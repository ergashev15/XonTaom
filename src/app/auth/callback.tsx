import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/ui";
import { colors, spacing } from "@/theme";

export default function GoogleAuthCallbackScreen() {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.green} />
    <AppText color={colors.muted}>Google kirishi yakunlanmoqda…</AppText>
  </View>;
}
