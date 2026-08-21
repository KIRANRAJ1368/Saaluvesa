import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.join(__dirname, "..", "test-output.pdf");
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data }).promise;
const page = await doc.getPage(1);
const content = await page.getTextContent();

const items = content.items
  .map((item) => ({
    text: item.str,
    x: Math.round(item.transform[4]),
    y: Math.round(item.transform[5]),
  }))
  .sort((a, b) => b.y - a.y || a.x - b.x);

console.log("--- Payment Method / Receiver zone (y 430-520) ---");
for (const item of items) {
  if (item.y >= 430 && item.y <= 520) {
    console.log(`y=${item.y} x=${item.x}  "${item.text.trim()}"`);
  }
}

console.log("\n--- Table header zone (y 300-340) ---");
for (const item of items) {
  if (item.y >= 300 && item.y <= 340) {
    console.log(`y=${item.y} x=${item.x}  "${item.text.trim()}"`);
  }
}

console.log("\n--- Footer zone (y 130-230) ---");
for (const item of items) {
  if (item.y >= 130 && item.y <= 230) {
    console.log(`y=${item.y} x=${item.x}  "${item.text.trim()}"`);
  }
}
