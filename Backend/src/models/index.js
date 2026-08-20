import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

export const AdminUser = sequelize.define("AdminUser", {
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true },
  },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM("admin", "staff"),
    allowNull: false,
    defaultValue: "admin",
  },
  refresh_token: DataTypes.TEXT,
});
export const Product = sequelize.define("Product", {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  website_link: DataTypes.STRING,
  image: DataTypes.TEXT,
  images: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  slug: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
});
export const ContactSubmission = sequelize.define("ContactSubmission", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true },
  },
  address: DataTypes.TEXT,
  postal_code: DataTypes.STRING,
  requirement_details: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM("New", "Responded"), defaultValue: "New" },
});
export const SiteSetting = sequelize.define("SiteSetting", {
  key: { type: DataTypes.STRING, unique: true, allowNull: false },
  value: { type: DataTypes.TEXT, allowNull: false },
});
export const ExportDocument = sequelize.define("ExportDocument", {
  invoice_no: { type: DataTypes.STRING, allowNull: false, unique: true },
  shipment_date: DataTypes.DATEONLY,
  shipment_ref_no: DataTypes.STRING,
  reason_for_export: DataTypes.STRING,
  type_of_export: DataTypes.STRING,
  export_license_no: DataTypes.STRING,
  import_license_no: DataTypes.STRING,
  incoterms: DataTypes.STRING,
  currency_code: { type: DataTypes.STRING, defaultValue: "USD" },
  payment_method: DataTypes.STRING,
  importer_name: { type: DataTypes.STRING, allowNull: false },
  importer_address: DataTypes.TEXT,
  importer_contact: DataTypes.STRING,
  importer_email: { type: DataTypes.STRING, validate: { isEmail: true } },
  importer_tax_id: DataTypes.STRING,
  no_of_packages: DataTypes.INTEGER,
  package_description: DataTypes.TEXT,
  total_goods_value: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  tax_type: { type: DataTypes.STRING, defaultValue: null },
  tax_rate: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  final_total_amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  total_amount_words: DataTypes.TEXT,
  total_net_weight_kg: { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
  total_net_weight_lbs: { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM("Draft", "Generated", "Closed"),
    defaultValue: "Draft",
  },
});
export const ExportDocumentItem = sequelize.define("ExportDocumentItem", {
  hs_code: DataTypes.STRING,
  product_name: { type: DataTypes.STRING, allowNull: false },
  country_of_origin: DataTypes.STRING,
  qty: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  uom: DataTypes.STRING,
  unit_value: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  sub_total: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  },
  unit_net_weight: { type: DataTypes.DECIMAL(14, 3), defaultValue: 0 },
});
export const ExportDocumentAudit = sequelize.define(
  "ExportDocumentAudit",
  {
    edited_field: { type: DataTypes.STRING, allowNull: false },
    old_value: DataTypes.TEXT,
    new_value: DataTypes.TEXT,
    edited_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { updatedAt: false },
);

Product.hasMany(ContactSubmission, { foreignKey: "source_product_id" });
ContactSubmission.belongsTo(Product, { foreignKey: "source_product_id" });
ExportDocument.hasMany(ExportDocumentItem, {
  foreignKey: "export_document_id",
  as: "items",
  onDelete: "CASCADE",
});
ExportDocumentItem.belongsTo(ExportDocument, {
  foreignKey: "export_document_id",
});
ExportDocument.hasMany(ExportDocumentAudit, {
  foreignKey: "export_document_id",
  as: "audits",
  onDelete: "CASCADE",
});
ExportDocumentAudit.belongsTo(ExportDocument, {
  foreignKey: "export_document_id",
});
AdminUser.hasMany(ExportDocumentAudit, { foreignKey: "edited_by" });
ExportDocumentAudit.belongsTo(AdminUser, {
  foreignKey: "edited_by",
  as: "editor",
});
