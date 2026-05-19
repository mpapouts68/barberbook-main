# PWA Icons

This directory contains the Progressive Web App (PWA) icons for Fade Factory.

## Generating Icons

To generate all required icon sizes from the Fade Factory logo, run:

```bash
npm run generate-icons
```

This script will:
- Read the logo from `attached_assets/ffactory_1754714366892.png`
- Generate icons in the following sizes:
  - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
  - Apple Touch Icon (180x180)
  - Favicons (16x16, 32x32)

## Required Icon Files

The following icon files should be present for full PWA support:

- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `apple-touch-icon.png` (180x180)

## Manual Icon Creation

If you prefer to create icons manually:

1. Use an online tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or [RealFaviconGenerator](https://realfavicongenerator.net/)
2. Upload your logo (`attached_assets/ffactory_1754714366892.png`)
3. Download and place the generated icons in this directory

## Testing PWA Installation

After icons are generated and the app is built:

1. **Chrome/Edge**: Look for the install icon in the address bar
2. **Safari (iOS)**: Tap the Share button → "Add to Home Screen"
3. **Safari (macOS)**: Look for the install icon in the address bar

The app will appear as a standalone app with the Fade Factory icon.







