import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { pdfBufferFromDocument } from "../src/services/export-document.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(__dirname, "..", "test-output.pdf");

const baseDoc = {
  id: 1,
  invoice_no: "PI-2026-649",
  shipment_date: "2026-08-21",
  shipment_ref_no: "REF-001",
  reason_for_export: "Commercial",
  type_of_export: "Permanent",
  export_license_no: "N/A",
  import_license_no: "N/A",
  incoterms: "DAP",
  currency_code: "USD",
  payment_method: "Bank Transfer",
  awb_bl_no: "44",
  sender_name: "Saaluvesa Enterprises Private Limited",
  sender_address: "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459",
  sender_contact: "+91 94884 10884",
  sender_email: "info@saaluvesa.com",
  sender_tax_id: "33ABRCS3304A1ZR",
  additional_company_details: "C.I.N : U46900TZ2025PTC36041 | ROC COIMBATORE - REG. NO : 036041\nGST - 33ABRCS3304A1ZR | Import Export code - ABRCS3304A | ICEGATE ID - ABRCS3304APIE000",
  receiver_name: "Aswin",
  receiver_address: "Govind Apartments, Coimbatore, - 641048 India",
  receiver_contact: "7598154129",
  receiver_email: "saswin.sts@gmail.com",
  receiver_tax_id: "N/A",
  importer_name: "Aswin",
  importer_address: "Govind Apartments, Coimbatore, - 641048 India",
  importer_contact: "7598154129",
  importer_email: "saswin.sts@gmail.com",
  importer_tax_id: "N/A",
  tax_type: "GST",
  tax_rate: "18",
  tax_amount: "180.00",
  total_goods_value: "1000.00",
  final_total_amount: "1180.00",
  total_amount_words: "USD ONE THOUSAND ONE HUNDRED EIGHTY ONLY",
  total_net_weight_kg: "0.020",
  total_net_weight_lbs: "0.044",
  no_of_packages: "1",
  other_information_compliance_details: "Good Condition. Export cargo properly packaged and verified.",
  signatory_name: "Saaluvesa Enterprises Private Limited",
  signatory_designation: "Manager",
};

const nItems = Number(process.argv[2] || 8);
const docType = process.argv[3] || "proforma";
baseDoc.items = Array.from({ length: nItems }, (_, i) => ({
  product_name: `Product Item Number ${i + 1} With A Longer Description`,
  hs_code: "61091000",
  country_of_origin: "India",
  qty: 10 + i,
  uom: "PCS",
  unit_value: 100,
  sub_total: (1000 + i * 10),
  unit_net_weight: 0.002,
}));

const buf = await pdfBufferFromDocument(baseDoc, docType);
fs.writeFileSync(pdfPath, buf);

const data = new Uint8Array(fs.readFileSync(pdfPath));
const pdfdoc = await getDocument({ data }).promise;
console.log(`TYPE=${docType} ITEMS=${nItems} PAGES=${pdfdoc.numPages}`);
for (let p = 1; p <= pdfdoc.numPages; p++) {
  const page = await pdfdoc.getPage(p);
  const content = await page.getTextContent();
  const items = content.items
    .filter((i) => i.str.trim())
    .map((item) => ({
      text: item.str.trim(),
      x: Math.round(item.transform[4]),
      y: Math.round(item.transform[5]),
    }));
  const maxY = Math.max(...items.map((i) => i.y));
  const minY = Math.min(...items.map((i) => i.y));
  console.log(`Page ${p}: ${items.length} runs, top y=${maxY}, bottom y=${minY}, height=${page.view[3]}`);
  if (p > 1) {
    items.sort((a, b) => b.y - a.y || a.x - b.x).forEach((i) =>
      console.log(`  y=${i.y} x=${i.x} "${i.text}"`),
    );
  }
}
