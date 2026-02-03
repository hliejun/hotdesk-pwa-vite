import { useEffect, useMemo, useRef, useState } from "react";
import type { Booking, Desk, User } from "../../types";
import {
  compareYmdSlot,
  formatDateTime,
  formatYmdDisplay,
  isUpcomingBooking,
  slotLabel,
  slotWindow,
} from "../../lib/date";
import { cx } from "../../lib/cx";
import { BookingNotes } from "../BookingNotes";

export type DeskBookingsModalProps = {
  open: boolean;
  desk: Desk | undefined;
  bookings: Booking[];
  users: User[];
  busy: boolean;
  pendingCancelBookingId?: string;
  canCancel: boolean;
  onCancelBooking?: (bookingId: string) => void;
  onClose: () => void;
};

export const DeskBookingsModal = (props: DeskBookingsModalProps) => {
  const {
    open,
    desk,
    bookings,
    users,
    busy,
    pendingCancelBookingId,
    canCancel,
    onCancelBooking,
    onClose,
  } = props;

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);

  useEffect(() => {
    if (open) setTab("upcoming");
  }, [open, desk?.id]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const userById = useMemo(() => {
    return new Map(users.map((u) => [u.id, u] as const));
  }, [users]);

  const visibleBookings = useMemo(() => {
    const filtered = bookings
      .filter((b) =>
        tab === "upcoming"
          ? isUpcomingBooking(b.date, b.slot)
          : !isUpcomingBooking(b.date, b.slot),
      )
      .slice();

    filtered.sort((a, b) => {
      const bySlot = compareYmdSlot(a.date, a.slot, b.date, b.slot);
      if (bySlot !== 0) return bySlot;
      return a.createdAt.localeCompare(b.createdAt);
    });

    if (tab === "past") filtered.reverse();
    return filtered;
  }, [bookings, tab]);

  const updateScrollEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const nextAtTop = el.scrollTop <= 1;
    const nextAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    setAtTop(nextAtTop);
    setAtBottom(nextAtBottom);
  };

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => updateScrollEdges());
  }, [open, tab, visibleBookings.length]);

  if (!open || !desk) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Bookings for ${desk.label}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modalWide modalConstrained">
        <div className="modalTitle">Bookings</div>
        <div className="muted">
          {desk.label} · {desk.zone}
        </div>
        <div className="pill deskIdPill" style={{ marginTop: 10 }}>
          <span className="muted">Desk ID</span>
          <span>{desk.id}</span>
        </div>

        <div className="tabs" style={{ marginTop: 14 }}>
          <button
            type="button"
            className={cx("tab", tab === "upcoming" && "tabActive")}
            onClick={() => setTab("upcoming")}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={cx("tab", tab === "past" && "tabActive")}
            onClick={() => setTab("past")}
          >
            Past
          </button>
        </div>

        <div className="modalBodyFlex" style={{ marginTop: 10 }}>
          {visibleBookings.length === 0 ? (
            <div className="muted">
              No {tab === "upcoming" ? "upcoming" : "past"} bookings.
            </div>
          ) : (
            <div
              className="scrollFade"
              data-at-top={atTop}
              data-at-bottom={atBottom}
            >
              <div
                ref={scrollerRef}
                className="scrollFadeScroller"
                onScroll={() => updateScrollEdges()}
              >
                <div className="list">
                  {visibleBookings.map((b) => {
                    const u = userById.get(b.userId);
                    const window = slotWindow(b.slot);
                    const isCancelling = pendingCancelBookingId === b.id;

                    return (
                      <div
                        key={b.id}
                        className="listRow"
                        style={{ alignItems: "flex-start" }}
                      >
                        <div>
                          <div className="listTitle">
                            {u?.name ?? b.userId} · {b.status}
                          </div>
                          <div className="infoPills u-mt-8">
                            <div className="pill deskIdPill">
                              <span className="muted">Booking for</span>
                              <span>
                                {formatYmdDisplay(b.date)} · {slotLabel(b.slot)}{" "}
                                ({window.range}, {window.duration})
                              </span>
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

                        {canCancel &&
                        b.status === "ACTIVE" &&
                        onCancelBooking ? (
                          <button
                            className="danger"
                            type="button"
                            disabled={busy || isCancelling}
                            onClick={() => onCancelBooking(b.id)}
                          >
                            {isCancelling ? "Cancelling…" : "Cancel"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="row u-justify-end u-mt-12">
          <button className="secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
