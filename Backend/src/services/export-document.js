import PDFDocument from "pdfkit";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ExportDocument,
  ExportDocumentItem,
  SiteSetting,
} from "../models/index.js";

export function numberToWords(amount, currency = "USD") {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return "";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertGroup(n) {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return `${currency} Zero Only`.toUpperCase();
  }

  let words = "";
  let n = integerPart;

  if (n >= 1000000000) {
    words += convertGroup(Math.floor(n / 1000000000)) + " Billion ";
    n %= 1000000000;
  }
  if (n >= 1000000) {
    words += convertGroup(Math.floor(n / 1000000)) + " Million ";
    n %= 1000000;
  }
  if (n >= 1000) {
    words += convertGroup(Math.floor(n / 1000)) + " Thousand ";
    n %= 1000;
  }
  if (n > 0) {
    words += convertGroup(n) + " ";
  }

  words = words.trim();
  if (!words) words = "Zero";

  let result = `${currency} ${words}`;
  if (decimalPart > 0) {
    result += ` and ${convertGroup(decimalPart)} Cents`;
  }
  result += " Only";
  return result.toUpperCase();
}

export async function recalculate(document, transaction) {
  const items = await ExportDocumentItem.findAll({
    where: { export_document_id: document.id },
    transaction,
  });
  const goods = items.reduce(
    (total, item) => total + Number(item.qty) * (Number(item.unit_value) + Number(item.extra_price || 0)),
    0,
  );
  const kg = items.reduce(
    (total, item) =>
      total + Number(item.qty) * Number(item.unit_net_weight || 0),
    0,
  );
  const taxRate = Number(document.tax_rate) || 0;
  const taxAmount = (goods * (taxRate / 100));
  const finalTotal = goods + taxAmount;
  const words = numberToWords(finalTotal, document.currency_code || "USD");

  await document.update(
    {
      total_goods_value: goods.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      final_total_amount: finalTotal.toFixed(2),
      total_amount_words: words,
      total_net_weight_kg: kg.toFixed(3),
      total_net_weight_lbs: (kg * 2.20462262).toFixed(3),
    },
    { transaction },
  );
  return document;
}

async function legacyPdfBuffer(documentId, documentType = "proforma") {
  const document = await ExportDocument.findByPk(documentId, {
    include: { model: ExportDocumentItem, as: "items" },
  });
  if (!document) throw new Error("Export document not found");
  const settings = await SiteSetting.findAll();
  const setting = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const pdf = new PDFDocument({ size: "A4", margin: 38 });
  const chunks = [];
  pdf.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) =>
    pdf.on("end", () => resolve(Buffer.concat(chunks))),
  );
  const documentTitles = {
    commercial: "COMMERCIAL INVOICE",
    proforma: "PROFORMA INVOICE",
    packing: "PACKING LIST",
  };
  pdf
    .fontSize(17)
    .font("Helvetica-Bold")
    .text(documentTitles[documentType] || documentTitles.proforma, { align: "center" });
  pdf.moveDown(0.5);
  pdf
    .fontSize(10)
    .font("Helvetica")
    .text(`Invoice No.: ${document.invoice_no}`, { align: "right" });
  pdf.moveDown();
  const info = [
    ["Shipment Date", document.shipment_date],
    ["Shipment Reference No.", document.shipment_ref_no],
    ["Reason for Export", document.reason_for_export],
    ["Type of Export", document.type_of_export],
    ["Export License No.", document.export_license_no],
    ["Import License No.", document.import_license_no],
    ["Incoterms", document.incoterms],
    ["Currency Code", document.currency_code],
    ["Payment Method", document.payment_method],
    ["Letter of Credit No.", document.letter_of_credit_no],
    ["Customer PO No.", document.customer_po_no],
    ["PO Date", document.po_date],
    ["File Number", document.file_number],
  ];
  pdf.font("Helvetica-Bold").text("GENERAL INFORMATION");
  pdf.font("Helvetica");
  info.forEach(([label, value]) => pdf.text(`${label}: ${value || "—"}`));
  pdf.moveDown(0.5);
  pdf.font("Helvetica-Bold").text("IMPORTER OF RECORD");
  pdf
    .font("Helvetica")
    .text(
      `${document.importer_name}\n${document.importer_address || ""}\nContact: ${document.importer_contact || "—"}\nEmail: ${document.importer_email || "—"}\nTax ID No.: ${document.importer_tax_id || "—"}`,
    );
  pdf.moveDown(0.5);
  pdf.font("Helvetica-Bold").text("SENDER DETAILS");
  pdf
    .font("Helvetica")
    .text(
      `${document.sender_name || "-"}\n${document.sender_address || ""}\n${document.additional_company_details || ""}\nContact: ${document.sender_contact || "-"}\nEmail: ${document.sender_email || "-"}\nTax ID No.: ${document.sender_tax_id || "-"}`,
    );
  pdf.moveDown(0.5);
  pdf.font("Helvetica-Bold").text("RECIPIENT / USER DATA");
  pdf
    .font("Helvetica")
    .text(
      `${document.receiver_name || "-"}\n${document.receiver_address || ""}\nContact: ${document.receiver_contact || "-"}\nEmail: ${document.receiver_email || "-"}\nTax ID No.: ${document.receiver_tax_id || "-"}`,
    );
  pdf.moveDown(0.5);
  pdf.font("Helvetica-Bold").text("PACKING / ITEM DETAILS");
  [
    ["Mode of Transportation", document.mode_of_transportation],
    ["Transportation Terms", document.transportation_terms],
    ["AWB / BL No.", document.awb_bl_no],
    ["Number of Packages", document.no_of_packages],
    ["Package Description", document.package_description],
    ["Total Gross Weight Unit", document.total_gross_weight_unit],
    ["HS Code", document.hs_code],
    ["Country of Origin", document.country_of_origin],
    ["Other Information and Compliance Details", document.other_information_compliance_details],
  ].forEach(([label, value]) => pdf.font("Helvetica").text(`${label}: ${value || "-"}`));
  pdf.moveDown();
  const xs = [38, 106, 153, 199, 235, 278, 337, 402, 480];
  const heads = [
    "Product",
    "HS Code",
    "Origin",
    "Qty",
    "UOM",
    "Price",
    "Sub-Total",
    "Unit Wt. (g)",
  ];
  let y = pdf.y;
  pdf.fontSize(7).font("Helvetica-Bold");
  heads.forEach((h, i) =>
    pdf.text(h, xs[i], y, { width: (xs[i + 1] || 555) - xs[i] - 3 }),
  );
  y += 14;
  pdf.moveTo(38, y).lineTo(555, y).stroke();
  pdf.font("Helvetica");
  document.items.forEach((item) => {
    if (y > 670) {
      pdf.addPage();
      y = 45;
    }
    const values = [
      item.product_name,
      item.hs_code,
      item.country_of_origin,
      item.qty,
      item.uom,
      item.unit_value,
      item.sub_total,
      (Number(item.unit_net_weight || 0) * 1000).toFixed(2),
    ];
    values.forEach((value, i) =>
      pdf.text(String(value ?? "—"), xs[i], y + 3, {
        width: (xs[i + 1] || 555) - xs[i] - 3,
      }),
    );
    y += 26;
    pdf.moveTo(38, y).lineTo(555, y).stroke();
  });
  pdf.y = y + 14;

  const hasTax = document.tax_type || Number(document.tax_rate) > 0;
  const currency = document.currency_code || "USD";
  const goodsVal = Number(document.total_goods_value || 0).toFixed(2);
  const taxRate = Number(document.tax_rate || 0).toFixed(2);
  const taxAmt = Number(document.tax_amount || 0).toFixed(2);
  const finalVal = Number(document.final_total_amount || document.total_goods_value || 0).toFixed(2);
  const wordsVal = document.total_amount_words || numberToWords(finalVal, currency);

  pdf.fontSize(9).font("Helvetica-Bold");
  pdf.text(`No. of Packages: ${document.no_of_packages || "—"}`);
  pdf.text(`Total Value of Goods: ${currency} ${goodsVal}`);

  if (hasTax) {
    pdf.text(`Tax (${document.tax_type || "Tax"} @ ${taxRate}%): ${currency} ${taxAmt}`);
  }
  pdf.text(`Final Total Amount: ${currency} ${finalVal}`);
  pdf.text(`Total Weight: ${document.total_net_weight_kg} KG / ${document.total_net_weight_lbs} LBS`);
  pdf.moveDown(0.5);

  pdf.fontSize(8.5).font("Helvetica-BoldOblique");
  pdf.text(`Total Amount in Words: ${wordsVal}`);
  pdf.moveDown();
  pdf.fontSize(9).font("Helvetica-Bold").text("SIGNATORY DETAILS");
  pdf.font("Helvetica").text(`${document.signatory_name || "-"}\n${document.signatory_designation || "-"}`);
  pdf.moveDown();

  pdf
    .fontSize(8)
    .font("Helvetica")
    .text(setting.office_name || "SAALUVESA ENTERPRISES PRIVATE LIMITED")
    .text(
      setting.office_address ||
        "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459",
    )
    .text(`GST – ${setting.gst_number || "33ABRCS3304A1ZR"}`)
    .text(`Import Export code – ${setting.iec_number || "ABRCS3304A"}`);
  pdf.end();
  return finished;
}

function formatDocDate(val) {
  if (!val) return "N/A";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(val);
  }
}

function pdfValue(value) {
  if (value === undefined || value === null || value === "") return "N/A";
  return String(value);
}

// ── Layout constants shared across the redesigned invoice / packing list ─────
// Keeping these centralised means every height calculation and every draw
// call agree on exactly the same numbers, which is what prevents text from
// overlapping or sticking together. These values were widened slightly
// (compared to the previous revision) specifically so the last row inside
// any two-column section — e.g. "Payment Method" in Shipment Details, which
// is the tallest/last column — always has clear air above the box border.
const SECTION_HEADER_H = 15; // grey title bar above a two-column block
const SECTION_TOP_PAD = 7; // gap between the grey bar and the first field
const SECTION_BOTTOM_PAD = 11; // gap below the LAST field before the box border
const FIELD_GAP = 5; // vertical gap between stacked label/value rows
const BASE_FONT = 7.2; // base field font size (bumped slightly for readability)

function pdfRowHeight(pdf, columns, values, minimumHeight = 19, fontSize = BASE_FONT) {
  let contentHeight = 0;
  columns.forEach((width, i) => {
    pdf.font("Helvetica").fontSize(fontSize);
    contentHeight = Math.max(
      contentHeight,
      pdf.heightOfString(pdfValue(values[i] ?? ""), { width: width - 8, lineGap: 1.6 }),
    );
  });
  return Math.max(minimumHeight, contentHeight + 9);
}

function pdfTextHeight(pdf, text, width, font, fontSize) {
  pdf.font(font).fontSize(fontSize);
  return pdf.heightOfString(pdfValue(text), { width, lineGap: 1.4 });
}

// Draw a bordered table row. Header cells get grey fill + bold text.
function pdfRow(pdf, y, startX, columns, values, height, isHeader = false, aligns = []) {
  let x = startX;
  columns.forEach((width, i) => {
    const val = values[i] === undefined || values[i] === null ? "" : String(values[i]);
    const align = aligns[i] || (isHeader ? "center" : "left");
    if (isHeader) {
      pdf.rect(x, y, width, height).fillAndStroke("#f2f2f2", "#000000");
      pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.2)
        .text(val, x + 3, y + 5, {
          width: width - 6,
          height: height - 8,
          align: "center",
          lineGap: 1.4,
        });
    } else {
      pdf.rect(x, y, width, height).stroke();
      if (val) {
        pdf.fillColor("#000000").font("Helvetica").fontSize(7.2)
          .text(val, x + 4, y + 5, {
            width: width - 8,
            height: height - 8,
            align,
            lineGap: 1.4,
          });
      }
    }
    x += width;
  });
}

// Height a single "Label: Value" row needs, given the label column width.
// A generous fixed buffer is added on top of the raw text metrics so that
// descenders / line-height rounding never causes the next row (or the box
// border) to sit on top of the text — this is what keeps rows like
// "Payment Method" clearly separated from the box edge below them.
function pdfFieldHeight(pdf, label, value, width, labelWidth, fontSize = BASE_FONT) {
  pdf.font("Helvetica-Bold").fontSize(fontSize);
  const labelHeight = pdf.heightOfString(label, { width: labelWidth - 6, lineGap: 1.6 });
  pdf.font("Helvetica").fontSize(fontSize);
  const valueHeight = pdf.heightOfString(pdfValue(value), { width: width - labelWidth - 8, lineGap: 1.6 });
  return Math.max(labelHeight, valueHeight, fontSize * 1.55) + 5.5;
}

function pdfField(pdf, label, value, x, y, width, labelWidth, fontSize = BASE_FONT, height) {
  const fieldHeight = height || pdfFieldHeight(pdf, label, value, width, labelWidth, fontSize);
  pdf.font("Helvetica-Bold").fontSize(fontSize).fillColor("#000000")
    .text(label, x + 4, y, { width: labelWidth - 6, height: fieldHeight - 2, lineGap: 1.6 });
  pdf.font("Helvetica").fontSize(fontSize)
    .text(pdfValue(value), x + labelWidth, y, {
      width: width - labelWidth - 8,
      height: fieldHeight - 2,
      lineGap: 1.6,
    });
  return fieldHeight;
}

// Total height a stack of "Label: Value" rows needs, including the gaps
// between rows. Used BOTH to size the surrounding box and (via
// drawFieldColumn) to actually place the rows, so the two can never drift
// apart the way the previous implementation did.
function measureFieldColumn(pdf, fields, width, labelWidth, fontSize) {
  if (!fields.length) return 0;
  let total = 0;
  fields.forEach(([label, value]) => {
    total += pdfFieldHeight(pdf, label, value, width, labelWidth, fontSize) + FIELD_GAP;
  });
  return total - FIELD_GAP;
}

function drawFieldColumn(pdf, fields, x, y, width, labelWidth, fontSize) {
  let cy = y;
  fields.forEach(([label, value]) => {
    const h = pdfFieldHeight(pdf, label, value, width, labelWidth, fontSize);
    pdfField(pdf, label, value, x, cy, width, labelWidth, fontSize, h);
    cy += h + FIELD_GAP;
  });
  return cy;
}

// Draws a two-column "titled box" (e.g. Sender Details | Shipment Details).
// Both columns share one outer height equal to the taller column's content,
// so the shorter column simply ends with blank space rather than ever
// overflowing its border, and the taller column (e.g. Shipment Details,
// which holds "Payment Method" as its last row) always gets the full
// SECTION_BOTTOM_PAD of clear air below its last row.
function drawTwoColumnSection(pdf, {
  x, y, width, colWidths, titles, fieldColumns, labelWidths, fontSize = BASE_FONT,
}) {
  const [leftW, rightW] = colWidths;
  const leftLabelW = labelWidths[0];
  const rightLabelW = labelWidths[1];

  const leftContentH = measureFieldColumn(pdf, fieldColumns[0], leftW, leftLabelW, fontSize);
  const rightContentH = measureFieldColumn(pdf, fieldColumns[1], rightW, rightLabelW, fontSize);
  const contentH = Math.max(leftContentH, rightContentH);
  const boxH = SECTION_HEADER_H + SECTION_TOP_PAD + contentH + SECTION_BOTTOM_PAD;

  // Outer borders
  pdf.rect(x, y, leftW, boxH).stroke();
  pdf.rect(x + leftW, y, rightW, boxH).stroke();

  // Header bars
  pdf.rect(x, y, leftW, SECTION_HEADER_H).fillAndStroke("#f2f2f2", "#000000");
  pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(8)
    .text(titles[0], x, y + 4, { width: leftW, align: "center" });
  pdf.rect(x + leftW, y, rightW, SECTION_HEADER_H).fillAndStroke("#f2f2f2", "#000000");
  pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(8)
    .text(titles[1], x + leftW, y + 4, { width: rightW, align: "center" });

  // Field rows
  const fieldsTopY = y + SECTION_HEADER_H + SECTION_TOP_PAD;
  drawFieldColumn(pdf, fieldColumns[0], x, fieldsTopY, leftW, leftLabelW, fontSize);
  drawFieldColumn(pdf, fieldColumns[1], x + leftW, fieldsTopY, rightW, rightLabelW, fontSize);

  return y + boxH;
}

// Draws the company header (title + logo + company info in dashed border).
// Returns the Y coordinate below the header box where body content starts.
function pdfCompanyHeader(pdf, document, title) {
  const logoPath = fileURLToPath(new URL("../../../admin/public/favicon.jpeg", import.meta.url));
  const L = 38;
  const R = 557;
  const W = 519;

  // Keep the document identity compact and separate from the form fields below.
  pdf.font("Helvetica-Bold").fontSize(14.5).fillColor("#000000")
    .text(title, L, 14, { width: W, align: "center" });

  const boxTop = 36;
  const logoSize = 62;
  const textX = L + logoSize + 20;
  const textW = R - textX - 6;
  const companyName = document.sender_name ||
    "Saaluvesa Enterprises Private Limited";
  const companyAddr = document.sender_address ||
    "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459";
  const regDetails = document.additional_company_details ||
    "C.I.N : U46900TZ2025PTC36041 | ROC COIMBATORE - REG. NO : 036041\nGST - 33ABRCS3304A1ZR | Import Export code - ABRCS3304A | ICEGATE ID - ABRCS3304APIE000";
  const companyNameHeight = pdfTextHeight(pdf, companyName, textW, "Helvetica-Bold", 11);
  const companyAddressHeight = pdfTextHeight(pdf, companyAddr, textW, "Helvetica", 7.2);
  const registrationHeight = pdfTextHeight(pdf, regDetails, textW, "Helvetica-Bold", 6.8);
  const boxHeight = Math.max(
    logoSize + 14,
    companyNameHeight + companyAddressHeight + registrationHeight + 24,
  );
  pdf.rect(L, boxTop, W, boxHeight).dash(3, { space: 3 }).stroke("#000000").undash();

  if (fs.existsSync(logoPath)) {
    pdf.image(logoPath, L + 6, boxTop + Math.max(5, (boxHeight - logoSize) / 2), { fit: [logoSize, logoSize] });
  }

  let ty = boxTop + 9;
  pdf.font("Helvetica-Bold").fontSize(11).fillColor("#000000")
    .text(companyName, textX, ty, { width: textW, height: companyNameHeight, lineGap: 1.4 });
  ty += companyNameHeight + 6;
  pdf.font("Helvetica").fontSize(7.2).fillColor("#000000")
    .text(companyAddr, textX, ty, { width: textW, height: companyAddressHeight, lineGap: 1.4 });
  ty += companyAddressHeight + 6;
  pdf.font("Helvetica-Bold").fontSize(6.8).fillColor("#000000")
    .text(regDetails, textX, ty, { width: textW, height: registrationHeight, lineGap: 1.4 });

  return boxTop + boxHeight; // Y where body starts
}

export async function pdfBuffer(documentId, documentType = "proforma") {
  const document = await ExportDocument.findByPk(documentId, { include: { model: ExportDocumentItem, as: "items" } });
  if (!document) throw new Error("Export document not found");
  const pdf = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const chunks = [];
  pdf.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks))));
  const packing = documentType === "packing";

  const docTitle = packing ? "PACKING LIST"
    : documentType === "commercial" ? "COMMERCIAL INVOICE" : "PROFORMA INVOICE";

  // ── Shared values ────────────────────────────────────────────────────────────
  const senderName      = document.sender_name      || "Saaluvesa Enterprises Private Limited";
  const senderAddress   = document.sender_address   || "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459";
  const senderContact   = document.sender_contact   || "+91 94884 10884";
  const senderEmail     = document.sender_email     || "info@saaluvesa.com";
  const senderTaxId     = document.sender_tax_id    || "33ABRCS3304A1ZR";

  const receiverName    = document.receiver_name    || document.importer_name    || "N/A";
  const receiverAddress = document.receiver_address || document.importer_address || "N/A";
  const receiverContact = document.receiver_contact || document.importer_contact || "N/A";
  const receiverEmail   = document.receiver_email   || document.importer_email   || "N/A";
  const receiverTaxId   = document.receiver_tax_id  || document.importer_tax_id  || "N/A";

  const importerName    = document.importer_name    || "N/A";
  const importerAddress = document.importer_address || "N/A";
  const importerContact = document.importer_contact || "N/A";
  const importerEmail   = document.importer_email   || "N/A";
  const importerTaxId   = document.importer_tax_id  || "N/A";

  const complianceText  = document.other_information_compliance_details || "Good Condition";
  const signatoryName   = document.signatory_name        || "Saaluvesa Enterprises Private Limited";
  const signatoryDesig  = document.signatory_designation || "Manager";

  const L = 38;   // left margin
  const R = 557;  // right edge (38 + 519)
  const W = 519;  // content width

  // Draw company header — returns Y just below the dashed border box
  const headerBotY = pdfCompanyHeader(pdf, document, docTitle);

  // ── META area starts just below the header box ───────────────────────────────
  const metaY = headerBotY + 9;
  let bodyBottomY = metaY;

  if (packing) {
    // ══════════════════════════════════════════════════════════════════════════
    // ── PACKING LIST ─────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    // Right-side meta block
    pdf.font("Helvetica-Bold").fontSize(7.6).fillColor("#000000");
    pdf.text(`Page:  1 of 1`,                                       L, metaY,      { width: W, align: "right" });
    pdf.text(`Date: ${formatDocDate(document.shipment_date)}`,      L, metaY + 11, { width: W, align: "right" });
    pdf.text(`Invoice Number: ${pdfValue(document.invoice_no)}`,    L, metaY + 22, { width: W, align: "right" });
    pdf.text(`SHIPMENT DATE: ${formatDocDate(document.shipment_date)}`, L, metaY + 33, { width: W, align: "right" });

    // Invoice No row + Invoice Date / File Number
    const refY = metaY + 50;
    pdf.font("Helvetica-Bold").fontSize(7.6).fillColor("#000000")
      .text(`Invoice No:  ${pdfValue(document.shipment_ref_no || document.invoice_no)}`, L, refY, { width: 230 });
    pdf.moveTo(L, refY + 13).lineTo(L + 220, refY + 13).stroke();
    pdf.text(`Invoice Date:  ${formatDocDate(document.shipment_date)}`, L, refY,      { width: W, align: "right" });
    pdf.text(`File Number:  ${pdfValue(document.file_number)}`,         L, refY + 13, { width: W, align: "right" });

    // ── SHIPPER / CONSIGNEE / BILL TO ────────────────────────────────────────
    const partyY    = refY + 28;
    const colW      = Math.floor(W / 3);        // 173
    const partyHdrH = SECTION_HEADER_H;
    const parties = [
      [senderName,   senderAddress],
      [receiverName, receiverAddress],
      [importerName, importerAddress],
    ];
    const partyBodyH = Math.max(...parties.map(([name, addr], i) => {
      const cw = i === 2 ? W - colW * 2 : colW;
      return pdfTextHeight(pdf, name, cw - 8, "Helvetica-Bold", 7.2)
        + pdfTextHeight(pdf, addr, cw - 8, "Helvetica", 6.8) + 22;
    }), 56);

    pdfRow(pdf, partyY, L, [colW, colW, W - colW * 2], ["SHIPPER", "CONSIGNEE", "BILL TO"], partyHdrH, true);

    // One continuous cell per column (name bold, address normal)
    parties.forEach(([name, addr], i) => {
      const cx = L + i * colW;
      const cw = i === 2 ? W - colW * 2 : colW;
      const by = partyY + partyHdrH;
      pdf.rect(cx, by, cw, partyBodyH).stroke();
      pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#000000")
        .text(name, cx + 4, by + 6, { width: cw - 8, lineGap: 1.4 });
      pdf.font("Helvetica").fontSize(6.8).fillColor("#000000")
        .text(addr, cx + 4, by + 19, { width: cw - 8, height: partyBodyH - 24, lineGap: 1.4 });
    });

    // ── SHIPMENT INFORMATION ─────────────────────────────────────────────────
    const siY    = partyY + partyHdrH + partyBodyH + 7;
    const siHdrH = SECTION_HEADER_H;
    const halfW  = Math.floor(W / 2);   // 259

    pdf.rect(L, siY, W, siHdrH).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(8)
      .text("SHIPMENT INFORMATION", L, siY + 4, { width: W, align: "center" });

    const leftSI = [
      ["Letter of Credit No:", document.letter_of_credit_no],
      ["Customer PO No:",       document.customer_po_no],
      ["PO Date:",              formatDocDate(document.po_date)],
      ["Currency:",             document.currency_code || "USD"],
      ["Ref No:",               document.shipment_ref_no],
      ["Payment Terms:",        document.payment_method || "Bank Transfer"],
      ["Incoterms Desc.:",      document.incoterms || "DAP"],
      ["AWB/BL No:",            document.awb_bl_no],
    ];
    const rightSI = [
      ["Mode of Transportation:", document.mode_of_transportation || "Air"],
      ["Transportation Terms:",   document.transportation_terms   || "EXW"],
      ["Number of Packages:",     document.no_of_packages         || "1"],
      ["Gross Weight(Kg):",       document.total_net_weight_kg    || "0.00"],
    ];
    const siRowHeights = leftSI.map((entry, i) => Math.max(
      pdfFieldHeight(pdf, entry[0], entry[1], halfW, 108, 7),
      rightSI[i] ? pdfFieldHeight(pdf, rightSI[i][0], rightSI[i][1], W - halfW, 122, 7) : 0,
      18,
    ));

    leftSI.forEach((entry, i) => {
      const ry = siY + siHdrH + siRowHeights.slice(0, i).reduce((sum, height) => sum + height, 0);
      pdf.rect(L, ry, halfW, siRowHeights[i]).stroke();
      pdfField(pdf, entry[0], entry[1], L, ry + 4, halfW, 108, 7, siRowHeights[i] - 4);
    });
    rightSI.forEach((entry, i) => {
      const ry = siY + siHdrH + siRowHeights.slice(0, i).reduce((sum, height) => sum + height, 0);
      pdf.rect(L + halfW, ry, W - halfW, siRowHeights[i]).stroke();
      pdfField(pdf, entry[0], entry[1], L + halfW, ry + 4, W - halfW, 122, 7, siRowHeights[i] - 4);
    });
    const siTotalH = siRowHeights.reduce((sum, height) => sum + height, 0);
    for (let i = rightSI.length; i < siRowHeights.length; i++) {
      const emptyY = siY + siHdrH + siRowHeights.slice(0, i)
        .reduce((sum, height) => sum + height, 0);
      pdf.rect(L + halfW, emptyY, W - halfW, siRowHeights[i]).stroke();
    }

    // ── ITEMS TABLE ──────────────────────────────────────────────────────────
    let curY = siY + siHdrH + siTotalH + 9;
    const cols  = [32, 56, 210, 78, 95, 48];
    const itemH = 19;
    pdfRow(pdf, curY, L, cols,
      ["NOs", "QUANTITY", "DESCRIPTION", "HSN CODE", "NET WEIGHT IN\nGRAMS", "UNIT"],
      27, true);
    curY += 27;

    const packingItems = Array.isArray(document.items) ? document.items : [];
    packingItems.forEach((item, i) => {
      const values = [
        i + 1,
        Number(item.qty || 1).toFixed(3),
        item.product_name || "Product",
        item.hs_code || document.hs_code || "N/A",
        (Number(item.unit_net_weight || 0) * 1000).toFixed(2),
        item.uom || "PCS",
      ];
      const rowHeight = pdfRowHeight(pdf, cols, values, itemH);
      pdfRow(pdf, curY, L, cols, values, rowHeight, false, ["center", "center", "left", "center", "right", "center"]);
      curY += rowHeight;
    });

    // 2 filler rows matching reference (N/A in each cell)
    const fillerValues = ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
    pdfRow(pdf, curY, L, cols, fillerValues, itemH, false); curY += itemH;
    pdfRow(pdf, curY, L, cols, fillerValues, itemH, false); curY += itemH;

    // ── TOTALS TABLE ─────────────────────────────────────────────────────────
    curY += 9;
    pdf.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
      .text("TOTAL:", L, curY, { width: W, align: "right" });
    curY += 14;

    const totalCols   = [75, 115, 82, 80];
    const totalStartX = R - totalCols.reduce((a, b) => a + b, 0);
    pdfRow(pdf, curY, totalStartX, totalCols,
      ["NO.\nPKGS", "TOTAL GROSS\nWEIGHT\nGRAMS", "NET WEIGHT\nLBS", "NET WEIGHT\nKGS"],
      29, true);
    curY += 29;
    pdfRow(pdf, curY, totalStartX, totalCols, [
      pdfValue(document.no_of_packages || "1"),
      (Number(document.total_net_weight_kg || 0) * 1000).toFixed(0),
      document.total_net_weight_lbs || "0",
      document.total_net_weight_kg  || "0",
    ], 17, false, ["center", "center", "center", "center"]);
    curY += 23;

    // ── PACKAGE DESCRIPTION ──────────────────────────────────────────────────
    pdf.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
      .text("PACKAGE DESCRIPTION:", L, curY);
    curY += 13;
    const packageDescriptionHeight = Math.max(26, pdfTextHeight(pdf, document.package_description, W - 8, "Helvetica", 7.2) + 12);
    pdf.rect(L, curY, W, packageDescriptionHeight).stroke();
    pdf.font("Helvetica").fontSize(7.2).fillColor("#000000")
      .text(pdfValue(document.package_description), L + 4, curY + 6, {
        width: W - 8,
        height: packageDescriptionHeight - 12,
        lineGap: 1.4,
      });
    bodyBottomY = curY + packageDescriptionHeight;

  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // ── COMMERCIAL / PROFORMA INVOICE ────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    // Meta line: Date (left) | Invoice Number (center) | AWB (right)
    pdf.font("Helvetica-Bold").fontSize(7.8).fillColor("#000000")
      .text(`Date: ${formatDocDate(document.shipment_date)}`,        L, metaY, { width: W });
    pdf.text(`Invoice Number: ${pdfValue(document.invoice_no)}`,     L, metaY, { width: W, align: "center" });
    pdf.text(`Air Waybill Number: ${pdfValue(document.awb_bl_no)}`,  L, metaY, { width: W, align: "right" });

    // ── Sender Details (left) & Shipment Details (right) ─────────────────────
    // NOTE: labelWidths[1] is intentionally wide (124) so long labels like
    // "Import License No.:" and "Payment Method:" never wrap, and the row
    // heights below (via pdfFieldHeight) stay tight and predictable — that,
    // combined with the larger SECTION_BOTTOM_PAD, is what keeps "Payment
    // Method" (the last row here) clear of the box border beneath it.
    const senderFields = [
      ["Name:", senderName], ["Address:", senderAddress], ["Contact Number:", senderContact],
      ["Email:", senderEmail], ["Tax ID No.:", senderTaxId],
    ];
    const shipmentFields = [
      ["SHIPMENT DATE:",           formatDocDate(document.shipment_date)],
      ["Shipment Ref. No.:",       document.shipment_ref_no  || "N/A"],
      ["Reason for Export:",       document.reason_for_export || "Commercial"],
      ["Type of Export:",          document.type_of_export    || "Permanent"],
      ["Export License No.:",      document.export_license_no || "N/A"],
      ["Import License No.:",      document.import_license_no || "N/A"],
      ["INCOTERMS:",               document.incoterms         || "DAP"],
      ["Currency Code:",           document.currency_code     || "USD"],
      ["Payment Method:",          document.payment_method    || "Bank Transfer"],
    ];

    const row1Y  = metaY + 18;
    const halfW  = Math.floor(W / 2);   // 259
    const row1Bottom = drawTwoColumnSection(pdf, {
      x: L, y: row1Y, width: W,
      colWidths: [halfW, W - halfW],
      titles: ["Sender Details", "Shipment Details"],
      fieldColumns: [senderFields, shipmentFields],
      labelWidths: [88, 124],
      fontSize: BASE_FONT,
    });

    // ── Receiver Details (left) & Importer of Record (right) ─────────────────
    const receiverFields = [
      ["Name:", receiverName], ["Address:", receiverAddress], ["Contact Number:", receiverContact],
      ["Email:", receiverEmail], ["Tax ID No.:", receiverTaxId],
    ];
    const importerFields = [
      ["Name:", importerName], ["Address:", importerAddress], ["Contact Number:", importerContact],
      ["Email:", importerEmail], ["Tax ID No.:", importerTaxId],
    ];

    const row2Y = row1Bottom + 8;
    const row2Bottom = drawTwoColumnSection(pdf, {
      x: L, y: row2Y, width: W,
      colWidths: [halfW, W - halfW],
      titles: ["Receiver Details", "Importer of Record Details"],
      fieldColumns: [receiverFields, importerFields],
      labelWidths: [88, 88],
      fontSize: BASE_FONT,
    });

    // ── Items Table ───────────────────────────────────────────────────────────
    let curY = row2Bottom + 10;
    const cols  = [28, 148, 60, 60, 56, 56, 58, 53];
    const itemH = 21;
    pdfRow(pdf, curY, L, cols,
      ["No.", "Item Description", "HS Code", "Country of\nOrigin", "Qty UOM", "Unit Value", "Sub-Total\nValue", "Unit Net\nWeight"],
      itemH, true);
    curY += itemH;

    const invoiceItems = Array.isArray(document.items) ? document.items : [];
    const itemCurrency = document.currency_code || "USD";
    invoiceItems.forEach((item, i) => {
      const itemSubTotal = Number(item.sub_total || (Number(item.qty || 1) * Number(item.unit_value || 0))).toFixed(2);
      const values = [
        i + 1,
        item.product_name || "Product",
        item.hs_code || document.hs_code || "N/A",
        item.country_of_origin || document.country_of_origin || "India",
        `${item.qty || 1} ${item.uom || "PCS"}`,
        `${itemCurrency} ${Number(item.unit_value || 0).toFixed(2)}`,
        `${itemCurrency} ${itemSubTotal}`,
        (Number(item.unit_net_weight || 0) * 1000).toFixed(2),
      ];
      const rowHeight = pdfRowHeight(pdf, cols, values, itemH);
      pdfRow(pdf, curY, L, cols, values, rowHeight, false, ["center", "left", "center", "center", "center", "right", "right", "right"]);
      curY += rowHeight;
    });

    // 2 empty filler rows
    const emptyValues = ["", "", "", "", "", "", "", ""];
    pdfRow(pdf, curY, L, cols, emptyValues, itemH, false); curY += itemH;
    pdfRow(pdf, curY, L, cols, emptyValues, itemH, false); curY += itemH;

    // ── Compliance + Totals ───────────────────────────────────────────────────
    curY += 7;
    pdf.font("Helvetica-Bold").fontSize(7.8).fillColor("#000000")
      .text("OTHER INFORMATION AND COMPLIANCE DETAILS:", L, curY);
    curY += 13;

    const compBoxW = 305;
    const compBoxH = Math.max(44, pdfTextHeight(pdf, complianceText, compBoxW - 8, "Helvetica", 7.2) + 13);
    pdf.rect(L, curY, compBoxW, compBoxH).stroke();
    pdf.font("Helvetica").fontSize(7.2).fillColor("#000000")
      .text(complianceText, L + 4, curY + 6, {
        width: compBoxW - 8,
        height: compBoxH - 12,
        lineGap: 1.4,
      });

    const currency    = document.currency_code || "USD";
    const goodsVal    = Number(document.total_goods_value || 0).toFixed(2);
    const weightGrams = (Number(document.total_net_weight_kg || 0) * 1000).toFixed(2);
    const totalsX     = L + compBoxW + 10;
    const totalsW     = W - compBoxW - 10;

    pdf.font("Helvetica-Bold").fontSize(7.4).fillColor("#000000");
    pdf.text("No. of Packages",   totalsX,                  curY + 6,  { width: totalsW * 0.6 });
    pdf.text(pdfValue(document.no_of_packages || "1"),
             totalsX + totalsW * 0.6, curY + 6,  { width: totalsW * 0.4, align: "right" });
    pdf.text("Total Goods Value", totalsX,                  curY + 21, { width: totalsW * 0.6 });
    pdf.text(`${currency} ${goodsVal}`,
             totalsX + totalsW * 0.6, curY + 21, { width: totalsW * 0.4, align: "right" });
    pdf.text("Total Weight (g)",  totalsX,                  curY + 36, { width: totalsW * 0.6 });
    pdf.text(`${weightGrams}`,
             totalsX + totalsW * 0.6, curY + 36, { width: totalsW * 0.4, align: "right" });

    curY += compBoxH + 12;

    // Tax / totals lines — each on its own clearly spaced line
    const goodsAmount = Number(document.total_goods_value || 0);
    const taxRateValue = Number(document.tax_rate || 0);
    const taxAmountValue = document.tax_amount !== null && document.tax_amount !== undefined && document.tax_amount !== ""
      ? Number(document.tax_amount)
      : goodsAmount * (taxRateValue / 100);
    const finalAmountValue = document.final_total_amount !== null && document.final_total_amount !== undefined && document.final_total_amount !== ""
      ? Number(document.final_total_amount)
      : goodsAmount + taxAmountValue;
    const taxRate  = taxRateValue.toFixed(2);
    const taxAmt   = taxAmountValue.toFixed(2);
    const finalVal = finalAmountValue.toFixed(2);
    const wordsVal = document.total_amount_words || numberToWords(finalVal, currency);
    const taxLabel = document.tax_type ? `Tax (${document.tax_type})` : "Tax";

    pdf.font("Helvetica-Bold").fontSize(7.8).fillColor("#000000");
    pdf.text(`Tax Percentage: ${taxRate}%`, L, curY, { width: W, align: "right" });
    curY += 13;
    pdf.text(`${taxLabel}: ${currency} ${taxAmt}`, L, curY, { width: W, align: "right" });
    curY += 13;
    pdf.text(`Final Total Amount: ${currency} ${finalVal}`, L, curY, { width: W, align: "right" });
    curY += 16;

    const wordsHeight = pdfTextHeight(pdf, `Amount in Words: ${wordsVal}`, W, "Helvetica-BoldOblique", 7.8);
    pdf.font("Helvetica-BoldOblique").fontSize(7.8)
      .text(`Amount in Words: ${wordsVal}`, L, curY, { width: W, lineGap: 1.4 });
    curY += wordsHeight + 9;

    // Certify
    const certifyText = "I/We certify the information on this invoice is true and correct and that the contents of this shipment are as stated above.";
    const certifyHeight = pdfTextHeight(pdf, certifyText, W, "Helvetica", 7.4);
    pdf.font("Helvetica").fontSize(7.4).fillColor("#000000")
      .text(certifyText, L, curY, { width: W, lineGap: 1.4 });
    bodyBottomY = curY + certifyHeight + 6;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SIGNATURE FOOTER (shared across all 3 document types) ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Keep a modest, consistent gap above the signature block, and fall back to
  // a fresh page only if the content genuinely can't fit — this keeps normal
  // documents on a single page while still being safe for unusually long data.
  let sigY = bodyBottomY + 18;
  const signatureWidth = R - L - 160;
  const signatureNameHeight = pdfTextHeight(pdf, signatoryName, signatureWidth, "Helvetica", 7.8);
  const signatureDesignationHeight = pdfTextHeight(pdf, signatoryDesig, signatureWidth, "Helvetica", 7.8);
  const signatureBottom = sigY + 26 + signatureNameHeight + signatureDesignationHeight + 16;
  if (signatureBottom > 828) {
    pdf.addPage();
    sigY = 45;
  }
  pdf.font("Helvetica-Bold").fontSize(7.8).fillColor("#000000").text("Signature:", L, sigY);
  pdf.moveTo(L + 80, sigY + 11).lineTo(R - 80, sigY + 11).stroke();

  const nameY = sigY + 21;
  pdf.font("Helvetica-Bold").text("Name:", L, nameY);
  pdf.font("Helvetica").text(signatoryName, L + 80, nameY, { width: signatureWidth, height: signatureNameHeight, lineGap: 1.4 });
  const designationY = nameY + signatureNameHeight + 7;
  pdf.moveTo(L + 80, designationY - 4).lineTo(R - 80, designationY - 4).stroke();

  pdf.font("Helvetica-Bold").text("Designation/Title:", L, designationY);
  pdf.font("Helvetica").text(signatoryDesig, L + 80, designationY, { width: signatureWidth, height: signatureDesignationHeight, lineGap: 1.4 });
  pdf.moveTo(L + 80, designationY + signatureDesignationHeight + 7).lineTo(R - 80, designationY + signatureDesignationHeight + 7).stroke();

  pdf.end();
  return finished;
}

export async function emailInvoice(document) {
  // Saving details must not generate or deliver a document. PDFs are only created by the PDF action.
  return undefined;
}