import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourceLogo = path.join(rootDir, "attached_assets", "ffactory_1754714366892.png");
const iconsDir = path.join(rootDir, "client", "public", "icons");

console.log("Testing icon generation...");
console.log("Root dir:", rootDir);
console.log("Source logo:", sourceLogo);
console.log("Logo exists:", fs.existsSync(sourceLogo));
console.log("Icons dir:", iconsDir);

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log("Created icons directory");
}

try {
  const testOutput = path.join(iconsDir, "test-icon-192x192.png");
  console.log("Generating test icon to:", testOutput);
  
  await sharp(sourceLogo)
    .resize(192, 192, {
      fit: "contain",
      background: { r: 26, g: 26, b: 26, alpha: 1 }
    })
    .png()
    .toFile(testOutput);
  
  console.log("✅ Test icon generated successfully!");
  console.log("File exists:", fs.existsSync(testOutput));
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error(error.stack);
  process.exit(1);
}







