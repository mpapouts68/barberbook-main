import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // Don't register SW - causes CacheStorage errors, auth issues
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: {
        name: "PEQI - Haircut Studio",
        short_name: "PEQI",
        description: "Book your haircut appointment at PEQI Haircut Studio. Choose your service, select your stylist, and manage appointments with ease.",
        theme_color: "#000000",
        background_color: "#050505",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/favicon-96x96.png",
            sizes: "96x96",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icons/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any"
          }
        ],
        shortcuts: [
          {
            name: "Κλείστε Ραντεβού",
            short_name: "Ραντεβού",
            description: "Κλείστε ένα νέο ραντεβού",
            url: "/booking",
            icons: [{ src: "/icons/web-app-manifest-192x192.png", sizes: "192x192" }]
          },
          {
            name: "Ραντεβού Μου",
            short_name: "Ραντεβού",
            description: "Δείτε τα ραντεβού σας",
            url: "/appointments",
            icons: [{ src: "/icons/web-app-manifest-192x192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB - Large images and Syncfusion bundle
        runtimeCaching: [
          {
            // NEVER cache auth - causes 401 loops, session issues
            urlPattern: /\/api\/auth\/?/,
            handler: "NetworkOnly"
          },
          {
            urlPattern: /\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: "module"
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@brand-assets": path.resolve(import.meta.dirname),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
