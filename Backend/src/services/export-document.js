import PDFDocument from "pdfkit";
import {
  ExportDocument,
  ExportDocumentItem,
  SiteSetting,
} from "../models/index.js";
import { sendMail } from "./email.js";

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
  await document.update(
    {
      total_goods_value: goods.toFixed(2),
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
    if (y > 700) {
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
  pdf.y = y + 16;
  pdf
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(`No. of Packages: ${document.no_of_packages || "—"}`)
    .text(
      `Total Goods Value: ${document.currency_code || ""} ${document.total_goods_value}`,
    )
    .text(
      `Total Weight: ${document.total_net_weight_kg} KG / ${document.total_net_weight_lbs} LBS`,
    );
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
