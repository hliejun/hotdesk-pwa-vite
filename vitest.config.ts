import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Provided by vite-plugin-pwa at runtime; aliased for tests so Vite can resolve it.
      "virtual:pwa-register": "/src/test/virtual-pwa-register.ts",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "src/test/**",
        "src/types.ts",
        "src/**/index.ts",
        "src/**/index.tsx",
        "dist/**",
        "**/node_modules/**",
      ],
      thresholds: {
        // CI baseline (raise over time)
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
