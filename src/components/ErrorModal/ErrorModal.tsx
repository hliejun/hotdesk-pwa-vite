import React, { useEffect } from "react";

export interface ErrorModalProps {
  title?: string;
  message: string;
  retryCount: number;
  onDismiss: () => void;
  onRetry: () => void;
}

export const ErrorModal = ({
  title = "Something went wrong",
  message,
  retryCount,
  onDismiss,
  onRetry,
}: ErrorModalProps) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onDismiss}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-message"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div id="error-modal-title" className="modalTitle">
          {title}
        </div>
        <div id="error-modal-message" className="modalBody">
          {message}
        </div>

        <div className="modalActions">
          {retryCount > 0 ? (
            <button
              className="primary"
              type="button"
              onClick={() => void onRetry()}
            >
              Retry ({retryCount})
            </button>
          ) : null}
          <button className="secondary" type="button" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
