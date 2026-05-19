import sharp from "sharp";
import fs from "fs";
import path from "path";

const sourceLogo = path.join(process.cwd(), "attached_assets", "ffactory_1754714366892.png");
const outputFile = path.join(process.cwd(), "client", "public", "icons", "test-192.png");

console.log("Testing Sharp...");
console.log("Source:", sourceLogo);
console.log("Source exists:", fs.existsSync(sourceLogo));
console.log("Output:", outputFile);

try {
  const result = await sharp(sourceLogo)
    .resize(192, 192)
    .png()
    .toFile(outputFile);
  
  console.log("Success! File created:", fs.existsSync(outputFile));
  console.log("Result:", result);
} catch (error) {
  console.error("Error:", error.message);
  console.error(error.stack);
  process.exit(1);
}







