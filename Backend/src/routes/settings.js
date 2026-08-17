import { Router } from "express";
import { SiteSetting } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router = Router();
router.use(authenticate, requireRole("admin"));
router.get("/", async (_req, res, next) => {
  try {
    const rows = await SiteSetting.findAll();
    res.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
  } catch (e) {
    next(e);
  }
});
router.put("/", async (req, res, next) => {
  try {
    const values = req.body.settings || req.body;
    if (!values || Array.isArray(values) || typeof values !== "object")
      return res.status(422).json({ message: "Provide a key/value object" });
    await Promise.all(
      Object.entries(values).map(([key, value]) =>
        SiteSetting.upsert({ key, value: String(value ?? "") }),
      ),
    );
    const rows = await SiteSetting.findAll();
    res.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
  } catch (e) {
    next(e);
  }
});
export default router;
