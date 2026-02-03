import { describe, expect, it, vi } from "vitest";
import {
  addDays,
  endOfIsoWeek,
  formatYmd,
  isBetweenYmd,
  pad2,
  parseYmd,
  startOfIsoWeek,
  todayYmd,
} from "./date";

describe("lib/date", () => {
  it("pad2 pads with leading zeros", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(3)).toBe("03");
    expect(pad2(12)).toBe("12");
  });

  it("formatYmd and parseYmd round-trip", () => {
    const d = new Date(2026, 1, 2); // 2026-02-02 local
    expect(formatYmd(d)).toBe("2026-02-02");

    const parsed = parseYmd("2026-02-02");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(2);
  });

  it("todayYmd uses current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 2, 12, 0, 0));

    expect(todayYmd()).toBe("2026-02-02");

    vi.useRealTimers();
  });

  it("addDays shifts by N days", () => {
    expect(addDays("2026-02-02", 0)).toBe("2026-02-02");
    expect(addDays("2026-02-02", 1)).toBe("2026-02-03");
    expect(addDays("2026-02-02", -1)).toBe("2026-02-01");
  });

  it("startOfIsoWeek/endOfIsoWeek compute Monday..Sunday", () => {
    // 2026-02-02 is a Monday.
    expect(startOfIsoWeek("2026-02-02")).toBe("2026-02-02");
    expect(endOfIsoWeek("2026-02-02")).toBe("2026-02-08");

    // Sunday should back up to Monday.
    expect(startOfIsoWeek("2026-02-08")).toBe("2026-02-02");
    expect(endOfIsoWeek("2026-02-08")).toBe("2026-02-08");
  });

  it("isBetweenYmd is inclusive", () => {
    expect(isBetweenYmd("2026-02-02", "2026-02-01", "2026-02-03")).toBe(true);
    expect(isBetweenYmd("2026-02-01", "2026-02-01", "2026-02-03")).toBe(true);
    expect(isBetweenYmd("2026-02-03", "2026-02-01", "2026-02-03")).toBe(true);

    expect(isBetweenYmd("2026-01-31", "2026-02-01", "2026-02-03")).toBe(false);
    expect(isBetweenYmd("2026-02-04", "2026-02-01", "2026-02-03")).toBe(false);
  });
});
