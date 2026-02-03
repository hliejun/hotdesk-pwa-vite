import React from "react";

export interface SpinnerProps {
  label?: string;
}

export const Spinner = ({ label = "Loading" }: SpinnerProps) => {
  return (
    <span
      className="spinner"
      role="status"
      aria-label={label}
      aria-live="polite"
    />
  );
};
