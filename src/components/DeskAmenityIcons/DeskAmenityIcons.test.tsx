import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeskAmenityIcons } from "./DeskAmenityIcons";

describe("DeskAmenityIcons", () => {
  it("renders amenity hints and merges className", () => {
    const { container } = render(
      <DeskAmenityIcons
        amenities={["MONITOR", "WINDOW"]}
        className="u-mt-10"
      />,
    );

    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getByText("Window")).toBeInTheDocument();

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root).toHaveClass("amenityIcons");
    expect(root).toHaveClass("u-mt-10");
  });
});
