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
  exactWidth: 800,
  exactHeight: 600,
};

const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "product";

/**
 * Parse stored images JSON field into an array of strings.
 * Returns [] if the field is missing or malformed.
 */
function parseImages(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function serializeImageUrl(req, imagePath) {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const host = req.get("host");
  if (!host) return imagePath;
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${proto}://${host}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
}

function serialize(req, product) {
  const data = product.toJSON ? product.toJSON() : product;
  const primaryImage = serializeImageUrl(req, data.image);
  const storedImages = parseImages(data.images);
  const allImages = storedImages.length
    ? storedImages.map((img) => serializeImageUrl(req, img))
    : primaryImage
    ? [primaryImage]
    : [];
  return {
    ...data,
    image: primaryImage,
    images: allImages,
  };
}

function checkImageFile(file) {
  const meta = readImageMeta(fs.readFileSync(file.path));
  if (!meta) {
    return "Could not read the image dimensions. Please upload a valid JPG, PNG or WebP image.";
  }
  if (meta.width !== IMAGE_RULES.exactWidth || meta.height !== IMAGE_RULES.exactHeight) {
    return `Image must be exactly ${IMAGE_RULES.exactWidth} × ${IMAGE_RULES.exactHeight} pixels (selected image is ${meta.width} × ${meta.height} px).`;
  }
  return null;
}

function getDisplayOrder(value) {
  if (value === undefined || value === "") return 0;
  const displayOrder = Number(value);
  return Number.isInteger(displayOrder) && displayOrder >= 0
    ? displayOrder
    : null;
}

function getActiveState(value) {
  return value === "true" || value === "1" || value === true;
}

router.get("/", async (req, res, next) => {
  try {
    const products = await Product.findAll({
      where: { is_active: true },
      order: [["display_order", "ASC"], ["createdAt", "DESC"]],
    });
    res.json(products.map((product) => serialize(req, product)));
  } catch (e) {
    next(e);
  }
});

// Fetching a single product is used by the public product-details page.
router.get("/:identifier", async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const product = /^\d+$/.test(identifier)
      ? await Product.findByPk(Number(identifier))
      : await Product.findOne({ where: { slug: identifier } });

    if (!product || !product.is_active) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(serialize(req, product));
  } catch (e) {
    next(e);
  }
});

const admin = Router();
admin.use(authenticate, requireRole("admin", "staff"));

admin.get("/", async (req, res, next) => {
  try {
    const products = await Product.findAll({
      order: [["display_order", "ASC"], ["createdAt", "DESC"]],
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
            "A product image is required. Please upload an image with exactly 800 × 600 pixels.",
        });
      }

      const imageMessage = checkImageFile(req.file);
      if (imageMessage) {
        fs.unlink(req.file.path, () => {});
        return res.status(422).json({ message: imageMessage });
      }

      const displayOrder = getDisplayOrder(req.body.display_order);
      if (displayOrder === null) {
        fs.unlink(req.file.path, () => {});
        return res.status(422).json({ message: "Display order must be a whole number of zero or greater." });
      }

      const imagePath = `/uploads/${req.file.filename}`;
      const product = await Product.create({
        name: req.body.name,
        description: req.body.description,
        website_link: req.body.website_link || null,
        display_order: displayOrder,
        is_active: getActiveState(req.body.is_active),
        slug: slugify(req.body.name),
        image: imagePath,
        images: JSON.stringify([imagePath]),
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

      const displayOrder = getDisplayOrder(req.body.display_order);
      if (displayOrder === null) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(422).json({ message: "Display order must be a whole number of zero or greater." });
      }

      const updates = {
        name: req.body.name,
        description: req.body.description,
        website_link: req.body.website_link || null,
        display_order: displayOrder,
        is_active: getActiveState(req.body.is_active),
      };

      if (req.file) {
        const previousImage = product.image;
        const newImagePath = `/uploads/${req.file.filename}`;
        updates.image = newImagePath;
        updates.images = JSON.stringify([newImagePath]);
        await product.update(updates);
        if (previousImage) removeUploadedFile(previousImage);
      } else {
        await product.update(updates);
      }

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
    const allImages = parseImages(product.images);
    const imagesToDelete = allImages.length ? allImages : [product.image];
    await product.destroy();
    removeUploadedFile(imagesToDelete);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export { router as publicProducts, admin as adminProducts };
