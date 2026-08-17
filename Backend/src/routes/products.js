import { Router } from "express";
import fs from "node:fs";
import { Product } from "../models/index.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  uploadImage,
  removeUploadedFile,
} from "../utils/upload.js";
import { readImageMeta } from "../utils/image-meta.js";

const router = Router();

const IMAGE_RULES = {
  minWidth: 800,
  minHeight: 600,
  targetRatio: 4 / 3,
  tolerance: 0.02,
};

const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";

function serialize(req, product) {
  const data = product.toJSON ? product.toJSON() : product;
  return {
    ...data,
    image: data.image
      ? `${req.protocol}://${req.get("host")}${data.image}`
      : null,
  };
}

function checkImageFile(file) {
  const meta = readImageMeta(fs.readFileSync(file.path));
  if (!meta) {
    return "Could not read the image dimensions. Please upload a valid JPG, PNG or WebP image.";
  }
  if (meta.width < IMAGE_RULES.minWidth || meta.height < IMAGE_RULES.minHeight) {
    return `Image is too small (${meta.width}×${meta.height} px). Minimum size is ${IMAGE_RULES.minWidth}×${IMAGE_RULES.minHeight} px.`;
  }
  const ratio = meta.width / meta.height;
  if (Math.abs(ratio - IMAGE_RULES.targetRatio) > IMAGE_RULES.tolerance) {
    return `Image must use a 4:3 aspect ratio (yours is ${meta.width}×${meta.height}). Use e.g. 1200×900 or 1600×1200 px.`;
  }
  return null;
}

router.get("/", async (req, res, next) => {
  try {
    const products = await Product.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(products.map((product) => serialize(req, product)));
  } catch (e) {
    next(e);
  }
});

const admin = Router();
admin.use(authenticate, requireRole("admin", "staff"));

admin.get("/", async (req, res, next) => {
  try {
    const products = await Product.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(products.map((product) => serialize(req, product)));
  } catch (e) {
    next(e);
  }
});

admin.post(
  "/",
  uploadImage,
  validate(["name", "description"]),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(422).json({
          message:
            "A product image is required. Upload a JPG, PNG or WebP image (4:3, min 800×600 px).",
        });
      }
      const imageMessage = checkImageFile(req.file);
      if (imageMessage) {
        fs.unlink(req.file.path, () => {});
        return res.status(422).json({ message: imageMessage });
      }
      const product = await Product.create({
        name: req.body.name,
        description: req.body.description,
        website_link: req.body.website_link || null,
        slug: slugify(req.body.name),
        image: `/uploads/${req.file.filename}`,
      });
      res.status(201).json(serialize(req, product));
    } catch (e) {
      next(e);
    }
  },
);

admin.put(
  "/:id",
  uploadImage,
  validate(["name", "description"]),
  async (req, res, next) => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });

      if (req.file) {
        const imageMessage = checkImageFile(req.file);
        if (imageMessage) {
          fs.unlink(req.file.path, () => {});
          return res.status(422).json({ message: imageMessage });
        }
      }

      const updates = {
        name: req.body.name,
        description: req.body.description,
        website_link: req.body.website_link || null,
      };

      if (req.file) {
        updates.image = `/uploads/${req.file.filename}`;
      }

      const previousImage = product.image;
      await product.update(updates);
      if (req.file) removeUploadedFile(previousImage);

      res.json(serialize(req, product));
    } catch (e) {
      next(e);
    }
  },
);

admin.delete("/:id", async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    const previousImage = product.image;
    await product.destroy();
    removeUploadedFile(previousImage);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export { router as publicProducts, admin as adminProducts };
