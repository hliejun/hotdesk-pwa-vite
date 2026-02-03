import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingNotes } from "./BookingNotes";

describe("BookingNotes", () => {
  it("renders nothing when details is empty", () => {
    const { container, rerender } = render(<BookingNotes />);
    expect(container).toBeEmptyDOMElement();

    rerender(<BookingNotes details="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders default title and details", () => {
    const { container } = render(
      <BookingNotes details="Needs an extra monitor" className="u-mt-10" />,
    );

    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Needs an extra monitor")).toBeInTheDocument();

    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root).toHaveClass("noteBox");
    expect(root).toHaveClass("u-mt-10");
  });

  it("supports a custom title", () => {
    render(<BookingNotes title="Reason" details="Client visit" />);

    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByText("Client visit")).toBeInTheDocument();
  });
});
