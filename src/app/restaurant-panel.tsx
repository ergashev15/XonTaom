import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { AppText, Button, Card, Chip, EmptyState, Field, Row, Screen, StatusPill, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, spacing } from "@/theme";
import type { Order, OrderStatus } from "@/types";
import { cartUnitPrice } from "@/utils/order-rules";

const stages: { title: string; statuses: OrderStatus[] }[] = [
  { title: "Yangi", statuses: ["Yangi buyurtma", "Restoran tasdig‘i kutilmoqda"] },
  { title: "Qabul qilindi", statuses: ["Qabul qilindi"] },
  { title: "Tayyorlanmoqda", statuses: ["Tayyorlanmoqda"] },
  { title: "Yetkazishda", statuses: ["Yetkazishga chiqdi"] }
];

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  "Qabul qilindi": "Tayyorlanmoqda",
  "Tayyorlanmoqda": "Yetkazishga chiqdi",
  "Yetkazishga chiqdi": "Yetkazildi"
};

function countdown(deadline: string, now: number) {
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function RestaurantPanelScreen() {
  const { restaurants, orders, catalogStatus, refreshCatalog, updateOrder, setPrepMinutes } = useAppStore();
  const { session, signOut } = useAuth();
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const assignedRestaurantId = restaurantId ?? session?.user.app_metadata?.restaurant_id;
  const assignedRestaurant = restaurants.find((entry) => entry.id === assignedRestaurantId);
  const ownerRestaurantLoading = Boolean(assignedRestaurantId && !assignedRestaurant);
  const restaurant = assignedRestaurant ?? restaurants[0];
  const [reasonByOrder, setReasonByOrder] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  const { isDesktop } = useResponsiveLayout();
  const player = useAudioPlayer(require("../../assets/sounds/new-order.wav"));
  const previousWaiting = useRef(0);
  const ownOrders = ownerRestaurantLoading ? [] : orders.filter((order) => order.restaurantId === restaurant.id);
  const activeOrders = ownOrders.filter((order) => stages.some((stage) => stage.statuses.includes(order.status)));
  const waiting = ownOrders.filter((order) => ["Yangi buyurtma", "Restoran tasdig‘i kutilmoqda"].includes(order.status));

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (waiting.length > previousWaiting.current) {
      player.seekTo(0);
      player.play();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    previousWaiting.current = waiting.length;
  }, [waiting.length, player]);

  const OrderCard = ({ order }: { order: Order }) => {
    const isWaiting = ["Yangi buyurtma", "Restoran tasdig‘i kutilmoqda"].includes(order.status);
    const late = isWaiting && new Date(order.confirmationDeadline).getTime() < now;
    const reason = reasonByOrder[order.id] ?? "";
    return <Card style={late ? { borderWidth: 2, borderColor: colors.red, backgroundColor: colors.redSoft } : undefined}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flex: 1 }}><AppText variant="heading">#{order.id}</AppText><AppText variant="caption" color={colors.muted}>{order.customerName} · {new Date(order.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</AppText></View>
        {isWaiting ? <AppText variant="heading" color={late ? colors.red : colors.orange}>{late ? "KECHIKDI" : countdown(order.confirmationDeadline, now)}</AppText> : <StatusPill open label={order.status} />}
      </View>
      <View style={{ padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background, gap: spacing.xs }}>
        {order.items.map((item) => <Row key={item.lineId} title={`${item.quantity} × ${item.name}`} subtitle={item.note} right={<AppText>{money(cartUnitPrice(item) * item.quantity)}</AppText>} />)}
      </View>
      <Row icon="location-outline" title={order.address} subtitle={order.note} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><AppText color={colors.muted}>Jami</AppText><AppText variant="heading" color={colors.green}>{money(order.total)}</AppText></View>
      {isWaiting ? <>
        <Field label="RAD ETISH SABABI" value={reason} onChangeText={(value) => setReasonByOrder((current) => ({ ...current, [order.id]: value }))} placeholder="Faqat rad etishda kerak" />
        <View style={{ flexDirection: "row", gap: spacing.sm }}><Button title="Rad etish" variant="danger" onPress={() => updateOrder(order.id, "Rad etildi", reason.trim() || "Sabab ko‘rsatilmagan")} style={{ flex: 1, minHeight: 60 }} /><Button title="Qabul qilish" onPress={() => updateOrder(order.id, "Qabul qilindi")} style={{ flex: 1, minHeight: 60 }} /></View>
      </> : null}
      {["Qabul qilindi", "Tayyorlanmoqda"].includes(order.status) ? <View style={{ gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>Tayyorlash vaqti</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{[20, 30, 45].map((minutes) => <Chip key={minutes} label={`${minutes} daqiqa`} active={order.prepMinutes === minutes} onPress={() => setPrepMinutes(order.id, minutes)} />)}</View></View> : null}
      {nextStatus[order.status] ? <Button title={order.status === "Tayyorlanmoqda" ? "Yetkazishga chiqdi" : order.status === "Yetkazishga chiqdi" ? "Yetkazildi" : "Tayyorlashni boshlash"} onPress={() => updateOrder(order.id, nextStatus[order.status]!)} /> : null}
      {order.phone ? <Button title="Mijozga qo‘ng‘iroq" icon="call-outline" variant="ghost" onPress={() => void Linking.openURL(`tel:${order.phone}`)} /> : null}
    </Card>;
  };

  if (ownerRestaurantLoading) return <Screen maxWidth={720} style={{ justifyContent: "center", minHeight: "100%" }}><EmptyState icon="storefront-outline" title={catalogStatus.error ? "Restoran yuklanmadi" : "Restoran yuklanmoqda"} text={catalogStatus.error ?? "Saytda qo‘shilgan restoran ma’lumotlari serverdan olinmoqda."} action={<Button title="Qayta tekshirish" loading={catalogStatus.syncing} onPress={() => void refreshCatalog()} />} /></Screen>;

  return <Screen maxWidth={1280}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, flexWrap: "wrap" }}>
      <View style={{ gap: spacing.xs }}><AppText variant="title">Buyurtmalar</AppText><AppText color={colors.muted}>{restaurant.name} · faqat buyurtmalarni qabul qilish va bajarish paneli</AppText></View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}><Button title="Yangilash" icon="refresh-outline" variant="secondary" loading={catalogStatus.syncing} onPress={() => void refreshCatalog()} /><Button title="Chiqish" icon="log-out-outline" variant="ghost" onPress={() => { void signOut().then(() => router.replace("/")); }} /></View>
    </View>
    {waiting.length ? <View style={{ padding: spacing.md, backgroundColor: colors.orangeSoft, borderRadius: radius.md }}><AppText color={colors.orange} style={{ fontWeight: "800" }}>Yangi buyurtmalar: {waiting.length} ta · ovozli signal yoqilgan</AppText></View> : null}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      <StatusSummary label="Yangi" value={waiting.length} tone="orange" />
      <StatusSummary label="Jarayonda" value={Math.max(0, activeOrders.length - waiting.length)} tone="green" />
      <StatusSummary label="Bugun yakunlangan" value={ownOrders.filter((order) => order.status === "Yetkazildi" && new Date(order.deliveredAt ?? order.createdAt).toDateString() === new Date().toDateString()).length} tone="green" />
    </View>
    {activeOrders.length ? <ScrollView horizontal showsHorizontalScrollIndicator={!isDesktop} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}>{stages.map((stage) => {
      const stageOrders = ownOrders.filter((order) => stage.statuses.includes(order.status));
      return <View key={stage.title} style={{ width: isDesktop ? 285 : 310, gap: spacing.md }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><AppText variant="heading">{stage.title}</AppText><AppText variant="caption" color={colors.muted}>{stageOrders.length} ta</AppText></View>{stageOrders.length ? stageOrders.map((order) => <OrderCard key={order.id} order={order} />) : <Card><AppText color={colors.muted}>Bu bosqichda buyurtma yo‘q.</AppText></Card>}</View>;
    })}</ScrollView> : <EmptyState icon="receipt-outline" title="Faol buyurtma yo‘q" text="Yangi buyurtma tushganda ovozli signal beriladi va shu ekranda ko‘rinadi." action={<Button title="Yangilash" loading={catalogStatus.syncing} onPress={() => void refreshCatalog()} />} />}
  </Screen>;
}

function StatusSummary({ label, value, tone }: { label: string; value: number; tone: "green" | "orange" }) {
  const accent = tone === "green" ? colors.green : colors.orange;
  const background = tone === "green" ? colors.greenSoft : colors.orangeSoft;
  return <View style={{ minWidth: 150, flex: 1, padding: spacing.md, gap: spacing.xs, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: background }}><AppText variant="caption" color={colors.muted}>{label}</AppText><AppText variant="title" color={accent} style={{ fontVariant: ["tabular-nums"] }}>{value}</AppText></View>;
}
