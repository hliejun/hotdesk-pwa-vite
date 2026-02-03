import type { Amenity } from "../../types";

import { AdjustableIcon } from "./icons/AdjustableIcon";
import { CommunalIcon } from "./icons/CommunalIcon";
import { MonitorIcon } from "./icons/MonitorIcon";
import { PrivateIcon } from "./icons/PrivateIcon";
import { WindowIcon } from "./icons/WindowIcon";

export interface AmenityIconProps {
  amenity: Amenity;
}

export const AmenityIcon = ({ amenity }: AmenityIconProps) => {
  switch (amenity) {
    case "MONITOR":
      return <MonitorIcon />;
    case "WINDOW":
      return <WindowIcon />;
    case "ADJUSTABLE":
      return <AdjustableIcon />;
    case "PRIVATE":
      return <PrivateIcon />;
    case "COMMUNAL":
      return <CommunalIcon />;
    default:
      return null;
  }
};
