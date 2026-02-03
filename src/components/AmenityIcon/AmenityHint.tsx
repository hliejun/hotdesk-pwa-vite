import React from "react";
import type { Amenity } from "../../types";
import { AmenityIcon } from "./AmenityIcon";
import { AmenityLabel } from "./amenityLabel";

export interface AmenityHintProps {
  amenity: Amenity;
}

export const AmenityHint = ({ amenity }: AmenityHintProps) => {
  const label = AmenityLabel(amenity);

  return (
    <span
      className="amenityHint"
      title={label}
      data-tooltip={label}
      tabIndex={0}
    >
      <span className="amenityHintIcon">
        <AmenityIcon amenity={amenity} />
      </span>
      <span className="amenityHintLabel">{label}</span>
    </span>
  );
};
