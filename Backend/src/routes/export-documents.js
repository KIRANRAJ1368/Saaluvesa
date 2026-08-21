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
const cleanItems = (items) => {
  if (!Array.isArray(items) || !items.length) {
    const error = new Error("Add at least one product before generating the document.");
    error.status = 422;
    throw error;
  }
  return items.map((item) => {
    const qty = Number(item.qty);
    const unit_value = Number(item.unit_value);
    const extra_price = Number(item.extra_price || 0);
    const unit_net_weight = Number(item.unit_net_weight || 0);
    if (
      !String(item.product_name || "").trim() ||
      !Number.isFinite(qty) || qty <= 0 ||
      !Number.isFinite(unit_value) || unit_value < 0 ||
      !Number.isFinite(extra_price) || extra_price < 0 ||
      !Number.isFinite(unit_net_weight) || unit_net_weight < 0
    ) {
      const error = new Error("Every product needs a name, positive quantity, unit price, a non-negative extra price, and unit net weight.");
      error.status = 422;
      throw error;
    }
    return {
      ...item,
      product_name: item.product_name.trim(),
      qty,
      unit_value,
      extra_price,
      unit_net_weight,
      uom: item.uom || "PCS",
      sub_total: (qty * (unit_value + extra_price)).toFixed(2),
    };
  });
};
router.post(
  "/",
  validate(["invoice_no", "importer_name"]),
  async (req, res, next) => {
    const tx = await sequelize.transaction();
    try {
      const { items, ...header } = req.body;
      const cleanDocumentItems = cleanItems(items);
      const document = await ExportDocument.create(
        { ...header, status: "Generated" },
        { transaction: tx },
      );
      await ExportDocumentItem.bulkCreate(
        cleanDocumentItems.map((item) => ({
          ...item,
          export_document_id: document.id,
        })),
        { transaction: tx },
      );
      await recalculate(document, tx);
      await tx.commit();
      const result = await ExportDocument.findByPk(document.id, { include });
      try {
        await emailInvoice(result);
      } catch (m) {
        console.error("Invoice email failed:", m.message);
      }
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
    const { items, ...headerFields } = req.body;
    const allowed = Object.keys(ExportDocument.rawAttributes).filter(
      (key) =>
        ![
          "id",
          "createdAt",
          "updatedAt",
          "total_goods_value",
          "tax_amount",
          "final_total_amount",
          "total_amount_words",
          "total_net_weight_kg",
          "total_net_weight_lbs",
        ].includes(key),
    );
    const changes = allowed
      .filter(
        (key) =>
          headerFields[key] !== undefined &&
          String(headerFields[key] ?? "") !== String(document.get(key) ?? ""),
      )
      .map((key) => ({
        edited_field: key,
        old_value: String(document.get(key) ?? ""),
        new_value: String(headerFields[key] ?? ""),
        edited_by: req.user.id,
      }));

    if (Object.keys(headerFields).length > 0) {
      await document.update(headerFields, { transaction: tx });
    }

    if (Array.isArray(items) && items.length > 0) {
      const cleanDocumentItems = cleanItems(items);
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
        cleanDocumentItems.map((item) => ({
          ...item,
          export_document_id: document.id,
        })),
        { transaction: tx },
      );
      changes.push({
        edited_field: "line_items",
        old_value: oldValue,
        new_value: JSON.stringify(items),
        edited_by: req.user.id,
      });
    }

    await recalculate(document, tx);
    if (changes.length) {
      await ExportDocumentAudit.bulkCreate(
        changes.map((change) => ({ ...change, export_document_id: document.id })),
        { transaction: tx },
      );
    }
    await tx.commit();
    const result = await ExportDocument.findByPk(document.id, { include });
    try {
      await emailInvoice(result);
    } catch (m) {
      console.error("Invoice email failed:", m.message);
    }
    res.json(result);
  } catch (e) {
    await tx.rollback();
    next(e);
  }
});

router.delete("/:id", async (req, res, next) => {
  const tx = await sequelize.transaction();
  try {
    const document = await ExportDocument.findByPk(req.params.id, {
      transaction: tx,
    });
    if (!document) {
      await tx.rollback();
      return res.status(404).json({ message: "Export document not found" });
    }
    await ExportDocumentItem.destroy({
      where: { export_document_id: document.id },
      transaction: tx,
    });
    await ExportDocumentAudit.destroy({
      where: { export_document_id: document.id },
      transaction: tx,
    });
    await document.destroy({ transaction: tx });
    await tx.commit();
    res.json({ message: "Export document deleted successfully" });
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
    try {
      await emailInvoice(result);
    } catch (m) {
      console.error("Invoice email failed:", m.message);
    }
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
        const [product_name, qty, unit_value, extra_price, unit_net_weight] = row
          .split(/\t|,/)
          .map((v) => v.trim());
        return {
          product_name,
          qty: Number(qty),
          unit_value: Number(unit_value),
          extra_price: Number(extra_price || 0),
          unit_net_weight: Number(unit_net_weight || 0),
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
        message:
          "No valid rows. Expected product name, quantity, unit price, extra price, unit net weight.",
      });
    return replaceItems(req, res, next, items);
  } catch (e) {
    return next(e);
  }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const buffer = await pdfBuffer(req.params.id, "proforma");
    res.setHeader("Content-Type", "application/pdf");
    if (req.query.download === "1") {
      res.setHeader("Content-Disposition", `attachment; filename="proforma-invoice-${req.params.id}.pdf"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="proforma-invoice-${req.params.id}.pdf"`);
    }
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

router.get("/:id/:documentType/pdf", async (req, res, next) => {
  try {
    const documentType = req.params.documentType;
    if (!Object.hasOwn({ commercial: true, proforma: true, packing: true }, documentType)) {
      return res.status(404).json({ message: "Document type not found" });
    }
    const buffer = await pdfBuffer(req.params.id, documentType);
    res.setHeader("Content-Type", "application/pdf");
    if (req.query.download === "1") {
      res.setHeader("Content-Disposition", `attachment; filename="${documentType}-${req.params.id}.pdf"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${documentType}-${req.params.id}.pdf"`);
    }
    res.send(buffer);
  } catch (e) {
    next(e);
  }
});

export default router;
