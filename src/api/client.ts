import type {
  Amenity,
  Booking,
  BookingSlot,
  DbV1,
  Desk,
  Fault,
  User,
} from "../types";
import { loadDb, resetDb, saveDb } from "./db";

export interface ApiResult<T> {
  data: T;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function apiError(message: string): never {
  throw new Error(message);
}

function withDb<T>(fn: (db: DbV1) => T) {
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  return result;
}

function isDeskAvailable(
  db: DbV1,
  deskId: string,
  date: string,
  slot: BookingSlot,
) {
  return !db.bookings.some(
    (b) =>
      b.status === "ACTIVE" &&
      b.deskId === deskId &&
      b.date === date &&
      b.slot === slot,
  );
}

function userHasBookingInSlot(
  db: DbV1,
  userId: string,
  date: string,
  slot: BookingSlot,
) {
  return db.bookings.some(
    (b) =>
      b.status === "ACTIVE" &&
      b.userId === userId &&
      b.date === date &&
      b.slot === slot,
  );
}

function countUserBookingsOnDate(db: DbV1, userId: string, date: string) {
  return db.bookings.filter(
    (b) => b.status === "ACTIVE" && b.userId === userId && b.date === date,
  ).length;
}

export const apiClient = {
  async getSnapshot(): Promise<ApiResult<DbV1>> {
    await delay(150);
    const db = loadDb();
    return { data: db };
  },

  async listUsers(): Promise<ApiResult<User[]>> {
    await delay(120);
    return withDb((db) => ({ data: db.users }));
  },

  async listDesks(): Promise<ApiResult<Desk[]>> {
    await delay(120);
    return withDb((db) => ({ data: db.desks }));
  },

  async listBookings(): Promise<ApiResult<Booking[]>> {
    await delay(120);
    return withDb((db) => ({ data: db.bookings }));
  },

  async listFaults(): Promise<ApiResult<Fault[]>> {
    await delay(120);
    return withDb((db) => ({ data: db.faults }));
  },

  async createBooking(input: {
    deskId: string;
    userId: string;
    actorUserId?: string;
    date: string;
    slot: BookingSlot;
    details?: string;
  }): Promise<ApiResult<Booking>> {
    await delay(220);

    return withDb((db) => {
      const desk = db.desks.find((d) => d.id === input.deskId);
      if (!desk) apiError("Desk not found");
      if (desk.status !== "ACTIVE") apiError("Desk is inactive");

      const targetUser = db.users.find((u) => u.id === input.userId);
      if (!targetUser) apiError("User not found");

      const actorUserId = input.actorUserId ?? input.userId;
      const actorUser = db.users.find((u) => u.id === actorUserId);
      if (!actorUser) apiError("User not found");

      if (actorUser.id !== targetUser.id && actorUser.role !== "ADMIN") {
        apiError("Not allowed to book on behalf");
      }

      if (userHasBookingInSlot(db, input.userId, input.date, input.slot)) {
        apiError("You already have a booking for this time slot");
      }

      if (!isDeskAvailable(db, input.deskId, input.date, input.slot)) {
        apiError("Desk is already booked for that slot");
      }

      // Booking limit is per-day and applies to the *target* user.
      // Admin users are not subject to the limit.
      if (targetUser.role !== "ADMIN") {
        const dayCount = countUserBookingsOnDate(db, input.userId, input.date);
        if (dayCount >= db.config.maxBookingsPerDay) {
          apiError(`Daily limit reached (${db.config.maxBookingsPerDay})`);
        }
      }

      const booking: Booking = {
        id: crypto.randomUUID(),
        deskId: input.deskId,
        userId: input.userId,
        date: input.date,
        slot: input.slot,
        status: "ACTIVE",
        createdAt: nowIso(),
        details: (() => {
          const trimmed = String(input.details ?? "").trim();
          return trimmed ? trimmed : undefined;
        })(),
      };

      db.bookings.push(booking);
      return { data: booking };
    });
  },

  async createFault(input: {
    deskId: string;
    reporterUserId: string;
    description: string;
    bookingId?: string;
  }): Promise<ApiResult<Fault>> {
    await delay(200);

    return withDb((db) => {
      const desk = db.desks.find((d) => d.id === input.deskId);
      if (!desk) apiError("Desk not found");

      const user = db.users.find((u) => u.id === input.reporterUserId);
      if (!user) apiError("User not found");

      const description = String(input.description ?? "").trim();
      if (description.length < 3) apiError("Please describe the issue");

      const bookingId = (() => {
        const cleaned = String(input.bookingId ?? "").trim();
        return cleaned ? cleaned : undefined;
      })();

      if (bookingId) {
        const exists = db.bookings.some((b) => b.id === bookingId);
        if (!exists) apiError("Booking not found");
      }

      const fault: Fault = {
        id: crypto.randomUUID(),
        deskId: input.deskId,
        reporterUserId: input.reporterUserId,
        bookingId,
        status: "OPEN",
        description,
        createdAt: nowIso(),
      };

      db.faults.push(fault);
      return { data: fault };
    });
  },

  async resolveFault(input: {
    faultId: string;
    userId: string;
  }): Promise<ApiResult<Fault>> {
    await delay(180);

    return withDb((db) => {
      const user = db.users.find((u) => u.id === input.userId);
      if (!user) apiError("User not found");
      if (user.role !== "ADMIN") apiError("Not allowed to resolve faults");

      const fault = db.faults.find((f) => f.id === input.faultId);
      if (!fault) apiError("Fault not found");
      if (fault.status !== "OPEN") apiError("Fault already resolved");

      fault.status = "RESOLVED";
      fault.resolvedAt = nowIso();
      fault.resolvedByUserId = input.userId;

      return { data: fault };
    });
  },

  async clearBookings(input: {
    userId: string;
  }): Promise<ApiResult<{ cleared: number }>> {
    await delay(180);

    return withDb((db) => {
      const user = db.users.find((u) => u.id === input.userId);
      if (!user) apiError("User not found");
      if (user.role !== "ADMIN") apiError("Not allowed to clear bookings");

      const cleared = db.bookings.length;
      db.bookings = [];
      return { data: { cleared } };
    });
  },

  async clearIssues(input: {
    userId: string;
  }): Promise<ApiResult<{ cleared: number }>> {
    await delay(180);

    return withDb((db) => {
      const user = db.users.find((u) => u.id === input.userId);
      if (!user) apiError("User not found");
      if (user.role !== "ADMIN") apiError("Not allowed to clear issues");

      const cleared = db.faults.length;
      db.faults = [];
      return { data: { cleared } };
    });
  },

  async cancelBooking(input: {
    bookingId: string;
    userId: string;
  }): Promise<ApiResult<Booking>> {
    await delay(200);

    return withDb((db) => {
      const booking = db.bookings.find((b) => b.id === input.bookingId);
      if (!booking) apiError("Booking not found");
      if (booking.status !== "ACTIVE") apiError("Booking already cancelled");

      // Allow owner or admin
      const user = db.users.find((u) => u.id === input.userId);
      if (!user) apiError("User not found");
      if (booking.userId !== input.userId && user.role !== "ADMIN") {
        apiError("Not allowed to cancel this booking");
      }

      booking.status = "CANCELLED";
      booking.cancelledAt = nowIso();

      return { data: booking };
    });
  },

  async upsertDesk(input: {
    id?: string;
    label: string;
    zone: string;
    status: "ACTIVE" | "INACTIVE";
    amenities?: Amenity[];
  }): Promise<ApiResult<Desk>> {
    await delay(220);

    return withDb((db) => {
      const zone = input.zone.trim();
      if (!zone) apiError("Zone is required");

      const label = input.label.trim();
      if (!label) apiError("Label is required");

      const nextAmenities = (() => {
        if (input.amenities === undefined) return undefined;
        const cleaned = Array.from(
          new Set(
            input.amenities
              .map((a) => String(a).trim())
              .filter(Boolean) as Amenity[],
          ),
        );
        if (cleaned.length === 0) apiError("Select at least one amenity");
        return cleaned;
      })();

      if (input.id) {
        const existing = db.desks.find((d) => d.id === input.id);
        if (!existing) apiError("Desk not found");
        existing.label = label;
        existing.zone = zone;
        existing.status = input.status;
        if (nextAmenities) existing.amenities = nextAmenities;
        return { data: existing };
      }

      const desk: Desk = {
        id: `d${Math.max(0, ...db.desks.map((d) => Number(d.id.slice(1)) || 0)) + 1}`,
        label,
        zone,
        status: input.status,
        amenities: nextAmenities ?? ["COMMUNAL"],
      };
      db.desks.push(desk);

      if (!db.config.zones.includes(zone)) {
        db.config.zones.push(zone);
      }

      return { data: desk };
    });
  },

  async deleteDesk(input: {
    deskId: string;
  }): Promise<ApiResult<{ deskId: string }>> {
    await delay(200);

    return withDb((db) => {
      const idx = db.desks.findIndex((d) => d.id === input.deskId);
      if (idx === -1) apiError("Desk not found");

      // Cancel any ACTIVE bookings for this desk (keeps history intact).
      for (const b of db.bookings) {
        if (b.deskId !== input.deskId) continue;
        if (b.status !== "ACTIVE") continue;
        b.status = "CANCELLED";
        b.cancelledAt = nowIso();
      }

      db.desks.splice(idx, 1);
      return { data: { deskId: input.deskId } };
    });
  },

  async updateConfig(input: {
    maxBookingsPerDay: number;
  }): Promise<ApiResult<DbV1["config"]>> {
    await delay(160);
    return withDb((db) => {
      const n = Math.floor(input.maxBookingsPerDay);
      if (!Number.isFinite(n) || n < 1 || n > 20)
        apiError("maxBookingsPerDay must be 1..20");
      db.config.maxBookingsPerDay = n;
      return { data: db.config };
    });
  },

  async reset(): Promise<ApiResult<DbV1>> {
    await delay(180);
    const db = resetDb();
    return { data: db };
  },
};
