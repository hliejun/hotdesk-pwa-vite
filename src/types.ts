export type Role = "EMPLOYEE" | "ADMIN";

// 3-hour slots from 08:00 to 20:00
export type BookingSlot = "MORNING" | "NOON" | "AFTERNOON" | "EVENING";

export type DeskStatus = "ACTIVE" | "INACTIVE";

export type BookingStatus = "ACTIVE" | "CANCELLED";

export type Amenity =
  | "MONITOR"
  | "WINDOW"
  | "ADJUSTABLE"
  | "PRIVATE"
  | "COMMUNAL";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Desk {
  id: string;
  label: string;
  zone: string;
  status: DeskStatus;
  amenities: Amenity[];
}

export interface Booking {
  id: string;
  deskId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  slot: BookingSlot;
  status: BookingStatus;
  createdAt: string; // ISO timestamp
  details?: string; // optional notes/reason
  cancelledAt?: string; // ISO timestamp
}

export type FaultStatus = "OPEN" | "RESOLVED";

export interface Fault {
  id: string;
  deskId: string;
  reporterUserId: string;
  bookingId?: string;
  status: FaultStatus;
  description: string;
  createdAt: string; // ISO timestamp
  resolvedAt?: string; // ISO timestamp
  resolvedByUserId?: string;
}

export interface AppConfig {
  maxBookingsPerDay: number;
  zones: string[];
}

export interface DbV1 {
  version: 1;
  users: User[];
  desks: Desk[];
  bookings: Booking[];
  faults: Fault[];
  config: AppConfig;
}
