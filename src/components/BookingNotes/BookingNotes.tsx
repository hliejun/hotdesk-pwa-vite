import { cx } from "../../lib/cx";

type BookingNotesProps = {
  details?: string;
  title?: string;
  className?: string;
};

export const BookingNotes = ({
  details,
  title = "Notes",
  className,
}: BookingNotesProps) => {
  if (!details) return null;

  return (
    <div className={cx("noteBox", className)}>
      <div className="noteLabel">{title}</div>
      <div className="noteText">{details}</div>
    </div>
  );
};
