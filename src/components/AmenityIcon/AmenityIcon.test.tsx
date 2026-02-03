import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Amenity } from "../../types";
import { AmenityIcon } from "./AmenityIcon";

describe("AmenityIcon", () => {
  it.each([
    ["MONITOR", /monitor/i],
    ["WINDOW", /window/i],
    ["ADJUSTABLE", /adjustable/i],
    ["PRIVATE", /private/i],
    ["COMMUNAL", /communal/i],
  ] as Array<[Amenity, RegExp]>)("renders %s icon", (amenity, name) => {
    render(<AmenityIcon amenity={amenity} />);
    expect(screen.getByRole("img", { name })).toBeInTheDocument();
  });
});
