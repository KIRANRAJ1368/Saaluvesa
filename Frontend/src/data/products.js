import productCustom from "../assets/product_custom.jpg";
import productPlain from "../assets/product_plain.jpg";
import productMerch from "../assets/product_merch.jpg";

import galleryCustom1 from "../assets/whatwedo_tshirts.jpg";
import galleryCustom2 from "../assets/product_tshirts.jpg";
import galleryPlain1 from "../assets/product_polos.jpg";
import galleryPlain2 from "../assets/hero_bg_apparel.jpg";
import galleryMerch1 from "../assets/whatwedo_personalized.jpg";
import galleryMerch2 from "../assets/product_sourcing.jpg";

export const PRODUCT_CATALOG = [
  {
    id: "custom-tshirts",
    name: "Custom-printed t-shirts",
    category: "Apparel Sector",
    tagline: "Turn ideas into wearable, high-quality printed apparel.",
    shortDescription:
      "Tailored designs for families, groups, businesses, events and organizations, printed in DTF or DTG on premium cotton.",
    aboutHeading: "Printing That Looks as Good as the Idea.",
    description:
      "Our custom-printed T-shirts are produced using modern DTF and DTG printing on premium cotton fabric. From family reunions and corporate events to branded merchandise and retail launches, every order is handled end-to-end — design assistance, sampling, printing, and multi-stage quality inspection — to ensure prints that stay sharp wash after wash.",
    images: [productCustom, galleryCustom1, galleryCustom2],
    features: [
      "DTF & DTG printing on premium cotton",
      "Full-color, photo-quality prints",
      "Free design assistance and mockups",
      "Order sizes from single pieces to bulk",
      "Multi-stage quality inspection",
      "Export-grade packing & global delivery",
    ],
    customizations: [
      { title: "Print Method", options: ["DTF", "DTG", "Screen Printing", "Embroidery"] },
      { title: "Fabric", options: ["100% Cotton", "Cotton Blend", "Heavy Weight"] },
      { title: "Sizes", options: ["XS – 5XL", "Kids Sizes", "Custom Sizing"] },
      { title: "Quantity", options: ["Single Piece", "Small Batch", "Bulk / Wholesale"] },
    ],
    relatedIds: ["plain-tshirts", "personalized-merch"],
  },
  {
    id: "plain-tshirts",
    name: "Plain cotton t-shirts",
    category: "Apparel Sector",
    tagline: "Blank-ready basics in bulk, sourced from verified mills.",
    shortDescription:
      "Bulk-ready blanks sourced from verified manufacturers, available across sizes and colors for retail or export.",
    aboutHeading: "Consistent Blanks, Ready in Bulk.",
    description:
      "Plain cotton T-shirts form the backbone of retail and export. We source blanks from verified manufacturers with consistent weight, fit, and color, available across sizes and a wide color palette. Ideal for retail shelves, sublimation, embroidery, and garment decoration businesses that need dependable quality at scale.",
    images: [productPlain, galleryPlain1, galleryPlain2],
    features: [
      "Verified manufacturers with consistent quality",
      "Wide color range and size matrix",
      "Choice of fabric weight and fit",
      "Retail, wholesale & export packing",
      "Custom branding and labels available",
      "Timely bulk delivery",
    ],
    customizations: [
      { title: "Fabric", options: ["180 GSM", "200 GSM", "240 GSM", "Heavy Weight"] },
      { title: "Fit", options: ["Regular", "Oversized", "Slim", "Polo (Optional)"] },
      { title: "Sizes", options: ["XS – 5XL", "Kids Sizes", "Graded Ratios"] },
      { title: "Colors", options: ["Full Pantone Range", "Custom Dyes"] },
    ],
    relatedIds: ["custom-tshirts", "personalized-merch"],
  },
  {
    id: "personalized-merch",
    name: "Personalized apparel & merch",
    category: "Apparel Sector",
    tagline: "From single-piece gifts to large merchandise runs.",
    shortDescription:
      "Flexible sourcing and printing scaled from single-piece orders to large export consignments.",
    aboutHeading: "One Partner for Design, Sourcing, and Branding.",
    description:
      "Personalized apparel and merchandise combine sourcing flexibility with design creativity. Whether it's branded team wear, corporate gifting, hoodies, caps, or souvenir merchandise, we scale production to match your requirement — from a single piece to large export consignments — with dedicated design and quality-control support throughout.",
    images: [productMerch, galleryMerch1, galleryMerch2],
    features: [
      "Hoodies, tees, caps & more",
      "Corporate gifting & team wear",
      "Custom labels, tags & packaging",
      "Single-piece to export-scale runs",
      "Dedicated design support",
      "Branded packaging options",
    ],
    customizations: [
      { title: "Product Types", options: ["Hoodies", "Caps", "Polo Shirts", "Accessories"] },
      { title: "Print Method", options: ["DTF", "DTG", "Embroidery", "Heat Transfer"] },
      { title: "Branding", options: ["Custom Labels", "Tags", "Embroidery", "Screen Print"] },
      { title: "Packaging", options: ["Standard", "Branded Boxes", "Export Cartons"] },
    ],
    relatedIds: ["custom-tshirts", "plain-tshirts"],
  },
];
