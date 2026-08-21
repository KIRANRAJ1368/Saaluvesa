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
  if (value === undefined || value === null) return "N/A";
  return String(value);
}

// Draw a bordered table row. Header cells get grey fill + bold text.
function pdfRow(pdf, y, startX, columns, values, height, isHeader = false, aligns = []) {
  let x = startX;
  columns.forEach((width, i) => {
    const val = values[i] === undefined || values[i] === null ? "" : String(values[i]);
    const align = aligns[i] || (isHeader ? "center" : "left");
    if (isHeader) {
      pdf.rect(x, y, width, height).fillAndStroke("#f2f2f2", "#000000");
      pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7)
        .text(val, x + 3, y + (height > 20 ? (height - 16) / 2 + 2 : 3), { width: width - 6, align: "center" });
    } else {
      pdf.rect(x, y, width, height).stroke();
      if (val) {
        pdf.fillColor("#000000").font("Helvetica").fontSize(7)
          .text(val, x + 4, y + 3, { width: width - 8, align });
      }
    }
    x += width;
  });
}

// Draws the company header (title + logo + company info in dashed border).
// Returns the Y coordinate below the header box where body content starts.
function pdfCompanyHeader(pdf, document, title) {
  const logoPath = fileURLToPath(new URL("../../../admin/public/favicon.jpeg", import.meta.url));
  const L = 38;
  const R = 557;
  const W = 519;

  // Keep the document identity compact and separate from the form fields below.
  // This gives every document type the same stable A4 starting point.
  pdf.font("Helvetica-Bold").fontSize(15).fillColor("#000000")
    .text(title, L, 18, { width: W, align: "center" });

  // The logo and exporter details sit above the short dashed separator, as in
  // the supplied document.  Keeping the separator independent prevents it
  // from cutting through either element and preserves a consistent body start.
  const boxTop = 90;
  const boxHeight = 19;
  const logoSize = 86;
  pdf.rect(L, boxTop, W, boxHeight).dash(3, { space: 3 }).stroke("#000000").undash();

  if (fs.existsSync(logoPath)) {
    pdf.image(logoPath, L + 4, 39, { fit: [logoSize, logoSize] });
  }

  const textX = L + logoSize + 28;
  const textW = R - textX - 8;
  const companyName = document.sender_name ||
    "Saaluvesa Enterprises Private Limited";
  const companyAddr = document.sender_address ||
    "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459";
  const regDetails = document.additional_company_details ||
    "C.I.N : U46900TZ2025PTC36041 | ROC COIMBATORE - REG. NO : 036041\nGST - 33ABRCS3304A1ZR | Import Export code - ABRCS3304A | ICEGATE ID - ABRCS3304APIE000";

  pdf.font("Helvetica-Bold").fontSize(11).fillColor("#000000")
    .text(companyName, textX, 42, { width: textW });
  pdf.font("Helvetica").fontSize(7).fillColor("#000000")
    .text(companyAddr, textX, 57, { width: textW, lineGap: 1 });
  pdf.font("Helvetica-Bold").fontSize(6.8).fillColor("#000000")
    .text(regDetails, textX, 72, { width: textW, lineGap: 1 });

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
  const metaY = headerBotY + 5;
  let bodyBottomY = metaY;

  if (packing) {
    // ══════════════════════════════════════════════════════════════════════════
    // ── PACKING LIST ─────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    // Right-side meta block
    pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000");
    pdf.text(`Page:  1 of 1`,                                       L, metaY,      { width: W, align: "right" });
    pdf.text(`Date: ${formatDocDate(document.shipment_date)}`,      L, metaY + 11, { width: W, align: "right" });
    pdf.text(`Invoice Number: ${pdfValue(document.invoice_no)}`,    L, metaY + 22, { width: W, align: "right" });
    pdf.text(`SHIPMENT DATE: ${formatDocDate(document.shipment_date)}`, L, metaY + 33, { width: W, align: "right" });

    // Invoice No row + Invoice Date / File Number
    const refY = metaY + 50;
    pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
      .text(`Invoice No:  ${pdfValue(document.shipment_ref_no || document.invoice_no)}`, L, refY, { width: 230 });
    pdf.moveTo(L, refY + 11).lineTo(L + 220, refY + 11).stroke();
    pdf.text(`Invoice Date:  ${formatDocDate(document.shipment_date)}`, L, refY,      { width: W, align: "right" });
    pdf.text(`File Number:  ${pdfValue(document.file_number)}`,         L, refY + 11, { width: W, align: "right" });

    // ── SHIPPER / CONSIGNEE / BILL TO ────────────────────────────────────────
    const partyY    = refY + 24;
    const colW      = Math.floor(W / 3);        // 173
    const partyHdrH = 14;
    const partyBodyH = 52;

    pdfRow(pdf, partyY, L, [colW, colW, W - colW * 2], ["SHIPPER", "CONSIGNEE", "BILL TO"], partyHdrH, true);

    // One continuous cell per column (name bold, address normal)
    const parties = [
      [senderName,   senderAddress],
      [receiverName, receiverAddress],
      [importerName, importerAddress],
    ];
    parties.forEach(([name, addr], i) => {
      const cx = L + i * colW;
      const cw = i === 2 ? W - colW * 2 : colW;
      const by = partyY + partyHdrH;
      pdf.rect(cx, by, cw, partyBodyH).stroke();
      pdf.font("Helvetica-Bold").fontSize(7).fillColor("#000000")
        .text(name, cx + 4, by + 4, { width: cw - 8 });
      pdf.font("Helvetica").fontSize(6.5).fillColor("#000000")
        .text(addr, cx + 4, by + 15, { width: cw - 8 });
    });

    // ── SHIPMENT INFORMATION ─────────────────────────────────────────────────
    const siY    = partyY + partyHdrH + partyBodyH + 4;
    const siHdrH = 13;
    const siRowH = 13;
    const halfW  = Math.floor(W / 2);   // 259

    pdf.rect(L, siY, W, siHdrH).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5)
      .text("SHIPMENT INFORMATION", L, siY + 3, { width: W, align: "center" });

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

    leftSI.forEach((entry, i) => {
      const ry = siY + siHdrH + i * siRowH;
      pdf.rect(L, ry, halfW, siRowH).stroke();
      pdf.font("Helvetica-Bold").fontSize(6.8).fillColor("#000000")
        .text(entry[0], L + 3, ry + 3, { continued: true, width: halfW - 6 });
      pdf.font("Helvetica").fontSize(6.8)
        .text(`  ${pdfValue(entry[1])}`, { continued: false });
    });
    rightSI.forEach((entry, i) => {
      const ry = siY + siHdrH + i * siRowH;
      pdf.rect(L + halfW, ry, W - halfW, siRowH).stroke();
      pdf.font("Helvetica-Bold").fontSize(6.8).fillColor("#000000")
        .text(entry[0], L + halfW + 3, ry + 3, { continued: true, width: W - halfW - 6 });
      pdf.font("Helvetica").fontSize(6.8)
        .text(`  ${pdfValue(entry[1])}`, { continued: false });
    });
    // Empty border cells for rows 4-7 on right side
    for (let i = 4; i < 8; i++) {
      pdf.rect(L + halfW, siY + siHdrH + i * siRowH, W - halfW, siRowH).stroke();
    }

    // ── ITEMS TABLE ──────────────────────────────────────────────────────────
    let curY = siY + siHdrH + 8 * siRowH + 5;
    const cols  = [32, 56, 210, 78, 95, 48];
    const itemH = 17;
    pdfRow(pdf, curY, L, cols,
      ["NOs", "QUANTITY", "DESCRIPTION", "HSN CODE", "NET WEIGHT IN\nGRAMS", "UNIT"],
      itemH, true);
    curY += itemH;

    const packingItems = Array.isArray(document.items) ? document.items : [];
    packingItems.forEach((item, i) => {
      pdfRow(pdf, curY, L, cols, [
        i + 1,
        Number(item.qty || 1).toFixed(3),
        item.product_name || "Product",
        item.hs_code || document.hs_code || "N/A",
        (Number(item.unit_net_weight || 0) * 1000).toFixed(2),
        item.uom || "PCS",
      ], itemH, false, ["center", "center", "left", "center", "right", "center"]);
      curY += itemH;
    });

    // 2 filler rows matching reference (N/A in each cell)
    pdfRow(pdf, curY, L, cols, ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"], itemH, false); curY += itemH;
    pdfRow(pdf, curY, L, cols, ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"], itemH, false); curY += itemH;

    // ── TOTALS TABLE ─────────────────────────────────────────────────────────
    curY += 5;
    pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
      .text("TOTAL:", L, curY, { width: W, align: "right" });
    curY += 11;

    const totalCols   = [75, 115, 82, 80];
    const totalStartX = R - totalCols.reduce((a, b) => a + b, 0);
    pdfRow(pdf, curY, totalStartX, totalCols,
      ["NO.\nPKGS", "TOTAL GROSS\nWEIGHT\nGRAMS", "NET WEIGHT\nLBS", "NET WEIGHT\nKGS"],
      24, true);
    curY += 24;
    pdfRow(pdf, curY, totalStartX, totalCols, [
      pdfValue(document.no_of_packages || "1"),
      (Number(document.total_net_weight_kg || 0) * 1000).toFixed(0),
      document.total_net_weight_lbs || "0",
      document.total_net_weight_kg  || "0",
    ], 14, false, ["center", "center", "center", "center"]);
    curY += 18;

    // ── PACKAGE DESCRIPTION ──────────────────────────────────────────────────
    pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
      .text("PACKAGE DESCRIPTION:", L, curY);
    curY += 10;
    pdf.rect(L, curY, W, 22).stroke();
    pdf.font("Helvetica").fontSize(7).fillColor("#000000")
      .text(pdfValue(document.package_description), L + 4, curY + 4, { width: W - 8 });
    bodyBottomY = curY + 22;

  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // ── COMMERCIAL / PROFORMA INVOICE ────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    // Meta line: Date (left) | Invoice Number (center) | AWB (right)
    pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
      .text(`Date: ${formatDocDate(document.shipment_date)}`,        L, metaY, { width: W });
    pdf.text(`Invoice Number: ${pdfValue(document.invoice_no)}`,     L, metaY, { width: W, align: "center" });
    pdf.text(`Air Waybill Number: ${pdfValue(document.awb_bl_no)}`,  L, metaY, { width: W, align: "right" });

    // General Information bar
    const giY  = metaY + 13;
    pdf.rect(L, giY, W, 13).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5)
      .text("General Information", L, giY + 3, { width: W, align: "center" });

    const halfW = Math.floor(W / 2);   // 259

    // ── Sender Details (left) & Shipment Details (right) ─────────────────────
    const row1Y = giY + 13;
    const row1H = 116;

    pdf.rect(L, row1Y, halfW, row1H).stroke();
    pdf.rect(L, row1Y, halfW, 13).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5)
      .text("Sender Details", L, row1Y + 3, { width: halfW, align: "center" });

    let sy = row1Y + 18;
    [["Name:", senderName], ["Address:", senderAddress], ["Contact Number:", senderContact],
     ["Email:", senderEmail], ["Tax ID No.:", senderTaxId]].forEach(([label, val]) => {
      pdf.font("Helvetica-Bold").fontSize(7).fillColor("#000000")
        .text(label, L + 4, sy, { continued: true, width: halfW - 8 });
      pdf.font("Helvetica").fontSize(7).text(`  ${pdfValue(val)}`, { continued: false });
      sy += label === "Address:" && String(val).length > 45 ? 20 : 14;
    });

    pdf.rect(L + halfW, row1Y, W - halfW, row1H).stroke();
    pdf.rect(L + halfW, row1Y, W - halfW, 13).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5)
      .text("Shipment Details", L + halfW, row1Y + 3, { width: W - halfW, align: "center" });

    let shy = row1Y + 18;
    [
      ["SHIPMENT DATE:",           formatDocDate(document.shipment_date)],
      ["Shipment Reference No.:",  document.shipment_ref_no  || "N/A"],
      ["Reason for Export:",       document.reason_for_export || "Commercial"],
      ["Type of Export:",          document.type_of_export    || "Permanent"],
      ["Export License No.:",      document.export_license_no || "N/A"],
      ["Import License No.:",      document.import_license_no || "N/A"],
      ["INCOTERMS:",               document.incoterms         || "DAP"],
      ["Currency Code:",           document.currency_code     || "USD"],
      ["Payment Method:",          document.payment_method    || "Bank Transfer"],
    ].forEach(([label, val]) => {
      pdf.font("Helvetica-Bold").fontSize(6.8).fillColor("#000000")
        .text(label, L + halfW + 4, shy, { continued: true, width: W - halfW - 8 });
      pdf.font("Helvetica").fontSize(6.8).text(`  ${pdfValue(val)}`, { continued: false });
      shy += 10.5;
    });

    // ── Receiver Details (left) & Importer of Record (right) ─────────────────
    const row2Y = row1Y + row1H;
    const row2H = 94;

    pdf.rect(L, row2Y, halfW, row2H).stroke();
    pdf.rect(L, row2Y, halfW, 13).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5)
      .text("Receiver Details", L, row2Y + 3, { width: halfW, align: "center" });

    let ry = row2Y + 18;
    [["Name:", receiverName], ["Address:", receiverAddress], ["Contact Number:", receiverContact],
     ["Email:", receiverEmail], ["Tax ID No.:", receiverTaxId]].forEach(([label, val]) => {
      pdf.font("Helvetica-Bold").fontSize(7).fillColor("#000000")
        .text(label, L + 4, ry, { continued: true, width: halfW - 8 });
      pdf.font("Helvetica").fontSize(7).text(`  ${pdfValue(val)}`, { continued: false });
      ry += label === "Address:" && String(val).length > 45 ? 20 : 14;
    });

    pdf.rect(L + halfW, row2Y, W - halfW, row2H).stroke();
    pdf.rect(L + halfW, row2Y, W - halfW, 13).fillAndStroke("#f2f2f2", "#000000");
    pdf.fillColor("#000000").font("Helvetica-Bold").fontSize(7.5)
      .text("Importer of Record Details", L + halfW, row2Y + 3, { width: W - halfW, align: "center" });

    let iy = row2Y + 18;
    [["Name:", importerName], ["Address:", importerAddress], ["Contact Number:", importerContact],
     ["Email:", importerEmail], ["Tax ID No.:", importerTaxId]].forEach(([label, val]) => {
      pdf.font("Helvetica-Bold").fontSize(7).fillColor("#000000")
        .text(label, L + halfW + 4, iy, { continued: true, width: W - halfW - 8 });
      pdf.font("Helvetica").fontSize(7).text(`  ${pdfValue(val)}`, { continued: false });
      iy += label === "Address:" && String(val).length > 45 ? 20 : 14;
    });

    // ── Items Table ───────────────────────────────────────────────────────────
    let curY = row2Y + row2H + 5;
    const cols  = [28, 148, 60, 60, 56, 56, 58, 53];
    const itemH = 18;
    pdfRow(pdf, curY, L, cols,
      ["No.", "Item Description", "HS Code", "Country of\nOrigin", "Qty UOM", "Unit Value", "Sub-Total\nValue", "Unit Net\nWeight"],
      itemH, true);
    curY += itemH;

    const invoiceItems = Array.isArray(document.items) ? document.items : [];
    invoiceItems.forEach((item, i) => {
      const itemSubTotal = Number(item.sub_total || (Number(item.qty || 1) * Number(item.unit_value || 0))).toFixed(2);
      pdfRow(pdf, curY, L, cols, [
        i + 1,
        item.product_name || "Product",
        item.hs_code || document.hs_code || "N/A",
        item.country_of_origin || document.country_of_origin || "India",
        `${item.qty || 1} ${item.uom || "PCS"}`,
        `$${Number(item.unit_value || 0).toFixed(2)}`,
        `$${itemSubTotal}`,
        (Number(item.unit_net_weight || 0) * 1000).toFixed(2),
      ], itemH, false, ["center", "left", "center", "center", "center", "right", "right", "right"]);
      curY += itemH;
    });

    // 2 empty filler rows
    pdfRow(pdf, curY, L, cols, ["", "", "", "", "", "", "", ""], itemH - 4, false); curY += itemH - 4;
    pdfRow(pdf, curY, L, cols, ["", "", "", "", "", "", "", ""], itemH - 4, false); curY += itemH - 4;

    // ── Compliance + Totals ───────────────────────────────────────────────────
    curY += 4;
    pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000")
      .text("OTHER INFORMATION AND COMPLIANCE DETAILS:", L, curY);
    curY += 10;

    const compBoxW = 305;
    const compBoxH = 40;
    pdf.rect(L, curY, compBoxW, compBoxH).stroke();
    pdf.font("Helvetica").fontSize(7).fillColor("#000000")
      .text(complianceText, L + 4, curY + 5, { width: compBoxW - 8 });

    const currency    = document.currency_code || "USD";
    const goodsVal    = Number(document.total_goods_value || 0).toFixed(2);
    const weightGrams = (Number(document.total_net_weight_kg || 0) * 1000).toFixed(2);
    const totalsX     = L + compBoxW + 10;
    const totalsW     = W - compBoxW - 10;

    pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#000000");
    pdf.text("No. of Packages",   totalsX,                  curY + 3,  { width: totalsW * 0.6 });
    pdf.text(pdfValue(document.no_of_packages || "1"),
             totalsX + totalsW * 0.6, curY + 3,  { width: totalsW * 0.4, align: "right" });
    pdf.text("Total Goods Value", totalsX,                  curY + 16, { width: totalsW * 0.6 });
    pdf.text(`${currency} ${goodsVal}`,
             totalsX + totalsW * 0.6, curY + 16, { width: totalsW * 0.4, align: "right" });
    pdf.text("Total Weight (g)",  totalsX,                  curY + 29, { width: totalsW * 0.6 });
    pdf.text(`${weightGrams}`,
             totalsX + totalsW * 0.6, curY + 29, { width: totalsW * 0.4, align: "right" });

    curY += compBoxH + 6;

    // Tax / totals lines
    const hasTax   = document.tax_type || Number(document.tax_rate) > 0;
    const taxRate  = Number(document.tax_rate  || 0).toFixed(2);
    const taxAmt   = Number(document.tax_amount || 0).toFixed(2);
    const finalVal = Number(document.final_total_amount || document.total_goods_value || 0).toFixed(2);
    const wordsVal = document.total_amount_words || numberToWords(finalVal, currency);

    pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#000000");
    if (hasTax) {
      pdf.text(`Tax (${document.tax_type || "Tax"} @ ${taxRate}%): ${currency} ${taxAmt}`,
               L, curY, { width: W, align: "right" });
      curY += 10;
    }
    pdf.text(`Final Total Amount: ${currency} ${finalVal}`, L, curY, { width: W, align: "right" });
    curY += 10;
    pdf.font("Helvetica-BoldOblique").fontSize(7.5)
      .text(`Amount in Words: ${wordsVal}`, L, curY, { width: W });
    curY += 12;

    // Certify
    pdf.font("Helvetica").fontSize(7).fillColor("#000000")
      .text("I/We certify the information on this invoice is true and correct and that the contents of this shipment are as stated above.",
            L, curY, { width: W });
    bodyBottomY = curY + 10;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SIGNATURE FOOTER (shared across all 3 document types) ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // Avoid the fixed footer position that left a large blank band on short
  // documents and could collide with longer ones.  Keep a modest, consistent
  // separation while reserving the A4 bottom margin.
  const sigY = Math.min(bodyBottomY + 20, 780);
  pdf.font("Helvetica-Bold").fontSize(7.5).fillColor("#000000").text("Signature:",        L, sigY);
  pdf.moveTo(L + 80, sigY + 8).lineTo(R - 80, sigY + 8).stroke();

  pdf.font("Helvetica-Bold").text("Name:",              L, sigY + 18);
  pdf.font("Helvetica").text(signatoryName,             L + 80, sigY + 18, { width: R - L - 160 });
  pdf.moveTo(L + 80, sigY + 26).lineTo(R - 80, sigY + 26).stroke();

  pdf.font("Helvetica-Bold").text("Designation/Title:", L, sigY + 36);
  pdf.font("Helvetica").text(signatoryDesig,            L + 80, sigY + 36, { width: R - L - 160 });
  pdf.moveTo(L + 80, sigY + 44).lineTo(R - 80, sigY + 44).stroke();

  pdf.end();
  return finished;
}

export async function emailInvoice(document) {
  // Saving details must not generate or deliver a document. PDFs are only created by the PDF action.
  return undefined;
}
