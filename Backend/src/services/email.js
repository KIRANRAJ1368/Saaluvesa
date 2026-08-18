import nodemailer from "nodemailer";
import "dotenv/config";
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
});
export async function sendMail(message) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error("Email service is not configured. Set SMTP_HOST and SMTP_FROM.");
  }
  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM,
      ...message,
    });
  } catch (error) {
    console.error("SMTP delivery failed:", error);
    throw error;
  }
}
