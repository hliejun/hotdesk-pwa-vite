import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { AppContext, type AppActions, type AppContextValue } from "../store";
import { initialState, type AppState } from "../store/reducer";

export function createMockActions(
  overrides: Partial<AppActions> = {},
): AppActions {
  return {
    bootstrap: vi.fn(async () => {}),
    setCurrentUser: vi.fn(() => {}),
    setView: vi.fn(() => {}),
    setSelectedDate: vi.fn(() => {}),
    setSelectedSlot: vi.fn(() => {}),
    setZoneFilter: vi.fn(() => {}),
    setQuery: vi.fn(() => {}),
    setAmenityFilters: vi.fn(() => {}),
    setTheme: vi.fn(() => {}),
    clearError: vi.fn(() => {}),

    retryQueuedRequests: vi.fn(async () => {}),

    bookDesk: vi.fn(async () => {}),
    cancelBooking: vi.fn(async () => {}),
    reportFault: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    resetDb: vi.fn(async () => {}),
    resetUserSettings: vi.fn(async () => {}),
    resetAll: vi.fn(async () => {}),

    adminUpsertDesk: vi.fn(async () => {}),
    adminUpdateConfig: vi.fn(async () => {}),
    adminDeleteDesk: vi.fn(async () => {}),
    adminResolveFault: vi.fn(async () => {}),
    adminClearBookings: vi.fn(async () => {}),
    adminClearIssues: vi.fn(async () => {}),

    ...overrides,
  };
}

export function createAppContextValue(
  overrides: {
    state?: AppState;
    actions?: Partial<AppActions>;
  } = {},
): AppContextValue {
  return {
    state: overrides.state ?? initialState,
    actions: createMockActions(overrides.actions),
  };
}

export function mockConfirm(initialValue?: boolean) {
  const spy = vi.spyOn(window, "confirm");
  if (typeof initialValue === "boolean") spy.mockReturnValue(initialValue);
  return spy;
}

export function renderWithApp(
  ui: React.ReactElement,
  options: {
    route?: string;
    path?: string;
    ctx?: AppContextValue;
  } = {},
) {
  const route = options.route ?? "/";
  const path = options.path ?? "/";
  const ctx = options.ctx ?? createAppContextValue();

  return render(
    <AppContext.Provider value={ctx}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>,
  );
}

export function renderWithLayout(
  layout: React.ReactElement,
  child: React.ReactElement,
  options: { route?: string; ctx?: AppContextValue } = {},
) {
  const route = options.route ?? "/";
  const ctx = options.ctx ?? createAppContextValue();

  return render(
    <AppContext.Provider value={ctx}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={layout}>
            <Route path="/" element={child} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppContext.Provider>,
  );
}
