import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Layout from "./Layout";
import { createAppContextValue, renderWithLayout } from "../../test/testUtils";

describe("Layout", () => {
  it("renders top navigation", () => {
    renderWithLayout(<Layout />, <div>Child</div>);
    expect(
      screen.getByRole("link", { name: "Company home" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bookings/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /all desks/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /admin/i })).toBeInTheDocument();
  });

  it("toggles theme via the header button", async () => {
    const user = userEvent.setup();
    const ctx = createAppContextValue();

    renderWithLayout(<Layout />, <div>Child</div>, { route: "/", ctx });

    await user.click(screen.getByRole("button", { name: /theme:\s*system/i }));
    expect(ctx.actions.setTheme).toHaveBeenCalledWith("light");
  });

  it("switches user via the profile menu", async () => {
    const user = userEvent.setup();
    const ctx = createAppContextValue();
    const targetUser =
      ctx.state.db.users.find((u) => u.id !== ctx.state.auth.currentUserId) ??
      ctx.state.db.users[0];

    renderWithLayout(<Layout />, <div>Child</div>, { route: "/", ctx });

    await user.click(screen.getByRole("button", { name: /select user/i }));
    await user.click(
      screen.getByRole("menuitemradio", {
        name: new RegExp(targetUser.name, "i"),
      }),
    );

    expect(ctx.actions.setCurrentUser).toHaveBeenCalledWith(targetUser.id);
  });

  it("does not render the error modal (toast-only errors)", () => {
    const base = createAppContextValue();
    const ctx = createAppContextValue({
      state: {
        ...base.state,
        ui: {
          ...base.state.ui,
          error: "Boom",
          retryCount: 2,
        },
      },
    });

    renderWithLayout(<Layout />, <div>Child</div>, { route: "/", ctx });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
