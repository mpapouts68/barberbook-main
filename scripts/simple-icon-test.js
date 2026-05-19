import sharp from "sharp";
import fs from "fs";
import path from "path";

console.log("=== Simple Icon Test ===");
console.log("Current directory:", process.cwd());

const sourceLogo = path.join(process.cwd(), "attached_assets", "ffactory_1754714366892.png");
const outputFile = path.join(process.cwd(), "client", "public", "icons", "test-icon.png");

console.log("Source:", sourceLogo);
console.log("Source exists:", fs.existsSync(sourceLogo));
console.log("Output:", outputFile);

if (!fs.existsSync(sourceLogo)) {
  console.error("❌ Logo file not found!");
  process.exit(1);
}

try {
  console.log("Generating test icon...");
  const result = await sharp(sourceLogo)
    .resize(192, 192)
    .png()
    .toFile(outputFile);
  
  console.log("✅ Success! Result:", result);
  console.log("File exists:", fs.existsSync(outputFile));
  console.log("File size:", fs.statSync(outputFile).size, "bytes");
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error(error.stack);
  process.exit(1);
}







