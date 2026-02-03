import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Home from "./Home";
import { createAppContextValue, renderWithApp } from "../../test/testUtils";
import { addDays, todayYmd } from "../../lib/date";

describe("Home स्क्रीन", () => {
  it("renders the booking card", () => {
    renderWithApp(<Home />);
    expect(screen.getByText(/book a desk/i)).toBeInTheDocument();
    expect(screen.getByText(/your next booking/i)).toBeInTheDocument();
    expect(screen.getByText(/office occupancy/i)).toBeInTheDocument();
  });

  it("wires up search and refresh", async () => {
    const user = userEvent.setup();

    const ctx = createAppContextValue({
      state: {
        ...createAppContextValue().state,
      },
    });

    renderWithApp(<Home />, { ctx, path: "/*" });

    await user.type(
      screen.getByPlaceholderText(/desk label, zone/i),
      "Desk N1",
    );

    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(ctx.actions.setQuery).toHaveBeenCalledWith("Desk N1");

    await user.click(screen.getByRole("button", { name: /refresh/i }));
    expect(ctx.actions.refresh).toHaveBeenCalledTimes(1);
  });

  it("cancels an upcoming booking (Cancel this slot is not shown)", async () => {
    const user = userEvent.setup();
    const base = createAppContextValue().state;

    const bookingId = "b1";
    const deskId = base.db.desks[0]?.id ?? "d1";

    const ctx = createAppContextValue({
      state: {
        ...base,
        ui: {
          ...base.ui,
          selectedDate: todayYmd(),
          selectedSlot: "MORNING",
        },
        db: {
          ...base.db,
          bookings: [
            {
              id: bookingId,
              userId: base.auth.currentUserId,
              deskId,
              date: addDays(todayYmd(), 1),
              slot: "MORNING",
              status: "ACTIVE",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    });

    renderWithApp(<Home />, { ctx, path: "/*" });

    expect(
      screen.queryByRole("button", { name: /cancel this slot/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(ctx.actions.cancelBooking).toHaveBeenCalledWith(bookingId);
  });

  it("updates date/slot controls", async () => {
    const user = userEvent.setup();
    const base = createAppContextValue().state;

    const ctx = createAppContextValue({
      state: {
        ...base,
      },
    });

    renderWithApp(<Home />, { ctx, path: "/*" });

    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), "2026-01-01");
    expect(ctx.actions.setSelectedDate).toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText(/^slot$/i), "AFTERNOON");
    expect(ctx.actions.setSelectedSlot).toHaveBeenCalledWith("AFTERNOON");
  });
});
