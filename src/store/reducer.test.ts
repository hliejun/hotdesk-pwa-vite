import { describe, expect, it } from "vitest";
import { seedDbV1 } from "../api/db";
import {
  applyPersistedUi,
  initialState,
  rootReducer,
  type PersistedUi,
} from "./reducer";

describe("store/reducer", () => {
  it("applyPersistedUi merges known fields", () => {
    const next = applyPersistedUi(initialState, {
      currentUserId: "u2",
      view: "ADMIN",
      selectedDate: "2026-02-02",
      selectedSlot: "AFTERNOON",
      zoneFilter: "North",
      query: "desk",
      amenityFilters: {
        MONITOR: true,
        WINDOW: false,
        ADJUSTABLE: false,
        PRIVATE: false,
        COMMUNAL: false,
      },
    });

    expect(next.auth.currentUserId).toBe("u2");
    expect(next.ui.view).toBe("ADMIN");
    expect(next.ui.selectedDate).toBe("2026-02-02");
    expect(next.ui.selectedSlot).toBe("AFTERNOON");
    expect(next.ui.zoneFilter).toBe("North");
    expect(next.ui.query).toBe("desk");
    expect(next.ui.amenityFilters.MONITOR).toBe(true);
    // Unknown/missing keys should fall back to defaults
    expect(next.ui.amenityFilters.COMMUNAL).toBe(false);
  });

  it("applyPersistedUi ignores invalid amenityFilters shapes", () => {
    const persisted = { amenityFilters: "nope" as unknown } as PersistedUi;
    const next = applyPersistedUi(initialState, persisted);

    expect(next.ui.amenityFilters).toEqual(initialState.ui.amenityFilters);
  });

  it("BOOTSTRAP_SUCCESS sets ready + db + syncedAt", () => {
    const db = seedDbV1();
    const next = rootReducer(initialState, {
      type: "BOOTSTRAP_SUCCESS",
      payload: { db, syncedAt: "2026-02-02T00:00:00.000Z" },
    });

    expect(next.boot.status).toBe("ready");
    expect(next.boot.lastSyncedAt).toBe("2026-02-02T00:00:00.000Z");
    expect(next.db).toBe(db);
  });

  it("BOOTSTRAP_ERROR sets boot error and ui.error", () => {
    const next = rootReducer(initialState, {
      type: "BOOTSTRAP_ERROR",
      payload: { message: "Bad" },
    });

    expect(next.boot.status).toBe("error");
    expect(next.boot.error).toBe("Bad");
    expect(next.ui.error).toBe("Bad");
  });

  it("SET_BUSY never drops below zero", () => {
    const down = rootReducer(initialState, {
      type: "SET_BUSY",
      payload: { delta: -1 },
    });
    expect(down.ui.busyCount).toBe(0);

    const up = rootReducer(initialState, {
      type: "SET_BUSY",
      payload: { delta: 1 },
    });
    expect(up.ui.busyCount).toBe(1);

    const back = rootReducer(up, { type: "SET_BUSY", payload: { delta: -1 } });
    expect(back.ui.busyCount).toBe(0);
  });

  it("SET_ERROR updates ui.error", () => {
    const next = rootReducer(initialState, {
      type: "SET_ERROR",
      payload: { message: "Oops" },
    });
    expect(next.ui.error).toBe("Oops");

    const cleared = rootReducer(next, {
      type: "SET_ERROR",
      payload: { message: undefined },
    });
    expect(cleared.ui.error).toBeUndefined();
  });
});
