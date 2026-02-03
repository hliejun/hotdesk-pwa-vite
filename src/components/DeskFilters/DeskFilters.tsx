import { AmenityIcon, AmenityLabel } from "../AmenityIcon";
import { ALL_AMENITIES, type DeskFilterState } from "./deskFiltersModel";

export interface DeskFiltersProps {
  zones: string[];
  value: DeskFilterState;
  onChange: (next: DeskFilterState) => void;
  dense?: boolean;
}

export const DeskFilters = ({
  zones,
  value,
  onChange,
  dense,
}: DeskFiltersProps) => {
  return (
    <div className={dense ? "filters filtersDense" : "filters"}>
      <label className="field" style={{ minWidth: 220 }}>
        <div className="label">Search</div>
        <input
          placeholder="Desk label or zone"
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
        />
      </label>

      <label className="field">
        <div className="label">Zone</div>
        <select
          value={value.zone}
          onChange={(e) => onChange({ ...value, zone: e.target.value })}
        >
          <option value="ALL">All</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </label>

      <div className="field" style={{ minWidth: 260 }}>
        <div className="label">Amenities</div>
        <div className="amenities">
          {ALL_AMENITIES.map((a) => {
            const active = value.amenities[a];
            const label = AmenityLabel(a);
            return (
              <button
                key={a}
                type="button"
                className={active ? "amenityChip amenityChipOn" : "amenityChip"}
                onClick={() =>
                  onChange({
                    ...value,
                    amenities: { ...value.amenities, [a]: !active },
                  })
                }
                title={label}
                data-tooltip={label}
              >
                <span className="amenityIcon">
                  <AmenityIcon amenity={a} />
                </span>
                <span className="amenityText">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
