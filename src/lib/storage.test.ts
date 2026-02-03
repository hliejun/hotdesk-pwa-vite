import { describe, it, expect, vi } from "vitest";
import {
  getLocalStorageItem,
  safeJsonParse,
  setLocalStorageItem,
} from "./storage";

describe("storage", () => {
  it("safeJsonParse returns ok for valid JSON", () => {
    const res = safeJsonParse<{ a: number }>('{"a":1}');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.a).toBe(1);
  });

  it("safeJsonParse returns error for invalid JSON", () => {
    const res = safeJsonParse("{");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("Invalid JSON in storage");
  });

  it("getLocalStorageItem returns null when Storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(getLocalStorageItem("x")).toBeNull();
  });

  it("setLocalStorageItem returns ok and error when Storage throws", () => {
    const ok = setLocalStorageItem("k", "v");
    expect(ok.ok).toBe(true);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const bad = setLocalStorageItem("k", "v");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toBe("Failed to write to localStorage");
  });
});
