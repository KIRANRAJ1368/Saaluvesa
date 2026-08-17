import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AdminUser } from "../models/index.js";
import "dotenv/config";
const router = Router();
const access = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: "15m" },
  );
const refresh = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
router.post("/login", async (req, res, next) => {
  try {
    const user = await AdminUser.findOne({ where: { email: req.body.email } });
    if (
      !user ||
      !(await bcrypt.compare(req.body.password || "", user.password_hash))
    )
      return res.status(401).json({ message: "Invalid email or password" });
    const refreshToken = refresh(user);
    await user.update({ refresh_token: refreshToken });
    res.json({
      accessToken: access(user),
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});
router.post("/refresh", async (req, res, next) => {
  try {
    const payload = jwt.verify(
      req.body.refreshToken,
      process.env.JWT_REFRESH_SECRET,
    );
    const user = await AdminUser.findByPk(payload.id);
    if (!user || user.refresh_token !== req.body.refreshToken)
      return res.status(401).json({ message: "Refresh token rejected" });
    const refreshToken = refresh(user);
    await user.update({ refresh_token: refreshToken });
    res.json({ accessToken: access(user), refreshToken });
  } catch (e) {
    next(e);
  }
});
router.post("/logout", async (req, res, next) => {
  try {
    const user = await AdminUser.findOne({
      where: { refresh_token: req.body.refreshToken },
    });
    if (user) await user.update({ refresh_token: null });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
export default router;
