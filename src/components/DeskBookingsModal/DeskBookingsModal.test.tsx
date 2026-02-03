import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Booking, Desk, User } from "../../types";
import { DeskBookingsModal } from "./DeskBookingsModal";

function makeDesk(overrides: Partial<Desk> = {}): Desk {
  return {
    id: "d1",
    label: "Desk N1",
    zone: "North",
    status: "ACTIVE",
    amenities: [],
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    name: "Alice",
    role: "EMPLOYEE",
    ...overrides,
  };
}

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    deskId: "d1",
    userId: "u1",
    date: "2026-02-02",
    slot: "AFTERNOON",
    status: "ACTIVE",
    createdAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
    ...overrides,
  };
}

describe("DeskBookingsModal", () => {
  it("returns null when closed or desk missing", () => {
    const { rerender } = render(
      <DeskBookingsModal
        open={false}
        desk={makeDesk()}
        bookings={[]}
        users={[]}
        busy={false}
        canCancel={false}
        onClose={() => {}}
      />,
    );

    expect(
      screen.queryByRole("dialog", { name: /bookings for/i }),
    ).not.toBeInTheDocument();

    rerender(
      <DeskBookingsModal
        open
        desk={undefined}
        bookings={[]}
        users={[]}
        busy={false}
        canCancel={false}
        onClose={() => {}}
      />,
    );

    expect(
      screen.queryByRole("dialog", { name: /bookings for/i }),
    ).not.toBeInTheDocument();
  });

  it("locks body scroll while open and restores on close", () => {
    const onClose = vi.fn();

    document.body.style.overflow = "auto";

    const { rerender, unmount } = render(
      <DeskBookingsModal
        open
        desk={makeDesk()}
        bookings={[]}
        users={[]}
        busy={false}
        canCancel={false}
        onClose={onClose}
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <DeskBookingsModal
        open={false}
        desk={makeDesk()}
        bookings={[]}
        users={[]}
        busy={false}
        canCancel={false}
        onClose={onClose}
      />,
    );

    expect(document.body.style.overflow).toBe("auto");

    unmount();
  });

  it("filters/sorts upcoming bookings, shows user name fallback, and closes on overlay click", async () => {
    const onClose = vi.fn();

    const desk = makeDesk({ id: "d1", label: "Desk N1", zone: "North" });
    const users: User[] = [makeUser({ id: "u1", name: "Alice" })];

    const bookings: Booking[] = [
      // Definitely past
      makeBooking({ id: "bPast", date: "2000-01-01", slot: "EVENING" }),
      // Future upcoming
      makeBooking({ id: "bSoon", date: "2099-01-02", slot: "AFTERNOON" }),
      // Future upcoming, with unknown user
      makeBooking({
        id: "bLater",
        userId: "uX",
        date: "2099-01-03",
        slot: "MORNING",
      }),
    ];

    const { container } = render(
      <DeskBookingsModal
        open
        desk={desk}
        bookings={bookings}
        users={users}
        busy={false}
        canCancel={false}
        onClose={onClose}
      />,
    );

    const titles = Array.from(container.querySelectorAll(".listTitle")).map(
      (n) => n.textContent ?? "",
    );

    expect(titles).toHaveLength(2);
    expect(titles[0]).toMatch(/Alice · ACTIVE/);
    expect(titles[1]).toMatch(/uX · ACTIVE/);

    // Click outside (overlay)
    const overlay = screen.getByRole("dialog", {
      name: /bookings for desk n1/i,
    });
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clicking inside modal shouldn't close
    const modal = container.querySelector(".modal");
    expect(modal).toBeTruthy();
    if (modal) fireEvent.mouseDown(modal);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Switch tabs also executes tab logic
    fireEvent.click(screen.getByRole("button", { name: /past/i }));
  });

  it("switching desk resets tab to upcoming and past view reverses ordering", async () => {
    const onClose = vi.fn();
    const desk1 = makeDesk({ id: "d1", label: "Desk N1" });
    const desk2 = makeDesk({ id: "d2", label: "Desk N2" });

    const bookings: Booking[] = [
      makeBooking({
        id: "bA",
        deskId: "d1",
        userId: "u1",
        date: "2000-01-02",
        slot: "MORNING",
        createdAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
      }),
      makeBooking({
        id: "bB",
        deskId: "d1",
        userId: "u2",
        date: "2000-01-01",
        slot: "EVENING",
        createdAt: new Date("2026-01-31T10:00:00.000Z").toISOString(),
      }),
    ];

    const { container, rerender } = render(
      <DeskBookingsModal
        open
        desk={desk1}
        bookings={bookings}
        users={[
          makeUser({ id: "u1", name: "Alice" }),
          makeUser({ id: "u2", name: "Bob" }),
        ]}
        busy={false}
        canCancel={false}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /past/i }));

    const titlesPast = Array.from(container.querySelectorAll(".listTitle")).map(
      (n) => n.textContent ?? "",
    );

    // Past tab reverses the ascending sort, so the later date (2000-01-02) shows first.
    expect(titlesPast[0]).toMatch(/Alice · ACTIVE/);
    expect(titlesPast[1]).toMatch(/Bob · ACTIVE/);

    // Changing desk while open should reset tab to upcoming.
    rerender(
      <DeskBookingsModal
        open
        desk={desk2}
        bookings={bookings}
        users={[
          makeUser({ id: "u1", name: "Alice" }),
          makeUser({ id: "u2", name: "Bob" }),
        ]}
        busy={false}
        canCancel={false}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("button", { name: /upcoming/i })).toHaveClass(
      "tabActive",
    );
  });

  it("renders cancel button only when allowed, and handles cancelling state", async () => {
    const onClose = vi.fn();
    const onCancelBooking = vi.fn();

    const booking = makeBooking({
      id: "b1",
      status: "ACTIVE",
      date: "2099-01-02",
      slot: "MORNING",
    });

    render(
      <DeskBookingsModal
        open
        desk={makeDesk()}
        bookings={[booking]}
        users={[makeUser()]}
        busy={false}
        canCancel
        pendingCancelBookingId="b1"
        onCancelBooking={onCancelBooking}
        onClose={onClose}
      />,
    );

    const cancel = screen.getByRole("button", { name: /cancelling/i });
    expect(cancel).toBeDisabled();

    // If booking isn't ACTIVE, no cancel button.
    render(
      <DeskBookingsModal
        open
        desk={makeDesk({ id: "d2" })}
        bookings={[makeBooking({ id: "b2", status: "CANCELLED" })]}
        users={[makeUser()]}
        busy={false}
        canCancel
        onCancelBooking={onCancelBooking}
        onClose={onClose}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /^cancel$/i }),
    ).not.toBeInTheDocument();
  });

  it("updates scroll edge data attributes on scroll", async () => {
    const onClose = vi.fn();

    const bookings: Booking[] = [
      makeBooking({ id: "b1", date: "2099-01-02", slot: "MORNING" }),
      makeBooking({ id: "b2", date: "2099-01-02", slot: "NOON" }),
    ];

    const { container } = render(
      <DeskBookingsModal
        open
        desk={makeDesk()}
        bookings={bookings}
        users={[makeUser()]}
        busy={false}
        canCancel={false}
        onClose={onClose}
      />,
    );

    const scroller = container.querySelector(
      ".scrollFadeScroller",
    ) as HTMLDivElement | null;
    expect(scroller).toBeTruthy();

    const fade = container.querySelector(
      ".scrollFade",
    ) as HTMLDivElement | null;
    expect(fade).toBeTruthy();

    expect(scroller).not.toBeNull();
    expect(fade).not.toBeNull();

    const scrollerEl = scroller as HTMLDivElement;
    const fadeEl = fade as HTMLDivElement;

    Object.defineProperty(scrollerEl, "clientHeight", {
      value: 100,
      configurable: true,
    });
    Object.defineProperty(scrollerEl, "scrollHeight", {
      value: 1000,
      configurable: true,
    });
    scrollerEl.scrollTop = 10;

    fireEvent.scroll(scrollerEl);

    await waitFor(() => {
      expect(fadeEl.getAttribute("data-at-top")).toBe("false");
      expect(fadeEl.getAttribute("data-at-bottom")).toBe("false");
    });
  });
});
