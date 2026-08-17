import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDirectory = path.resolve(currentDirectory, "../../uploads");

fs.mkdirSync(uploadsDirectory, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDirectory),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".jpg").toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

export class ImageUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImageUploadError";
    this.status = 422;
  }
}

export const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !(file.mimetype || "").startsWith("image/")) {
      return cb(
        new ImageUploadError(
          "Unsupported file type. Please upload a JPG, PNG or WebP image.",
        ),
      );
    }
    cb(null, true);
  },
}).single("image");

export function removeUploadedFile(imagePath) {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;
  fs.unlink(path.join(uploadsDirectory, path.basename(imagePath)), () => {});
}
