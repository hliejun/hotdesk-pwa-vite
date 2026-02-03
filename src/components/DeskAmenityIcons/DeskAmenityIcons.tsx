import type { Amenity } from "../../types";
import { AmenityHint } from "../AmenityIcon";
import { cx } from "../../lib/cx";

type DeskAmenityIconsProps = {
  amenities: Amenity[];
  className?: string;
};

export const DeskAmenityIcons = ({
  amenities,
  className,
}: DeskAmenityIconsProps) => {
  return (
    <div className={cx("amenityIcons", className)}>
      {amenities.map((a) => (
        <AmenityHint key={a} amenity={a} />
      ))}
    </div>
  );
};
