import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

declare const process: {
  env: Record<string, string | undefined>;
};

const githubRepo = process.env.GITHUB_REPOSITORY;
const repoName = githubRepo?.includes("/")
  ? githubRepo.split("/")[1]
  : undefined;

// GitHub Pages project sites are served from `/<repo>/`.
// - CI: auto-detect from `GITHUB_REPOSITORY`
// - Override: set `VITE_BASE` (e.g. '/my-repo/')
// - Local dev/build: fall back to '/'
const base = (
  process.env.VITE_BASE ?? (repoName ? `/${repoName}/` : "/")
).replace(
  /\/+$|$/, // ensure exactly one trailing slash
  "/",
);

export default defineConfig({
  base,

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",

      scope: base,
      base,

      includeAssets: ["favicon.svg", "pwa-192x192.svg", "pwa-512x512.svg"],

      manifest: {
        name: "Hot Desk Booking",
        short_name: "HotDesk",
        start_url: base,
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
