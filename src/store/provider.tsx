import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { apiClient } from "../api/client";
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  safeJsonParse,
  setLocalStorageItem,
} from "../lib/storage";
import type { Amenity, BookingSlot, DeskStatus } from "../types";
import { AppContext, type AppActions } from "./context";
import {
  applyPersistedUi,
  initialState,
  rootReducer,
  type AppState,
  type PersistedUi,
  type ThemeMode,
  type UiState,
} from "./reducer";

const UI_KEY = "hotdesk-ui";

function loadPersistedUi(): PersistedUi | undefined {
  const raw = getLocalStorageItem(UI_KEY);
  if (!raw) return undefined;
  const parsed = safeJsonParse<PersistedUi>(raw);
  return parsed.ok ? parsed.value : undefined;
}

function persistUi(state: AppState) {
  const payload: PersistedUi = {
    currentUserId: state.auth.currentUserId,
    view: state.ui.view,
    selectedDate: state.ui.selectedDate,
    selectedSlot: state.ui.selectedSlot,
    zoneFilter: state.ui.zoneFilter,
    query: state.ui.query,
    amenityFilters: state.ui.amenityFilters,
    theme: state.ui.theme,
  };
  setLocalStorageItem(UI_KEY, JSON.stringify(payload));
}

function asMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

function isRetryableError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return /network|offline|failed to fetch/i.test(err.message);
}

type RetryJob = {
  id: string;
  attempts: number;
  run: () => Promise<void>;
};

type Toast = {
  id: string;
  variant: "success" | "error";
  title: string;
  body: string;
};

function makeToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [state, dispatch] = useReducer(rootReducer, initialState, (base) =>
    applyPersistedUi(base, loadPersistedUi()),
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimersRef = useRef<number[]>([]);

  const pushToast = useCallback((title: string, body: string) => {
    const id = makeToastId();
    const variant: Toast["variant"] = title === "Error" ? "error" : "success";
    setToasts((prev) => [...prev, { id, variant, title, body }].slice(-3));
    const timeoutId = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimersRef.current = toastTimersRef.current.filter(
        (tid) => tid !== timeoutId,
      );
    }, 3500);
    toastTimersRef.current.push(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      for (const tid of toastTimersRef.current) {
        window.clearTimeout(tid);
      }
      toastTimersRef.current = [];
    };
  }, []);

  const retryQueueRef = useRef<RetryJob[]>([]);

  const syncRetryCount = useCallback(() => {
    dispatch({
      type: "SET_RETRY_COUNT",
      payload: { retryCount: retryQueueRef.current.length },
    });
  }, []);

  const enqueueRetry = useCallback(
    (job: Omit<RetryJob, "attempts">) => {
      if (retryQueueRef.current.some((j) => j.id === job.id)) return;
      retryQueueRef.current.push({ ...job, attempts: 0 });
      syncRetryCount();
    },
    [syncRetryCount],
  );

  const processRetryQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    // Process sequentially to avoid stampeding.
    for (const job of [...retryQueueRef.current]) {
      try {
        job.attempts += 1;
        await job.run();
        retryQueueRef.current = retryQueueRef.current.filter(
          (j) => j.id !== job.id,
        );
      } catch {
        // Keep job in queue for next online event.
      }
    }

    syncRetryCount();
  }, [syncRetryCount]);

  const bootstrap = useCallback(async () => {
    dispatch({ type: "BOOTSTRAP_START" });
    try {
      const snap = await apiClient.getSnapshot();
      dispatch({
        type: "BOOTSTRAP_SUCCESS",
        payload: { db: snap.data, syncedAt: new Date().toISOString() },
      });
    } catch (e) {
      pushToast("Error", asMessage(e));
      dispatch({ type: "BOOTSTRAP_ERROR", payload: { message: asMessage(e) } });
    }
  }, [pushToast]);

  const refresh = useCallback(async () => {
    dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
    dispatch({ type: "SET_PENDING", payload: { pending: { refresh: true } } });
    try {
      const snap = await apiClient.getSnapshot();
      dispatch({
        type: "APPLY_SNAPSHOT",
        payload: { db: snap.data, syncedAt: new Date().toISOString() },
      });
    } catch (e) {
      if (isRetryableError(e)) {
        enqueueRetry({
          id: "refresh",
          run: async () => {
            const snap = await apiClient.getSnapshot();
            dispatch({
              type: "APPLY_SNAPSHOT",
              payload: { db: snap.data, syncedAt: new Date().toISOString() },
            });
          },
        });
      }
      pushToast("Error", asMessage(e));
      dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
    } finally {
      dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
      dispatch({
        type: "SET_PENDING",
        payload: { pending: { refresh: false } },
      });
    }
  }, [enqueueRetry, pushToast]);

  const bookDesk = useCallback(
    async (deskId: string, details?: string, bookForUserId?: string) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });
      dispatch({
        type: "SET_PENDING",
        payload: { pending: { bookDeskId: deskId } },
      });
      try {
        const actorUserId = state.auth.currentUserId;
        const actor = state.db.users.find((u) => u.id === actorUserId);
        const isAdmin = actor?.role === "ADMIN";
        const targetUserId =
          isAdmin && bookForUserId ? bookForUserId : actorUserId;

        const cleanedDetails = String(details ?? "").trim() || undefined;
        await apiClient.createBooking({
          deskId,
          userId: targetUserId,
          actorUserId,
          date: state.ui.selectedDate,
          slot: state.ui.selectedSlot,
          details: cleanedDetails,
        });
        await refresh();
        if (targetUserId !== actorUserId) {
          const targetName =
            state.db.users.find((u) => u.id === targetUserId)?.name ??
            targetUserId;
          pushToast("Booked", `Booking confirmed for ${targetName}.`);
        } else {
          pushToast("Booked", "Your booking has been confirmed.");
        }
      } catch (e) {
        if (isRetryableError(e)) {
          const actorUserId = state.auth.currentUserId;
          const actor = state.db.users.find((u) => u.id === actorUserId);
          const isAdmin = actor?.role === "ADMIN";
          const targetUserId =
            isAdmin && bookForUserId ? bookForUserId : actorUserId;

          const cleanedDetails = String(details ?? "").trim() || undefined;
          enqueueRetry({
            id: `book:${deskId}:${actorUserId}:${targetUserId}:${state.ui.selectedDate}:${state.ui.selectedSlot}:${cleanedDetails ?? ""}`,
            run: async () => {
              await apiClient.createBooking({
                deskId,
                userId: targetUserId,
                actorUserId,
                date: state.ui.selectedDate,
                slot: state.ui.selectedSlot,
                details: cleanedDetails,
              });
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
        dispatch({
          type: "SET_PENDING",
          payload: { pending: { bookDeskId: undefined } },
        });
      }
    },
    [
      enqueueRetry,
      pushToast,
      refresh,
      state.auth.currentUserId,
      state.db.users,
      state.ui.selectedDate,
      state.ui.selectedSlot,
    ],
  );

  const resetUserSettings = useCallback(async () => {
    dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
    dispatch({ type: "SET_ERROR", payload: { message: undefined } });
    try {
      retryQueueRef.current = [];
      dispatch({ type: "SET_RETRY_COUNT", payload: { retryCount: 0 } });
      removeLocalStorageItem(UI_KEY);
      dispatch({ type: "RESET_USER_SETTINGS" });
      pushToast("Reset", "Settings restored to defaults.");
    } catch (e) {
      pushToast("Error", asMessage(e));
      dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
    } finally {
      dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
    }
  }, [pushToast]);

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });
      dispatch({
        type: "SET_PENDING",
        payload: { pending: { cancelBookingId: bookingId } },
      });
      try {
        await apiClient.cancelBooking({
          bookingId,
          userId: state.auth.currentUserId,
        });
        await refresh();
        pushToast("Cancelled", "Your booking has been cancelled.");
      } catch (e) {
        if (isRetryableError(e)) {
          enqueueRetry({
            id: `cancel:${bookingId}:${state.auth.currentUserId}`,
            run: async () => {
              await apiClient.cancelBooking({
                bookingId,
                userId: state.auth.currentUserId,
              });
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
        dispatch({
          type: "SET_PENDING",
          payload: { pending: { cancelBookingId: undefined } },
        });
      }
    },
    [enqueueRetry, pushToast, refresh, state.auth.currentUserId],
  );

  const reportFault = useCallback(
    async (input: {
      deskId: string;
      description: string;
      bookingId?: string;
    }) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });

      try {
        const description = String(input.description ?? "").trim();
        const bookingId = String(input.bookingId ?? "").trim() || undefined;

        await apiClient.createFault({
          deskId: input.deskId,
          reporterUserId: state.auth.currentUserId,
          description,
          bookingId,
        });
        await refresh();
        pushToast("Fault reported", "Thanks — the issue has been logged.");
      } catch (e) {
        if (isRetryableError(e)) {
          const description = String(input.description ?? "").trim();
          const bookingId = String(input.bookingId ?? "").trim() || undefined;

          enqueueRetry({
            id: `fault:${input.deskId}:${state.auth.currentUserId}:${description}:${bookingId ?? ""}`,
            run: async () => {
              await apiClient.createFault({
                deskId: input.deskId,
                reporterUserId: state.auth.currentUserId,
                description,
                bookingId,
              });
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
      }
    },
    [enqueueRetry, pushToast, refresh, state.auth.currentUserId],
  );

  const resetDb = useCallback(async () => {
    dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
    dispatch({ type: "SET_ERROR", payload: { message: undefined } });
    dispatch({ type: "SET_PENDING", payload: { pending: { resetDb: true } } });
    try {
      const snap = await apiClient.reset();
      dispatch({
        type: "APPLY_SNAPSHOT",
        payload: { db: snap.data, syncedAt: new Date().toISOString() },
      });
      pushToast("Reset", "Database reset to seed data.");
    } catch (e) {
      if (isRetryableError(e)) {
        enqueueRetry({
          id: "resetDb",
          run: async () => {
            const snap = await apiClient.reset();
            dispatch({
              type: "APPLY_SNAPSHOT",
              payload: { db: snap.data, syncedAt: new Date().toISOString() },
            });
          },
        });
      }
      pushToast("Error", asMessage(e));
      dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
    } finally {
      dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
      dispatch({
        type: "SET_PENDING",
        payload: { pending: { resetDb: false } },
      });
    }
  }, [enqueueRetry, pushToast]);

  const resetAll = useCallback(async () => {
    await resetUserSettings();
    await resetDb();
  }, [resetDb, resetUserSettings]);

  const adminUpsertDesk = useCallback(
    async (input: {
      id?: string;
      label: string;
      zone: string;
      status: DeskStatus;
      amenities?: Amenity[];
    }) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });
      dispatch({ type: "SET_PENDING", payload: { pending: { admin: true } } });
      try {
        await apiClient.upsertDesk(input);
        await refresh();
        pushToast("Saved", "Desk updated.");
      } catch (e) {
        if (isRetryableError(e)) {
          enqueueRetry({
            id: `adminUpsertDesk:${input.id ?? "new"}:${input.label}:${input.zone}`,
            run: async () => {
              await apiClient.upsertDesk(input);
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
        dispatch({
          type: "SET_PENDING",
          payload: { pending: { admin: false } },
        });
      }
    },
    [enqueueRetry, pushToast, refresh],
  );

  const adminUpdateConfig = useCallback(
    async (input: { maxBookingsPerDay: number }) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });
      dispatch({ type: "SET_PENDING", payload: { pending: { admin: true } } });
      try {
        await apiClient.updateConfig(input);
        await refresh();
        pushToast("Saved", "Config updated.");
      } catch (e) {
        if (isRetryableError(e)) {
          enqueueRetry({
            id: `adminUpdateConfig:${input.maxBookingsPerDay}`,
            run: async () => {
              await apiClient.updateConfig(input);
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
        dispatch({
          type: "SET_PENDING",
          payload: { pending: { admin: false } },
        });
      }
    },
    [enqueueRetry, pushToast, refresh],
  );

  const adminDeleteDesk = useCallback(
    async (input: { deskId: string }) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });
      dispatch({ type: "SET_PENDING", payload: { pending: { admin: true } } });
      try {
        await apiClient.deleteDesk(input);
        await refresh();
        pushToast("Deleted", "Desk removed.");
      } catch (e) {
        if (isRetryableError(e)) {
          enqueueRetry({
            id: `adminDeleteDesk:${input.deskId}`,
            run: async () => {
              await apiClient.deleteDesk(input);
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
        dispatch({
          type: "SET_PENDING",
          payload: { pending: { admin: false } },
        });
      }
    },
    [enqueueRetry, pushToast, refresh],
  );

  const adminResolveFault = useCallback(
    async (input: { faultId: string }) => {
      dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
      dispatch({ type: "SET_ERROR", payload: { message: undefined } });
      dispatch({ type: "SET_PENDING", payload: { pending: { admin: true } } });
      try {
        await apiClient.resolveFault({
          faultId: input.faultId,
          userId: state.auth.currentUserId,
        });
        await refresh();
        pushToast("Resolved", "Fault marked as resolved.");
      } catch (e) {
        if (isRetryableError(e)) {
          enqueueRetry({
            id: `resolveFault:${input.faultId}:${state.auth.currentUserId}`,
            run: async () => {
              await apiClient.resolveFault({
                faultId: input.faultId,
                userId: state.auth.currentUserId,
              });
              await refresh();
            },
          });
        }
        pushToast("Error", asMessage(e));
        dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
      } finally {
        dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
        dispatch({
          type: "SET_PENDING",
          payload: { pending: { admin: false } },
        });
      }
    },
    [enqueueRetry, pushToast, refresh, state.auth.currentUserId],
  );

  const adminClearBookings = useCallback(async () => {
    dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
    dispatch({ type: "SET_ERROR", payload: { message: undefined } });
    dispatch({ type: "SET_PENDING", payload: { pending: { admin: true } } });
    try {
      await apiClient.clearBookings({ userId: state.auth.currentUserId });
      await refresh();
      pushToast("Cleared", "All bookings deleted.");
    } catch (e) {
      if (isRetryableError(e)) {
        enqueueRetry({
          id: `clearBookings:${state.auth.currentUserId}`,
          run: async () => {
            await apiClient.clearBookings({ userId: state.auth.currentUserId });
            await refresh();
          },
        });
      }
      pushToast("Error", asMessage(e));
      dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
    } finally {
      dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
      dispatch({ type: "SET_PENDING", payload: { pending: { admin: false } } });
    }
  }, [enqueueRetry, pushToast, refresh, state.auth.currentUserId]);

  const adminClearIssues = useCallback(async () => {
    dispatch({ type: "SET_BUSY", payload: { delta: 1 } });
    dispatch({ type: "SET_ERROR", payload: { message: undefined } });
    dispatch({ type: "SET_PENDING", payload: { pending: { admin: true } } });
    try {
      await apiClient.clearIssues({ userId: state.auth.currentUserId });
      await refresh();
      pushToast("Cleared", "All issues deleted.");
    } catch (e) {
      if (isRetryableError(e)) {
        enqueueRetry({
          id: `clearIssues:${state.auth.currentUserId}`,
          run: async () => {
            await apiClient.clearIssues({ userId: state.auth.currentUserId });
            await refresh();
          },
        });
      }
      pushToast("Error", asMessage(e));
      dispatch({ type: "SET_ERROR", payload: { message: asMessage(e) } });
    } finally {
      dispatch({ type: "SET_BUSY", payload: { delta: -1 } });
      dispatch({ type: "SET_PENDING", payload: { pending: { admin: false } } });
    }
  }, [enqueueRetry, pushToast, refresh, state.auth.currentUserId]);

  const actions: AppActions = useMemo(
    () => ({
      bootstrap,
      refresh,
      resetDb,
      bookDesk,
      cancelBooking,
      reportFault,
      adminUpsertDesk,
      adminUpdateConfig,
      adminDeleteDesk,
      adminResolveFault,
      adminClearBookings,
      adminClearIssues,
      setCurrentUser: (userId) =>
        dispatch({ type: "SET_CURRENT_USER", payload: { userId } }),
      setView: (view: UiState["view"]) =>
        dispatch({ type: "SET_VIEW", payload: { view } }),
      setSelectedDate: (date) =>
        dispatch({ type: "SET_SELECTED_DATE", payload: { date } }),
      setSelectedSlot: (slot: BookingSlot) =>
        dispatch({ type: "SET_SELECTED_SLOT", payload: { slot } }),
      setZoneFilter: (zone) =>
        dispatch({ type: "SET_ZONE_FILTER", payload: { zone } }),
      setQuery: (query) => dispatch({ type: "SET_QUERY", payload: { query } }),
      setAmenityFilters: (amenityFilters) =>
        dispatch({
          type: "SET_AMENITY_FILTERS",
          payload: { amenityFilters },
        }),
      setTheme: (theme) => dispatch({ type: "SET_THEME", payload: { theme } }),
      retryQueuedRequests: async () => {
        await processRetryQueue();
      },
      clearError: () =>
        dispatch({ type: "SET_ERROR", payload: { message: undefined } }),
      resetUserSettings: async () => {
        await resetUserSettings();
      },
      resetAll: async () => {
        await resetAll();
      },
    }),
    [
      adminUpdateConfig,
      adminDeleteDesk,
      adminResolveFault,
      adminClearBookings,
      adminClearIssues,
      adminUpsertDesk,
      bootstrap,
      bookDesk,
      cancelBooking,
      reportFault,
      processRetryQueue,
      refresh,
      resetDb,
      resetAll,
      resetUserSettings,
    ],
  );

  useEffect(() => {
    persistUi(state);
  }, [state]);

  useEffect(() => {
    applyTheme(state.ui.theme);

    if (state.ui.theme !== "system") return;
    if (typeof window.matchMedia !== "function") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    // Safari < 14
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, [state.ui.theme]);

  useEffect(() => {
    const onOnline = () => {
      void processRetryQueue();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [processRetryQueue]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
      <div className="toastStack" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.variant === "error" ? "toastError" : "toastSuccess"}`}
            role="status"
          >
            <div className="toastTitle">{t.title}</div>
            <div className="toastBody">{t.body}</div>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};
