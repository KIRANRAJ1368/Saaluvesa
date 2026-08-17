import { Router } from "express";
import { sequelize } from "../config/database.js";
import {
  ExportDocument,
  ExportDocumentItem,
  ExportDocumentAudit,
  AdminUser,
} from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  recalculate,
  pdfBuffer,
  emailInvoice,
} from "../services/export-document.js";
const router = Router();
router.use(authenticate, requireRole("admin", "staff"));
const include = [
  { model: ExportDocumentItem, as: "items" },
  {
    model: ExportDocumentAudit,
    as: "audits",
    include: { model: AdminUser, as: "editor", attributes: ["id", "email"] },
  },
];
const cleanItems = (items) =>
  (items || []).map((item) => ({
    ...item,
    sub_total: (Number(item.qty) * Number(item.unit_value)).toFixed(2),
  }));
router.post(
  "/",
  validate(["invoice_no", "importer_name"]),
  async (req, res, next) => {
    const tx = await sequelize.transaction();
    try {
      const { items, ...header } = req.body;
      const document = await ExportDocument.create(header, { transaction: tx });
      if (items?.length)
        await ExportDocumentItem.bulkCreate(
          cleanItems(items).map((item) => ({
            ...item,
            export_document_id: document.id,
          })),
          { transaction: tx },
        );
      await recalculate(document, tx);
      await tx.commit();
      const result = await ExportDocument.findByPk(document.id, { include });
      await emailInvoice(result);
      res.status(201).json(result);
    } catch (e) {
      await tx.rollback();
      next(e);
    }
  },
);
router.get("/", async (_req, res, next) => {
  try {
    res.json(
      await ExportDocument.findAll({
        order: [["createdAt", "DESC"]],
        include: { model: ExportDocumentItem, as: "items" },
      }),
    );
  } catch (e) {
    next(e);
  }
});
router.get("/:id", async (req, res, next) => {
  try {
    const document = await ExportDocument.findByPk(req.params.id, { include });
    if (!document)
      return res.status(404).json({ message: "Export document not found" });
    res.json(document);
  } catch (e) {
    next(e);
  }
});
router.put("/:id", async (req, res, next) => {
  const tx = await sequelize.transaction();
  try {
    const document = await ExportDocument.findByPk(req.params.id, {
      transaction: tx,
    });
    if (!document) {
      await tx.rollback();
      return res.status(404).json({ message: "Export document not found" });
    }
    const allowed = Object.keys(ExportDocument.rawAttributes).filter(
      (key) =>
        ![
          "id",
          "createdAt",
          "updatedAt",
          "total_goods_value",
          "total_net_weight_kg",
          "total_net_weight_lbs",
        ].includes(key),
    );
    const changes = allowed
      .filter(
        (key) =>
          req.body[key] !== undefined &&
          String(req.body[key] ?? "") !== String(document.get(key) ?? ""),
      )
      .map((key) => ({
        edited_field: key,
        old_value: String(document.get(key) ?? ""),
        new_value: String(req.body[key] ?? ""),
        edited_by: req.user.id,
      }));
    if (!changes.length) {
      await tx.commit();
      return res.json(
        await ExportDocument.findByPk(req.params.id, { include }),
      );
    }
    await document.update(req.body, { transaction: tx });
    await ExportDocumentAudit.bulkCreate(
      changes.map((change) => ({ ...change, export_document_id: document.id })),
      { transaction: tx },
    );
    await tx.commit();
    const result = await ExportDocument.findByPk(document.id, { include });
    await emailInvoice(result);
    res.json(result);
  } catch (e) {
    await tx.rollback();
    next(e);
  }
});
async function replaceItems(req, res, next, items) {
  const tx = await sequelize.transaction();
  try {
    const document = await ExportDocument.findByPk(req.params.id, {
      transaction: tx,
    });
    if (!document) {
      await tx.rollback();
      return res.status(404).json({ message: "Export document not found" });
    }
    if (!Array.isArray(items)) {
      await tx.rollback();
      return res.status(422).json({ message: "items must be an array" });
    }
    const oldValue = JSON.stringify(
      await ExportDocumentItem.findAll({
        where: { export_document_id: document.id },
        transaction: tx,
      }),
    );
    await ExportDocumentItem.destroy({
      where: { export_document_id: document.id },
      transaction: tx,
    });
    await ExportDocumentItem.bulkCreate(
      cleanItems(items).map((item) => ({
        ...item,
        export_document_id: document.id,
      })),
      { transaction: tx },
    );
    await recalculate(document, tx);
    await ExportDocumentAudit.create(
      {
        export_document_id: document.id,
        edited_field: "line_items",
        old_value: oldValue,
        new_value: JSON.stringify(items),
        edited_by: req.user.id,
      },
      { transaction: tx },
    );
    await tx.commit();
    const result = await ExportDocument.findByPk(document.id, { include });
    await emailInvoice(result);
    return res.json(result);
  } catch (e) {
    await tx.rollback();
    return next(e);
  }
}
router.put("/:id/items", (req, res, next) =>
  replaceItems(req, res, next, req.body.items),
);
router.post("/:id/items/bulk-paste", async (req, res, next) => {
  try {
    const items = (req.body.text || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((row) => {
        const [product_name, qty, unit_value] = row
          .split(/\t|,/)
          .map((v) => v.trim());
        return {
          product_name,
          qty: Number(qty),
          unit_value: Number(unit_value),
          uom: "PCS",
        };
      })
      .filter(
        (item) =>
          item.product_name &&
          Number.isFinite(item.qty) &&
          Number.isFinite(item.unit_value),
      );
    if (!items.length)
      return res
        .status(422)
        .json({
          message: "No valid rows. Expected product_name, qty, unit_value.",
        });
    return replaceItems(req, res, next, items);
  } catch (e) {
    return next(e);
  }
});
router.get("/:id/pdf", async (req, res, next) => {
  try {
    const buffer = await pdfBuffer(req.params.id);
    res
      .type("application/pdf")
      .attachment(`proforma-invoice-${req.params.id}.pdf`)
      .send(buffer);
  } catch (e) {
    next(e);
  }
});
export default router;
