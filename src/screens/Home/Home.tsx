import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../store";
import type { BookingSlot } from "../../types";
import {
  BOOKING_SLOTS,
  compareYmdSlot,
  formatDateTime,
  formatYmdDisplay,
  isUpcomingBooking,
  slotLabel,
  slotWindow,
  todayYmd,
} from "../../lib/date";
import { Spinner } from "../../components/Spinner";
import { Skeleton } from "../../components/Skeleton";
import { bookingLabel } from "../../lib/bookingLabel";
import { BookDeskModal } from "../../components/BookDeskModal/BookDeskModal";
import { BookingNotes } from "../../components/BookingNotes";
import { activeBookingsForSlot as activeBookingsForSlotQuery } from "../../lib/bookingQueries";

const Home = () => {
  const { state, actions } = useApp();

  const isBootLoading = state.boot.status === "loading";

  const navigate = useNavigate();

  const busy = state.ui.busyCount > 0;
  const refreshPending = state.ui.pending.refresh;
  const bookPendingId = state.ui.pending.bookDeskId;
  const cancelPendingId = state.ui.pending.cancelBookingId;

  const [searchQuery, setSearchQuery] = useState(state.ui.query);

  const selectedDate = state.ui.selectedDate || todayYmd();
  const selectedSlot = state.ui.selectedSlot;

  const activeDesks = useMemo(
    () => state.db.desks.filter((d) => d.status === "ACTIVE"),
    [state.db.desks],
  );

  const activeBookingsForSlot = useMemo(() => {
    return activeBookingsForSlotQuery(
      state.db.bookings,
      selectedDate,
      selectedSlot,
    );
  }, [selectedDate, selectedSlot, state.db.bookings]);

  const occupancy = useMemo(() => {
    const capacity = activeDesks.length;
    const occupied = activeBookingsForSlot.length;
    const pct = capacity === 0 ? 0 : Math.round((occupied / capacity) * 100);
    return { capacity, occupied, pct };
  }, [activeBookingsForSlot.length, activeDesks.length]);

  const upcomingBookings = useMemo(() => {
    return state.db.bookings
      .filter(
        (b) =>
          b.status === "ACTIVE" &&
          b.userId === state.auth.currentUserId &&
          isUpcomingBooking(b.date, b.slot),
      )
      .slice()
      .sort((a, b) => compareYmdSlot(a.date, a.slot, b.date, b.slot));
  }, [state.auth.currentUserId, state.db.bookings]);

  const nextBooking = upcomingBookings[0] ?? null;

  const [bookDeskId, setBookDeskId] = useState<string | null>(null);

  const bookDesk = useMemo(() => {
    if (!bookDeskId) return undefined;
    return state.db.desks.find((d) => d.id === bookDeskId);
  }, [bookDeskId, state.db.desks]);

  if (isBootLoading) {
    return (
      <div className="stack">
        <section className="card">
          <Skeleton className="skeletonTitle" />
          <div style={{ height: 10 }} />
          <Skeleton className="skeletonLine" />
          <div style={{ height: 14 }} />
          <Skeleton className="skeletonBlock" />
        </section>
        <section className="gridTwo">
          <div className="card">
            <Skeleton className="skeletonTitle" />
            <div style={{ height: 12 }} />
            <Skeleton className="skeletonBlock" />
          </div>
          <div className="card">
            <Skeleton className="skeletonTitle" />
            <div style={{ height: 12 }} />
            <Skeleton className="skeletonBlock" />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="stack homeCenter">
      <section className="homeHero" aria-label="Brand">
        <h1 className="homeHeroTitle">Bookie</h1>
        <p className="homeHeroSubtitle">Book desks fast, we bet.</p>
      </section>

      <section className="card">
        <div className="cardTitle">Book a desk</div>
        <div className="gridForm">
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
                navigate("/bookings", { state: { showResults: true } });
              }}
            >
              Search
            </button>
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => void actions.refresh()}
            >
              <span className="buttonContent">
                {refreshPending ? <Spinner label="Refreshing" /> : null}
                Refresh
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="gridTwo">
        <div className="card">
          <div className="cardTitle">Your next booking</div>
          {nextBooking ? (
            <div className="list">
              <div className="listRow">
                <div>
                  <div className="listTitle">
                    {bookingLabel(nextBooking, state.db.desks)}
                  </div>
                  <div className="pill deskIdPill u-mt-8">
                    <span className="muted">Booked at</span>
                    <span>{formatDateTime(nextBooking.createdAt)}</span>
                  </div>
                  <BookingNotes
                    details={nextBooking.details}
                    className="u-mt-10"
                  />
                </div>
                <button
                  className="danger"
                  type="button"
                  disabled={busy}
                  onClick={() => void actions.cancelBooking(nextBooking.id)}
                >
                  <span className="buttonContent">
                    {cancelPendingId === nextBooking.id ? (
                      <Spinner label="Cancelling" />
                    ) : null}
                    Cancel
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="muted">No upcoming bookings.</div>
          )}
        </div>

        <div className="card">
          <div className="cardTitle">Office occupancy</div>
          <div
            className="row"
            style={{ justifyContent: "space-between", marginBottom: 10 }}
          >
            <div className="muted">
              {formatYmdDisplay(selectedDate)} · {slotLabel(selectedSlot)}
            </div>
            <div className="pill">
              <span className="muted">Booked</span>
              <span>
                {occupancy.occupied}/{occupancy.capacity}
              </span>
            </div>
          </div>
          <div
            className="meter"
            role="progressbar"
            aria-valuenow={occupancy.pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="meterFill" style={{ width: `${occupancy.pct}%` }} />
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            {occupancy.pct}% occupied
          </div>
        </div>
      </section>

      <BookDeskModal
        open={!!bookDeskId}
        desk={bookDesk}
        date={selectedDate}
        slot={selectedSlot}
        busy={busy || (bookDeskId ? bookPendingId === bookDeskId : false)}
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

export default Home;
