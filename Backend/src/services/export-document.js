import PDFDocument from "pdfkit";
import {
  ExportDocument,
  ExportDocumentItem,
  SiteSetting,
} from "../models/index.js";
import { sendMail } from "./email.js";

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
    (total, item) => total + Number(item.qty) * Number(item.unit_value),
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

export async function pdfBuffer(documentId) {
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
  pdf
    .fontSize(17)
    .font("Helvetica-Bold")
    .text("PROFORMA INVOICE", { align: "center" });
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
  pdf.moveDown();
  const xs = [38, 93, 150, 210, 245, 290, 350, 415, 480];
  const heads = [
    "Product",
    "HS Code",
    "Origin",
    "Qty",
    "UOM",
    "Unit Value",
    "Sub-Total",
    "Unit Wt.",
    "",
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
      item.unit_net_weight,
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

export async function emailInvoice(document) {
  if (!document.importer_email) return;
  const buffer = await pdfBuffer(document.id);
  await sendMail({
    to: document.importer_email,
    subject: `Proforma Invoice ${document.invoice_no}`,
    text: `Attached is your Proforma Invoice ${document.invoice_no}.`,
    attachments: [
      {
        filename: `${document.invoice_no}.pdf`,
        content: buffer,
        contentType: "application/pdf",
      },
    ],
  });
}
