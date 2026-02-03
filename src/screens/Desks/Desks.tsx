import { useMemo, useState, useRef } from "react";
import { useApp } from "../../store";
import { BookDeskModal } from "../../components/BookDeskModal/BookDeskModal";
import { DeskBookingsModal } from "../../components/DeskBookingsModal/DeskBookingsModal";
import { ReportFaultModal } from "../../components/ReportFaultModal";
import { Spinner } from "../../components/Spinner";
import { BootSkeleton } from "../../components/BootSkeleton";
import { DeskCard } from "../../components/DeskCard";
import { todayYmd } from "../../lib/date";
import {
  activeBookingsForSlot,
  bookingByDeskId as bookingMapByDeskId,
  myActiveBookingForSlot,
  myBookingsForDeskSorted,
} from "../../lib/bookingQueries";
import {
  DeskFilters,
  type DeskFilterState,
} from "../../components/DeskFilters";
import { matchesDeskFilters } from "../../lib/deskFiltering";
import { cx } from "../../lib/cx";
import { zonesFromDesks } from "../../lib/deskZones";
import { useDismissOnOutsideInteraction } from "../../lib/useDismissOnOutsideInteraction";

const Desks = () => {
  const { state, actions } = useApp();

  const isBootLoading = state.boot.status === "loading";

  const busy = state.ui.busyCount > 0;
  const cancelPendingId = state.ui.pending.cancelBookingId;

  const selectedDate = state.ui.selectedDate || todayYmd();
  const selectedSlot = state.ui.selectedSlot;

  const bookingsForSlot = useMemo(() => {
    return activeBookingsForSlot(state.db.bookings, selectedDate, selectedSlot);
  }, [selectedDate, selectedSlot, state.db.bookings]);

  const bookingByDeskId = useMemo(() => {
    return bookingMapByDeskId(bookingsForSlot);
  }, [bookingsForSlot]);

  const myBookingForSlot = useMemo(() => {
    return myActiveBookingForSlot(
      state.db.bookings,
      state.auth.currentUserId,
      selectedDate,
      selectedSlot,
    );
  }, [selectedDate, selectedSlot, state.auth.currentUserId, state.db.bookings]);

  const zones = useMemo(() => {
    return zonesFromDesks(state.db.desks);
  }, [state.db.desks]);

  const filters: DeskFilterState = useMemo(
    () => ({
      zone: state.ui.zoneFilter,
      query: state.ui.query,
      amenities: state.ui.amenityFilters,
    }),
    [state.ui.amenityFilters, state.ui.query, state.ui.zoneFilter],
  );

  const visibleDesks = useMemo(() => {
    return state.db.desks
      .filter((d) => matchesDeskFilters(d, filters))
      .slice()
      .sort((a, b) => (a.zone + a.label).localeCompare(b.zone + b.label));
  }, [filters, state.db.desks]);

  const [reportDeskId, setReportDeskId] = useState<string | null>(null);
  const [deskMenuId, setDeskMenuId] = useState<string | null>(null);
  const deskMenuRef = useRef<HTMLDivElement | null>(null);
  const deskMenuAnchorRef = useRef<HTMLElement | null>(null);
  const [bookDeskId, setBookDeskId] = useState<string | null>(null);
  const [bookingsDeskId, setBookingsDeskId] = useState<string | null>(null);

  useDismissOnOutsideInteraction(
    !!deskMenuId,
    [deskMenuRef, deskMenuAnchorRef],
    () => setDeskMenuId(null),
  );

  const reportDesk = useMemo(() => {
    if (!reportDeskId) return undefined;
    return state.db.desks.find((d) => d.id === reportDeskId);
  }, [reportDeskId, state.db.desks]);

  const bookDesk = useMemo(() => {
    if (!bookDeskId) return undefined;
    return state.db.desks.find((d) => d.id === bookDeskId);
  }, [bookDeskId, state.db.desks]);

  const bookingsDesk = useMemo(() => {
    if (!bookingsDeskId) return undefined;
    return state.db.desks.find((d) => d.id === bookingsDeskId);
  }, [bookingsDeskId, state.db.desks]);

  const bookingsForDesk = useMemo(() => {
    if (!bookingsDeskId) return [];
    return state.db.bookings.filter((b) => b.deskId === bookingsDeskId);
  }, [bookingsDeskId, state.db.bookings]);

  const myBookingsForReportDesk = useMemo(() => {
    if (!reportDeskId) return [];
    return myBookingsForDeskSorted(
      state.db.bookings,
      state.auth.currentUserId,
      reportDeskId,
    );
  }, [reportDeskId, state.auth.currentUserId, state.db.bookings]);

  if (isBootLoading) {
    return <BootSkeleton />;
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row u-justify-between u-gap-12 u-wrap">
          <div>
            <div className="cardTitle">All desks</div>
            <div className="muted">Browse the full inventory with filters.</div>
          </div>

          <div className="row u-gap-8 u-wrap">
            <div className="pill">
              <span className="muted">Showing</span>
              <span>{visibleDesks.length}</span>
            </div>
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => void actions.refresh()}
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <DeskFilters
          zones={zones}
          value={filters}
          onChange={(next) => {
            actions.setZoneFilter(next.zone);
            actions.setQuery(next.query);
            actions.setAmenityFilters(next.amenities);
          }}
        />
      </section>

      <section className="grid">
        {visibleDesks.map((desk) => {
          const booking = bookingByDeskId.get(desk.id);
          const isBooked = !!booking;
          const isBookedByMe = booking?.userId === state.auth.currentUserId;

          const availability = (() => {
            if (desk.status !== "ACTIVE") return "Unavailable";
            if (!booking) return "Available";
            return isBookedByMe ? "Booked" : "Unavailable";
          })();

          const availabilityBadgeClass = (() => {
            if (availability === "Booked") return "badgeMine";
            if (availability === "Available") return "badgeFree";
            return "badgeBooked";
          })();

          return (
            <DeskCard
              key={desk.id}
              desk={desk}
              meta={
                <>
                  {desk.zone} · {desk.status}
                </>
              }
              className={cx(
                "gridCard",
                "deskBrowseCard",
                isBookedByMe
                  ? "cardBookedMine"
                  : isBooked
                    ? "cardBooked"
                    : null,
                desk.status !== "ACTIVE" && "cardDim",
              )}
              cornerAction={
                <button
                  type="button"
                  className="iconButton iconButtonSmall deskActionsButton"
                  aria-label={`Desk actions for ${desk.label}`}
                  disabled={busy}
                  onClick={(e) =>
                    setDeskMenuId((prev) => {
                      const next = prev === desk.id ? null : desk.id;
                      deskMenuAnchorRef.current = next ? e.currentTarget : null;
                      return next;
                    })
                  }
                >
                  ⋯
                </button>
              }
              badge={
                <div className={cx("badge", availabilityBadgeClass)}>
                  {availability}
                </div>
              }
            >
              {deskMenuId === desk.id ? (
                <div
                  ref={deskMenuRef}
                  className="menuTray"
                  role="menu"
                  aria-label="Desk actions"
                >
                  {(() => {
                    const lockedOutByOtherBooking =
                      !!myBookingForSlot && myBookingForSlot.deskId !== desk.id;
                    const canBook =
                      !busy &&
                      desk.status === "ACTIVE" &&
                      !isBooked &&
                      !myBookingForSlot;
                    const canCancel = !busy && isBookedByMe;

                    return (
                      <>
                        <button
                          className="menuItem"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDeskMenuId(null);
                            setReportDeskId(desk.id);
                          }}
                        >
                          Report issue
                        </button>
                        <button
                          className="menuItem"
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDeskMenuId(null);
                            setBookingsDeskId(desk.id);
                          }}
                        >
                          View bookings
                        </button>
                        {isBookedByMe && booking ? (
                          <button
                            className="menuItem danger"
                            type="button"
                            role="menuitem"
                            disabled={!canCancel}
                            onClick={() => {
                              setDeskMenuId(null);
                              void actions.cancelBooking(booking.id);
                            }}
                          >
                            <span className="buttonContent">
                              {cancelPendingId === booking.id ? (
                                <Spinner label="Cancelling" />
                              ) : null}
                              Cancel booking
                            </span>
                          </button>
                        ) : lockedOutByOtherBooking ? null : (
                          <button
                            className="menuItem"
                            type="button"
                            role="menuitem"
                            disabled={!canBook}
                            onClick={() => {
                              setDeskMenuId(null);
                              setBookDeskId(desk.id);
                            }}
                          >
                            Book
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </DeskCard>
          );
        })}
      </section>

      <ReportFaultModal
        open={!!reportDeskId}
        desk={reportDesk}
        myBookingsForDesk={myBookingsForReportDesk}
        busy={busy}
        onClose={() => setReportDeskId(null)}
        onSubmit={async (input) => {
          await actions.reportFault(input);
          setReportDeskId(null);
        }}
      />

      <DeskBookingsModal
        open={!!bookingsDeskId}
        desk={bookingsDesk}
        bookings={bookingsForDesk}
        users={state.db.users}
        busy={busy}
        canCancel={false}
        onClose={() => setBookingsDeskId(null)}
      />

      <BookDeskModal
        open={!!bookDeskId}
        desk={bookDesk}
        date={selectedDate}
        slot={selectedSlot}
        busy={busy}
        onClose={() => setBookDeskId(null)}
        onConfirm={async (details) => {
          if (!bookDeskId) return;
          await actions.bookDesk(bookDeskId, details);
          setBookDeskId(null);
        }}
      />
    </div>
  );
};

export default Desks;
