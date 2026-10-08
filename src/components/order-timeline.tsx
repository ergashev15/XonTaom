import { View } from "react-native";
import { AppText } from "@/components/ui";
import { OrderStatus } from "@/types";
import { colors, spacing } from "@/theme";

const steps: OrderStatus[] = ["Restoran tasdig‘i kutilmoqda", "Qabul qilindi", "Tayyorlanmoqda", "Yetkazishga chiqdi", "Yetkazildi"];

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const current = steps.indexOf(status);
  if (current < 0) return null;
  return <View accessibilityLabel={`Buyurtma holati: ${status}`} style={{ gap: 0 }}>{steps.map((step, index) => {
    const done = index <= current;
    return <View key={step} style={{ flexDirection: "row", minHeight: index === steps.length - 1 ? 28 : 48 }}><View style={{ width: 24, alignItems: "center" }}><View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: done ? colors.green : colors.line, marginTop: 3 }} />{index < steps.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: index < current ? colors.green : colors.line }} /> : null}</View><AppText variant="caption" color={done ? colors.ink : colors.muted} style={{ paddingLeft: spacing.sm, fontWeight: done ? "700" : "500" }}>{step}{step === status ? " · hozir" : ""}</AppText></View>;
  })}</View>;
}
