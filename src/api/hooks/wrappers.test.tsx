import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { seedDbV1 } from "../db";
import type { Booking, Desk, User } from "../../types";

vi.mock("../client", () => {
  return {
    apiClient: {
      getSnapshot: vi.fn(),
      createBooking: vi.fn(),
      cancelBooking: vi.fn(),
      listDesks: vi.fn(),
      listBookings: vi.fn(),
      listUsers: vi.fn(),
      reset: vi.fn(),
      updateConfig: vi.fn(),
      upsertDesk: vi.fn(),
    },
  };
});

import { apiClient } from "../client";
import { useGetSnapshot } from "./useGetSnapshot";
import { useCreateBooking } from "./useCreateBooking";
import { useCancelBooking } from "./useCancelBooking";
import { useListDesks } from "./useListDesks";
import { useListBookings } from "./useListBookings";
import { useListUsers } from "./useListUsers";
import { useResetDb } from "./useResetDb";
import { useUpdateConfig } from "./useUpdateConfig";
import { useUpsertDesk } from "./useUpsertDesk";

describe("api hook wrappers", () => {
  it("useGetSnapshot delegates to apiClient.getSnapshot", async () => {
    const snapshot: Awaited<ReturnType<typeof apiClient.getSnapshot>> = {
      data: seedDbV1(),
    };
    vi.mocked(apiClient.getSnapshot).mockResolvedValueOnce(snapshot);

    const { result } = renderHook(() => useGetSnapshot());
    await expect(result.current.getSnapshot()).resolves.toMatchObject({
      version: 1,
    });

    expect(apiClient.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it("useCreateBooking delegates to apiClient.createBooking", async () => {
    const booking: Booking = {
      id: "b1",
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
      status: "ACTIVE",
      createdAt: new Date(0).toISOString(),
    };

    const res: Awaited<ReturnType<typeof apiClient.createBooking>> = {
      data: booking,
    };
    vi.mocked(apiClient.createBooking).mockResolvedValueOnce(res);

    const { result } = renderHook(() => useCreateBooking());
    await expect(
      result.current.createBooking({
        deskId: "d1",
        userId: "u1",
        date: "2026-02-02",
        slot: "MORNING",
      }),
    ).resolves.toEqual(booking);

    expect(apiClient.createBooking).toHaveBeenCalledTimes(1);
  });

  it("useCancelBooking delegates to apiClient.cancelBooking", async () => {
    const booking: Booking = {
      id: "b1",
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
      status: "CANCELLED",
      createdAt: new Date(0).toISOString(),
      cancelledAt: new Date(1).toISOString(),
    };
    const res: Awaited<ReturnType<typeof apiClient.cancelBooking>> = {
      data: booking,
    };
    vi.mocked(apiClient.cancelBooking).mockResolvedValueOnce(res);

    const { result } = renderHook(() => useCancelBooking());
    await expect(
      result.current.cancelBooking({ bookingId: "b1", userId: "u1" }),
    ).resolves.toEqual(booking);

    expect(apiClient.cancelBooking).toHaveBeenCalledTimes(1);
  });

  it("list hooks delegate", async () => {
    const desk: Desk = {
      id: "d1",
      label: "Desk N1",
      zone: "North",
      status: "ACTIVE",
      amenities: ["COMMUNAL"],
    };
    const booking: Booking = {
      id: "b1",
      deskId: "d1",
      userId: "u1",
      date: "2026-02-02",
      slot: "MORNING",
      status: "ACTIVE",
      createdAt: new Date(0).toISOString(),
    };
    const user: User = { id: "u1", name: "Demo", role: "EMPLOYEE" };

    vi.mocked(apiClient.listDesks).mockResolvedValueOnce({ data: [desk] });
    vi.mocked(apiClient.listBookings).mockResolvedValueOnce({
      data: [booking],
    });
    vi.mocked(apiClient.listUsers).mockResolvedValueOnce({ data: [user] });

    const desks = renderHook(() => useListDesks());
    const bookings = renderHook(() => useListBookings());
    const users = renderHook(() => useListUsers());

    await expect(desks.result.current.listDesks()).resolves.toEqual([desk]);
    await expect(bookings.result.current.listBookings()).resolves.toEqual([
      booking,
    ]);
    await expect(users.result.current.listUsers()).resolves.toEqual([user]);
  });

  it("admin hooks delegate", async () => {
    const config: Awaited<ReturnType<typeof apiClient.updateConfig>>["data"] = {
      maxBookingsPerDay: 3,
      zones: ["North"],
    };
    vi.mocked(apiClient.updateConfig).mockResolvedValueOnce({ data: config });

    const desk: Desk = {
      id: "d1",
      label: "Desk N1",
      zone: "North",
      status: "ACTIVE",
      amenities: ["COMMUNAL"],
    };
    vi.mocked(apiClient.upsertDesk).mockResolvedValueOnce({ data: desk });

    const updateConfig = renderHook(() => useUpdateConfig());
    const upsertDesk = renderHook(() => useUpsertDesk());

    await expect(
      updateConfig.result.current.updateConfig({ maxBookingsPerDay: 3 }),
    ).resolves.toEqual(config);
    await expect(upsertDesk.result.current.upsertDesk(desk)).resolves.toEqual(
      desk,
    );
  });

  it("useResetDb delegates to apiClient.reset", async () => {
    const db = seedDbV1();
    const res: Awaited<ReturnType<typeof apiClient.reset>> = { data: db };
    vi.mocked(apiClient.reset).mockResolvedValueOnce(res);

    const { result } = renderHook(() => useResetDb());
    await expect(result.current.resetDb()).resolves.toEqual(db);

    expect(apiClient.reset).toHaveBeenCalledTimes(1);
  });
});
