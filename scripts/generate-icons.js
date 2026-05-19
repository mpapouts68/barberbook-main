/**
 * Script to generate PWA icons from the PEQI logo
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Requirements:
 * - npm install -D sharp
 * - Source logo should be at: peqi_logo_round.PNG
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const sourceLogo = path.join(rootDir, "peqi_logo_round.PNG");
const iconsDir = path.join(rootDir, "client", "public", "icons");
const publicDir = path.join(rootDir, "client", "public");

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [
  { size: 96, name: "favicon-96x96.png" },
  { size: 192, name: "web-app-manifest-192x192.png" },
  { size: 512, name: "web-app-manifest-512x512.png" },
  { size: 180, name: "apple-touch-icon.png" },
];

async function generateIcons() {
  const logFile = path.join(rootDir, "icon-generation.log");
  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(msg);
    try {
      fs.appendFileSync(logFile, logMsg + "\n");
    } catch (err) {
      console.error("Failed to write to log file:", err.message);
    }
  };
  
  try {
    // Clear previous log
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    
    // Ensure log file can be created
    fs.writeFileSync(logFile, `Icon Generation Log - ${new Date().toISOString()}\n`);
    
    log("Starting icon generation...");
    log(`Root directory: ${rootDir}`);
    log(`Source logo: ${sourceLogo}`);
    log(`Icons directory: ${iconsDir}`);
    log(`Logo exists: ${fs.existsSync(sourceLogo)}`);
    log(`Icons dir exists: ${fs.existsSync(iconsDir)}`);
    
    // Check if source logo exists
    if (!fs.existsSync(sourceLogo)) {
      log(`❌ Source logo not found at: ${sourceLogo}`);
      log("Please ensure the logo file exists in the project root.");
      process.exit(1);
    }
    
    log("✅ Source logo found");

    log("🎨 Generating PWA icons from logo...");
    log(`📁 Source: ${sourceLogo}`);
    log(`📁 Output: ${iconsDir}\n`);

    // Generate all icon sizes
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(iconsDir, name);
      
      log(`Generating ${name} (${size}x${size})...`);
      const outputDir = name === "apple-touch-icon.png" ? iconsDir : iconsDir;
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .png()
        .toFile(path.join(outputDir, name));
      
      if (fs.existsSync(outputPath)) {
        log(`✅ Generated: ${name} (${size}x${size})`);
      } else {
        log(`❌ Failed to generate: ${name}`);
      }
    }

    // Also create a favicon.ico (16x16 and 32x32)
    const favicon16 = path.join(publicDir, "favicon-16x16.png");
    const favicon32 = path.join(publicDir, "favicon-32x32.png");
    
    await sharp(sourceLogo)
      .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(favicon16);
    
    await sharp(sourceLogo)
      .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png()
      .toFile(favicon32);

    log(`✅ Generated: favicon-16x16.png`);
    log(`✅ Generated: favicon-32x32.png`);

    log("\n✨ All icons generated successfully!");
    log("\n📝 Next steps:");
    log("   1. Icons are ready in client/public/icons/");
    log("   2. Build the app: npm run build");
    log("   3. Test PWA installation in Chrome/Safari");
    log(`\n📋 Full log saved to: ${logFile}`);
    
  } catch (error) {
    const errorMsg = `❌ Error generating icons: ${error.message}\n${error.stack}`;
    log(errorMsg);
    console.error("❌ Error:", error.message);
    console.error(error.stack);
    if (error.message.includes("Cannot find module 'sharp'")) {
      log("\n💡 Install sharp first: npm install -D sharp");
      console.error("\n💡 Install sharp first: npm install -D sharp");
    }
    log(`\nLog file location: ${logFile}`);
    console.error(`\nCheck log file for details: ${logFile}`);
    process.exit(1);
  }
}

generateIcons();

