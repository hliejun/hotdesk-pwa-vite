import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Admin from "./Admin";
import {
  createAppContextValue,
  mockConfirm,
  renderWithApp,
} from "../../test/testUtils";

describe("Admin स्क्रीन", () => {
  it("shows access denied for non-admin user", () => {
    renderWithApp(<Admin />);
    expect(screen.getByText(/you must be an admin/i)).toBeInTheDocument();
  });

  it("renders admin controls for admin user", () => {
    const ctx = createAppContextValue({
      state: {
        ...createAppContextValue().state,
        auth: { currentUserId: "u2" },
      },
    });

    renderWithApp(<Admin />, { ctx });
    expect(screen.getByText(/config/i)).toBeInTheDocument();
    expect(screen.getByText(/add desk/i)).toBeInTheDocument();
  });

  it("supports core admin actions", async () => {
    const user = userEvent.setup();

    const ctx = createAppContextValue({
      state: {
        ...createAppContextValue().state,
        auth: { currentUserId: "u2" },
      },
    });

    renderWithApp(<Admin />, { ctx });

    const maxInput = screen.getByLabelText(/max bookings per day/i);
    await user.clear(maxInput);
    await user.type(maxInput, "5");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(ctx.actions.adminUpdateConfig).toHaveBeenCalledWith({
      maxBookingsPerDay: 5,
    });

    await user.click(screen.getByRole("button", { name: /monitor/i }));

    const labelInput = screen.getByPlaceholderText(/desk n1/i);
    await user.type(labelInput, "Desk Test");
    await user.click(screen.getByRole("button", { name: /create/i }));
    expect(ctx.actions.adminUpsertDesk).toHaveBeenCalled();

    expect(screen.getByPlaceholderText(/desk n1/i)).toHaveValue("");

    // Manage desks zones are collapsed by default
    await user.click(screen.getByText("North"));

    const statusToggle = screen.getByRole("button", {
      name: /toggle status for desk n1/i,
    });
    await user.click(statusToggle);
    expect(ctx.actions.adminUpsertDesk).toHaveBeenCalledWith(
      expect.objectContaining({ status: "INACTIVE" }),
    );

    await user.click(
      screen.getByRole("button", { name: /desk actions for desk n1/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

    const deleteDialog = screen.getByRole("dialog", { name: /delete desk\?/i });
    await user.click(
      within(deleteDialog).getByRole("button", { name: /^delete$/i }),
    );
    expect(ctx.actions.adminDeleteDesk).toHaveBeenCalledWith(
      expect.objectContaining({ deskId: "d1" }),
    );

    // Confirm prompts for danger zone actions.
    const confirmSpy = mockConfirm(true);

    await user.click(screen.getByText(/danger zone/i));
    await user.click(screen.getByRole("button", { name: /reset db/i }));
    expect(ctx.actions.resetDb).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Reset settings" }));
    expect(ctx.actions.resetUserSettings).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(ctx.actions.resetAll).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it("shows upcoming bookings agenda and unresolved faults actions", async () => {
    const user = userEvent.setup();

    const base = createAppContextValue().state;
    const ctx = createAppContextValue({
      state: {
        ...base,
        auth: { currentUserId: "u2" },
        db: {
          ...base.db,
          bookings: [
            {
              id: "b_up",
              deskId: "d1",
              userId: "u1",
              date: "2099-01-01",
              slot: "MORNING",
              status: "ACTIVE",
              createdAt: new Date("2098-12-31T10:00:00.000Z").toISOString(),
              details: "Need quiet",
            },
          ],
          faults: [
            {
              id: "f1",
              deskId: "d1",
              reporterUserId: "u3",
              bookingId: "b_up",
              status: "OPEN",
              description: "Monitor flickering",
              createdAt: new Date("2098-12-31T11:00:00.000Z").toISOString(),
            },
          ],
        },
      },
      actions: {
        cancelBooking: vi.fn(async () => {}),
        adminResolveFault: vi.fn(async () => {}),
      },
    });

    renderWithApp(<Admin />, { ctx });

    await user.click(screen.getByRole("button", { name: /revoke/i }));
    expect(ctx.actions.cancelBooking).toHaveBeenCalledWith("b_up");

    await user.click(screen.getByRole("button", { name: /^resolve$/i }));
    expect(ctx.actions.adminResolveFault).toHaveBeenCalledWith({
      faultId: "f1",
    });
  });
});
