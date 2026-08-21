/**
 * Generates a sample commercial-invoice PDF for layout verification.
 * Usage: node scripts/test-pdf-layout.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pdfBufferFromDocument } from "../src/services/export-document.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "test-output.pdf");

const mockDoc = {
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
  items: [{
    product_name: "T-shirt",
    hs_code: "61091000",
    country_of_origin: "India",
    qty: 10,
    uom: "PCS",
    unit_value: 100,
    sub_total: 1000,
    unit_net_weight: 0.002,
  }],
};

const buf = await pdfBufferFromDocument(mockDoc, "proforma");
fs.writeFileSync(outPath, buf);
console.log("Wrote", outPath, "size:", buf.length);
