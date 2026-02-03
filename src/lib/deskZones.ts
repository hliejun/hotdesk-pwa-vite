import type { Desk } from "../types";

/**
 * Returns a sorted list of unique zone names from a desk inventory.
 */
export function zonesFromDesks(desks: Desk[]): string[] {
  const set = new Set<string>();
  for (const desk of desks) {
    set.add(desk.zone);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
