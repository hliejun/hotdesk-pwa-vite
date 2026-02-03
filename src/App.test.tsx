import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { seedDbV1 } from "./api/db";

vi.mock("./api/client", () => {
  return {
    apiClient: {
      getSnapshot: vi.fn(),
      createBooking: vi.fn(),
      cancelBooking: vi.fn(),
      reset: vi.fn(),
      upsertDesk: vi.fn(),
      updateConfig: vi.fn(),
      listBookings: vi.fn(),
      listDesks: vi.fn(),
      listUsers: vi.fn(),
    },
  };
});

import { apiClient } from "./api/client";
import App from "./App";

describe("App", () => {
  it("renders the route for /bookings", async () => {
    const snapshot: Awaited<ReturnType<typeof apiClient.getSnapshot>> = {
      data: seedDbV1(),
    };
    vi.mocked(apiClient.getSnapshot).mockResolvedValue(snapshot);

    window.history.pushState({}, "", "/bookings");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/book a desk/i)).toBeInTheDocument();
    });
  });
});
