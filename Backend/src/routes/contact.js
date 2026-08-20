import { Router } from "express";
import { Product, ContactSubmission } from "../models/index.js";
import { validate } from "../middleware/validate.js";
import { sendMail } from "../services/email.js";

const router = Router();
const CONTACT_RECIPIENT = "kiranraj1368@gmail.com";

router.post(
  "/",
  validate(["name", "email", "address", "postal_code", "requirement_details"]),
  async (req, res, next) => {
    try {
      if (!/^\S+@\S+\.\S+$/.test(req.body.email)) {
        return res.status(422).json({ message: "Please provide a valid email address." });
      }
      const sourceProductId = req.body.product_id || null;
      const product = sourceProductId ? await Product.findByPk(sourceProductId) : null;
      const productName = product?.name || req.body.product_name || "General enquiry";

      await ContactSubmission.create({
        name: req.body.name,
        email: req.body.email,
        address: req.body.address,
        postal_code: req.body.postal_code,
        requirement_details: req.body.requirement_details,
        source_product_id: sourceProductId,
        status: "New",
      });

      await sendMail({
        to: CONTACT_RECIPIENT,
        replyTo: req.body.email,
        subject: `New website enquiry from ${req.body.name}`,
        text: [
          `Name: ${req.body.name}`,
          `Email: ${req.body.email}`,
          `Address: ${req.body.address}`,
          `Postal code: ${req.body.postal_code}`,
          `Product: ${productName}`,
          "",
          "Requirement:",
          req.body.requirement_details,
        ].join("\n"),
      });
      return res.status(201).json({ message: "Your enquiry has been sent successfully." });
    } catch (error) {
      console.error("Contact enquiry failed:", error);
      return res.status(503).json({
        message: "We could not send your enquiry right now. Please try again shortly.",
      });
    }
  },
);

export { router as publicContact };
