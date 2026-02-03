import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BootSkeleton } from "./BootSkeleton";

describe("BootSkeleton", () => {
  it("renders a lightweight boot-loading skeleton", () => {
    const { container } = render(<BootSkeleton />);

    // BootSkeleton is composed of 3 Skeleton blocks.
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBe(3);

    // Sanity-check expected variants exist.
    expect(container.querySelector(".skeletonTitle")).not.toBeNull();
    expect(container.querySelector(".skeletonLine")).not.toBeNull();
    expect(container.querySelector(".skeletonBlock")).not.toBeNull();
  });
});
