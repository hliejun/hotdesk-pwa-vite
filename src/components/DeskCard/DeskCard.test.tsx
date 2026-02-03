import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeskCard } from "./DeskCard";
import type { Desk } from "../../types";

describe("DeskCard", () => {
  const desk: Desk = {
    id: "desk-1",
    label: "Desk N1",
    zone: "North",
    status: "ACTIVE",
    amenities: ["MONITOR", "WINDOW"],
  };

  it("renders title, default meta, and amenities", () => {
    render(<DeskCard desk={desk} />);

    expect(screen.getByText("Desk N1")).toBeInTheDocument();
    expect(screen.getByText("North")).toBeInTheDocument();

    // AmenityHint renders labels.
    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getByText("Window")).toBeInTheDocument();
  });

  it("supports meta=null to suppress the subtitle", () => {
    render(<DeskCard desk={desk} meta={null} />);
    expect(screen.queryByText("North")).toBeNull();
  });

  it("renders badge, details, cornerAction and children", () => {
    const { container } = render(
      <DeskCard
        desk={desk}
        className="gridCard"
        badge={<div>Available</div>}
        details={<div>Desk ID: {desk.id}</div>}
        cornerAction={<button type="button">⋯</button>}
      >
        <div>Extra actions</div>
      </DeskCard>,
    );

    expect(container.firstElementChild).toHaveClass("card");
    expect(container.firstElementChild).toHaveClass("gridCard");

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Desk ID: desk-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⋯" })).toBeInTheDocument();
    expect(screen.getByText("Extra actions")).toBeInTheDocument();
  });
});
