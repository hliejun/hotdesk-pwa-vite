import { describe, expect, it } from "vitest";
import type { Desk } from "../types";
import { zonesFromDesks } from "./deskZones";

describe("lib/deskZones", () => {
  it("returns unique zones sorted alphabetically", () => {
    const desks: Desk[] = [
      {
        id: "d1",
        label: "Desk N1",
        zone: "North",
        status: "ACTIVE",
        amenities: ["COMMUNAL"],
      },
      {
        id: "d2",
        label: "Desk S1",
        zone: "South",
        status: "ACTIVE",
        amenities: ["COMMUNAL"],
      },
      {
        id: "d3",
        label: "Desk N2",
        zone: "North",
        status: "INACTIVE",
        amenities: ["COMMUNAL"],
      },
      {
        id: "d4",
        label: "Desk A1",
        zone: "Atrium",
        status: "ACTIVE",
        amenities: ["COMMUNAL"],
      },
    ];

    expect(zonesFromDesks(desks)).toEqual(["Atrium", "North", "South"]);
  });
});
