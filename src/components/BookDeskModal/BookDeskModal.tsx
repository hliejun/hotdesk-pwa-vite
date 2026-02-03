import { useEffect, useMemo, useState } from "react";
import type { BookingSlot, Desk } from "../../types";
import { formatYmdDisplay, slotLabel, slotWindow } from "../../lib/date";
import { Spinner } from "../Spinner";

export type BookDeskModalProps = {
  open: boolean;
  desk: Desk | undefined;
  date: string;
  slot: BookingSlot;
  busy: boolean;
  onClose: () => void;
  onConfirm: (details?: string) => void | Promise<void>;
};

export const BookDeskModal = (props: BookDeskModalProps) => {
  const { open, desk, date, slot, busy, onClose, onConfirm } = props;

  const [details, setDetails] = useState("");

  useEffect(() => {
    if (open) setDetails("");
  }, [open, desk?.id, date, slot]);

  const window = useMemo(() => slotWindow(slot), [slot]);

  if (!open || !desk) return null;

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Book ${desk.label}`}
      onMouseDown={(e) => {
        if (busy) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modalTitle">Book desk</div>
        <div className="muted">
          {desk.label} · {desk.zone}
        </div>

        <div className="kvRow" style={{ marginTop: 12 }}>
          <span className="kvLabel">When</span>
          <span className="kvValue">
            {formatYmdDisplay(date)} · {slotLabel(slot)} ({window.range})
          </span>
        </div>

        <div className="modalBody" style={{ marginTop: 10 }}>
          <label className="field">
            <div className="label">Booking notes (optional)</div>
            <textarea
              rows={4}
              placeholder="Reason or notes for this booking"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
        </div>

        <div className="row u-justify-end u-gap-10 u-mt-12 u-wrap">
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
            disabled={busy}
            onClick={() => void onConfirm(details.trim() || undefined)}
          >
            <span className="buttonContent">
              {busy ? <Spinner label="Booking" /> : null}
              {busy ? "Booking" : "Book"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
