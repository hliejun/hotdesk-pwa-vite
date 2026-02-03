import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useApiRequest } from "./useApiRequest";

describe("useApiRequest", () => {
  it("returns data and clears loading", async () => {
    let resolveFn: ((v: { data: number }) => void) | undefined;
    const fn = vi.fn((n: number) =>
      new Promise<{ data: number }>((resolve) => {
        resolveFn = (v) => resolve(v);
      }).then((res) => ({ data: res.data + n - n })),
    );

    const { result } = renderHook(() => useApiRequest(fn));

    const p = result.current.run(1);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    resolveFn?.({ data: 2 });

    await expect(p).resolves.toBe(2);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    expect(fn).toHaveBeenCalledWith(1);
  });

  it("surfaces error message and supports clearError", async () => {
    const fn = vi.fn(async () => {
      throw new Error("Boom");
    });

    const { result } = renderHook(() => useApiRequest(fn));

    const p = result.current.run();
    await expect(p).rejects.toThrow("Boom");

    await waitFor(() => {
      expect(result.current.error).toBe("Boom");
      expect(result.current.isLoading).toBe(false);
    });

    result.current.clearError();

    await waitFor(() => {
      expect(result.current.error).toBeUndefined();
    });
  });
});
