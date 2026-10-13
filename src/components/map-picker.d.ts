import type { Coordinate } from "@/utils/geo";

export function MapPicker(props: {
  value?: Coordinate;
  onChange: (value: Coordinate) => void;
  radiusKm?: number;
}): React.JSX.Element;
