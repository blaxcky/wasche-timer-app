import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const resolvedBase =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}/` : "/");

export default defineConfig({
  base: resolvedBase,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.svg", "icons/icon-512.svg", "icons/maskable-512.svg"],
      manifest: {
        name: "Wäsche-Timer",
        short_name: "WäscheTimer",
        description: "Tracke Trocknungszeit und Waschmaschinenlaufzeiten auf Android.",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f4f7fb",
        theme_color: "#0d5f7f",
        lang: "de",
        icons: [
          {
            src: "icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          },
          {
            src: "icons/maskable-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: `${resolvedBase}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: {
              cacheName: "documents-cache"
            }
          },
          {
            urlPattern: ({ request }) => ["script", "style", "image", "font"].includes(request.destination),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "assets-cache"
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
});

