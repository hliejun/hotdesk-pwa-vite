import type { Amenity, Desk } from "../types";
import type { DeskFilterState } from "../components/DeskFilters";

/**
 * Applies the current desk filter state (zone, query, required amenities).
 */
export function matchesDeskFilters(desk: Desk, filters: DeskFilterState) {
  if (filters.zone !== "ALL" && desk.zone !== filters.zone) return false;

  const q = filters.query.trim().toLowerCase();
  if (q) {
    const hay = `${desk.label} ${desk.zone}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  const required = Object.entries(filters.amenities)
    .filter(([, v]) => v)
    .map(([k]) => k as Amenity);

  if (required.length > 0) {
    for (const a of required) {
      if (!desk.amenities.includes(a)) return false;
    }
  }

  return true;
}

/**
 * Computes a weighted amenity score for suggestion/sorting purposes.
 * Higher score indicates a "better equipped" desk.
 */
export function deskAmenityScore(desk: Desk) {
  // Higher = better suggestion
  const weights: Record<Amenity, number> = {
    MONITOR: 4,
    ADJUSTABLE: 3,
    WINDOW: 2,
    PRIVATE: 2,
    COMMUNAL: 1,
  };
  return desk.amenities.reduce((acc, a) => acc + (weights[a] ?? 0), 0);
}
