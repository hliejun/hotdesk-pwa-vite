import { describe, expect, it } from "vitest";
import type { Booking } from "../types";
import {
  activeBookingsForSlot,
  bookingByDeskId,
  myActiveBookingForSlot,
  myBookingsForDeskSorted,
} from "./bookingQueries";

describe("lib/bookingQueries", () => {
  const base: Omit<
    Booking,
    "id" | "deskId" | "userId" | "date" | "slot" | "status"
  > = {
    createdAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
  };

  it("activeBookingsForSlot filters by ACTIVE + date + slot", () => {
    const bookings: Booking[] = [
      {
        ...base,
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b2",
        deskId: "d2",
        userId: "u2",
        date: "2026-02-02",
        slot: "MORNING",
        status: "CANCELLED",
      },
      {
        ...base,
        id: "b3",
        deskId: "d3",
        userId: "u1",
        date: "2026-02-02",
        slot: "NOON",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b4",
        deskId: "d4",
        userId: "u1",
        date: "2026-02-03",
        slot: "MORNING",
        status: "ACTIVE",
      },
    ];

    expect(activeBookingsForSlot(bookings, "2026-02-02", "MORNING")).toEqual([
      expect.objectContaining({ id: "b1" }),
    ]);
  });

  it("bookingByDeskId maps latest entry per deskId", () => {
    const bookings: Booking[] = [
      {
        ...base,
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b2",
        deskId: "d1",
        userId: "u2",
        date: "2026-02-03",
        slot: "NOON",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b3",
        deskId: "d2",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
      },
    ];

    const map = bookingByDeskId(bookings);
    expect(map.get("d1")?.id).toBe("b2");
    expect(map.get("d2")?.id).toBe("b3");
  });

  it("myActiveBookingForSlot returns the matching ACTIVE booking", () => {
    const bookings: Booking[] = [
      {
        ...base,
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b2",
        deskId: "d2",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "CANCELLED",
      },
      {
        ...base,
        id: "b3",
        deskId: "d3",
        userId: "u2",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
      },
    ];

    expect(
      myActiveBookingForSlot(bookings, "u1", "2026-02-02", "MORNING")?.id,
    ).toBe("b1");
  });

  it("myBookingsForDeskSorted sorts newest first by date+slot", () => {
    const bookings: Booking[] = [
      {
        ...base,
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b2",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "EVENING",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b3",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-03",
        slot: "NOON",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b_other",
        deskId: "d2",
        userId: "u1",
        date: "2026-02-04",
        slot: "MORNING",
        status: "ACTIVE",
      },
      {
        ...base,
        id: "b_other_user",
        deskId: "d1",
        userId: "u2",
        date: "2026-02-05",
        slot: "MORNING",
        status: "ACTIVE",
      },
    ];

    const sorted = myBookingsForDeskSorted(bookings, "u1", "d1");
    expect(sorted.map((b) => b.id)).toEqual(["b3", "b2", "b1"]);
  });
});
