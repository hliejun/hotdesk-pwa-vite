import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

// jsdom/Node compatibility
if (!globalThis.crypto) {
  // @ts-expect-error - minimal polyfill for tests
  globalThis.crypto = {};
}

if (typeof globalThis.crypto.randomUUID !== "function") {
  const hex = (len: number) =>
    Array.from({ length: len }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join("");

  // Matches the DOM type: `${string}-${string}-${string}-${string}-${string}`
  globalThis.crypto.randomUUID = () =>
    `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
}
