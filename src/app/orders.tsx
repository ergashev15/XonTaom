import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Linking, ScrollView, View } from "react-native";
import { AppText, CustomerShell, EmptyState, PressableScale, Screen, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, shadow, spacing } from "@/theme";
import { Order, OrderStatus } from "@/types";

type Filter = "all" | "active" | "delivered" | "cancelled";

const filterItems: { key: Filter; label: string }[] = [
  { key: "all", label: "Barchasi" },
  { key: "active", label: "Jarayonda" },
  { key: "delivered", label: "Yetkazilgan" },
  { key: "cancelled", label: "Bekor qilingan" }
];

export default function OrdersScreen() {
  const { created } = useLocalSearchParams<{ created?: string }>();
  const { orders, reorder, cart } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const [filter, setFilter] = useState<Filter>("all");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const visible = useMemo(() => orders.filter((order) => {
    if (filter === "active") return !["Yetkazildi", "Rad etildi", "Bekor qilindi"].includes(order.status);
    if (filter === "delivered") return order.status === "Yetkazildi";
    if (filter === "cancelled") return order.status === "Rad etildi" || order.status === "Bekor qilindi";
    return true;
  }), [filter, orders]);

  return <CustomerShell active="orders" cartCount={cartCount}><Screen safeTop maxWidth={820} style={{ paddingBottom: isDesktop ? spacing.xxl : 116 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText variant="title">Buyurtmalar</AppText><View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.surface }}><Ionicons name="settings-outline" size={21} color={colors.ink} /></View></View>
    {created ? <View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.greenSoft }}><AppText variant="caption" color={colors.green} style={{ fontWeight: "800" }}>Buyurtma yuborildi: {created}</AppText></View> : null}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{filterItems.map((item) => <FilterChip key={item.key} label={item.label} active={filter === item.key} onPress={() => setFilter(item.key)} />)}</ScrollView>
    <View style={{ gap: spacing.md }}>{visible.map((order) => <OrderCard key={order.id} order={order} onReorder={() => { if (reorder(order.id)) router.push("/cart"); else Alert.alert("Qayta buyurtma berib bo‘lmadi", "Restoran yopiq yoki taomlar hozir mavjud emas."); }} />)}{!visible.length ? <EmptyState icon="receipt-outline" title="Buyurtma topilmadi" text="Tanlangan holat bo‘yicha buyurtmalar yo‘q." /> : null}</View>
  </Screen></CustomerShell>;
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <PressableScale accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={{ minHeight: 38, justifyContent: "center", paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: active ? colors.green : colors.surfaceMuted }}><AppText variant="caption" color={active ? colors.white : colors.muted} style={{ fontWeight: "800" }}>{label}</AppText></PressableScale>;
}

function OrderCard({ order, onReorder }: { order: Order; onReorder: () => void }) {
  const cancelled = order.status === "Rad etildi" || order.status === "Bekor qilindi";
  const delivered = order.status === "Yetkazildi";
  const tone = cancelled ? colors.red : delivered ? colors.green : colors.orange;
  const soft = cancelled ? colors.redSoft : delivered ? colors.greenSoft : colors.yellowSoft;
  return <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, boxShadow: shadow.subtle }}>
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}><View style={{ flex: 1, gap: 2 }}><AppText style={{ fontWeight: "900" }}>#{order.id.replace("XT-", "")}</AppText><AppText variant="caption" color={colors.muted}>{new Date(order.createdAt).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</AppText></View><View style={{ paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.full, backgroundColor: soft }}><AppText variant="caption" color={tone} style={{ fontWeight: "800", fontSize: 10 }}>{order.status}</AppText></View></View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><Ionicons name="location" size={15} color={colors.ink} /><AppText variant="caption" color={colors.muted}>{order.restaurantName}</AppText></View>
    <View style={{ gap: 5 }}>{order.items.map((item) => <View key={item.lineId} style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><AppText variant="caption" color={colors.muted}>{item.name} ×{item.quantity}</AppText><AppText variant="caption" style={{ fontWeight: "700" }}>{money(item.price * item.quantity)}</AppText></View>)}</View>
    <View style={{ height: 1, backgroundColor: colors.line }} /><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText variant="caption" color={colors.muted}>Jami</AppText><AppText style={{ fontWeight: "900" }}>{money(order.total)}</AppText></View>
    <View style={{ flexDirection: "row", gap: spacing.sm }}><PressableScale accessibilityLabel="Restoranga qo‘ng‘iroq qilish" onPress={() => order.courierPhone && Linking.openURL(`tel:${order.courierPhone}`)} style={{ flex: 1, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }}><Ionicons name="call-outline" size={16} color={colors.green} /><AppText variant="caption" color={colors.green}>Bog‘lanish</AppText></PressableScale><PressableScale accessibilityLabel="Qayta buyurtma berish" onPress={onReorder} style={{ flex: 1, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.greenSoft }}><Ionicons name="refresh-outline" size={16} color={colors.green} /><AppText variant="caption" color={colors.green}>Qayta buyurtma</AppText></PressableScale></View>
  </View>;
}
