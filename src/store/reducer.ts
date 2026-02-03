import type { Amenity, BookingSlot, DbV1 } from "../types";
import { seedDbV1 } from "../api/db";
import { todayYmd } from "../lib/date";

const ALL_AMENITIES: Amenity[] = [
  "MONITOR",
  "WINDOW",
  "ADJUSTABLE",
  "PRIVATE",
  "COMMUNAL",
];

function defaultAmenityFilters(): Record<Amenity, boolean> {
  return {
    MONITOR: false,
    WINDOW: false,
    ADJUSTABLE: false,
    PRIVATE: false,
    COMMUNAL: false,
  };
}

function normalizeAmenityFilters(input: unknown): Record<Amenity, boolean> {
  const base = defaultAmenityFilters();
  if (!input || typeof input !== "object") return base;
  const rec = input as Record<string, unknown>;
  for (const a of ALL_AMENITIES) {
    const v = rec[a];
    if (typeof v === "boolean") base[a] = v;
  }
  return base;
}

export type BootStatus = "idle" | "loading" | "ready" | "error";

export type ThemeMode = "system" | "light" | "dark";

export interface PendingState {
  refresh: boolean;
  bookDeskId?: string;
  cancelBookingId?: string;
  resetDb: boolean;
  admin: boolean;
}

export interface UiState {
  view: "DESKS" | "MY_BOOKINGS" | "ADMIN";
  selectedDate: string;
  selectedSlot: BookingSlot;
  zoneFilter: "ALL" | string;
  query: string;
  amenityFilters: Record<Amenity, boolean>;
  theme: ThemeMode;
  pending: PendingState;
  busyCount: number;
  error?: string;
  retryCount: number;
}

export interface AppState {
  boot: {
    status: BootStatus;
    lastSyncedAt?: string;
    error?: string;
  };
  auth: {
    currentUserId: string;
  };
  db: DbV1;
  ui: UiState;
}

export type Action =
  | { type: "BOOTSTRAP_START" }
  | { type: "BOOTSTRAP_SUCCESS"; payload: { db: DbV1; syncedAt: string } }
  | { type: "BOOTSTRAP_ERROR"; payload: { message: string } }
  | { type: "APPLY_SNAPSHOT"; payload: { db: DbV1; syncedAt: string } }
  | { type: "RESET_USER_SETTINGS" }
  | { type: "SET_CURRENT_USER"; payload: { userId: string } }
  | { type: "SET_VIEW"; payload: { view: UiState["view"] } }
  | { type: "SET_SELECTED_DATE"; payload: { date: string } }
  | { type: "SET_SELECTED_SLOT"; payload: { slot: BookingSlot } }
  | { type: "SET_ZONE_FILTER"; payload: { zone: string } }
  | { type: "SET_QUERY"; payload: { query: string } }
  | {
      type: "SET_AMENITY_FILTERS";
      payload: { amenityFilters: Record<Amenity, boolean> };
    }
  | { type: "SET_THEME"; payload: { theme: ThemeMode } }
  | {
      type: "SET_PENDING";
      payload: { pending: Partial<PendingState> };
    }
  | { type: "SET_RETRY_COUNT"; payload: { retryCount: number } }
  | { type: "SET_BUSY"; payload: { delta: 1 | -1 } }
  | { type: "SET_ERROR"; payload: { message?: string } };

export interface PersistedUi {
  currentUserId?: string;
  view?: UiState["view"];
  selectedDate?: string;
  selectedSlot?: BookingSlot;
  zoneFilter?: string;
  query?: string;
  amenityFilters?: Record<Amenity, boolean>;
  theme?: ThemeMode;
}

export const initialState: AppState = {
  boot: { status: "idle" },
  auth: { currentUserId: "u1" },
  db: seedDbV1(),
  ui: {
    view: "DESKS",
    selectedDate: todayYmd(),
    selectedSlot: "MORNING",
    zoneFilter: "ALL",
    query: "",
    amenityFilters: defaultAmenityFilters(),
    theme: "system",
    pending: {
      refresh: false,
      resetDb: false,
      admin: false,
    },
    busyCount: 0,
    retryCount: 0,
  },
};

function normalizeBookingSlot(value: unknown): BookingSlot | undefined {
  if (value === "MORNING") return "MORNING";
  if (value === "NOON") return "NOON";
  if (value === "AFTERNOON") return "AFTERNOON";
  if (value === "EVENING") return "EVENING";

  // Back-compat for older persisted values.
  if (value === "AM") return "MORNING";
  if (value === "PM") return "AFTERNOON";

  return undefined;
}

export function applyPersistedUi(
  state: AppState,
  persisted?: PersistedUi,
): AppState {
  if (!persisted) return state;
  return {
    ...state,
    auth: {
      ...state.auth,
      currentUserId: persisted.currentUserId ?? state.auth.currentUserId,
    },
    ui: {
      ...state.ui,
      view: persisted.view ?? state.ui.view,
      selectedDate: persisted.selectedDate ?? state.ui.selectedDate,
      selectedSlot:
        normalizeBookingSlot(persisted.selectedSlot) ?? state.ui.selectedSlot,
      zoneFilter: persisted.zoneFilter ?? state.ui.zoneFilter,
      query: persisted.query ?? state.ui.query,
      amenityFilters:
        persisted.amenityFilters !== undefined
          ? normalizeAmenityFilters(persisted.amenityFilters)
          : state.ui.amenityFilters,
      theme: persisted.theme ?? state.ui.theme,
    },
  };
}

export function rootReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "BOOTSTRAP_START":
      return { ...state, boot: { status: "loading" } };
    case "BOOTSTRAP_SUCCESS":
      return {
        ...state,
        boot: { status: "ready", lastSyncedAt: action.payload.syncedAt },
        db: action.payload.db,
      };
    case "BOOTSTRAP_ERROR":
      return {
        ...state,
        boot: { status: "error", error: action.payload.message },
        ui: { ...state.ui, error: action.payload.message },
      };
    case "APPLY_SNAPSHOT":
      return {
        ...state,
        boot: { status: "ready", lastSyncedAt: action.payload.syncedAt },
        db: action.payload.db,
      };
    case "RESET_USER_SETTINGS":
      return {
        ...state,
        auth: { currentUserId: initialState.auth.currentUserId },
        ui: {
          ...initialState.ui,
          selectedDate: todayYmd(),
        },
      };
    case "SET_CURRENT_USER":
      return {
        ...state,
        auth: { ...state.auth, currentUserId: action.payload.userId },
      };
    case "SET_VIEW":
      return { ...state, ui: { ...state.ui, view: action.payload.view } };
    case "SET_SELECTED_DATE":
      return {
        ...state,
        ui: { ...state.ui, selectedDate: action.payload.date },
      };
    case "SET_SELECTED_SLOT":
      return {
        ...state,
        ui: { ...state.ui, selectedSlot: action.payload.slot },
      };
    case "SET_ZONE_FILTER":
      return { ...state, ui: { ...state.ui, zoneFilter: action.payload.zone } };
    case "SET_QUERY":
      return { ...state, ui: { ...state.ui, query: action.payload.query } };
    case "SET_AMENITY_FILTERS":
      return {
        ...state,
        ui: { ...state.ui, amenityFilters: action.payload.amenityFilters },
      };
    case "SET_THEME":
      return {
        ...state,
        ui: { ...state.ui, theme: action.payload.theme },
      };
    case "SET_PENDING":
      return {
        ...state,
        ui: {
          ...state.ui,
          pending: {
            ...state.ui.pending,
            ...action.payload.pending,
          },
        },
      };
    case "SET_RETRY_COUNT":
      return {
        ...state,
        ui: { ...state.ui, retryCount: action.payload.retryCount },
      };
    case "SET_BUSY":
      return {
        ...state,
        ui: {
          ...state.ui,
          busyCount: Math.max(0, state.ui.busyCount + action.payload.delta),
        },
      };
    case "SET_ERROR":
      return { ...state, ui: { ...state.ui, error: action.payload.message } };
    default:
      return state;
  }
}
