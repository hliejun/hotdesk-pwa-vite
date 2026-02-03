import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../../store";
import type { BookingSlot } from "../../types";
import { Spinner } from "../../components/Spinner";
import { Skeleton } from "../../components/Skeleton";
import { BootSkeleton } from "../../components/BootSkeleton";
import { BookingNotes } from "../../components/BookingNotes";
import { DeskCard } from "../../components/DeskCard";
import { bookingLabel } from "../../lib/bookingLabel";
import {
  activeBookingsForSlot,
  bookingByDeskId as bookingMapByDeskId,
  myActiveBookingForSlot,
  myBookingsForDeskSorted,
} from "../../lib/bookingQueries";
import {
  BOOKING_SLOTS,
  compareYmdSlot,
  formatDateTime,
  isUpcomingBooking,
  slotLabel,
  slotWindow,
  todayYmd,
} from "../../lib/date";
import {
  DeskFilters,
  type DeskFilterState,
} from "../../components/DeskFilters";
import { matchesDeskFilters } from "../../lib/deskFiltering";
import { cx } from "../../lib/cx";
import { zonesFromDesks } from "../../lib/deskZones";
import { ReportFaultModal } from "../../components/ReportFaultModal";
import { BookDeskModal } from "../../components/BookDeskModal/BookDeskModal";

type NavState = {
  showResults?: boolean;
} | null;

function skeletonGrid(count: number) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="card gridCard">
      <Skeleton className="skeletonTitle" />
      <div style={{ height: 10 }} />
      <Skeleton className="skeletonLine" />
      <div style={{ height: 10 }} />
      <Skeleton className="skeletonBlock" />
    </div>
  ));
}

const Bookings = () => {
  const { state, actions } = useApp();

  const isBootLoading = state.boot.status === "loading";

  const location = useLocation();
  const navState = (location.state ?? null) as NavState;

  const [showResults, setShowResults] = useState<boolean>(() =>
    Boolean(navState?.showResults),
  );

  const [searchQuery, setSearchQuery] = useState(state.ui.query);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<number | null>(null);

  const pulseSearchSkeleton = () => {
    setIsSearching(true);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setIsSearching(false);
      searchTimerRef.current = null;
    }, 350);
  };

  const selectedDate = state.ui.selectedDate || todayYmd();
  const selectedSlot = state.ui.selectedSlot;

  const currentUser = useMemo(() => {
    return state.db.users.find((u) => u.id === state.auth.currentUserId);
  }, [state.auth.currentUserId, state.db.users]);

  const isAdmin = currentUser?.role === "ADMIN";

  const [bookForUserId, setBookForUserId] = useState(state.auth.currentUserId);

  useEffect(() => {
    if (!isAdmin) {
      setBookForUserId(state.auth.currentUserId);
      return;
    }
    if (!state.db.users.some((u) => u.id === bookForUserId)) {
      setBookForUserId(state.auth.currentUserId);
    }
  }, [bookForUserId, isAdmin, state.auth.currentUserId, state.db.users]);

  const bookingUserId = isAdmin ? bookForUserId : state.auth.currentUserId;

  const busy = state.ui.busyCount > 0;
  const refreshPending = state.ui.pending.refresh;
  const bookPendingId = state.ui.pending.bookDeskId;
  const cancelPendingId = state.ui.pending.cancelBookingId;

  useEffect(() => {
    if (!navState?.showResults) return;
    setShowResults(true);
    pulseSearchSkeleton();
    // If user navigates here with state again, this should re-run.
  }, [location.key, navState?.showResults]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, []);

  const mine = useMemo(() => {
    return state.db.bookings
      .filter(
        (b) => b.status === "ACTIVE" && b.userId === state.auth.currentUserId,
      )
      .filter((b) => isUpcomingBooking(b.date, b.slot))
      .slice()
      .sort((a, b) => compareYmdSlot(a.date, a.slot, b.date, b.slot));
  }, [state.auth.currentUserId, state.db.bookings]);

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

  const bookingsForSlot = useMemo(() => {
    return activeBookingsForSlot(state.db.bookings, selectedDate, selectedSlot);
  }, [selectedDate, selectedSlot, state.db.bookings]);

  const bookingByDeskId = useMemo(() => {
    return bookingMapByDeskId(bookingsForSlot);
  }, [bookingsForSlot]);

  const myBookingForSlot = useMemo(() => {
    return myActiveBookingForSlot(
      state.db.bookings,
      bookingUserId,
      selectedDate,
      selectedSlot,
    );
  }, [bookingUserId, selectedDate, selectedSlot, state.db.bookings]);

  const visibleDesks = useMemo(() => {
    return state.db.desks
      .filter((d) => d.status === "ACTIVE")
      .filter((d) => matchesDeskFilters(d, filters))
      .sort((a, b) => (a.zone + a.label).localeCompare(b.zone + b.label));
  }, [filters, state.db.desks]);

  const [reportDeskId, setReportDeskId] = useState<string | null>(null);
  const [bookDeskId, setBookDeskId] = useState<string | null>(null);

  const reportDesk = useMemo(() => {
    if (!reportDeskId) return undefined;
    return state.db.desks.find((d) => d.id === reportDeskId);
  }, [reportDeskId, state.db.desks]);

  const bookDesk = useMemo(() => {
    if (!bookDeskId) return undefined;
    return state.db.desks.find((d) => d.id === bookDeskId);
  }, [bookDeskId, state.db.desks]);

  const myBookingsForReportDesk = useMemo(() => {
    if (!reportDeskId) return [];
    return myBookingsForDeskSorted(
      state.db.bookings,
      bookingUserId,
      reportDeskId,
    );
  }, [bookingUserId, reportDeskId, state.db.bookings]);

  if (isBootLoading) {
    return <BootSkeleton />;
  }

  return (
    <div className="stack">
      <details className="card accordionCard" aria-label="My bookings">
        <summary className="accordionSummary accordionSummaryCard">
          <div>
            <div className="cardTitle">My bookings</div>
            <div className="muted">
              Your upcoming bookings (collapsed by default).
            </div>
          </div>
          <span className="accordionChevron" aria-hidden="true" />
        </summary>

        <div className="accordionBody">
          {mine.length === 0 ? (
            <div className="muted">No upcoming bookings.</div>
          ) : (
            <div className="list">
              {mine.map((b) => (
                <div key={b.id} className="listRow">
                  <div>
                    <div className="listTitle">
                      {bookingLabel(b, state.db.desks)}
                    </div>
                    <div className="pill deskIdPill u-mt-8">
                      <span className="muted">Booked at</span>
                      <span>{formatDateTime(b.createdAt)}</span>
                    </div>
                    <BookingNotes details={b.details} className="u-mt-10" />
                  </div>
                  <button
                    className="danger"
                    type="button"
                    disabled={busy}
                    onClick={() => void actions.cancelBooking(b.id)}
                  >
                    <span className="buttonContent">
                      {cancelPendingId === b.id ? (
                        <Spinner label="Cancelling" />
                      ) : null}
                      Cancel
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </details>

      <section className="card">
        <div className="cardTitle">Book a desk</div>
        <div className="gridForm">
          {isAdmin ? (
            <label className="field">
              <div className="label">Book for</div>
              <select
                value={bookForUserId}
                onChange={(e) => setBookForUserId(e.target.value)}
              >
                {state.db.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <div className="label">Date</div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => actions.setSelectedDate(e.target.value)}
            />
          </label>

          <label className="field">
            <div className="label">Slot</div>
            <select
              value={selectedSlot}
              onChange={(e) =>
                actions.setSelectedSlot(e.target.value as BookingSlot)
              }
            >
              {BOOKING_SLOTS.map((slot) => {
                const window = slotWindow(slot);
                return (
                  <option key={slot} value={slot}>
                    {slotLabel(slot)} ({window.range})
                  </option>
                );
              })}
            </select>
          </label>

          <label className="field" style={{ minWidth: 240 }}>
            <div className="label">Search</div>
            <input
              placeholder="Desk label, zone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <div className="row u-gap-10 u-align-end u-wrap u-ml-auto u-justify-end">
            <button
              className="primary"
              type="button"
              disabled={busy}
              onClick={() => {
                actions.setQuery(searchQuery);
                setShowResults(true);
                pulseSearchSkeleton();
              }}
            >
              Search
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => {
                setShowResults(true);
                pulseSearchSkeleton();
                void actions.refresh();
              }}
            >
              <span className="buttonContent">
                {refreshPending ? <Spinner label="Refreshing" /> : null}
                Refresh
              </span>
            </button>
          </div>
        </div>
      </section>

      {showResults ? (
        <>
          <section className="card">
            <div
              className="row"
              style={{
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="cardTitle">Available desks</div>
                <div className="muted">Results matching your filters.</div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <div className="pill">
                  <span className="muted">Showing</span>
                  <span>{visibleDesks.length}</span>
                </div>
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
                // If user tweaks filters, ensure results stay visible
                setShowResults(true);
              }}
              dense
            />
          </section>

          <section className="grid">
            {refreshPending || isSearching ? (
              skeletonGrid(6)
            ) : visibleDesks.length === 0 ? (
              <div
                className="muted"
                style={{ gridColumn: "1 / -1", padding: "2px 2px" }}
              >
                No desks match your filters.
              </div>
            ) : (
              visibleDesks.map((desk) => {
                const booking = bookingByDeskId.get(desk.id);
                const isBooked = !!booking;
                const isBookedByMe = booking?.userId === bookingUserId;
                const lockedOutByOtherBooking =
                  !!myBookingForSlot && myBookingForSlot.deskId !== desk.id;

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

                const canBook = !busy && !isBooked && !myBookingForSlot;
                const canCancel = !busy && isBookedByMe;

                return (
                  <DeskCard
                    key={desk.id}
                    desk={desk}
                    className={cx(
                      "gridCard",
                      isBookedByMe
                        ? "cardBookedMine"
                        : isBooked
                          ? "cardBooked"
                          : null,
                    )}
                    badge={
                      <div className={cx("badge", availabilityBadgeClass)}>
                        {availability}
                      </div>
                    }
                  >
                    <div className="u-mt-auto">
                      <div className="row u-justify-end u-gap-12 u-mt-12 u-wrap">
                        <div className="row u-gap-10 u-wrap">
                          <button
                            className="secondary"
                            type="button"
                            disabled={busy}
                            onClick={() => setReportDeskId(desk.id)}
                          >
                            Report issue
                          </button>
                          {isBookedByMe && booking ? (
                            <button
                              className="danger"
                              type="button"
                              disabled={!canCancel}
                              onClick={() =>
                                void actions.cancelBooking(booking.id)
                              }
                            >
                              <span className="buttonContent">
                                {cancelPendingId === booking.id ? (
                                  <Spinner label="Cancelling" />
                                ) : null}
                                Cancel
                              </span>
                            </button>
                          ) : lockedOutByOtherBooking ? null : (
                            <button
                              className="primary"
                              type="button"
                              disabled={!canBook}
                              onClick={() => setBookDeskId(desk.id)}
                            >
                              <span className="buttonContent">
                                {bookPendingId === desk.id ? (
                                  <Spinner label="Booking" />
                                ) : null}
                                {bookPendingId === desk.id ? "Booking" : "Book"}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      <BookingNotes
                        details={booking?.details}
                        className="u-mt-12"
                      />
                    </div>
                  </DeskCard>
                );
              })
            )}
          </section>
        </>
      ) : null}

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

      <BookDeskModal
        open={!!bookDeskId}
        desk={bookDesk}
        date={selectedDate}
        slot={selectedSlot}
        busy={busy || (bookDeskId ? bookPendingId === bookDeskId : false)}
        onClose={() => setBookDeskId(null)}
        onConfirm={async (details) => {
          if (!bookDeskId) return;
          await actions.bookDesk(bookDeskId, details, bookingUserId);
          setBookDeskId(null);
        }}
      />
    </div>
  );
};

export default Bookings;
