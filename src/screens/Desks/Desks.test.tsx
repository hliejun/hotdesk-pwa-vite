import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Desks from "./Desks";
import { createAppContextValue, renderWithApp } from "../../test/testUtils";
import { initialState } from "../../store/reducer";

describe("Desks स्क्रीन", () => {
  it("renders the desk inventory", () => {
    renderWithApp(<Desks />);
    expect(screen.getByText(/all desks/i)).toBeInTheDocument();
  });

  it("supports filters, refresh, and booking an available desk", async () => {
    const actions = {
      refresh: vi.fn(async () => {}),
      setQuery: vi.fn(() => {}),
      setZoneFilter: vi.fn(() => {}),
      setAmenityFilters: vi.fn(() => {}),
      bookDesk: vi.fn(async () => {}),
    };

    const ctx = createAppContextValue({
      actions,
      state: {
        ...initialState,
        boot: { status: "ready" },
        auth: { currentUserId: "u1" },
        ui: {
          ...initialState.ui,
          selectedDate: "2099-01-02",
          selectedSlot: "MORNING",
          busyCount: 0,
        },
        db: {
          ...initialState.db,
          users: [
            { id: "u1", name: "Alice", role: "EMPLOYEE" },
            { id: "u2", name: "Bob", role: "EMPLOYEE" },
          ],
          desks: [
            {
              id: "d1",
              label: "Desk A",
              zone: "North",
              status: "ACTIVE",
              amenities: [],
            },
          ],
          bookings: [],
          faults: [],
          config: { maxBookingsPerDay: 4, zones: ["North"] },
        },
      },
    });

    renderWithApp(<Desks />, { ctx });

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(actions.refresh).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/desk label or zone/i), {
      target: { value: "Desk" },
    });
    expect(actions.setQuery).toHaveBeenCalledWith("Desk");

    fireEvent.change(screen.getByRole("combobox", { name: /zone/i }), {
      target: { value: "North" },
    });
    expect(actions.setZoneFilter).toHaveBeenCalledWith("North");

    fireEvent.click(screen.getByRole("button", { name: /monitor/i }));
    expect(actions.setAmenityFilters).toHaveBeenCalled();

    // Open desk actions menu
    fireEvent.click(
      screen.getByRole("button", { name: /desk actions for desk a/i }),
    );
    expect(screen.getByRole("menu", { name: /desk actions/i })).toBeVisible();

    fireEvent.click(screen.getByRole("menuitem", { name: /^book$/i }));

    // Confirm booking from modal
    expect(screen.getByRole("dialog", { name: /book desk a/i })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^book$/i }));

    await waitFor(() => {
      expect(actions.bookDesk).toHaveBeenCalledWith("d1", undefined);
    });
  });

  it("shows cancel booking when booked by me, and hides Book when locked out by another booking", async () => {
    const actions = {
      cancelBooking: vi.fn(async () => {}),
    };

    const ctx = createAppContextValue({
      actions,
      state: {
        ...initialState,
        boot: { status: "ready" },
        auth: { currentUserId: "u1" },
        ui: {
          ...initialState.ui,
          selectedDate: "2099-01-02",
          selectedSlot: "MORNING",
          busyCount: 0,
          pending: { ...initialState.ui.pending, cancelBookingId: undefined },
        },
        db: {
          ...initialState.db,
          users: [
            { id: "u1", name: "Alice", role: "EMPLOYEE" },
            { id: "u2", name: "Bob", role: "EMPLOYEE" },
          ],
          desks: [
            {
              id: "d1",
              label: "Desk A",
              zone: "North",
              status: "ACTIVE",
              amenities: [],
            },
            {
              id: "d2",
              label: "Desk B",
              zone: "North",
              status: "ACTIVE",
              amenities: [],
            },
          ],
          bookings: [
            {
              id: "b1",
              deskId: "d1",
              userId: "u1",
              date: "2099-01-02",
              slot: "MORNING",
              status: "ACTIVE",
              createdAt: new Date("2099-01-01T10:00:00.000Z").toISOString(),
            },
          ],
          faults: [],
          config: { maxBookingsPerDay: 4, zones: ["North"] },
        },
      },
    });

    renderWithApp(<Desks />, { ctx });

    // Desk A is booked by me -> cancel option available
    fireEvent.click(
      screen.getByRole("button", { name: /desk actions for desk a/i }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /cancel booking/i }));

    await waitFor(() => {
      expect(actions.cancelBooking).toHaveBeenCalledWith("b1");
    });

    // Desk B should not allow booking because I'm already booked on Desk A for the same slot.
    fireEvent.click(
      screen.getByRole("button", { name: /desk actions for desk b/i }),
    );
    expect(
      screen.queryByRole("menuitem", { name: /^book$/i }),
    ).not.toBeInTheDocument();
  });
});
