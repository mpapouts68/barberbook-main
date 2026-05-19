/**
 * PWA Configuration Test Script
 * Verifies all PWA components are correctly configured
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const iconsDir = path.join(rootDir, "client", "public", "icons");
const manifestPath = path.join(rootDir, "client", "public", "manifest.json");
const indexHtmlPath = path.join(rootDir, "client", "index.html");

console.log("🔍 Testing PWA Configuration...\n");

let errors = [];
let warnings = [];

// Test 1: Check icons directory exists
console.log("1. Checking icons directory...");
if (!fs.existsSync(iconsDir)) {
  errors.push("Icons directory not found: " + iconsDir);
} else {
  console.log("   ✅ Icons directory exists");
}

// Test 2: Check required icons
console.log("\n2. Checking required icon files...");
const requiredIcons = [
  "favicon-96x96.png",
  "web-app-manifest-192x192.png",
  "web-app-manifest-512x512.png",
  "apple-touch-icon.png"
];

requiredIcons.forEach(icon => {
  const iconPath = path.join(iconsDir, icon);
  if (fs.existsSync(iconPath)) {
    const stats = fs.statSync(iconPath);
    console.log(`   ✅ ${icon} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    errors.push(`Required icon missing: ${icon}`);
    console.log(`   ❌ ${icon} - MISSING`);
  }
});

// Test 3: Check manifest.json
console.log("\n3. Checking manifest.json...");
if (!fs.existsSync(manifestPath)) {
  errors.push("manifest.json not found");
} else {
  console.log("   ✅ manifest.json exists");
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    
    // Check required fields
    const requiredFields = ["name", "short_name", "start_url", "display", "icons"];
    requiredFields.forEach(field => {
      if (!manifest[field]) {
        errors.push(`manifest.json missing required field: ${field}`);
      }
    });
    
    // Check icons in manifest
    if (manifest.icons && manifest.icons.length > 0) {
      console.log(`   ✅ Manifest has ${manifest.icons.length} icon definitions`);
      manifest.icons.forEach(icon => {
        const iconPath = path.join(rootDir, "client", "public", icon.src);
        if (!fs.existsSync(iconPath)) {
          warnings.push(`Icon referenced in manifest not found: ${icon.src}`);
        }
      });
    }
    
    // Check theme color
    if (manifest.theme_color === "#D4A574") {
      console.log("   ✅ Theme color matches (#D4A574)");
    } else {
      warnings.push(`Theme color is ${manifest.theme_color}, expected #D4A574`);
    }
    
  } catch (error) {
    errors.push(`manifest.json is invalid JSON: ${error.message}`);
  }
}

// Test 4: Check index.html
console.log("\n4. Checking index.html...");
if (!fs.existsSync(indexHtmlPath)) {
  errors.push("index.html not found");
} else {
  console.log("   ✅ index.html exists");
  const htmlContent = fs.readFileSync(indexHtmlPath, "utf-8");
  
  // Check for manifest link
  if (htmlContent.includes('rel="manifest"')) {
    console.log("   ✅ Manifest link found");
  } else {
    errors.push("index.html missing manifest link");
  }
  
  // Check for theme-color meta
  if (htmlContent.includes('name="theme-color"')) {
    console.log("   ✅ Theme color meta tag found");
  } else {
    warnings.push("index.html missing theme-color meta tag");
  }
  
  // Check for apple-touch-icon
  if (htmlContent.includes('apple-touch-icon')) {
    console.log("   ✅ Apple touch icon link found");
  } else {
    warnings.push("index.html missing apple-touch-icon link");
  }
}

// Test 5: Check vite.config.ts
console.log("\n5. Checking vite.config.ts...");
const viteConfigPath = path.join(rootDir, "vite.config.ts");
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, "utf-8");
  if (viteConfig.includes("VitePWA")) {
    console.log("   ✅ VitePWA plugin configured");
  } else {
    warnings.push("vite.config.ts may not have VitePWA plugin");
  }
} else {
  warnings.push("vite.config.ts not found");
}

// Summary
console.log("\n" + "=".repeat(50));
console.log("📊 Test Summary");
console.log("=".repeat(50));

if (errors.length === 0 && warnings.length === 0) {
  console.log("✅ All tests passed! PWA is ready for deployment.");
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }
  
  console.log("\n💡 Fix the errors above before deploying.");
  process.exit(errors.length > 0 ? 1 : 0);
}







