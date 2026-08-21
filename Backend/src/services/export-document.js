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
  pdf.moveTo(38, y).lineTo(555, y).stroke("#07105b");
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
    pdf.moveTo(38, y).lineTo(555, y).stroke("#07105b");
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
// Centralised so every height calculation and draw call use identical numbers,
// preventing text overlap — especially around "Payment Method" (last row in
// Shipment Details) and the box borders beneath each column.
// Kept tight so a typical document fits one A4 page at natural size; anything
// longer is handled by the uniform scale-to-fit pass in pdfBufferFromDocument.
const SECTION_HEADER_H = 14;   // grey title bar height
const SECTION_TOP_PAD = 3;     // gap between a sub-header bar and the first field
const SECTION_ROW_BOTTOM_PAD = 4;  // gap below fields in the upper row of General Info
const SECTION_BOTTOM_PAD = 5; // gap below the LAST field before the outer box border
const FIELD_GAP = 2.2;           // vertical gap between stacked label/value rows
const FIELD_TOP_PAD = 1.2;       // inset from the top of each field row
const BASE_FONT = 6.8;         // base field font size
const BLOCK_GAP = 5;           // gap between major sections (meta → grid, grid → table, etc.)
const CELL_FONT = 6.9;         // table header / cell font size
const CELL_PAD_X = 3.5;          // horizontal inset inside table cells
const ROW_PAD_V = 2.5;         // vertical padding above + below text in each cell
const PAGE_CONTENT_BOTTOM = 818; // lowest Y (top-down) any body content may occupy
const SIGNATURE_GAP = 6;       // clear air between body content and signature block
const SINGLE_PAGE_BOTTOM_LIMIT = 832; // when scaling, content may reach at most this Y

// Natural height a table row needs so every cell's wrapped text fits fully.
function pdfMeasureRow(pdf, columns, values, minHeight = 17, isHeader = false) {
  let contentH = 0;
  columns.forEach((width, i) => {
    const val = values[i];
    if (val === undefined || val === null || String(val) === "") return;
    pdf.font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(CELL_FONT);
    contentH = Math.max(
      contentH,
      pdf.heightOfString(String(val), { width: width - CELL_PAD_X * 2, lineGap: 1.3 }),
    );
  });
  return Math.max(minHeight, contentH + ROW_PAD_V * 2);
}

function pdfTextHeight(pdf, text, width, font, fontSize) {
  pdf.font(font).fontSize(fontSize);
  return pdf.heightOfString(pdfValue(text), { width, lineGap: 1.4 });
}

// Draw a bordered table row. The row auto-expands to fit its tallest cell and
// cell text is vertically centred, so multi-line headers/values are never cut
// off or touching the borders. Returns the actual row height used.
function pdfRow(pdf, y, startX, columns, values, height, isHeader = false, aligns = []) {
  const rowH = pdfMeasureRow(pdf, columns, values, height, isHeader);
  let x = startX;
  columns.forEach((width, i) => {
    const val = values[i] === undefined || values[i] === null ? "" : String(values[i]);
    const align = aligns[i] || (isHeader ? "center" : "left");
    if (isHeader) {
      pdf.rect(x, y, width, rowH).fillAndStroke("#eaeee7", "#0b0f2b");
    } else {
      pdf.rect(x, y, width, rowH).stroke("#07105b");
    }
    if (val) {
      pdf.fillColor("#0b0f2b")
        .font(isHeader ? "Helvetica-Bold" : "Helvetica").fontSize(CELL_FONT);
      const textH = pdf.heightOfString(val, { width: width - CELL_PAD_X * 2, lineGap: 1.3 });
      pdf.text(val, x + CELL_PAD_X, y + (rowH - textH) / 2, {
        width: width - CELL_PAD_X * 2,
        align,
        lineGap: 1.3,
      });
    }
    x += width;
  });
  return rowH;
}

// Height a single "Label: Value" row needs, given the label column width.
// A generous fixed buffer is added on top of the raw text metrics so that
// descenders / line-height rounding never causes the next row (or the box
// border) to sit on top of the text — this is what keeps rows like
// "Payment Method" clearly separated from the box edge below them.
function pdfFieldHeight(pdf, label, value, width, labelWidth, fontSize = BASE_FONT) {
  pdf.font("Helvetica-Bold").fontSize(fontSize);
  const labelHeight = pdf.heightOfString(label, { width: labelWidth - 6, lineGap: 1.3 });
  pdf.font("Helvetica").fontSize(fontSize);
  const valueHeight = pdf.heightOfString(pdfValue(value), { width: width - labelWidth - 8, lineGap: 1.3 });
  return Math.max(labelHeight, valueHeight, fontSize * 1.5) + 3.2;
}

function pdfField(pdf, label, value, x, y, width, labelWidth, fontSize = BASE_FONT, height) {
  const fieldHeight = height || pdfFieldHeight(pdf, label, value, width, labelWidth, fontSize);
  const textY = y + FIELD_TOP_PAD;
  const textH = fieldHeight - FIELD_TOP_PAD - 0.8;
  pdf.font("Helvetica-Bold").fontSize(fontSize).fillColor("#0b0f2b")
    .text(label, x + 4, textY, { width: labelWidth - 6, height: textH, lineGap: 1.3 });
  pdf.font("Helvetica").fontSize(fontSize)
    .text(pdfValue(value), x + labelWidth, textY, {
      width: width - labelWidth - 8,
      height: textH,
      lineGap: 1.3,
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
  pdf.rect(x, y, leftW, boxH).stroke("#07105b");
  pdf.rect(x + leftW, y, rightW, boxH).stroke("#07105b");

  // Header bars
  pdf.rect(x, y, leftW, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text(titles[0], x, y + 4, { width: leftW, align: "center" });
  pdf.rect(x + leftW, y, rightW, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text(titles[1], x + leftW, y + 4, { width: rightW, align: "center" });

  // Field rows
  const fieldsTopY = y + SECTION_HEADER_H + SECTION_TOP_PAD;
  drawFieldColumn(pdf, fieldColumns[0], x, fieldsTopY, leftW, leftLabelW, fontSize);
  drawFieldColumn(pdf, fieldColumns[1], x + leftW, fieldsTopY, rightW, rightLabelW, fontSize);

  return y + boxH;
}

// Draws the full "General Information" block used on commercial/proforma invoices:
// one outer border, a top "General Information" bar, then two stacked two-column
// rows (Sender|Shipment, Receiver|Importer).  Sharing one outer box and sizing
// each row independently prevents the Payment Method row from colliding with the
// Receiver Details header below it.
function drawGeneralInformationBlock(pdf, {
  x, y, width, halfW, rightW,
  row1Titles, row1Columns, row1LabelWidths,
  row2Titles, row2Columns, row2LabelWidths,
  fontSize = BASE_FONT,
}) {
  const measureRow = (fields, colW, labelW) =>
    measureFieldColumn(pdf, fields, colW, labelW, fontSize);

  const row1LeftH  = measureRow(row1Columns[0], halfW, row1LabelWidths[0]);
  const row1RightH = measureRow(row1Columns[1], rightW, row1LabelWidths[1]);
  const row1ContentH = Math.max(row1LeftH, row1RightH);

  const row2LeftH  = measureRow(row2Columns[0], halfW, row2LabelWidths[0]);
  const row2RightH = measureRow(row2Columns[1], rightW, row2LabelWidths[1]);
  const row2ContentH = Math.max(row2LeftH, row2RightH);

  const row1H = SECTION_HEADER_H + SECTION_TOP_PAD + row1ContentH + SECTION_ROW_BOTTOM_PAD;
  const row2H = SECTION_HEADER_H + SECTION_TOP_PAD + row2ContentH + SECTION_BOTTOM_PAD;
  const totalH = SECTION_HEADER_H + row1H + row2H;

  // Outer border
  pdf.rect(x, y, width, totalH).stroke("#07105b");

  // "General Information" top bar
  pdf.rect(x, y, width, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text("General Information", x, y + 4, { width, align: "center" });

  // ── Row 1: Sender Details | Shipment Details ──
  const row1Y = y + SECTION_HEADER_H;
  pdf.moveTo(x, row1Y + row1H).lineTo(x + width, row1Y + row1H).stroke("#07105b");
  pdf.moveTo(x + halfW, row1Y).lineTo(x + halfW, row1Y + row1H).stroke("#07105b");

  pdf.rect(x, row1Y, halfW, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text(row1Titles[0], x, row1Y + 4, { width: halfW, align: "center" });
  pdf.rect(x + halfW, row1Y, rightW, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text(row1Titles[1], x + halfW, row1Y + 4, { width: rightW, align: "center" });

  const row1FieldsY = row1Y + SECTION_HEADER_H + SECTION_TOP_PAD;
  drawFieldColumn(pdf, row1Columns[0], x, row1FieldsY, halfW, row1LabelWidths[0], fontSize);
  drawFieldColumn(pdf, row1Columns[1], x + halfW, row1FieldsY, rightW, row1LabelWidths[1], fontSize);

  // ── Row 2: Receiver Details | Importer of Record Details ──
  const row2Y = row1Y + row1H;
  pdf.moveTo(x + halfW, row2Y).lineTo(x + halfW, row2Y + row2H).stroke("#07105b");

  pdf.rect(x, row2Y, halfW, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text(row2Titles[0], x, row2Y + 4, { width: halfW, align: "center" });
  pdf.rect(x + halfW, row2Y, rightW, SECTION_HEADER_H).fillAndStroke("#eaeee7", "#0b0f2b");
  pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(8)
    .text(row2Titles[1], x + halfW, row2Y + 4, { width: rightW, align: "center" });

  const row2FieldsY = row2Y + SECTION_HEADER_H + SECTION_TOP_PAD;
  drawFieldColumn(pdf, row2Columns[0], x, row2FieldsY, halfW, row2LabelWidths[0], fontSize);
  drawFieldColumn(pdf, row2Columns[1], x + halfW, row2FieldsY, rightW, row2LabelWidths[1], fontSize);

  return y + totalH;
}

// Draws the company header (title + logo + company info in dashed border).
// Returns the Y coordinate below the header box where body content starts.
function pdfCompanyHeader(pdf, document, title) {
  const logoPath = fileURLToPath(new URL("../../../admin/public/favicon.jpeg", import.meta.url));
  const L = 38;
  const R = 557;
  const W = 519;

  // Keep the document identity compact and separate from the form fields below.
  pdf.font("Helvetica-Bold").fontSize(13).fillColor("#0b0f2b")
    .text(title, L, 10, { width: W, align: "center" });

  const boxTop = 28;
  const logoSize = 48;
  const textX = L + logoSize + 14;
  const textW = R - textX - 6;
  const companyName = document.sender_name ||
    "Saaluvesa Enterprises Private Limited";
  const companyAddr = document.sender_address ||
    "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459";
  const regDetails = document.additional_company_details ||
    "C.I.N : U46900TZ2025PTC36041 | ROC COIMBATORE - REG. NO : 036041\nGST - 33ABRCS3304A1ZR | Import Export code - ABRCS3304A | ICEGATE ID - ABRCS3304APIE000";
  const companyNameHeight = pdfTextHeight(pdf, companyName, textW, "Helvetica-Bold", 10.5);
  const companyAddressHeight = pdfTextHeight(pdf, companyAddr, textW, "Helvetica", 6.8);
  const registrationHeight = pdfTextHeight(pdf, regDetails, textW, "Helvetica-Bold", 6.2);
  const boxHeight = Math.max(
    logoSize + 10,
    companyNameHeight + companyAddressHeight + registrationHeight + 18,
  );
  pdf.rect(L, boxTop, W, boxHeight).dash(3, { space: 3 }).stroke("#0b0f2b").undash();

  if (fs.existsSync(logoPath)) {
    pdf.image(logoPath, L + 6, boxTop + Math.max(5, (boxHeight - logoSize) / 2), { fit: [logoSize, logoSize] });
  }

  let ty = boxTop + 7;
  pdf.font("Helvetica-Bold").fontSize(10.5).fillColor("#0b0f2b")
    .text(companyName, textX, ty, { width: textW, height: companyNameHeight, lineGap: 1.2 });
  ty += companyNameHeight + 4;
  pdf.font("Helvetica").fontSize(6.8).fillColor("#0b0f2b")
    .text(companyAddr, textX, ty, { width: textW, height: companyAddressHeight, lineGap: 1.2 });
  ty += companyAddressHeight + 4;
  pdf.font("Helvetica-Bold").fontSize(6.2).fillColor("#0b0f2b")
    .text(regDetails, textX, ty, { width: textW, height: registrationHeight, lineGap: 1.2 });

  return boxTop + boxHeight; // Y where body starts
}

export async function pdfBuffer(documentId, documentType = "proforma") {
  const document = await ExportDocument.findByPk(documentId, { include: { model: ExportDocumentItem, as: "items" } });
  if (!document) throw new Error("Export document not found");
  return pdfBufferFromDocument(document, documentType);
}

// Builds the export document PDF.
//  - probe mode: renders onto a tall scratch page with pagination disabled and
//    reports the natural (unscaled) bottom Y of the complete document.
//  - final mode: renders onto a real A4 page, uniformly pre-scaled when needed
//    so the entire document is guaranteed to land on exactly one page.
async function buildExportPdf(document, documentType, { probe = false, scale = 1, naturalBottom = 0 }) {
  const pdf = new PDFDocument({
    size: probe ? [595.28, 14000] : "A4",
    margin: 0,
    autoFirstPage: true,
  });
  const chunks = [];
  pdf.on("data", (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks))));

  if (!probe && scale < 1) {
    // The uniform scale shrinks every drawn element, but pdfkit's internal
    // line-wrapper still compares UNSCALED y positions against the page's
    // logical bottom and would silently insert extra pages. Widening the
    // bottom margin disables that check; the CTM scale alone decides where
    // content visually lands, keeping the output to exactly one A4 page.
    pdf.page.margins.bottom = -20000;
    pdf.save();
    pdf.scale(scale, scale);
    // Centre the shrunken document on the page instead of pinning it to the
    // top-left corner.
    const tx = (595.28 * (1 - scale)) / 2;
    const ty = Math.max(0, (841.89 - scale * naturalBottom) / 2);
    pdf.translate(tx, ty);
  }

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
  const metaY = headerBotY + BLOCK_GAP;
  let bodyBottomY = metaY;

  if (packing) {
    // ══════════════════════════════════════════════════════════════════════════
    // ── PACKING LIST ─────────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    // Right-side meta block — each line advances by its measured height so a
    // long value that wraps can never overlap the line beneath it.
    pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#0b0f2b");
    const packingMetaLines = [
      `Page:  1 of 1`,
      `Date: ${formatDocDate(document.shipment_date)}`,
      `Invoice Number: ${pdfValue(document.invoice_no)}`,
      `SHIPMENT DATE: ${formatDocDate(document.shipment_date)}`,
    ];
    let metaCurY = metaY;
    packingMetaLines.forEach((line) => {
      const lineH = pdfTextHeight(pdf, line, W, "Helvetica-Bold", 7.2);
      pdf.text(line, L, metaCurY, { width: W, align: "right" });
      metaCurY += lineH + 2;
    });

    // Invoice No row + Invoice Date / File Number
    const refY = metaCurY + 6;
    pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#0b0f2b")
      .text(`Invoice No:  ${pdfValue(document.shipment_ref_no || document.invoice_no)}`, L, refY, { width: 230 });
    pdf.moveTo(L, refY + 11).lineTo(L + 220, refY + 11).stroke("#07105b");
    pdf.text(`Invoice Date:  ${formatDocDate(document.shipment_date)}`, L, refY,      { width: W, align: "right" });
    pdf.text(`File Number:  ${pdfValue(document.file_number)}`,         L, refY + 11, { width: W, align: "right" });

    // ── SHIPPER / CONSIGNEE / BILL TO ────────────────────────────────────────
    const partyY    = refY + 22;
    const colW      = Math.floor(W / 3);        // 173
    const partyHdrH = SECTION_HEADER_H;
    const parties = [
      [senderName,   senderAddress],
      [receiverName, receiverAddress],
      [importerName, importerAddress],
    ];
    const partyMetrics = parties.map(([name, addr], i) => {
      const cw = i === 2 ? W - colW * 2 : colW;
      return {
        cw,
        nameH: pdfTextHeight(pdf, name, cw - 8, "Helvetica-Bold", 7.2),
        addrH: pdfTextHeight(pdf, addr, cw - 8, "Helvetica", 6.8),
      };
    });
    const partyBodyH = Math.max(
      ...partyMetrics.map((m) => m.nameH + m.addrH + 16),
      46,
    );

    pdfRow(pdf, partyY, L, [colW, colW, W - colW * 2], ["SHIPPER", "CONSIGNEE", "BILL TO"], partyHdrH, true);

    // One continuous cell per column (name bold, address normal). The address
    // starts below the measured name height so wrapped names never overlap it.
    parties.forEach(([name, addr], i) => {
      const cx = L + i * colW;
      const cw = i === 2 ? W - colW * 2 : colW;
      const by = partyY + partyHdrH;
      const m = partyMetrics[i];
      pdf.rect(cx, by, cw, partyBodyH).stroke("#07105b");
      pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#0b0f2b")
        .text(name, cx + 4, by + 6, { width: cw - 8, height: m.nameH + 2, lineGap: 1.4 });
      pdf.font("Helvetica").fontSize(6.8).fillColor("#0b0f2b")
        .text(addr, cx + 4, by + 6 + m.nameH + 5, {
          width: cw - 8,
          height: m.addrH + 2,
          lineGap: 1.4,
        });
    });

    // ── SHIPMENT INFORMATION ─────────────────────────────────────────────────
    const siY    = partyY + partyHdrH + partyBodyH + 5;
    const siHdrH = SECTION_HEADER_H;
    const halfW  = Math.floor(W / 2);   // 259

    pdf.rect(L, siY, W, siHdrH).fillAndStroke("#eaeee7", "#0b0f2b");
    pdf.fillColor("#0b0f2b").font("Helvetica-Bold").fontSize(7.4)
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
      pdfFieldHeight(pdf, entry[0], entry[1], halfW, 108, 6.8),
      rightSI[i] ? pdfFieldHeight(pdf, rightSI[i][0], rightSI[i][1], W - halfW, 122, 6.8) : 0,
      16,
    ));

    leftSI.forEach((entry, i) => {
      const ry = siY + siHdrH + siRowHeights.slice(0, i).reduce((sum, height) => sum + height, 0);
      pdf.rect(L, ry, halfW, siRowHeights[i]).stroke("#07105b");
      pdfField(pdf, entry[0], entry[1], L, ry + 3, halfW, 108, 6.8, siRowHeights[i] - 3);
    });
    rightSI.forEach((entry, i) => {
      const ry = siY + siHdrH + siRowHeights.slice(0, i).reduce((sum, height) => sum + height, 0);
      pdf.rect(L + halfW, ry, W - halfW, siRowHeights[i]).stroke("#07105b");
      pdfField(pdf, entry[0], entry[1], L + halfW, ry + 3, W - halfW, 122, 6.8, siRowHeights[i] - 3);
    });
    const siTotalH = siRowHeights.reduce((sum, height) => sum + height, 0);
    for (let i = rightSI.length; i < siRowHeights.length; i++) {
      const emptyY = siY + siHdrH + siRowHeights.slice(0, i)
        .reduce((sum, height) => sum + height, 0);
      pdf.rect(L + halfW, emptyY, W - halfW, siRowHeights[i]).stroke("#07105b");
    }

    // ── ITEMS TABLE ──────────────────────────────────────────────────────────
    let curY = siY + siHdrH + siTotalH + 7;
    const cols  = [32, 56, 210, 78, 95, 48];
    const itemH = 16;
    const packingHeadValues = ["NOs", "QUANTITY", "DESCRIPTION", "HSN CODE", "NET WEIGHT IN\nGRAMS", "UNIT"];
    const drawPackingHeader = () =>
      pdfRow(pdf, curY, L, cols, packingHeadValues, 23, true);
    curY += drawPackingHeader();

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
      const rowHeight = pdfMeasureRow(pdf, cols, values, itemH);
      pdfRow(pdf, curY, L, cols, values, rowHeight, false, ["center", "center", "left", "center", "right", "center"]);
      curY += rowHeight;
    });

    // 2 filler rows matching reference (N/A in each cell)
    const fillerValues = ["N/A", "N/A", "N/A", "N/A", "N/A", "N/A"];
    for (let n = 0; n < 2; n++) {
      if (curY + itemH > PAGE_CONTENT_BOTTOM) break;
      pdfRow(pdf, curY, L, cols, fillerValues, itemH, false);
      curY += itemH;
    }

    // ── TOTALS TABLE ─────────────────────────────────────────────────────────
    curY += 7;
    pdf.font("Helvetica-Bold").fontSize(7.4).fillColor("#0b0f2b")
      .text("TOTAL:", L, curY, { width: W, align: "right" });
    curY += 11;

    const totalCols   = [75, 115, 82, 80];
    const totalStartX = R - totalCols.reduce((a, b) => a + b, 0);
    curY += pdfRow(pdf, curY, totalStartX, totalCols,
      ["NO.\nPKGS", "TOTAL GROSS\nWEIGHT\nGRAMS", "NET WEIGHT\nLBS", "NET WEIGHT\nKGS"],
      25, true);
    curY += pdfRow(pdf, curY, totalStartX, totalCols, [
      pdfValue(document.no_of_packages || "1"),
      (Number(document.total_net_weight_kg || 0) * 1000).toFixed(0),
      document.total_net_weight_lbs || "0",
      document.total_net_weight_kg  || "0",
    ], 15, false, ["center", "center", "center", "center"]);
    curY += 5;

    // ── PACKAGE DESCRIPTION ──────────────────────────────────────────────────
    pdf.font("Helvetica-Bold").fontSize(7.4).fillColor("#0b0f2b")
      .text("PACKAGE DESCRIPTION:", L, curY);
    curY += 11;
    const packageDescriptionHeight = Math.max(22, pdfTextHeight(pdf, document.package_description, W - 8, "Helvetica", 6.8) + 10);
    pdf.rect(L, curY, W, packageDescriptionHeight).stroke("#07105b");
    pdf.font("Helvetica").fontSize(6.8).fillColor("#0b0f2b")
      .text(pdfValue(document.package_description), L + 4, curY + 5, {
        width: W - 8,
        height: packageDescriptionHeight - 10,
        lineGap: 1.3,
      });
    bodyBottomY = curY + packageDescriptionHeight;

  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // ── COMMERCIAL / PROFORMA INVOICE ────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════════════

    // Meta line: Date (left) | Invoice Number (center) | AWB (right).
    // Each item gets its own third of the width so long values wrap inside
    // their zone instead of colliding with the neighbours. The measured block
    // height decides where the General Information grid starts, so wrapped
    // meta lines can never run into it.
    const metaZoneW = W / 3;
    const metaDate = `Date: ${formatDocDate(document.shipment_date)}`;
    const metaInvoiceNo = `Invoice Number: ${pdfValue(document.invoice_no)}`;
    const metaAwb = `Air Waybill Number: ${pdfValue(document.awb_bl_no)}`;
    const metaH = Math.max(
      pdfTextHeight(pdf, metaDate, metaZoneW, "Helvetica-Bold", 7.4),
      pdfTextHeight(pdf, metaInvoiceNo, metaZoneW, "Helvetica-Bold", 7.4),
      pdfTextHeight(pdf, metaAwb, metaZoneW, "Helvetica-Bold", 7.4),
    );
    pdf.font("Helvetica-Bold").fontSize(7.4).fillColor("#0b0f2b");
    pdf.text(metaDate, L, metaY, { width: metaZoneW });
    pdf.text(metaInvoiceNo, L + metaZoneW, metaY, { width: metaZoneW, align: "center" });
    pdf.text(metaAwb, L + metaZoneW * 2, metaY, { width: metaZoneW, align: "right" });

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
    const receiverFields = [
      ["Name:", receiverName], ["Address:", receiverAddress], ["Contact Number:", receiverContact],
      ["Email:", receiverEmail], ["Tax ID No.:", receiverTaxId],
    ];
    const importerFields = [
      ["Name:", importerName], ["Address:", importerAddress], ["Contact Number:", importerContact],
      ["Email:", importerEmail], ["Tax ID No.:", importerTaxId],
    ];

    const halfW  = Math.floor(W / 2);   // 259
    const rightW = W - halfW;
    const gridY  = metaY + metaH + 4;
    const gridBottom = drawGeneralInformationBlock(pdf, {
      x: L, y: gridY, width: W, halfW, rightW,
      row1Titles: ["Sender Details", "Shipment Details"],
      row1Columns: [senderFields, shipmentFields],
      row1LabelWidths: [88, 124],
      row2Titles: ["Receiver Details", "Importer of Record Details"],
      row2Columns: [receiverFields, importerFields],
      row2LabelWidths: [88, 88],
      fontSize: BASE_FONT,
    });

    // ── Items Table ───────────────────────────────────────────────────────────
    let curY = gridBottom + BLOCK_GAP;
    const cols  = [22, 148, 52, 51, 48, 52, 54, 44, 48];
    const itemH = 16;
    const fillerH = 13;
    const itemHeadValues = [
      "No.", "Item Description", "HS Code", "Country of\nOrigin",
      "Qty UOM", "Unit Value", "Sub-Total\nValue", "Unit Net\nWeight", "Net Weight\n(g)",
    ];
    const drawItemHeader = () =>
      pdfRow(pdf, curY, L, cols, itemHeadValues, 21, true);
    curY += drawItemHeader();

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
        (Number(item.qty || 1) * Number(item.unit_net_weight || 0) * 1000).toFixed(2),
      ];
      const rowHeight = pdfMeasureRow(pdf, cols, values, itemH);
      pdfRow(pdf, curY, L, cols, values, rowHeight, false, ["center", "left", "center", "center", "center", "right", "right", "right", "right"]);
      curY += rowHeight;
    });

    // 2 empty filler rows
    const emptyValues = ["", "", "", "", "", "", "", "", ""];
    for (let n = 0; n < 2; n++) {
      if (curY + fillerH > PAGE_CONTENT_BOTTOM) break;
      pdfRow(pdf, curY, L, cols, emptyValues, fillerH, false);
      curY += fillerH;
    }

    // ── Compliance + Totals ───────────────────────────────────────────────────
    curY += BLOCK_GAP;
    pdf.font("Helvetica-Bold").fontSize(7.4).fillColor("#0b0f2b")
      .text("OTHER INFORMATION AND COMPLIANCE DETAILS:", L, curY);
    curY += 9;

    const compBoxW = 300;
    const compBoxH = Math.max(30, pdfTextHeight(pdf, complianceText, compBoxW - 8, "Helvetica", 6.8) + 11);
    pdf.rect(L, curY, compBoxW, compBoxH).stroke("#07105b");
    pdf.font("Helvetica").fontSize(6.8).fillColor("#0b0f2b")
      .text(complianceText, L + 5, curY + 5, {
        width: compBoxW - 10,
        height: compBoxH - 10,
        lineGap: 1.3,
      });

    const currency    = document.currency_code || "USD";
    const goodsVal    = Number(document.total_goods_value || 0).toFixed(2);
    const weightGrams = (Number(document.total_net_weight_kg || 0) * 1000).toFixed(2);
    const totalsX     = L + compBoxW + 12;
    const totalsW     = W - compBoxW - 12;
    const totalsLineH = 12;

    pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#0b0f2b");
    pdf.text("No. of Packages",   totalsX, curY + 3,  { width: totalsW * 0.62 });
    pdf.text(pdfValue(document.no_of_packages || "1"),
             totalsX + totalsW * 0.62, curY + 3,  { width: totalsW * 0.38, align: "right" });
    pdf.text("Total Goods Value", totalsX, curY + 3 + totalsLineH, { width: totalsW * 0.62 });
    pdf.text(`${currency} ${goodsVal}`,
             totalsX + totalsW * 0.62, curY + 3 + totalsLineH, { width: totalsW * 0.38, align: "right" });
    pdf.text("Total Weight (g)",  totalsX, curY + 3 + totalsLineH * 2, { width: totalsW * 0.62 });
    pdf.text(`${weightGrams}`,
             totalsX + totalsW * 0.62, curY + 3 + totalsLineH * 2, { width: totalsW * 0.38, align: "right" });

    curY += compBoxH + 7;

    // Tax / totals lines — right-aligned, clearly spaced
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
    const taxTypeLabel = document.tax_type || "Tax";
    const taxLineLabel = taxRateValue > 0
      ? `Tax (${taxTypeLabel} @ ${taxRate}%): ${currency} ${taxAmt}`
      : `${taxTypeLabel}: ${currency} ${taxAmt}`;

    pdf.font("Helvetica-Bold").fontSize(7.4).fillColor("#0b0f2b");
    if (taxRateValue > 0 || taxAmountValue > 0) {
      pdf.text(taxLineLabel, L, curY, { width: W, align: "right" });
      curY += 11;
    }
    pdf.text(`Final Total Amount: ${currency} ${finalVal}`, L, curY, { width: W, align: "right" });
    curY += 11;

    const wordsHeight = pdfTextHeight(pdf, `Amount in Words: ${wordsVal}`, W, "Helvetica-BoldOblique", 7.4);
    pdf.font("Helvetica-BoldOblique").fontSize(7.4)
      .text(`Amount in Words: ${wordsVal}`, L, curY, { width: W, lineGap: 1.3 });
    curY += wordsHeight + 5;

    // Certify
    const certifyText = "I/We certify the information on this invoice is true and correct and that the contents of this shipment are as stated above.";
    const certifyHeight = pdfTextHeight(pdf, certifyText, W, "Helvetica", 7);
    pdf.font("Helvetica").fontSize(7).fillColor("#0b0f2b")
      .text(certifyText, L, curY, { width: W, lineGap: 1.3 });
    bodyBottomY = curY + certifyHeight + 2;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SIGNATURE FOOTER (shared across all 3 document types) ───────────────────
  // ══════════════════════════════════════════════════════════════════════════════
  // No page-break fallback here: the scale-to-fit pass guarantees the whole
  // document (signature included) stays on a single physical page.
  const sigY = bodyBottomY + SIGNATURE_GAP;
  const signatureWidth = R - L - 160;
  const signatureNameHeight = pdfTextHeight(pdf, signatoryName, signatureWidth, "Helvetica", 7.2);
  const signatureDesignationHeight = pdfTextHeight(pdf, signatoryDesig, signatureWidth, "Helvetica", 7.2);
  pdf.font("Helvetica-Bold").fontSize(7.2).fillColor("#0b0f2b").text("Signature:", L, sigY);
  pdf.moveTo(L + 80, sigY + 9).lineTo(R - 80, sigY + 9).stroke("#07105b");

  const nameY = sigY + 15;
  pdf.font("Helvetica-Bold").text("Name:", L, nameY);
  pdf.font("Helvetica").text(signatoryName, L + 80, nameY, { width: signatureWidth, height: signatureNameHeight, lineGap: 1.3 });
  const designationY = nameY + signatureNameHeight + 5;
  pdf.moveTo(L + 80, designationY - 2).lineTo(R - 80, designationY - 2).stroke("#07105b");

  pdf.font("Helvetica-Bold").text("Designation/Title:", L, designationY);
  pdf.font("Helvetica").text(signatoryDesig, L + 80, designationY, { width: signatureWidth, height: signatureDesignationHeight, lineGap: 1.3 });
  pdf.moveTo(L + 80, designationY + signatureDesignationHeight + 5).lineTo(R - 80, designationY + signatureDesignationHeight + 5).stroke("#07105b");

  const bottomY = designationY + signatureDesignationHeight + 8;

  if (!probe && scale < 1) pdf.restore();
  pdf.end();
  return { buffer: await finished, bottomY };
}

export async function pdfBufferFromDocument(document, documentType = "proforma") {
  // Pass 1 — measure the natural, unscaled height of the complete document.
  const { bottomY: naturalBottom } = await buildExportPdf(document, documentType, { probe: true });

  // Pass 2 — render onto A4. Only when the natural layout would not fit a
  // single page is the whole document shrunk uniformly (fonts, tables and logo
  // scale together), so no content is ever dropped or split across pages.
  let scale = 1;
  if (naturalBottom > PAGE_CONTENT_BOTTOM) {
    scale = Math.max(0.35, Math.min(1, SINGLE_PAGE_BOTTOM_LIMIT / naturalBottom));
  }
  const { buffer } = await buildExportPdf(document, documentType, { scale, naturalBottom });
  return buffer;
}

export async function emailInvoice(document) {
  // Saving details must not generate or deliver a document. PDFs are only created by the PDF action.
  return undefined;
}