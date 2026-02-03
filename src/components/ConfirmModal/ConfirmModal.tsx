import { useEffect } from "react";
import { Spinner } from "../Spinner";

export type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  confirmBusy?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  confirmBusy = false,
  disabled = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [disabled, onCancel]);

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onMouseDown={() => {
        if (disabled) return;
        onCancel();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div id="confirm-modal-title" className="modalTitle">
          {title}
        </div>
        <div id="confirm-modal-message" className="modalBody">
          {message}
        </div>

        <div className="modalActions">
          <button
            className="secondary"
            type="button"
            disabled={disabled}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={confirmVariant}
            type="button"
            disabled={disabled}
            onClick={onConfirm}
          >
            <span className="buttonContent">
              {confirmBusy ? <Spinner label={confirmLabel} /> : null}
              {confirmLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
