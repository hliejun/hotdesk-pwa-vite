import { describe, expect, it, vi } from "vitest";
import { confirm } from "./confirm";

describe("lib/confirm", () => {
  it("delegates to window.confirm and returns its value", () => {
    const spy = vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    expect(confirm("Are you sure?")).toBe(true);
    expect(spy).toHaveBeenCalledWith("Are you sure?");

    spy.mockRestore();
  });
});
