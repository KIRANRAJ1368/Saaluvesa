import { Router } from "express";
import { ContactSubmission, Product } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, requireRole("admin", "staff"));

router.get("/", async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const rows = await ContactSubmission.findAll({
    where,
    include: [{ model: Product, attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
  });
  res.json(rows);
});

router.patch("/:id", async (req, res) => {
  const row = await ContactSubmission.findByPk(req.params.id);
  if (!row) return res.status(404).json({ message: "Submission not found" });
  if (req.body.status) row.status = req.body.status;
  await row.save();
  res.json(row);
});

router.delete("/:id", async (req, res) => {
  const row = await ContactSubmission.findByPk(req.params.id);
  if (!row) return res.status(404).json({ message: "Submission not found" });
  await row.destroy();
  res.status(204).end();
});

export default router;
