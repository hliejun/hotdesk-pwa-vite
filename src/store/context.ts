import { createContext } from "react";
import type { Amenity, BookingSlot, DeskStatus } from "../types";
import type { AppState, ThemeMode, UiState } from "./reducer";

export interface AppActions {
  bootstrap: () => Promise<void>;
  setCurrentUser: (userId: string) => void;
  setView: (view: UiState["view"]) => void;
  setSelectedDate: (date: string) => void;
  setSelectedSlot: (slot: BookingSlot) => void;
  setZoneFilter: (zone: string) => void;
  setQuery: (query: string) => void;
  setAmenityFilters: (amenityFilters: Record<Amenity, boolean>) => void;
  setTheme: (theme: ThemeMode) => void;
  clearError: () => void;

  retryQueuedRequests: () => Promise<void>;

  bookDesk: (
    deskId: string,
    details?: string,
    bookForUserId?: string,
  ) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  reportFault: (input: {
    deskId: string;
    description: string;
    bookingId?: string;
  }) => Promise<void>;
  refresh: () => Promise<void>;
  resetDb: () => Promise<void>;
  resetUserSettings: () => Promise<void>;
  resetAll: () => Promise<void>;

  adminUpsertDesk: (input: {
    id?: string;
    label: string;
    zone: string;
    status: DeskStatus;
    amenities?: Amenity[];
  }) => Promise<void>;
  adminUpdateConfig: (input: { maxBookingsPerDay: number }) => Promise<void>;
  adminDeleteDesk: (input: { deskId: string }) => Promise<void>;
  adminResolveFault: (input: { faultId: string }) => Promise<void>;
  adminClearBookings: () => Promise<void>;
  adminClearIssues: () => Promise<void>;
}

export interface AppContextValue {
  state: AppState;
  actions: AppActions;
}

export const AppContext = createContext<AppContextValue | null>(null);
