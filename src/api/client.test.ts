import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { apiClient } from "./client";
import { loadDb, resetDb, saveDb } from "./db";

async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getSnapshot returns seeded db", async () => {
    const p = apiClient.getSnapshot();
    await advance(200);
    const res = await p;

    expect(res.data.version).toBe(1);
    expect(res.data.users.length).toBeGreaterThan(0);
    expect(res.data.desks.length).toBeGreaterThan(0);
  });

  it("listUsers/listDesks/listBookings/listFaults return arrays", async () => {
    const usersP = apiClient.listUsers();
    const desksP = apiClient.listDesks();
    const bookingsP = apiClient.listBookings();
    const faultsP = apiClient.listFaults();

    await advance(150);

    expect((await usersP).data.length).toBeGreaterThan(0);
    expect((await desksP).data.length).toBeGreaterThan(0);
    expect((await bookingsP).data).toEqual([]);
    expect((await faultsP).data).toEqual([]);
  });

  it("createBooking enforces availability and per-slot uniqueness", async () => {
    const p1 = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
      details: "Need a quiet spot",
    });
    await advance(250);
    const booking = (await p1).data;
    expect(booking.deskId).toBe("d1");
    expect(booking.userId).toBe("u1");
    expect(booking.status).toBe("ACTIVE");
    expect(booking.details).toBe("Need a quiet spot");

    // Same user, same slot, different desk
    const p2 = apiClient.createBooking({
      deskId: "d2",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    const p2Assert = expect(p2).rejects.toThrow(
      "You already have a booking for this time slot",
    );
    await advance(250);
    await p2Assert;

    // Different user, same desk+slot
    const p3 = apiClient.createBooking({
      deskId: "d1",
      userId: "u3",
      date: "2026-02-02",
      slot: "MORNING",
    });
    const p3Assert = expect(p3).rejects.toThrow(
      "Desk is already booked for that slot",
    );
    await advance(250);
    await p3Assert;
  });

  it("createBooking rejects inactive desks", async () => {
    const db = loadDb();
    const desk = db.desks.find((d) => d.id === "d1");
    if (!desk) throw new Error("seed desk missing");
    desk.status = "INACTIVE";
    saveDb(db);

    const p = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    const assertP = expect(p).rejects.toThrow("Desk is inactive");
    await advance(250);
    await assertP;
  });

  it("createBooking enforces daily booking limit", async () => {
    const db = loadDb();
    db.config.maxBookingsPerDay = 1;
    saveDb(db);

    const p1 = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    await p1;

    const p2 = apiClient.createBooking({
      deskId: "d2",
      userId: "u1",
      date: "2026-02-02",
      slot: "AFTERNOON",
    });
    const p2Assert = expect(p2).rejects.toThrow("Daily limit reached (1)");
    await advance(250);
    await p2Assert;
  });

  it("createBooking allows admin to bypass daily limit", async () => {
    const db = loadDb();
    db.config.maxBookingsPerDay = 1;
    saveDb(db);

    const p1 = apiClient.createBooking({
      deskId: "d1",
      userId: "u2",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    await p1;

    const p2 = apiClient.createBooking({
      deskId: "d2",
      userId: "u2",
      date: "2026-02-02",
      slot: "AFTERNOON",
    });
    await advance(250);
    await expect(p2).resolves.toBeTruthy();
  });

  it("createBooking does not allow non-admin to book on behalf", async () => {
    const p = apiClient.createBooking({
      deskId: "d1",
      userId: "u3",
      actorUserId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    const assertP = expect(p).rejects.toThrow("Not allowed to book on behalf");
    await advance(250);
    await assertP;
  });

  it("createBooking enforces daily limit for employees even when booked by admin on behalf", async () => {
    const db = loadDb();
    db.config.maxBookingsPerDay = 1;
    saveDb(db);

    const p1 = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      actorUserId: "u2",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    await p1;

    const p2 = apiClient.createBooking({
      deskId: "d2",
      userId: "u1",
      actorUserId: "u2",
      date: "2026-02-02",
      slot: "AFTERNOON",
    });
    const assertP = expect(p2).rejects.toThrow("Daily limit reached (1)");
    await advance(250);
    await assertP;
  });

  it("cancelBooking allows owner or admin", async () => {
    const create = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    const booking = (await create).data;

    const notAllowed = apiClient.cancelBooking({
      bookingId: booking.id,
      userId: "u3",
    });
    const notAllowedAssert = expect(notAllowed).rejects.toThrow(
      "Not allowed to cancel this booking",
    );
    await advance(250);
    await notAllowedAssert;

    const asAdmin = apiClient.cancelBooking({
      bookingId: booking.id,
      userId: "u2",
    });
    await advance(250);
    const cancelled = (await asAdmin).data;
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).toBeTruthy();

    const alreadyCancelled = apiClient.cancelBooking({
      bookingId: booking.id,
      userId: "u2",
    });
    const alreadyCancelledAssert = expect(alreadyCancelled).rejects.toThrow(
      "Booking already cancelled",
    );
    await advance(250);
    await alreadyCancelledAssert;
  });

  it("createFault creates an OPEN fault and can attach a booking", async () => {
    const bookingP = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    const booking = (await bookingP).data;

    const p = apiClient.createFault({
      deskId: "d1",
      reporterUserId: "u1",
      description: "Monitor not working",
      bookingId: booking.id,
    });
    await advance(250);
    const fault = (await p).data;

    expect(fault.deskId).toBe("d1");
    expect(fault.reporterUserId).toBe("u1");
    expect(fault.status).toBe("OPEN");
    expect(fault.description).toBe("Monitor not working");
    expect(fault.bookingId).toBe(booking.id);

    const snap = apiClient.getSnapshot();
    await advance(250);
    const db = (await snap).data;
    expect(db.faults.some((f) => f.id === fault.id)).toBe(true);
  });

  it("createFault validates description and bookingId", async () => {
    const tooShort = apiClient.createFault({
      deskId: "d1",
      reporterUserId: "u1",
      description: "x",
    });
    const tooShortAssert = expect(tooShort).rejects.toThrow(
      "Please describe the issue",
    );
    await advance(250);
    await tooShortAssert;

    const badBooking = apiClient.createFault({
      deskId: "d1",
      reporterUserId: "u1",
      description: "Monitor not working",
      bookingId: "does-not-exist",
    });
    const badBookingAssert =
      expect(badBooking).rejects.toThrow("Booking not found");
    await advance(250);
    await badBookingAssert;
  });

  it("resolveFault requires admin and marks the fault RESOLVED", async () => {
    const create = apiClient.createFault({
      deskId: "d2",
      reporterUserId: "u1",
      description: "Chair broken",
    });
    await advance(250);
    const fault = (await create).data;

    const notAllowed = apiClient.resolveFault({
      faultId: fault.id,
      userId: "u1",
    });
    const notAllowedAssert = expect(notAllowed).rejects.toThrow(
      "Not allowed to resolve faults",
    );
    await advance(250);
    await notAllowedAssert;

    const ok = apiClient.resolveFault({ faultId: fault.id, userId: "u2" });
    await advance(250);
    const resolved = (await ok).data;
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeTruthy();
    expect(resolved.resolvedByUserId).toBe("u2");

    const alreadyResolved = apiClient.resolveFault({
      faultId: fault.id,
      userId: "u2",
    });
    const alreadyResolvedAssert = expect(alreadyResolved).rejects.toThrow(
      "Fault already resolved",
    );
    await advance(250);
    await alreadyResolvedAssert;
  });

  it("clearBookings and clearIssues require admin and clear collections", async () => {
    const bookingP = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    await bookingP;

    const faultP = apiClient.createFault({
      deskId: "d1",
      reporterUserId: "u1",
      description: "Monitor dead",
    });
    await advance(250);
    await faultP;

    const noBookings = apiClient.clearBookings({ userId: "u1" });
    const noBookingsAssert = expect(noBookings).rejects.toThrow(
      "Not allowed to clear bookings",
    );
    await advance(250);
    await noBookingsAssert;

    const noIssues = apiClient.clearIssues({ userId: "u1" });
    const noIssuesAssert = expect(noIssues).rejects.toThrow(
      "Not allowed to clear issues",
    );
    await advance(250);
    await noIssuesAssert;

    const clearedBookingsP = apiClient.clearBookings({ userId: "u2" });
    await advance(250);
    const clearedBookings = (await clearedBookingsP).data;
    expect(clearedBookings.cleared).toBeGreaterThan(0);

    const clearedIssuesP = apiClient.clearIssues({ userId: "u2" });
    await advance(250);
    const clearedIssues = (await clearedIssuesP).data;
    expect(clearedIssues.cleared).toBeGreaterThan(0);

    const snap = apiClient.getSnapshot();
    await advance(250);
    const db = (await snap).data;
    expect(db.bookings).toHaveLength(0);
    expect(db.faults).toHaveLength(0);
  });

  it("upsertDesk validates and can create a new desk + zone", async () => {
    const missingZone = apiClient.upsertDesk({
      label: "Desk X1",
      zone: "   ",
      status: "ACTIVE",
      amenities: ["COMMUNAL"],
    });
    const missingZoneAssert =
      expect(missingZone).rejects.toThrow("Zone is required");
    await advance(250);
    await missingZoneAssert;

    const create = apiClient.upsertDesk({
      label: "Desk Z9",
      zone: "Zen",
      status: "ACTIVE",
      amenities: ["COMMUNAL", "MONITOR", "MONITOR"],
    });
    await advance(250);
    const desk = (await create).data;
    expect(desk.id).toMatch(/^d\d+$/);
    expect(desk.zone).toBe("Zen");
    expect(desk.amenities).toEqual(["COMMUNAL", "MONITOR"]);

    const snap = apiClient.getSnapshot();
    await advance(200);
    const db = (await snap).data;
    expect(db.config.zones).toContain("Zen");
  });

  it("upsertDesk updates an existing desk and keeps amenities if omitted", async () => {
    const createdP = apiClient.upsertDesk({
      label: "Desk Z1",
      zone: "Zen",
      status: "ACTIVE",
      amenities: ["COMMUNAL", "WINDOW"],
    });
    await advance(250);
    const created = (await createdP).data;

    const updatedP = apiClient.upsertDesk({
      id: created.id,
      label: "Desk Z1 Updated",
      zone: "Zen",
      status: "INACTIVE",
      // amenities omitted
    });
    await advance(250);
    const updated = (await updatedP).data;

    expect(updated.label).toBe("Desk Z1 Updated");
    expect(updated.status).toBe("INACTIVE");
    expect(updated.amenities).toEqual(["COMMUNAL", "WINDOW"]);
  });

  it("deleteDesk removes a desk and cancels any ACTIVE bookings for it", async () => {
    const bookingP = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    const booking = (await bookingP).data;

    const delP = apiClient.deleteDesk({ deskId: "d1" });
    await advance(250);
    await delP;

    const snap = apiClient.getSnapshot();
    await advance(250);
    const db = (await snap).data;
    expect(db.desks.some((d) => d.id === "d1")).toBe(false);

    const cancelled = db.bookings.find((b) => b.id === booking.id);
    expect(cancelled?.status).toBe("CANCELLED");
    expect(cancelled?.cancelledAt).toBeTruthy();
  });

  it("updateConfig validates range 1..20", async () => {
    const badLow = apiClient.updateConfig({ maxBookingsPerDay: 0 });
    const badLowAssert = expect(badLow).rejects.toThrow(
      "maxBookingsPerDay must be 1..20",
    );
    await advance(200);
    await badLowAssert;

    const ok = apiClient.updateConfig({ maxBookingsPerDay: 4.7 });
    await advance(200);
    const cfg = (await ok).data;
    expect(cfg.maxBookingsPerDay).toBe(4);

    const badHigh = apiClient.updateConfig({ maxBookingsPerDay: 999 });
    const badHighAssert = expect(badHigh).rejects.toThrow(
      "maxBookingsPerDay must be 1..20",
    );
    await advance(200);
    await badHighAssert;
  });

  it("reset returns a fresh seeded db", async () => {
    const create = apiClient.createBooking({
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
    });
    await advance(250);
    await create;

    const p = apiClient.reset();
    await advance(250);
    const db = (await p).data;
    expect(db.bookings).toHaveLength(0);
    expect(db.desks.length).toBeGreaterThan(0);
  });
});
