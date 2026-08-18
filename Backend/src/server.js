import express from "express";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import "./config/env.js";
import { sequelize, ensureDatabase } from "./config/database.js";
import "./models/index.js";
import { uploadsDirectory } from "./utils/upload.js";
import auth from "./routes/auth.js";
import { publicProducts, adminProducts } from "./routes/products.js";
import { publicContact } from "./routes/contact.js";
import exportDocuments from "./routes/export-documents.js";
const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDirectory));
const specification = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "Saaluvesa API", version: "1.0.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: [],
});

specification.paths = {
  "/api/auth/login": { post: { summary: "Admin login" } },
  "/api/products": { get: { summary: "Public product catalogue" } },
  "/api/contact": { post: { summary: "Submit a public enquiry" } },
  "/api/admin/products": {
    get: { summary: "List products", security: [{ bearerAuth: [] }] },
    post: { summary: "Create product", security: [{ bearerAuth: [] }] },
  },
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(specification));
app.use("/api/auth", auth);
app.use("/api/products", publicProducts);
app.use("/api/contact", publicContact);
app.use("/api/admin/products", adminProducts);
app.use("/api/admin/export-documents", exportDocuments);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === "MulterError") {
    return res.status(422).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Image file is too large. Maximum allowed size is 10 MB."
          : "Image upload failed. Please try again.",
    });
  }
  if (err.name === "ImageUploadError") {
    return res.status(err.status || 422).json({ message: err.message });
  }
  if (
    err.name?.includes("Validation") ||
    err.name === "SequelizeUniqueConstraintError"
  )
    return res.status(422).json({
      message: err.errors?.map((e) => e.message).join(", ") || err.message,
    });
  if (err.status) return res.status(err.status).json({ message: err.message });
  res.status(500).json({ message: err.message || "Unexpected server error" });
});

const port = Number(process.env.PORT || 5000);

async function start() {
  await ensureDatabase();
  await sequelize.authenticate();
  if (process.env.DB_SYNC !== "false") await sequelize.sync({ alter: true });
  app.listen(port, () => console.log(`Saaluvesa API listening on ${port}`));
}

start().catch((error) => {
  console.error("Database connection failed:", error);
  process.exit(1);
});
