import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportFaultModal } from "./ReportFaultModal";

describe("ReportFaultModal", () => {
  it("calls onSubmit with description and optional booking", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {});
    const onClose = vi.fn();

    render(
      <ReportFaultModal
        open
        desk={{ id: "d1", label: "Desk N1", zone: "North" }}
        myBookingsForDesk={[
          {
            id: "b1",
            deskId: "d1",
            userId: "u1",
            date: "2026-02-02",
            slot: "MORNING",
            status: "ACTIVE",
            createdAt: new Date("2026-02-01T10:00:00.000Z").toISOString(),
          },
        ]}
        busy={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    await user.type(
      screen.getByLabelText(/describe the issue/i),
      "Monitor dead",
    );
    await user.selectOptions(screen.getByLabelText(/attach booking/i), "b1");
    await user.click(screen.getByRole("button", { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      deskId: "d1",
      description: "Monitor dead",
      bookingId: "b1",
    });
  });
});
