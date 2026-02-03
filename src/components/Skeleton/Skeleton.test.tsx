import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders aria-hidden skeleton with optional className", () => {
    const { container } = render(<Skeleton className="skeletonTitle" />);
    const el = container.firstElementChild;

    expect(el).not.toBeNull();
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el).toHaveClass("skeleton");
    expect(el).toHaveClass("skeletonTitle");
  });
});
