import { Router } from "express";
import { ContactSubmission, Product } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendMail } from "../services/email.js";
const router = Router();
router.post(
  "/",
  validate(["name", "email", "requirement_details"]),
  async (req, res, next) => {
    try {
      const source_product_id =
        req.body.product_id || req.query.product_id || null;
      const product_name = req.body.product_name || req.query.product_name;
      const submission = await ContactSubmission.create({
        ...req.body,
        source_product_id,
      });
      const product = source_product_id
        ? await Product.findByPk(source_product_id)
        : null;
      try {
        await sendMail({
          to: process.env.CONTACT_RECIPIENT || "contact@saaluvesa.com",
          subject: `New website enquiry from ${submission.name}`,
          text: `Name: ${submission.name}\nEmail: ${submission.email}\nAddress: ${submission.address || "—"}\nPostal code: ${submission.postal_code || "—"}\nProduct: ${product?.name || product_name || "General enquiry"}\n\nRequirement:\n${submission.requirement_details}`,
        });
      } catch (mailErr) {
        console.error("Email notification failed:", mailErr.message);
      }
      res.status(201).json(submission);
    } catch (e) {
      next(e);
    }
  },
);
const admin = Router();
admin.use(authenticate, requireRole("admin", "staff"));
admin.get("/", async (req, res, next) => {
  try {
    const where = req.query.status ? { status: req.query.status } : {};
    res.json(
      await ContactSubmission.findAll({
        where,
        include: Product,
        order: [["createdAt", "DESC"]],
      }),
    );
  } catch (e) {
    next(e);
  }
});
admin.patch("/:id", async (req, res, next) => {
  try {
    const submission = await ContactSubmission.findByPk(req.params.id);
    if (!submission)
      return res.status(404).json({ message: "Contact submission not found" });
    if (req.body.status && !["New", "Responded"].includes(req.body.status))
      return res.status(422).json({ message: "Invalid status" });
    res.json(
      await submission.update({ status: req.body.status || "Responded" }),
    );
  } catch (e) {
    next(e);
  }
});
admin.delete("/:id", async (req, res, next) => {
  try {
    const submission = await ContactSubmission.findByPk(req.params.id);
    if (!submission)
      return res.status(404).json({ message: "Contact submission not found" });
    await submission.destroy();
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
export { router as publicContact, admin as adminContacts };
