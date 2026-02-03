import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Bookings from "./Bookings";
import { createAppContextValue, renderWithApp } from "../../test/testUtils";
import { initialState } from "../../store/reducer";
import type { Booking, Desk } from "../../types";
import { addDays, todayYmd } from "../../lib/date";

describe("Bookings स्क्रीन", () => {
  it("renders booking widget and keeps results hidden until search", async () => {
    const user = userEvent.setup();
    renderWithApp(<Bookings />);

    expect(screen.getByText(/book a desk/i)).toBeInTheDocument();
    expect(screen.getByText(/my bookings/i)).toBeInTheDocument();

    // Results section is hidden by default
    expect(screen.queryByText(/available desks/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(screen.getByText(/available desks/i)).toBeInTheDocument();
  });

  it("allows admin to book on behalf (calls bookDesk with selected userId)", async () => {
    const user = userEvent.setup();

    const desks: Desk[] = [
      {
        id: "d1",
        label: "Desk N1",
        zone: "North",
        status: "ACTIVE",
        amenities: ["COMMUNAL"],
      },
    ];

    const bookDesk = vi.fn(async () => {});

    const base = createAppContextValue().state;
    const ctx = createAppContextValue({
      state: {
        ...base,
        auth: { currentUserId: "u2" },
        db: {
          ...base.db,
          desks,
          bookings: [],
        },
      },
      actions: {
        bookDesk,
      },
    });

    renderWithApp(<Bookings />, { ctx });

    await user.click(screen.getByRole("button", { name: /^search$/i }));

    // Wait for results to render (search skeleton is time-based)
    const bookButton = await screen.findByRole("button", { name: /^book$/i });

    // Admin-only selector
    const bookFor = screen.getByLabelText(/book for/i);
    await user.selectOptions(bookFor, "u1");

    await user.click(bookButton);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^book$/i }));

    expect(bookDesk).toHaveBeenCalledWith("d1", undefined, "u1");
  });

  it("shows my upcoming bookings inside the collapsed section", async () => {
    const user = userEvent.setup();

    const desks: Desk[] = [
      {
        id: "d1",
        label: "Desk N1",
        zone: "North",
        status: "ACTIVE",
        amenities: ["COMMUNAL"],
      },
    ];

    const mine: Booking = {
      id: "b1",
      deskId: "d1",
      userId: "u1",
      date: addDays(todayYmd(), 1),
      slot: "MORNING",
      status: "ACTIVE",
      createdAt: new Date(1).toISOString(),
    };

    const cancelBooking = vi.fn(async (_bookingId: string) => {});

    const ctx = createAppContextValue({
      state: {
        ...initialState,
        auth: { currentUserId: "u1" },
        db: {
          ...initialState.db,
          desks,
          bookings: [mine],
        },
        ui: { ...initialState.ui, busyCount: 0 },
      },
      actions: {
        cancelBooking,
      },
    });

    renderWithApp(<Bookings />, { ctx });

    // Expand the details
    await user.click(screen.getByText(/my bookings/i));

    expect(screen.getByText(/desk n1/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(cancelBooking).toHaveBeenCalledWith("b1");
  });
});
