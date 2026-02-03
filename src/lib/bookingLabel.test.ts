import { describe, expect, it } from "vitest";
import { bookingLabel } from "./bookingLabel";
import type { Booking, Desk } from "../types";

describe("lib/bookingLabel", () => {
  it("includes desk label + zone when desk exists", () => {
    const booking: Booking = {
      id: "b1",
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    const desks: Desk[] = [
      {
        id: "d1",
        label: "A-01",
        zone: "North",
        status: "ACTIVE",
        amenities: ["MONITOR"],
      },
    ];

    expect(bookingLabel(booking, desks)).toContain("02 Feb 2026");
    expect(bookingLabel(booking, desks)).toContain("Morning");
    expect(bookingLabel(booking, desks)).toContain("A-01 (North)");
  });

  it("falls back to deskId when desk is missing", () => {
    const booking: Booking = {
      id: "b1",
      deskId: "missing",
      userId: "u1",
      date: "2026-02-02",
      slot: "AFTERNOON",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    expect(bookingLabel(booking, [])).toContain("missing");
  });
});
