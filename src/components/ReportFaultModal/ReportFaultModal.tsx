import { useEffect, useMemo, useState } from "react";
import type { Booking, Desk } from "../../types";
import { cx } from "../../lib/cx";
import { formatYmdDisplay, slotLabel } from "../../lib/date";
import { Spinner } from "../Spinner";

export interface ReportFaultModalProps {
  open: boolean;
  desk: Pick<Desk, "id" | "label" | "zone"> | undefined;
  myBookingsForDesk: Booking[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: {
    deskId: string;
    description: string;
    bookingId?: string;
  }) => Promise<void> | void;
}

export const ReportFaultModal = ({
  open,
  desk,
  myBookingsForDesk,
  busy,
  onClose,
  onSubmit,
}: ReportFaultModalProps) => {
  const [description, setDescription] = useState("");
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    if (!open) return;
    setDescription("");
    setBookingId("");
  }, [open]);

  const valid = useMemo(() => {
    return !!desk && description.trim().length >= 3;
  }, [desk, description]);

  if (!open || !desk) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Report issue for ${desk.label}`}
      onMouseDown={(e) => {
        if (busy) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modalTitle">Report an issue</div>
        <div className="muted">
          {desk.label} · {desk.zone}
        </div>
        <div className="kvRow" style={{ marginTop: 10 }}>
          <span className="kvLabel">Desk ID</span>
          <span className="kvValue">{desk.id}</span>
        </div>

        <div className="modalBody" style={{ marginTop: 12 }}>
          <label className="field">
            <div className="label">Describe the issue</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. monitor not turning on, chair broken, desk wobbly"
            />
          </label>

          <label className="field" style={{ marginTop: 10 }}>
            <div className="label">Attach booking (optional)</div>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              disabled={myBookingsForDesk.length === 0}
            >
              <option value="">None</option>
              {myBookingsForDesk.map((b) => (
                <option key={b.id} value={b.id}>
                  {formatYmdDisplay(b.date)} · {slotLabel(b.slot)} ({b.status})
                </option>
              ))}
            </select>
            {myBookingsForDesk.length === 0 ? (
              <div className="muted" style={{ marginTop: 6 }}>
                No bookings found for this desk.
              </div>
            ) : null}
          </label>

          {!valid ? (
            <div className={cx("muted", "noteText")} style={{ marginTop: 10 }}>
              Please enter at least 3 characters.
            </div>
          ) : null}
        </div>

        <div className="modalActions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="primary"
            type="button"
            disabled={!valid || busy}
            onClick={async () => {
              await onSubmit({
                deskId: desk.id,
                description: description.trim(),
                bookingId: bookingId.trim() || undefined,
              });
            }}
          >
            <span className="buttonContent">
              {busy ? <Spinner label="Submitting" /> : null}
              {busy ? "Submitting" : "Submit"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
