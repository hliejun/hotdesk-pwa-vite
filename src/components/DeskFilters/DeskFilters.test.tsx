import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { DeskFilters } from "./DeskFilters";
import { defaultAmenityFilter, type DeskFilterState } from "./deskFiltersModel";

describe("DeskFilters", () => {
  it("renders the search input and zone selector", () => {
    const value: DeskFilterState = {
      zone: "ALL",
      query: "",
      amenities: defaultAmenityFilter(),
    };

    render(
      <DeskFilters
        zones={["North", "South"]}
        value={value}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/desk label or zone/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Zone")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("calls onChange when typing in Search", async () => {
    const user = userEvent.setup();

    const onChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState<DeskFilterState>({
        zone: "ALL",
        query: "",
        amenities: defaultAmenityFilter(),
      });

      return (
        <DeskFilters
          zones={["North"]}
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }

    render(<Harness />);

    const input = screen.getByPlaceholderText(/desk label or zone/i);
    await user.type(input, "N1");

    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveValue("N1");
  });

  it("toggles an amenity filter", async () => {
    const user = userEvent.setup();

    const value: DeskFilterState = {
      zone: "ALL",
      query: "",
      amenities: defaultAmenityFilter(),
    };
    const onChange = vi.fn();

    render(<DeskFilters zones={["North"]} value={value} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /monitor/i }));

    const last = onChange.mock.calls.at(-1)?.[0] as DeskFilterState;
    expect(last.amenities.MONITOR).toBe(true);
  });
});
