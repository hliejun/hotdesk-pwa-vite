import type { Amenity } from "../../types";

export function AmenityLabel(amenity: Amenity) {
  switch (amenity) {
    case "MONITOR":
      return "Monitor";
    case "WINDOW":
      return "Window";
    case "ADJUSTABLE":
      return "Adjustable";
    case "PRIVATE":
      return "Private";
    case "COMMUNAL":
      return "Communal";
  }
}
