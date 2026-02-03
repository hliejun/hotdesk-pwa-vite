import { useMemo, useState, useRef } from "react";
import { useApp } from "../../store";
import type { Amenity, Booking, BookingSlot, Desk } from "../../types";
import {
  ALL_AMENITIES,
  defaultAmenityFilter,
} from "../../components/DeskFilters";
import { AmenityIcon, AmenityLabel } from "../../components/AmenityIcon";
import { BootSkeleton } from "../../components/BootSkeleton";
import { BookingNotes } from "../../components/BookingNotes";
import { DeskCard } from "../../components/DeskCard";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  currentSlotNow,
  formatDateTime,
  formatYmdDisplay,
  isUpcomingBooking,
  slotRank,
  slotWindow,
  todayYmd,
} from "../../lib/date";
import { cx } from "../../lib/cx";
import { confirm } from "../../lib/confirm";
import { Spinner } from "../../components/Spinner";
import { DeskBookingsModal } from "../../components/DeskBookingsModal/DeskBookingsModal";
import { useDismissOnOutsideInteraction } from "../../lib/useDismissOnOutsideInteraction";

const Admin = () => {
  const { state, actions } = useApp();

  const isBootLoading = state.boot.status === "loading";

  const busy = state.ui.busyCount > 0;

  const currentUser = useMemo(
    () => state.db.users.find((u) => u.id === state.auth.currentUserId),
    [state.auth.currentUserId, state.db.users],
  );

  const isAdmin = currentUser?.role === "ADMIN";

  const userById = useMemo(() => {
    const map = new Map(state.db.users.map((u) => [u.id, u] as const));
    return map;
  }, [state.db.users]);

  const desksByZone = useMemo(() => {
    const map = new Map<string, Desk[]>();
    for (const desk of state.db.desks) {
      const list = map.get(desk.zone) ?? [];
      list.push(desk);
      map.set(desk.zone, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.label + a.id).localeCompare(b.label + b.id));
    }
    return map;
  }, [state.db.desks]);

  const deskById = useMemo(() => {
    const map = new Map(state.db.desks.map((d) => [d.id, d] as const));
    return map;
  }, [state.db.desks]);

  const bookingById = useMemo(() => {
    const map = new Map(state.db.bookings.map((b) => [b.id, b] as const));
    return map;
  }, [state.db.bookings]);

  const upcomingBookingsAgenda = useMemo(() => {
    const activeUpcoming = state.db.bookings
      .filter((b) => b.status === "ACTIVE" && isUpcomingBooking(b.date, b.slot))
      .slice();

    activeUpcoming.sort((a, b) => {
      const keyA = a.date + String(slotRank(a.slot));
      const keyB = b.date + String(slotRank(b.slot));
      if (keyA !== keyB) return keyA.localeCompare(keyB);

      const dA = deskById.get(a.deskId);
      const dB = deskById.get(b.deskId);
      const deskKeyA = (dA?.zone ?? "") + (dA?.label ?? a.deskId);
      const deskKeyB = (dB?.zone ?? "") + (dB?.label ?? b.deskId);
      if (deskKeyA !== deskKeyB) return deskKeyA.localeCompare(deskKeyB);

      return a.createdAt.localeCompare(b.createdAt);
    });

    const groups = new Map<string, Booking[]>();
    for (const b of activeUpcoming) {
      const key = `${b.date}|${b.slot}`;
      const list = groups.get(key) ?? [];
      list.push(b);
      groups.set(key, list);
    }

    return Array.from(groups.entries()).map(([key, bookings]) => {
      const [date, slot] = key.split("|") as [string, BookingSlot];
      return { date, slot, bookings };
    });
  }, [deskById, state.db.bookings]);

  const [showResolvedFaults, setShowResolvedFaults] = useState(false);

  const [expandedFaults, setExpandedFaults] = useState<Record<string, boolean>>(
    {},
  );

  const visibleFaults = useMemo(() => {
    const all = state.db.faults
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (showResolvedFaults) return all;
    return all.filter((f) => f.status === "OPEN");
  }, [showResolvedFaults, state.db.faults]);

  const [deskMenuId, setDeskMenuId] = useState<string | null>(null);
  const [deskPendingDelete, setDeskPendingDelete] = useState<Desk | null>(null);
  const deskMenuRef = useRef<HTMLDivElement | null>(null);
  const deskMenuAnchorRef = useRef<HTMLElement | null>(null);

  useDismissOnOutsideInteraction(
    !!deskMenuId,
    [deskMenuRef, deskMenuAnchorRef],
    () => setDeskMenuId(null),
  );

  const inUseDeskIds = useMemo(() => {
    const today = todayYmd();
    const slot = currentSlotNow();
    if (!slot) return new Set<string>();
    return new Set(
      state.db.bookings
        .filter(
          (b) => b.status === "ACTIVE" && b.date === today && b.slot === slot,
        )
        .map((b) => b.deskId),
    );
  }, [state.db.bookings]);

  const zones = useMemo(() => {
    return Array.from(desksByZone.keys()).sort((a, b) => a.localeCompare(b));
  }, [desksByZone]);

  const [bookingsDeskId, setBookingsDeskId] = useState<string | null>(null);
  const [resolvingFaultId, setResolvingFaultId] = useState<string | null>(null);
  const [deskDeleting, setDeskDeleting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingDesk, setCreatingDesk] = useState(false);

  const bookingsDesk = useMemo(() => {
    if (!bookingsDeskId) return undefined;
    return state.db.desks.find((d) => d.id === bookingsDeskId);
  }, [bookingsDeskId, state.db.desks]);

  const bookingsForDesk = useMemo(() => {
    if (!bookingsDeskId) return [];
    return state.db.bookings.filter((b) => b.deskId === bookingsDeskId);
  }, [bookingsDeskId, state.db.bookings]);

  const [newDeskLabel, setNewDeskLabel] = useState("");
  const [newDeskZone, setNewDeskZone] = useState("North");
  const [newDeskAmenities, setNewDeskAmenities] = useState<
    Record<Amenity, boolean>
  >(() => ({ ...defaultAmenityFilter(), COMMUNAL: true }));

  const [maxPerDay, setMaxPerDay] = useState(
    String(state.db.config.maxBookingsPerDay),
  );

  const selectedNewDeskAmenities = useMemo(
    () => ALL_AMENITIES.filter((a) => newDeskAmenities[a]),
    [newDeskAmenities],
  );

  if (isBootLoading) {
    return <BootSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="stack">
        <section className="card">
          <div className="cardTitle">Admin</div>
          <div className="muted">You must be an admin to view this page.</div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="cardTitle">Config</div>
        <div
          className="row"
          style={{ gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <label className="field">
            <div className="label">Max bookings per day</div>
            <input
              value={maxPerDay}
              onChange={(e) => setMaxPerDay(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button
            className="primary"
            type="button"
            disabled={busy || savingConfig}
            onClick={() => {
              setSavingConfig(true);
              void actions
                .adminUpdateConfig({
                  maxBookingsPerDay: Number(maxPerDay),
                })
                .finally(() => setSavingConfig(false));
            }}
          >
            <span className="buttonContent">
              {savingConfig ? <Spinner label="Saving" /> : null}
              Save
            </span>
          </button>
        </div>
      </section>

      <section className="card">
        <div className="cardTitle">Upcoming bookings</div>
        <div className="muted">Agenda view across all desks.</div>

        <div style={{ height: 10 }} />

        {upcomingBookingsAgenda.length === 0 ? (
          <div className="muted">No upcoming bookings.</div>
        ) : (
          <div className="stack">
            {upcomingBookingsAgenda.map((group) => {
              const window = slotWindow(group.slot);
              return (
                <div key={`${group.date}:${group.slot}`} className="card">
                  <div
                    className="row"
                    style={{ justifyContent: "space-between" }}
                  >
                    <div className="cardTitle">
                      {formatYmdDisplay(group.date)} · {group.slot}
                    </div>
                    <div className="muted">
                      {window.range} ({window.duration})
                    </div>
                  </div>

                  <div className="list" style={{ marginTop: 12 }}>
                    {group.bookings.map((b) => {
                      const u = userById.get(b.userId);
                      const d = deskById.get(b.deskId);
                      const isCancelling =
                        state.ui.pending.cancelBookingId === b.id;

                      return (
                        <div
                          key={b.id}
                          className="listRow"
                          style={{ alignItems: "flex-start" }}
                        >
                          <div>
                            <div className="listTitle">
                              {u?.name ?? b.userId} · {d?.label ?? b.deskId}
                            </div>
                            <div className="muted">{d?.zone ?? ""}</div>
                            <div className="infoPills u-mt-8">
                              <div className="pill deskIdPill">
                                <span className="muted">Desk ID</span>
                                <span>{b.deskId}</span>
                              </div>
                              <div className="pill deskIdPill">
                                <span className="muted">Booked at</span>
                                <span>{formatDateTime(b.createdAt)}</span>
                              </div>
                            </div>
                            <BookingNotes
                              details={b.details}
                              className="u-mt-10"
                            />
                          </div>

                          <button
                            className="danger"
                            type="button"
                            disabled={busy}
                            onClick={() => void actions.cancelBooking(b.id)}
                          >
                            <span className="buttonContent">
                              {isCancelling ? (
                                <Spinner label="Revoking" />
                              ) : null}
                              Revoke
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="cardTitle">Add desk</div>
        <div
          className="row"
          style={{ gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <label className="field" style={{ minWidth: 220 }}>
            <div className="label">Label</div>
            <input
              value={newDeskLabel}
              onChange={(e) => setNewDeskLabel(e.target.value)}
              placeholder="Desk N1"
            />
          </label>
          <label className="field">
            <div className="label">Zone</div>
            <input
              value={newDeskZone}
              onChange={(e) => setNewDeskZone(e.target.value)}
              placeholder="North"
            />
          </label>
          <button
            className="primary"
            type="button"
            disabled={
              busy ||
              creatingDesk ||
              !newDeskLabel.trim() ||
              !newDeskZone.trim() ||
              selectedNewDeskAmenities.length === 0
            }
            onClick={async () => {
              setCreatingDesk(true);
              try {
                await actions.adminUpsertDesk({
                  label: newDeskLabel,
                  zone: newDeskZone,
                  status: "ACTIVE",
                  amenities: selectedNewDeskAmenities,
                });
                setNewDeskLabel("");
                setNewDeskAmenities({
                  ...defaultAmenityFilter(),
                  COMMUNAL: true,
                });
              } finally {
                setCreatingDesk(false);
              }
            }}
          >
            <span className="buttonContent">
              {creatingDesk ? <Spinner label="Creating" /> : null}
              Create
            </span>
          </button>
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <div className="label">Amenities</div>
          <div className="amenities">
            {ALL_AMENITIES.map((a) => {
              const active = newDeskAmenities[a];
              return (
                <button
                  key={a}
                  type="button"
                  className={
                    active ? "amenityChip amenityChipOn" : "amenityChip"
                  }
                  onClick={() =>
                    setNewDeskAmenities((prev) => ({ ...prev, [a]: !prev[a] }))
                  }
                  title={AmenityLabel(a)}
                >
                  <span className="amenityIcon">
                    <AmenityIcon amenity={a} />
                  </span>
                  <span className="amenityText">{AmenityLabel(a)}</span>
                </button>
              );
            })}
          </div>
          <div className="smallNote" style={{ marginTop: 8 }}>
            Pick one or more. (If you’re unsure, keep Communal on.)
          </div>
        </div>
      </section>

      <section className="card">
        <div className="cardTitle">Manage desks</div>
        {zones.map((zone, index) => {
          const desks = desksByZone.get(zone) ?? [];
          return (
            <div key={zone} style={{ marginTop: index === 0 ? 12 : 0 }}>
              <details className="zoneSection" aria-label={`${zone} desks`}>
                <summary className="accordionSummary accordionSummaryCard zoneSummary">
                  <div className="zoneTitle">{zone}</div>
                  <div
                    className="row"
                    style={{ gap: 10, alignItems: "center" }}
                  >
                    <div className="zoneCount">{desks.length} desks</div>
                    <span className="accordionChevron" aria-hidden="true" />
                  </div>
                </summary>

                <div className="adminDeskGrid">
                  {desks.map((d) => (
                    <DeskCard
                      key={d.id}
                      desk={d}
                      meta={null}
                      className={cx("gridCard", "deskAdminCard")}
                      cornerAction={
                        <>
                          <button
                            type="button"
                            className={cx(
                              "statusToggle",
                              "statusToggleCorner",
                              d.status === "ACTIVE" && "statusToggleOn",
                              d.status === "ACTIVE" &&
                                inUseDeskIds.has(d.id) &&
                                "statusToggleInUse",
                            )}
                            disabled={busy}
                            aria-label={`Toggle status for ${d.label}`}
                            onClick={() =>
                              void actions.adminUpsertDesk({
                                id: d.id,
                                label: d.label,
                                zone: d.zone,
                                status:
                                  d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                              })
                            }
                          >
                            {d.status === "ACTIVE"
                              ? inUseDeskIds.has(d.id)
                                ? "In use"
                                : "Active"
                              : "Inactive"}
                          </button>

                          <button
                            type="button"
                            className="iconButton iconButtonSmall deskActionsButton"
                            aria-label={`Desk actions for ${d.label}`}
                            disabled={busy}
                            onClick={(e) =>
                              setDeskMenuId((prev) => {
                                const next = prev === d.id ? null : d.id;
                                deskMenuAnchorRef.current = next
                                  ? e.currentTarget
                                  : null;
                                return next;
                              })
                            }
                          >
                            ⋯
                          </button>
                        </>
                      }
                    >
                      {deskMenuId === d.id ? (
                        <div
                          ref={deskMenuRef}
                          className="menuTray"
                          role="menu"
                          aria-label="Desk actions"
                        >
                          <button
                            className="menuItem"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setDeskMenuId(null);
                              setBookingsDeskId(d.id);
                            }}
                          >
                            View bookings
                          </button>
                          <button
                            className="menuItem danger"
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setDeskMenuId(null);
                              setDeskPendingDelete(d);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </DeskCard>
                  ))}
                </div>
              </details>

              {index < zones.length - 1 ? (
                <div className="divider zoneDivider" />
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="card">
        <div
          className="row"
          style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
        >
          <div>
            <div className="cardTitle">Faults</div>
            <div className="muted">Reported desk issues and resolutions.</div>
          </div>

          <button
            className={cx("secondary", showResolvedFaults && "tabActive")}
            type="button"
            disabled={busy}
            onClick={() => setShowResolvedFaults((v) => !v)}
          >
            {showResolvedFaults ? "Hide resolved" : "View resolved"}
          </button>
        </div>

        <div style={{ height: 10 }} />

        {visibleFaults.length === 0 ? (
          <div className="muted">
            No {showResolvedFaults ? "faults" : "unresolved faults"}.
          </div>
        ) : (
          <div className="faultGrid">
            {visibleFaults.map((f) => {
              const d = deskById.get(f.deskId);
              const reporter = userById.get(f.reporterUserId);
              const attachedBooking = f.bookingId
                ? bookingById.get(f.bookingId)
                : undefined;

              const isExpanded = expandedFaults[f.id] ?? false;
              const canToggleIssue =
                f.description.length > 70 || f.description.includes("\n");

              return (
                <div key={f.id} className="card faultCard">
                  <div>
                    <div className="listTitle">
                      {d?.label ?? f.deskId} · {d?.zone ?? ""}
                    </div>
                    <div className="pill deskIdPill" style={{ marginTop: 8 }}>
                      <span className="muted">Desk ID</span>
                      <span>{f.deskId}</span>
                    </div>
                    <div className="faultMeta">
                      <div className="kvRow">
                        <span className="kvLabel">Reported by</span>
                        <span className="kvValue">
                          {reporter?.name ?? f.reporterUserId}
                        </span>
                      </div>
                      <div className="kvRow">
                        <span className="kvLabel">Status</span>
                        <span className="kvValue">{f.status}</span>
                      </div>
                      <div className="kvRow">
                        <span className="kvLabel">Reported at</span>
                        <span className="kvValue">
                          {formatDateTime(f.createdAt)}
                        </span>
                      </div>
                      {f.status === "RESOLVED" && f.resolvedAt ? (
                        <div className="kvRow">
                          <span className="kvLabel">Resolved at</span>
                          <span className="kvValue">
                            {formatDateTime(f.resolvedAt)}
                          </span>
                        </div>
                      ) : null}
                      {attachedBooking ? (
                        <div className="kvRow">
                          <span className="kvLabel">Booking</span>
                          <span className="kvValue">
                            {formatYmdDisplay(attachedBooking.date)} ·{" "}
                            {attachedBooking.slot} ({attachedBooking.status})
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="noteBox faultIssue">
                      <div className="noteLabel">Issue</div>
                      <div
                        className={cx(
                          "noteText",
                          "faultIssueText",
                          !isExpanded && "faultIssueTextClamp",
                        )}
                      >
                        {f.description}
                      </div>
                      {canToggleIssue ? (
                        <button
                          type="button"
                          className="inlineButton"
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedFaults((prev) => ({
                              ...prev,
                              [f.id]: !prev[f.id],
                            }))
                          }
                        >
                          {isExpanded ? "Show less" : "Show more"}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {f.status === "OPEN" ? (
                    <div style={{ marginTop: "auto" }}>
                      <button
                        className="primary"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setResolvingFaultId(f.id);
                          void actions
                            .adminResolveFault({ faultId: f.id })
                            .finally(() => setResolvingFaultId(null));
                        }}
                      >
                        <span className="buttonContent">
                          {resolvingFaultId === f.id ? (
                            <Spinner label="Resolving" />
                          ) : null}
                          Resolve
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <DeskBookingsModal
        open={!!bookingsDeskId}
        desk={bookingsDesk}
        bookings={bookingsForDesk}
        users={state.db.users}
        busy={busy}
        pendingCancelBookingId={state.ui.pending.cancelBookingId}
        canCancel
        onCancelBooking={(bookingId) => void actions.cancelBooking(bookingId)}
        onClose={() => setBookingsDeskId(null)}
      />

      {deskPendingDelete ? (
        <ConfirmModal
          title="Delete desk?"
          message={`Delete ${deskPendingDelete.label} (${deskPendingDelete.id})? This cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          confirmBusy={deskDeleting}
          disabled={busy || deskDeleting}
          onCancel={() => setDeskPendingDelete(null)}
          onConfirm={() => {
            const deskId = deskPendingDelete.id;
            setDeskDeleting(true);
            void actions.adminDeleteDesk({ deskId }).finally(() => {
              setDeskDeleting(false);
              setDeskPendingDelete(null);
            });
          }}
        />
      ) : null}

      <details className="card accordionCard" aria-label="Danger zone">
        <summary className="accordionSummary accordionSummaryCard">
          <div>
            <div className="cardTitle">Danger zone</div>
            <div className="muted">Destructive admin actions.</div>
          </div>
          <span className="accordionChevron" aria-hidden="true" />
        </summary>

        <div className="accordionBody">
          <div className="accordionRow">
            <div>
              <div className="listTitle">Reset DB</div>
              <div className="muted">Reset all to seed data.</div>
            </div>
            <button
              className="danger"
              type="button"
              disabled={busy}
              onClick={() => {
                const ok = confirm(
                  "Reset DB? This wipes all bookings, desks, and issues.",
                );
                if (!ok) return;
                void actions.resetDb();
              }}
            >
              Reset DB
            </button>
          </div>

          <div className="divider" />

          <div className="accordionRow">
            <div>
              <div className="listTitle">Reset user settings</div>
              <div className="muted">
                Reset theme, filters, and selected user.
              </div>
            </div>
            <button
              className="danger"
              type="button"
              disabled={busy}
              onClick={() => {
                const ok = confirm(
                  "Reset your settings to defaults? (Theme, filters, selected user)",
                );
                if (!ok) return;
                void actions.resetUserSettings();
              }}
            >
              Reset settings
            </button>
          </div>

          <div className="divider" />

          <div className="accordionRow">
            <div>
              <div className="listTitle">Reset all</div>
              <div className="muted">Reset DB plus user settings.</div>
            </div>
            <button
              className="danger"
              type="button"
              disabled={busy}
              onClick={() => {
                const ok = confirm(
                  "Reset everything? This resets the DB (bookings/desks/issues) and your settings.",
                );
                if (!ok) return;
                void actions.resetAll();
              }}
            >
              Reset all
            </button>
          </div>

          <div className="divider" />

          <div className="accordionRow">
            <div>
              <div className="listTitle">Clear bookings</div>
              <div className="muted">
                Delete all bookings (active + history).
              </div>
            </div>
            <button
              className="danger"
              type="button"
              disabled={busy}
              onClick={() => {
                const ok = confirm(
                  "Clear all bookings? This cannot be undone.",
                );
                if (!ok) return;
                void actions.adminClearBookings();
              }}
            >
              Clear
            </button>
          </div>

          <div className="divider" />

          <div className="accordionRow">
            <div>
              <div className="listTitle">Clear issues</div>
              <div className="muted">Delete all fault reports.</div>
            </div>
            <button
              className="danger"
              type="button"
              disabled={busy}
              onClick={() => {
                const ok = confirm("Clear all issues? This cannot be undone.");
                if (!ok) return;
                void actions.adminClearIssues();
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </details>
    </div>
  );
};

export default Admin;
