import { describe, it, expect, beforeEach } from "vitest";
import { loadDb, saveDb, seedDbV1 } from "./db";

function setRawDb(raw: unknown) {
  window.localStorage.setItem("hotdesk-db", JSON.stringify(raw));
}

describe("db", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loadDb seeds and persists when missing", () => {
    expect(window.localStorage.getItem("hotdesk-db")).toBeNull();

    const db = loadDb();
    expect(db.version).toBe(1);
    expect(db.users.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("hotdesk-db")).toContain('"version":1');
  });

  it("loadDb reseeds when JSON is invalid", () => {
    window.localStorage.setItem("hotdesk-db", "{");
    const db = loadDb();
    expect(db.version).toBe(1);
  });

  it("loadDb reseeds when version mismatch", () => {
    setRawDb({ version: 999, users: [], desks: [], bookings: [], faults: [] });
    const db = loadDb();
    expect(db.version).toBe(1);
    expect(db.desks.length).toBeGreaterThan(0);
  });

  it("migrates legacy weekly limit to daily limit and removes maxBookingsPerWeek", () => {
    const legacy = seedDbV1() as unknown as {
      version: number;
      config: Record<string, unknown>;
    };

    legacy.config = {
      maxBookingsPerWeek: 3.8,
      zones: ["North"],
    };

    setRawDb(legacy);
    const db = loadDb();

    expect(db.config.maxBookingsPerDay).toBe(3);
    expect(
      (db.config as unknown as { maxBookingsPerWeek?: unknown })
        .maxBookingsPerWeek,
    ).toBeUndefined();
  });

  it("defaults maxBookingsPerDay to 4 if legacy weekly value is unusable", () => {
    const legacy = seedDbV1() as unknown as {
      version: number;
      config: Record<string, unknown>;
    };

    legacy.config = {
      maxBookingsPerWeek: "n/a",
    };

    setRawDb(legacy);
    const db = loadDb();
    expect(db.config.maxBookingsPerDay).toBe(4);
  });

  it("migrates booking slots AM/PM to MORNING/AFTERNOON and ensures faults array exists", () => {
    const legacy = seedDbV1() as unknown as {
      bookings?: unknown;
      faults?: unknown;
    };
    legacy.bookings = [
      {
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "AM",
        status: "ACTIVE",
        createdAt: new Date(0).toISOString(),
      },
      {
        id: "b2",
        deskId: "d2",
        userId: "u1",
        date: "2026-02-02",
        slot: "PM",
        status: "ACTIVE",
        createdAt: new Date(0).toISOString(),
      },
    ];
    delete legacy.faults;

    setRawDb(legacy);
    const db = loadDb();

    expect(db.bookings[0].slot).toBe("MORNING");
    expect(db.bookings[1].slot).toBe("AFTERNOON");
    expect(Array.isArray(db.faults)).toBe(true);
  });

  it("migrates desk.features into amenities when amenities missing", () => {
    const legacy = seedDbV1() as unknown as {
      desks?: unknown;
    };
    legacy.desks = [
      {
        id: "d1",
        label: "Desk N1",
        zone: "North",
        status: "ACTIVE",
        // legacy shape
        features: ["Monitor", "Near window"],
      },
    ];

    setRawDb(legacy);
    const db = loadDb();

    expect(db.desks[0].amenities).toContain("COMMUNAL");
    expect(db.desks[0].amenities).toContain("MONITOR");
    expect(db.desks[0].amenities).toContain("WINDOW");
    expect(
      (db.desks[0] as unknown as { features?: unknown }).features,
    ).toBeUndefined();
  });

  it("saveDb persists provided db", () => {
    const db = seedDbV1();
    db.config.maxBookingsPerDay = 9;
    saveDb(db);

    const raw = window.localStorage.getItem("hotdesk-db");
    expect(raw).toContain('"maxBookingsPerDay":9');
  });
});
