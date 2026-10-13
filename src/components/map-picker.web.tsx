import { useState } from "react";
import { View } from "react-native";
import { AppText, Button } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";
import type { Coordinate } from "@/utils/geo";

export function MapPicker({ value, onChange }: { value?: Coordinate; onChange: (value: Coordinate) => void; radiusKm?: number; zoneCenter?: Coordinate }) {
  const [locating, setLocating] = useState(false);
  const locate = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocating(false);
    }, () => setLocating(false), { enableHighAccuracy: true });
  };
  return <View style={{ padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: "center" }}><AppText color={colors.muted} style={{ textAlign: "center" }}>Telefon ilovasida nuqtani xaritadan tanlash mumkin. Brauzerda joriy joylashuvdan foydalaning.</AppText><Button title="Joriy joyim" icon="locate-outline" variant="secondary" loading={locating} onPress={locate} />{value ? <AppText variant="caption" color={colors.green}>{value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</AppText> : null}</View>;
}
