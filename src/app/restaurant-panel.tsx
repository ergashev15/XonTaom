import { Image } from "expo-image";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Linking, ScrollView, View } from "react-native";
import { MenuItemForm } from "@/components/menu-item-form";
import { RestaurantManagement } from "@/components/restaurant-management";
import { AppText, Button, Card, Chip, EmptyState, Field, Metric, ResponsiveGrid, Row, Screen, StatusPill, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, spacing } from "@/theme";
import type { MenuItem, Order, OrderStatus } from "@/types";
import { cartUnitPrice } from "@/utils/order-rules";
import { useAuth } from "@/auth/auth-context";

const stages: { title: string; statuses: OrderStatus[] }[] = [
  { title: "Yangi", statuses: ["Yangi buyurtma", "Restoran tasdig‘i kutilmoqda"] },
  { title: "Qabul qilindi", statuses: ["Qabul qilindi"] },
  { title: "Tayyorlanmoqda", statuses: ["Tayyorlanmoqda"] },
  { title: "Yetkazishda", statuses: ["Yetkazishga chiqdi"] }
];
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = { "Qabul qilindi": "Tayyorlanmoqda", "Tayyorlanmoqda": "Yetkazishga chiqdi", "Yetkazishga chiqdi": "Yetkazildi" };

function countdown(deadline: string, now: number) {
  const seconds = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function RestaurantPanelScreen() {
  const { restaurants, orders, catalogStatus, refreshCatalog, toggleRestaurant, toggleMenuItem, addMenuItem, updateMenuItem, deleteMenuItem, updateOrder, setPrepMinutes } = useAppStore();
  const { session, signOut } = useAuth();
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const assignedRestaurantId = restaurantId ?? session?.user.app_metadata?.restaurant_id;
  const assignedRestaurant = restaurants.find((entry) => entry.id === assignedRestaurantId);
  const ownerRestaurantLoading = Boolean(assignedRestaurantId && !assignedRestaurant);
  const restaurant = assignedRestaurant ?? restaurants[0];
  const [tab, setTab] = useState("Buyurtmalar");
  const [reason, setReason] = useState("Taom mahsuloti tugagan");
  const [now, setNow] = useState(Date.now());
  const [editingItem, setEditingItem] = useState<MenuItem | "new" | null>(null);
  const [savedItem, setSavedItem] = useState("");
  const [menuCategory, setMenuCategory] = useState("Barchasi");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState("Barchasi");
  const { isDesktop } = useResponsiveLayout();
  const player = useAudioPlayer(require("../../assets/sounds/new-order.wav"));
  const previousWaiting = useRef(0);
  const ownOrders = ownerRestaurantLoading ? [] : orders.filter((order) => order.restaurantId === restaurant.id);
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

  const today = new Date().toDateString();
  const delivered = ownOrders.filter((order) => order.status === "Yetkazildi");
  const deliveredToday = delivered.filter((order) => new Date(order.deliveredAt ?? order.createdAt).toDateString() === today);
  const sales = deliveredToday.reduce((sum, order) => sum + order.subtotal, 0);
  const allSales = delivered.reduce((sum, order) => sum + order.subtotal, 0);
  const commission = Math.round(sales * restaurant.commission / 100);
  const active = ownOrders.filter((order) => stages.some((stage) => stage.statuses.includes(order.status)));
  const lowStock = restaurant.menu.filter((item) => item.stock !== undefined && item.stock <= 5);
  const categories = ["Barchasi", ...new Set([...(restaurant.categories ?? []), ...restaurant.menu.map((item) => item.category)])];
  const history = ownOrders.filter((order) => `${order.id} ${order.customerName} ${order.phone}`.toLowerCase().includes(historyQuery.toLowerCase()) && (historyStatus === "Barchasi" || order.status === historyStatus));
  const soldCounts = delivered.flatMap((order) => order.items).reduce<Record<string, { name: string; quantity: number; revenue: number }>>((acc, item) => {
    const current = acc[item.id] ?? { name: item.name, quantity: 0, revenue: 0 };
    acc[item.id] = { name: item.name, quantity: current.quantity + item.quantity, revenue: current.revenue + cartUnitPrice(item) * item.quantity };
    return acc;
  }, {});
  const popular = Object.values(soldCounts).sort((a, b) => b.quantity - a.quantity);
  const averageOrder = delivered.length ? Math.round(allSales / delivered.length) : 0;
  const averagePrep = delivered.filter((order) => order.prepMinutes).length ? Math.round(delivered.reduce((sum, order) => sum + (order.prepMinutes ?? 0), 0) / delivered.filter((order) => order.prepMinutes).length) : 0;
  const summary = useMemo(() => [
    { label: "Faol buyurtmalar", value: `${active.length}`, tone: "orange" as const },
    { label: "Bugungi savdo", value: money(sales), tone: "green" as const },
    { label: "Kam qolgan", value: `${lowStock.length} ta`, tone: "orange" as const }
  ], [active.length, sales, lowStock.length]);

  const OrderCard = ({ order }: { order: Order }) => {
    const isWaiting = ["Yangi buyurtma", "Restoran tasdig‘i kutilmoqda"].includes(order.status);
    const late = isWaiting && new Date(order.confirmationDeadline).getTime() < now;
    return <Card style={late ? { borderWidth: 2, borderColor: colors.red, backgroundColor: colors.redSoft } : undefined}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}><View style={{ flex: 1 }}><AppText variant="heading">#{order.id}</AppText><AppText variant="caption" color={colors.muted}>{order.customerName} · {new Date(order.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</AppText></View>{isWaiting ? <AppText variant="heading" color={late ? colors.red : colors.orange}>{late ? "KECHIKDI" : countdown(order.confirmationDeadline, now)}</AppText> : <StatusPill open label={order.status} />}</View>
      <View style={{ padding: spacing.sm, borderRadius: 12, backgroundColor: colors.background, gap: spacing.xs }}>{order.items.map((item) => <Row key={item.lineId} title={`${item.quantity} × ${item.name}`} subtitle={item.note} right={<AppText>{money(cartUnitPrice(item) * item.quantity)}</AppText>} />)}</View>
      <Row icon="location-outline" title={order.address} subtitle={order.note} />
      {isWaiting ? <><Field label="Rad etish sababi" value={reason} onChangeText={setReason} /><View style={{ flexDirection: "row", gap: spacing.sm }}><Button title="Rad etish" variant="danger" onPress={() => updateOrder(order.id, "Rad etildi", reason || "Sabab ko‘rsatilmagan")} style={{ flex: 1, minHeight: 60 }} /><Button title="Qabul qilish" onPress={() => updateOrder(order.id, "Qabul qilindi")} style={{ flex: 1, minHeight: 60 }} /></View></> : null}
      {["Qabul qilindi", "Tayyorlanmoqda"].includes(order.status) ? <View style={{ gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>Tayyorlash vaqti</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{[20, 30, 45].map((minutes) => <Chip key={minutes} label={`${minutes} daqiqa`} active={order.prepMinutes === minutes} onPress={() => setPrepMinutes(order.id, minutes)} />)}</View></View> : null}
      {nextStatus[order.status] ? <Button title={order.status === "Tayyorlanmoqda" ? "Yetkazishga chiqdi" : order.status === "Yetkazishga chiqdi" ? "Yetkazildi" : "Tayyorlashni boshlash"} onPress={() => updateOrder(order.id, nextStatus[order.status]!)} /> : null}
      <Button title="Mijozga qo‘ng‘iroq" icon="call-outline" variant="ghost" onPress={() => Linking.openURL(`tel:${order.phone}`)} />
    </Card>;
  };

  if (ownerRestaurantLoading) return <Screen maxWidth={720} style={{ justifyContent: "center", minHeight: "100%" }}><EmptyState icon="storefront-outline" title={catalogStatus.error ? "Restoran yuklanmadi" : "Restoran yuklanmoqda"} text={catalogStatus.error ?? "Saytda qo‘shilgan restoran ma’lumotlari serverdan olinmoqda."} action={<Button title="Qayta tekshirish" loading={catalogStatus.syncing} onPress={() => void refreshCatalog()} />} /></Screen>;

  return <Screen maxWidth={1280}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, flexWrap: "wrap" }}><View><AppText variant="title">{restaurant.name}</AppText><AppText color={colors.muted}>Restoran boshqaruvi · {restaurant.hours}</AppText></View><View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}><Button title={restaurant.isOpen ? "Restoran ochiq" : "Restoran yopiq"} icon={restaurant.isOpen ? "checkmark-circle" : "close-circle"} variant={restaurant.isOpen ? "primary" : "danger"} onPress={() => toggleRestaurant(restaurant.id)} /><Button title="Chiqish" icon="log-out-outline" variant="ghost" onPress={() => { void signOut().then(() => router.replace("/")); }} /></View></View>
    {waiting.length ? <View style={{ padding: spacing.md, backgroundColor: colors.orangeSoft, borderRadius: 14 }}><AppText color={colors.orange} style={{ fontWeight: "800" }}>🔔 {waiting.length} ta yangi buyurtma — ovozli signal yoqilgan</AppText></View> : null}
    {lowStock.length ? <View style={{ padding: spacing.md, backgroundColor: colors.yellowSoft, borderRadius: 14 }}><AppText color={colors.ink} style={{ fontWeight: "800" }}>⚠️ Kam qolgan: {lowStock.map((item) => `${item.name} (${item.stock})`).join(", ")}</AppText></View> : null}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>{summary.map((item) => <Metric key={item.label} {...item} />)}</View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{["Buyurtmalar", "Menyu", "Tarix", "Statistika", "Boshqaruv"].map((item) => <Chip key={item} label={item} active={tab === item} onPress={() => setTab(item)} />)}</ScrollView>

    {tab === "Buyurtmalar" ? <ScrollView horizontal showsHorizontalScrollIndicator={!isDesktop} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}>{stages.map((stage) => <View key={stage.title} style={{ width: isDesktop ? 285 : 310, gap: spacing.md }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><AppText variant="heading">{stage.title}</AppText><AppText variant="caption" color={colors.muted}>{ownOrders.filter((order) => stage.statuses.includes(order.status)).length} ta</AppText></View>{ownOrders.filter((order) => stage.statuses.includes(order.status)).map((order) => <OrderCard key={order.id} order={order} />)}</View>)}</ScrollView> : null}

    {tab === "Menyu" ? <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, flexWrap: "wrap" }}><View><AppText variant="heading">Restoran menyusi</AppText><AppText variant="caption" color={colors.muted}>{restaurant.menu.length} ta taom · rasm, narx, qoldiq va variantlar</AppText></View>{!editingItem ? <Button title="Yangi taom qo‘shish" icon="add-circle-outline" onPress={() => { setEditingItem("new"); setSavedItem(""); }} /> : null}</View>
      {savedItem ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.greenSoft }}><AppText color={colors.green} style={{ fontWeight: "800" }}>{savedItem}</AppText></View> : null}
      {editingItem ? <MenuItemForm initial={editingItem === "new" ? undefined : editingItem} onCancel={() => setEditingItem(null)} onSubmit={(item) => { if (editingItem === "new") addMenuItem(restaurant.id, item); else updateMenuItem(restaurant.id, editingItem.id, item); setSavedItem(`“${item.name}” saqlandi va mijozlarga ko‘rinadi.`); setEditingItem(null); }} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{categories.map((item) => <Chip key={item} label={item} active={menuCategory === item} onPress={() => setMenuCategory(item)} />)}</ScrollView>
      <ResponsiveGrid maxColumns={2} minItemWidth={430}>{restaurant.menu.filter((item) => menuCategory === "Barchasi" || item.category === menuCategory).map((item) => {
        const discounted = item.discountPercent ? Math.round(item.price * (100 - item.discountPercent) / 100) : item.price;
        return <Card key={item.id}><View style={{ flexDirection: "row", gap: spacing.md }}><Image source={{ uri: item.image }} contentFit="cover" style={{ width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.line }} /><View style={{ flex: 1, gap: spacing.xs }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}><AppText variant="heading" style={{ flex: 1 }}>{item.name}</AppText><StatusPill open={item.available} label={item.available ? "Mavjud" : "Tugagan"} /></View><AppText variant="caption" color={colors.muted}>{item.category} · {item.prepMinutes ?? 25} daqiqa</AppText><View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}><AppText color={colors.green} style={{ fontWeight: "900" }}>{money(discounted)}</AppText>{item.discountPercent ? <AppText variant="caption" color={colors.muted} style={{ textDecorationLine: "line-through" }}>{money(item.price)}</AppText> : null}</View><AppText variant="caption" color={(item.stock ?? 99) <= 5 ? colors.red : colors.muted}>Qoldiq: {item.stock ?? "cheklanmagan"} · Variant: {item.variants?.length ?? 0} · Qo‘shimcha: {item.extras?.length ?? 0}</AppText></View></View><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}><Button title={item.available ? "Mavjud" : "Mavjud emas"} size="sm" variant={item.available ? "primary" : "danger"} onPress={() => toggleMenuItem(restaurant.id, item.id)} style={{ flex: 1 }} /><Button title="Tahrirlash" icon="create-outline" size="sm" variant="ghost" onPress={() => setEditingItem(item)} style={{ flex: 1 }} /><Button title="O‘chirish" icon="trash-outline" size="sm" variant="danger" onPress={() => Alert.alert("Taomni o‘chirish", `“${item.name}” menyudan butunlay o‘chirilsinmi?`, [{ text: "Bekor qilish" }, { text: "O‘chirish", style: "destructive", onPress: () => deleteMenuItem(restaurant.id, item.id) }])} style={{ flex: 1 }} /></View></Card>;
      })}</ResponsiveGrid>
    </View> : null}

    {tab === "Tarix" ? <View style={{ gap: spacing.md }}><Field label="BUYURTMA, MIJOZ YOKI TELEFON QIDIRISH" value={historyQuery} onChangeText={setHistoryQuery} placeholder="XT-1048 yoki mijoz ismi" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>{["Barchasi", "Yetkazildi", "Rad etildi", "Bekor qilindi"].map((item) => <Chip key={item} label={item} active={historyStatus === item} onPress={() => setHistoryStatus(item)} />)}</ScrollView>{history.length ? <ResponsiveGrid maxColumns={2} minItemWidth={420}>{history.map((order) => <Card key={order.id}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><View style={{ flex: 1 }}><AppText variant="heading">#{order.id}</AppText><AppText variant="caption" color={colors.muted}>{order.customerName} · {new Date(order.createdAt).toLocaleString("uz-UZ")}</AppText></View><StatusPill open={order.status === "Yetkazildi"} label={order.status} /></View><Row title={`${order.items.length} turdagi taom`} subtitle={order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")} right={<AppText variant="heading">{money(order.total)}</AppText>} /></Card>)}</ResponsiveGrid> : <EmptyState icon="search-outline" title="Buyurtma topilmadi" text="Qidiruv yoki holat filtrini o‘zgartirib ko‘ring." />}</View> : null}

    {tab === "Statistika" ? <View style={{ gap: spacing.md }}><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}><Metric label="Jami savdo" value={money(allSales)} /><Metric label="O‘rtacha buyurtma" value={money(averageOrder)} tone="orange" /><Metric label="Tayyorlash vaqti" value={`${averagePrep} daq`} /><Metric label="Bugungi komissiya" value={money(commission)} tone="orange" /></View><Card><AppText variant="heading">Eng ko‘p sotilgan taomlar</AppText>{popular.length ? popular.map((item, index) => <Row key={item.name} icon={index === 0 ? "trophy-outline" : "restaurant-outline"} title={`${index + 1}. ${item.name}`} subtitle={`${item.quantity} porsiya sotilgan`} right={<AppText color={colors.green}>{money(item.revenue)}</AppText>} />) : <AppText color={colors.muted}>Statistika uchun yetkazilgan buyurtmalar kerak.</AppText>}</Card><Card><AppText variant="heading">Kunlik natija</AppText><Row title="Yetkazilgan buyurtmalar" right={<AppText>{deliveredToday.length} ta</AppText>} /><Row title="Umumiy savdo" right={<AppText>{money(sales)}</AppText>} /><Row title={`Platforma komissiyasi (${restaurant.commission}%)`} right={<AppText color={colors.orange}>{money(commission)}</AppText>} /><Row title="Restoranga qoladi" right={<AppText color={colors.green}>{money(sales - commission)}</AppText>} /></Card></View> : null}

    {tab === "Boshqaruv" ? <RestaurantManagement restaurantId={restaurant.id} /> : null}
  </Screen>;
}
