import type { Amenity } from "../../types";

export interface DeskFilterState {
  zone: string;
  query: string;
  amenities: Record<Amenity, boolean>;
}

export const ALL_AMENITIES: Amenity[] = [
  "MONITOR",
  "WINDOW",
  "ADJUSTABLE",
  "PRIVATE",
  "COMMUNAL",
];

export function defaultAmenityFilter(): Record<Amenity, boolean> {
  return {
    MONITOR: false,
    WINDOW: false,
    ADJUSTABLE: false,
    PRIVATE: false,
    COMMUNAL: false,
  };
}
