import type { Booking, BookingSlot } from "../types";
import { compareYmdSlot } from "./date";

/**
 * Returns ACTIVE bookings for a given date+slot.
 *
 * @param bookings Full booking list.
 * @param date Date in `YYYY-MM-DD` format.
 * @param slot Slot to filter by.
 */
export function activeBookingsForSlot(
  bookings: Booking[],
  date: string,
  slot: BookingSlot,
) {
  return bookings.filter(
    (b) => b.status === "ACTIVE" && b.date === date && b.slot === slot,
  );
}

/**
 * Builds a map of `deskId -> booking` for quick lookup when rendering desk cards.
 *
 * If multiple bookings exist for the same desk in the input list, the last one wins.
 */
export function bookingByDeskId(bookings: Booking[]) {
  const map = new Map<string, Booking>();
  for (const booking of bookings) map.set(booking.deskId, booking);
  return map;
}

/**
 * Finds the current user's ACTIVE booking for a specific date+slot.
 */
export function myActiveBookingForSlot(
  bookings: Booking[],
  userId: string,
  date: string,
  slot: BookingSlot,
) {
  return bookings.find(
    (b) =>
      b.status === "ACTIVE" &&
      b.userId === userId &&
      b.date === date &&
      b.slot === slot,
  );
}

/**
 * Returns all bookings for a desk by a given user, sorted by date+slot descending.
 */
export function myBookingsForDeskSorted(
  bookings: Booking[],
  userId: string,
  deskId: string,
) {
  return bookings
    .filter((b) => b.userId === userId && b.deskId === deskId)
    .slice()
    .sort((a, b) => compareYmdSlot(b.date, b.slot, a.date, a.slot));
}
