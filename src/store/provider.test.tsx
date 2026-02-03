import React, { useContext, useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppProvider } from "./provider";
import { AppContext, type AppContextValue } from "./context";
import { seedDbV1 } from "../api/db";
import type { Booking, Desk } from "../types";

vi.mock("../api/client", () => {
  return {
    apiClient: {
      getSnapshot: vi.fn(),
      createBooking: vi.fn(),
      cancelBooking: vi.fn(),
      createFault: vi.fn(),
      resolveFault: vi.fn(),
      deleteDesk: vi.fn(),
      clearBookings: vi.fn(),
      clearIssues: vi.fn(),
      reset: vi.fn(),
      upsertDesk: vi.fn(),
      updateConfig: vi.fn(),
      listBookings: vi.fn(),
      listDesks: vi.fn(),
      listUsers: vi.fn(),
      listFaults: vi.fn(),
    },
  };
});

import { apiClient } from "../api/client";

function Capture({ onValue }: { onValue: (v: AppContextValue) => void }) {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("AppContext missing");
  useEffect(() => {
    onValue(ctx);
  }, [ctx, onValue]);
  return null;
}

describe("AppProvider", () => {
  it("bootstraps on mount and persists UI", async () => {
    const db = seedDbV1();
    const snap: Awaited<ReturnType<typeof apiClient.getSnapshot>> = {
      data: db,
    };
    vi.mocked(apiClient.getSnapshot).mockResolvedValue(snap);

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(apiClient.getSnapshot).toHaveBeenCalledTimes(1);
      expect(latest?.state.boot.status).toBe("ready");
    });

    latest?.actions.setCurrentUser("u3");

    await waitFor(() => {
      const raw = window.localStorage.getItem("hotdesk-ui");
      expect(raw).toContain("u3");
    });
  });

  it("applies persisted UI when valid, ignores when invalid", async () => {
    window.localStorage.setItem(
      "hotdesk-ui",
      JSON.stringify({
        currentUserId: "u2",
        view: "ADMIN",
        zoneFilter: "North",
      }),
    );

    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: seedDbV1() });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.auth.currentUserId).toBe("u2");
      expect(latest?.state.ui.view).toBe("ADMIN");
      expect(latest?.state.ui.zoneFilter).toBe("North");
    });

    window.localStorage.setItem("hotdesk-ui", "{");

    let latest2: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest2 = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest2?.state.ui.view).toBeDefined();
    });
  });

  it("bookDesk calls createBooking then refreshes snapshot", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });
    vi.mocked(apiClient.createBooking).mockResolvedValue({
      data: {
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
        createdAt: new Date(0).toISOString(),
      },
    });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.bookDesk("d1", "Need a quiet spot");

    expect(apiClient.createBooking).toHaveBeenCalledTimes(1);
    expect(apiClient.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        actorUserId: "u1",
        details: "Need a quiet spot",
      }),
    );
    expect(apiClient.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it("handles API errors by setting ui.error", async () => {
    vi.mocked(apiClient.getSnapshot).mockRejectedValueOnce(new Error("Nope"));

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("error");
      expect(latest?.state.ui.error).toBe("Nope");
    });
  });

  it("uses a generic error message for non-Error throws", async () => {
    vi.mocked(apiClient.getSnapshot).mockRejectedValueOnce("nope");

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("error");
      expect(latest?.state.ui.error).toBe("Something went wrong");
    });
  });

  it("updates UI state via setter actions", async () => {
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: seedDbV1() });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    latest?.actions.setView("ADMIN");
    latest?.actions.setSelectedDate("2026-01-01");
    latest?.actions.setSelectedSlot("AFTERNOON");
    latest?.actions.setZoneFilter("North");
    latest?.actions.setQuery("Desk N1");
    latest?.actions.setAmenityFilters({
      MONITOR: true,
      WINDOW: false,
      ADJUSTABLE: false,
      PRIVATE: false,
      COMMUNAL: true,
    });

    await waitFor(() => {
      expect(latest?.state.ui.view).toBe("ADMIN");
      expect(latest?.state.ui.selectedDate).toBe("2026-01-01");
      expect(latest?.state.ui.selectedSlot).toBe("AFTERNOON");
      expect(latest?.state.ui.zoneFilter).toBe("North");
      expect(latest?.state.ui.query).toBe("Desk N1");
      expect(latest?.state.ui.amenityFilters.MONITOR).toBe(true);
      expect(latest?.state.ui.amenityFilters.COMMUNAL).toBe(true);
    });
  });

  it("cancelBooking calls apiClient.cancelBooking then refreshes snapshot", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });

    const cancelled: Booking = {
      id: "b1",
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
      status: "CANCELLED",
      createdAt: new Date(0).toISOString(),
      cancelledAt: new Date(1).toISOString(),
    };
    vi.mocked(apiClient.cancelBooking).mockResolvedValue({ data: cancelled });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.cancelBooking("b1");

    expect(apiClient.cancelBooking).toHaveBeenCalledWith({
      bookingId: "b1",
      userId: "u1",
    });
    expect(apiClient.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it("resetDb calls apiClient.reset and applies snapshot", async () => {
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: seedDbV1() });
    vi.mocked(apiClient.reset).mockResolvedValue({ data: seedDbV1() });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.resetDb();

    expect(apiClient.reset).toHaveBeenCalledTimes(1);
  });

  it("admin actions call their api method then refresh", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });
    vi.mocked(apiClient.updateConfig).mockResolvedValue({
      data: { ...db.config, maxBookingsPerDay: 4 },
    });

    const desk: Desk = {
      id: "d1",
      label: "Desk N1",
      zone: "North",
      status: "ACTIVE",
      amenities: ["COMMUNAL"],
    };
    vi.mocked(apiClient.upsertDesk).mockResolvedValue({ data: desk });
    vi.mocked(apiClient.resolveFault).mockResolvedValue({
      data: {
        id: "f1",
        deskId: "d1",
        reporterUserId: "u1",
        status: "RESOLVED",
        description: "Broken chair",
        createdAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
        resolvedAt: new Date("2026-02-01T11:00:00.000Z").toISOString(),
        resolvedByUserId: "u1",
      },
    });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.adminUpdateConfig({ maxBookingsPerDay: 4 });
    await latest?.actions.adminUpsertDesk({
      id: "d1",
      label: "Desk N1",
      zone: "North",
      status: "ACTIVE",
      amenities: ["COMMUNAL"],
    });
    await latest?.actions.adminResolveFault({ faultId: "f1" });

    expect(apiClient.updateConfig).toHaveBeenCalledTimes(1);
    expect(apiClient.upsertDesk).toHaveBeenCalledTimes(1);
    expect(apiClient.resolveFault).toHaveBeenCalledTimes(1);
    expect(apiClient.getSnapshot).toHaveBeenCalledTimes(4);
  });

  it("reportFault calls apiClient.createFault then refreshes snapshot", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });
    vi.mocked(apiClient.createFault).mockResolvedValue({
      data: {
        id: "f1",
        deskId: "d1",
        reporterUserId: "u1",
        status: "OPEN",
        description: "Monitor dead",
        createdAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
      },
    });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.reportFault({
      deskId: "d1",
      description: "Monitor dead",
      bookingId: "b1",
    });

    expect(apiClient.createFault).toHaveBeenCalledWith({
      deskId: "d1",
      reporterUserId: "u1",
      description: "Monitor dead",
      bookingId: "b1",
    });
    expect(apiClient.getSnapshot).toHaveBeenCalledTimes(2);
  });

  it("refresh error sets ui.error and clearError clears it", async () => {
    vi.mocked(apiClient.getSnapshot)
      .mockResolvedValueOnce({ data: seedDbV1() })
      .mockRejectedValueOnce(new Error("Network"));

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.refresh();

    await waitFor(() => {
      expect(latest?.state.ui.error).toBe("Network");
    });

    latest?.actions.clearError();

    await waitFor(() => {
      expect(latest?.state.ui.error).toBeUndefined();
    });
  });

  it("enqueues retryable refresh and processes it via retryQueuedRequests", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot)
      .mockResolvedValueOnce({ data: db })
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce({ data: db });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.refresh();

    await waitFor(() => {
      expect(latest?.state.ui.retryCount).toBe(1);
      expect(latest?.state.ui.error).toBe("Failed to fetch");
    });

    await latest?.actions.retryQueuedRequests();

    await waitFor(() => {
      expect(latest?.state.ui.retryCount).toBe(0);
    });
  });

  it("bookDesk uses admin on-behalf userId and trims empty details", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });
    vi.mocked(apiClient.createBooking).mockResolvedValue({
      data: {
        id: "b1",
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
        status: "ACTIVE",
        createdAt: new Date(0).toISOString(),
      },
    });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    latest?.actions.setCurrentUser("u2");

    await waitFor(() => {
      expect(latest?.state.auth.currentUserId).toBe("u2");
    });

    await latest?.actions.bookDesk("d1", "   ", "u1");

    expect(apiClient.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        actorUserId: "u2",
        details: undefined,
      }),
    );

    expect(
      await screen.findByText(/Booking confirmed for Demo User\./),
    ).toBeTruthy();
  });

  it("adminDeleteDesk/adminClearBookings/adminClearIssues call their api method then refresh", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });
    vi.mocked(apiClient.deleteDesk).mockResolvedValue({
      data: { deskId: "d1" },
    });
    vi.mocked(apiClient.clearBookings).mockResolvedValue({
      data: { cleared: 0 },
    });
    vi.mocked(apiClient.clearIssues).mockResolvedValue({
      data: { cleared: 0 },
    });

    let latest: AppContextValue | undefined;
    render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    await latest?.actions.adminDeleteDesk({ deskId: "d1" });
    await latest?.actions.adminClearBookings();
    await latest?.actions.adminClearIssues();

    expect(apiClient.deleteDesk).toHaveBeenCalledTimes(1);
    expect(apiClient.clearBookings).toHaveBeenCalledTimes(1);
    expect(apiClient.clearIssues).toHaveBeenCalledTimes(1);
    expect(apiClient.getSnapshot).toHaveBeenCalledTimes(4);
  });

  it("applies theme to documentElement and wires matchMedia listeners (modern + legacy)", async () => {
    const db = seedDbV1();
    vi.mocked(apiClient.getSnapshot).mockResolvedValue({ data: db });

    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(
      () =>
        ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener,
          removeEventListener,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        }) as unknown as MediaQueryList,
    );

    let latest: AppContextValue | undefined;
    const { unmount } = render(
      <AppProvider>
        <Capture onValue={(v) => (latest = v)} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(latest?.state.boot.status).toBe("ready");
    });

    expect(addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    latest?.actions.setTheme("dark");
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    latest?.actions.setTheme("system");
    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    });

    unmount();
    expect(removeEventListener).toHaveBeenCalled();

    // legacy matchMedia path
    const addListener = vi.fn();
    const removeListener = vi.fn();
    window.matchMedia = vi.fn(
      () =>
        ({
          matches: false,
          media: "",
          onchange: null,
          addListener,
          removeListener,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        }) as unknown as MediaQueryList,
    );

    render(
      <AppProvider>
        <Capture onValue={() => undefined} />
      </AppProvider>,
    );

    await waitFor(() => {
      expect(addListener).toHaveBeenCalled();
    });

    window.matchMedia = originalMatchMedia;
  });
});
