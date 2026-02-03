import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repoName = "hotdesk-pwa-vite";

export default defineConfig({
  base: `/${repoName}/`,

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",

      scope: `/${repoName}/`,
      base: `/${repoName}/`,

      includeAssets: ["favicon.svg", "pwa-192x192.svg", "pwa-512x512.svg"],

      manifest: {
        name: "Hot Desk Booking",
        short_name: "HotDesk",
        start_url: `/${repoName}/`,
        display: "standalone",
        background_color: "#0b1220",
        theme_color: "#60a5fa",
        description:
          "Book a desk for AM/PM time slots. Works offline with local persistence.",
        icons: [
          {
            src: "pwa-192x192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "pwa-512x512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
        ],
      },
    }),
  ],
});
