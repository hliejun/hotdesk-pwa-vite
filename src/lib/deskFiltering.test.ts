import { describe, expect, it } from "vitest";
import { deskAmenityScore, matchesDeskFilters } from "./deskFiltering";
import type { Desk } from "../types";
import {
  defaultAmenityFilter,
  type DeskFilterState,
} from "../components/DeskFilters";

describe("lib/deskFiltering", () => {
  const baseDesk: Desk = {
    id: "d1",
    label: "A-01",
    zone: "North",
    status: "ACTIVE",
    amenities: ["MONITOR", "WINDOW"],
  };

  const baseFilters: DeskFilterState = {
    zone: "ALL",
    query: "",
    amenities: defaultAmenityFilter(),
  };

  it("matches with ALL zone and empty query", () => {
    expect(matchesDeskFilters(baseDesk, baseFilters)).toBe(true);
  });

  it("filters by zone", () => {
    expect(
      matchesDeskFilters(baseDesk, { ...baseFilters, zone: "North" }),
    ).toBe(true);
    expect(
      matchesDeskFilters(baseDesk, { ...baseFilters, zone: "South" }),
    ).toBe(false);
  });

  it("filters by query (trimmed, case-insensitive) over label + zone", () => {
    expect(
      matchesDeskFilters(baseDesk, { ...baseFilters, query: "  a-0 " }),
    ).toBe(true);
    expect(
      matchesDeskFilters(baseDesk, { ...baseFilters, query: "noRth" }),
    ).toBe(true);
    expect(
      matchesDeskFilters(baseDesk, { ...baseFilters, query: "missing" }),
    ).toBe(false);
  });

  it("filters by required amenities (all required must be present)", () => {
    const reqMonitor: DeskFilterState = {
      ...baseFilters,
      amenities: { ...baseFilters.amenities, MONITOR: true },
    };
    expect(matchesDeskFilters(baseDesk, reqMonitor)).toBe(true);

    const reqPrivate: DeskFilterState = {
      ...baseFilters,
      amenities: { ...baseFilters.amenities, PRIVATE: true },
    };
    expect(matchesDeskFilters(baseDesk, reqPrivate)).toBe(false);

    const reqTwo: DeskFilterState = {
      ...baseFilters,
      amenities: {
        ...baseFilters.amenities,
        MONITOR: true,
        WINDOW: true,
      },
    };
    expect(matchesDeskFilters(baseDesk, reqTwo)).toBe(true);
  });

  it("deskAmenityScore uses weights", () => {
    expect(deskAmenityScore(baseDesk)).toBe(6); // MONITOR(4) + WINDOW(2)
    expect(
      deskAmenityScore({
        ...baseDesk,
        amenities: ["COMMUNAL", "ADJUSTABLE", "PRIVATE"],
      }),
    ).toBe(1 + 3 + 2);
  });
});
