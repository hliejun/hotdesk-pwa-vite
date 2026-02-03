import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("lib/cx", () => {
  it("joins truthy classnames and ignores falsy", () => {
    expect(cx("a", false, undefined, null, "b")).toBe("a b");
    expect(cx(false, undefined, null)).toBe("");
  });
});
