import type { Booking, Desk } from "../types";
import { formatYmdDisplay, slotLabel } from "./date";

/**
 * Formats a booking into a human-friendly, single-line label.
 *
 * Used for UI dropdowns/lists where a booking needs a compact descriptor.
 * Falls back to the raw `deskId` when the desk cannot be found.
 *
 * @param booking Booking to label.
 * @param desks Desk inventory used to resolve `deskId` into label/zone.
 * @returns A label like: `02 Feb 2026 · Morning · Desk N1 (North)`.
 */
export function bookingLabel(booking: Booking, desks: Desk[]) {
  const desk = desks.find((d) => d.id === booking.deskId);
  const deskName = desk ? `${desk.label} (${desk.zone})` : booking.deskId;
  return `${formatYmdDisplay(booking.date)} · ${slotLabel(booking.slot)} · ${deskName}`;
}
