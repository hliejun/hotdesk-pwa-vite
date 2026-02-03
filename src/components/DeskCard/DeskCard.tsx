import type { ReactNode } from "react";
import type { Desk } from "../../types";
import { cx } from "../../lib/cx";
import { DeskAmenityIcons } from "../DeskAmenityIcons";

type DeskCardProps = {
  desk: Desk;
  meta?: ReactNode;
  badge?: ReactNode;
  details?: ReactNode;
  className?: string;
  cornerAction?: ReactNode;
  children?: ReactNode;
};

export const DeskCard = ({
  desk,
  meta = desk.zone,
  badge,
  details,
  className,
  cornerAction,
  children,
}: DeskCardProps) => {
  return (
    <div className={cx("card", className)}>
      {cornerAction}

      <div className="row u-justify-between u-gap-12 deskCardTopRow">
        <div>
          <div className="deskTitle">{desk.label}</div>
          {meta ? <div className="muted">{meta}</div> : null}
        </div>
        {badge ? badge : null}
      </div>

      {details ? details : null}

      <DeskAmenityIcons amenities={desk.amenities} className="u-mt-10" />

      {children}
    </div>
  );
};
