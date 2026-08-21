import bcrypt from "bcryptjs";
import "../config/env.js";
import { sequelize } from "../config/database.js";
import { AdminUser, SiteSetting } from "../models/index.js";
if (process.env.DB_SYNC === "alter") {
  await sequelize.sync({ alter: true });
} else {
  await sequelize.sync();
}
const defaults = {
  office_name: "SAALUVESA ENTERPRISES PRIVATE LIMITED",
  office_address:
    "Dr.No.18/76, Thiru.Ve.Ka. St, Punjai Puliampatti, SATHYAMANGALAM, ERODE, TAMIL NADU. -638459",
  gst_number: "33ABRCS3304A1ZR",
  iec_number: "ABRCS3304A",
  contact_email: "contact@saaluvesa.com",
  live_support_number: "",
};
await Promise.all(
  Object.entries(defaults).map(([key, value]) =>
    SiteSetting.findOrCreate({ where: { key }, defaults: { value } }),
  ),
);
if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD)
  await AdminUser.findOrCreate({
    where: { email: process.env.SEED_ADMIN_EMAIL },
    defaults: {
      password_hash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12),
      role: "admin",
    },
  });
console.log("Database schema and defaults are ready.");
await sequelize.close();
