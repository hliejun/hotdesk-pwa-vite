import type { Amenity, Booking, DbV1, Desk, Fault, User } from "../types";
import {
  getLocalStorageItem,
  safeJsonParse,
  setLocalStorageItem,
} from "../lib/storage";

const DB_KEY = "hotdesk-db";

function seedUsers(): User[] {
  return [
    { id: "u1", name: "Demo User", role: "EMPLOYEE" },
    { id: "u2", name: "Alex Admin", role: "ADMIN" },
    { id: "u3", name: "Sam Staff", role: "EMPLOYEE" },
  ];
}

function seedDesks(): Desk[] {
  const zones = ["North", "South", "East", "West"];
  const desks: Desk[] = [];
  let i = 1;
  for (const zone of zones) {
    for (let n = 1; n <= 6; n++) {
      const amenities: Amenity[] = [];

      // Make sure every desk has a "type" for filtering
      amenities.push(n % 4 === 0 ? "PRIVATE" : "COMMUNAL");

      if (n % 3 === 0) amenities.push("MONITOR");
      if (n % 2 === 0) amenities.push("WINDOW");
      if (n % 5 === 0) amenities.push("ADJUSTABLE");

      desks.push({
        id: `d${i}`,
        label: `Desk ${zone[0]}${n}`,
        zone,
        status: "ACTIVE",
        amenities,
      });
      i++;
    }
  }
  return desks;
}

export function seedDbV1(): DbV1 {
  return {
    version: 1,
    users: seedUsers(),
    desks: seedDesks(),
    bookings: [],
    faults: [],
    config: {
      maxBookingsPerDay: 4,
      zones: ["North", "South", "East", "West"],
    },
  };
}

export function loadDb(): DbV1 {
  const raw = getLocalStorageItem(DB_KEY);
  if (!raw) {
    const seeded = seedDbV1();
    saveDb(seeded);
    return seeded;
  }

  const parsed = safeJsonParse<DbV1>(raw);
  if (!parsed.ok || !parsed.value || parsed.value.version !== 1) {
    const seeded = seedDbV1();
    saveDb(seeded);
    return seeded;
  }

  // Lightweight migration for older persisted shapes
  type LegacyDesk = Omit<Desk, "amenities"> & {
    amenities?: unknown;
    features?: unknown;
  };

  const db = parsed.value;
  const desks = db.desks as unknown as LegacyDesk[];

  // Config migration: weekly limit -> daily limit
  const cfg = db.config as unknown as {
    maxBookingsPerDay?: unknown;
    maxBookingsPerWeek?: unknown;
    zones?: unknown;
  };
  if (!Number.isFinite(cfg.maxBookingsPerDay as number)) {
    const fromWeek = Number(cfg.maxBookingsPerWeek);
    cfg.maxBookingsPerDay = Number.isFinite(fromWeek)
      ? Math.max(1, Math.min(20, Math.floor(fromWeek)))
      : 4;
  }
  if (Number.isFinite(cfg.maxBookingsPerWeek as number)) {
    delete cfg.maxBookingsPerWeek;
  }

  // Slot migration for older persisted bookings (AM/PM -> MORNING/AFTERNOON)
  const bookings = db.bookings as unknown as Booking[];
  for (const b of bookings) {
    const slot = (b as unknown as { slot?: unknown }).slot;
    if (slot === "AM") (b as unknown as { slot: string }).slot = "MORNING";
    if (slot === "PM") (b as unknown as { slot: string }).slot = "AFTERNOON";
  }

  // Add missing collections from older persisted shapes
  if (!Array.isArray((db as unknown as { faults?: unknown }).faults)) {
    (db as unknown as { faults: Fault[] }).faults = [];
  }

  for (const desk of desks) {
    if (!Array.isArray(desk.amenities)) {
      const amenities: Amenity[] = [];

      // Default to communal if we don't know
      amenities.push("COMMUNAL");

      // Legacy: desk.features: ["Monitor"|"Near window"|...]
      if (Array.isArray(desk.features)) {
        if (
          desk.features.some((f) => String(f).toLowerCase().includes("monitor"))
        ) {
          amenities.push("MONITOR");
        }
        if (
          desk.features.some((f) => String(f).toLowerCase().includes("window"))
        ) {
          amenities.push("WINDOW");
        }
      }

      (desk as Desk).amenities = Array.from(new Set(amenities));
      delete desk.features;
    }
  }

  return db;
}

export function saveDb(db: DbV1) {
  setLocalStorageItem(DB_KEY, JSON.stringify(db));
}

export function resetDb() {
  const seeded = seedDbV1();
  saveDb(seeded);
  return seeded;
}
