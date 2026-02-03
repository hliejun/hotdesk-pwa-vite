import type { BookingSlot } from "../types";

export type { BookingSlot } from "../types";

/**
 * Pads a number to 2 digits.
 *
 * @example
 * pad2(3) // "03"
 */
export function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

/**
 * Returns today's date in local time as `YYYY-MM-DD`.
 */
export function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Parses a `YYYY-MM-DD` string into a local `Date`.
 */
export function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formats a `YYYY-MM-DD` string into a human-friendly label.
 *
 * If `ymd` does not match the expected format, it is returned as-is.
 */
export function formatYmdDisplay(ymd: string) {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(ymd);
  if (!match) return ymd;
  const [y, m, d] = ymd.split("-");
  const monthIndex = Number(m) - 1;
  const month =
    monthIndex >= 0 && monthIndex < 12
      ? [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ][monthIndex]
      : m;
  return `${d} ${month} ${y}`;
}

/**
 * Formats a JS Date into `YYYY-MM-DD` in local time.
 */
export function formatYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Adds a number of days to a `YYYY-MM-DD` and returns `YYYY-MM-DD`.
 */
export function addDays(ymd: string, days: number) {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

/**
 * Returns the Monday of the ISO week for the given `YYYY-MM-DD`.
 */
export function startOfIsoWeek(ymd: string) {
  const d = parseYmd(ymd);
  // ISO week starts Monday. JS getDay: 0=Sun..6=Sat
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return formatYmd(d);
}

/**
 * Returns the Sunday of the ISO week for the given `YYYY-MM-DD`.
 */
export function endOfIsoWeek(ymd: string) {
  return addDays(startOfIsoWeek(ymd), 6);
}

/**
 * Checks if a `YYYY-MM-DD` string falls between two bounds (inclusive).
 */
export function isBetweenYmd(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

export const BOOKING_SLOTS: BookingSlot[] = [
  "MORNING",
  "NOON",
  "AFTERNOON",
  "EVENING",
];

/**
 * Returns a stable ordering rank for a booking slot.
 */
export function slotRank(slot: BookingSlot) {
  return BOOKING_SLOTS.indexOf(slot);
}

/**
 * Returns a human label for a booking slot.
 */
export function slotLabel(slot: BookingSlot) {
  switch (slot) {
    case "MORNING":
      return "Morning";
    case "NOON":
      return "Noon";
    case "AFTERNOON":
      return "Afternoon";
    case "EVENING":
      return "Evening";
  }
}

/**
 * Returns the time window metadata for a slot.
 */
export function slotWindow(slot: BookingSlot): {
  startHour: number;
  endHour: number;
  range: string;
  duration: string;
} {
  const startHour = (() => {
    switch (slot) {
      case "MORNING":
        return 8;
      case "NOON":
        return 11;
      case "AFTERNOON":
        return 14;
      case "EVENING":
        return 17;
    }
  })();
  const endHour = startHour + 3;
  const range = `${pad2(startHour)}:00–${pad2(endHour)}:00`;
  const duration = "3h";
  return { startHour, endHour, range, duration };
}

/**
 * Sort comparator for (date, slot) pairs.
 *
 * @returns negative if a<b, positive if a>b, 0 if equal.
 */
export function compareYmdSlot(
  aDate: string,
  aSlot: BookingSlot,
  bDate: string,
  bSlot: BookingSlot,
) {
  if (aDate !== bDate) return aDate.localeCompare(bDate);
  return slotRank(aSlot) - slotRank(bSlot);
}

function currentSlotRankNow() {
  const d = new Date();
  const hours = d.getHours() + d.getMinutes() / 60;

  // Before the first bookable window, treat as before MORNING.
  if (hours < 8) return 0;
  if (hours < 11) return slotRank("MORNING");
  if (hours < 14) return slotRank("NOON");
  if (hours < 17) return slotRank("AFTERNOON");
  if (hours < 20) return slotRank("EVENING");

  // After the last slot ends, there are no upcoming slots today.
  return BOOKING_SLOTS.length;
}

export function currentSlotNow(): BookingSlot | undefined {
  const d = new Date();
  const hours = d.getHours() + d.getMinutes() / 60;
  if (hours < 8) return "MORNING";
  if (hours < 11) return "MORNING";
  if (hours < 14) return "NOON";
  if (hours < 17) return "AFTERNOON";
  if (hours < 20) return "EVENING";
  return undefined;
}

/**
 * Whether a booking should be considered "upcoming" relative to now.
 *
 * The comparison is done in local time.
 */
export function isUpcomingBooking(dateYmd: string, slot: BookingSlot) {
  const today = todayYmd();
  const rankNow = currentSlotRankNow();

  if (dateYmd > today) return true;
  if (dateYmd < today) return false;
  return slotRank(slot) >= rankNow;
}

/**
 * Formats a timestamp/date into a locale-friendly string.
 */
export function formatDateTime(value: string | number | Date) {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
