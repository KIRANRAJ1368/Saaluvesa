import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../config/env.js";
import { sequelize } from "../config/database.js";
import { Product } from "../models/index.js";
import { uploadsDirectory } from "../utils/upload.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendAssets = path.resolve(currentDirectory, "../../../Frontend/src/assets");

const seeds = [
  {
    slug: "custom-tshirts",
    file: "product_custom.jpg",
    name: "Custom-printed t-shirts",
    description:
      "Tailored designs for families, groups, businesses, events and organizations, printed in DTF or DTG on premium cotton.",
    website_link: "https://castbull.co.in/",
  },
  {
    slug: "plain-tshirts",
    file: "product_plain.jpg",
    name: "Plain cotton t-shirts",
    description:
      "Bulk-ready blanks sourced from verified manufacturers, available across sizes and colors for retail or export.",
    website_link: "https://castbull.co.in/",
  },
  {
    slug: "personalized-merch",
    file: "product_merch.jpg",
    name: "Personalized apparel & merch",
    description:
      "Flexible sourcing and printing scaled from single-piece orders to large export consignments.",
    website_link: "https://castbull.co.in/",
  },
];

fs.mkdirSync(uploadsDirectory, { recursive: true });

for (const seed of seeds) {
  const destination = path.join(uploadsDirectory, seed.file);
  if (!fs.existsSync(destination)) {
    fs.copyFileSync(path.join(frontendAssets, seed.file), destination);
  }
  await Product.findOrCreate({
    where: { slug: seed.slug },
    defaults: {
      name: seed.name,
      description: seed.description,
      website_link: seed.website_link,
      slug: seed.slug,
      image: `/uploads/${seed.file}`,
    },
  });
}

console.log("Product catalogue seeded with existing website products.");
await sequelize.close();
