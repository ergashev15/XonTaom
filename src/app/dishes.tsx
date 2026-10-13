import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, Chip, CustomerShell, EmptyState, PressableScale, ResponsiveGrid, Screen, SearchField, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, shadow, spacing } from "@/theme";

export default function DishesScreen() {
  const { restaurants, cart } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const allItems = useMemo(() => restaurants.flatMap((restaurant) => restaurant.menu.map((item) => ({ item, restaurant }))), [restaurants]);
  const categories = useMemo(() => ["Barchasi", ...new Set(allItems.map(({ item }) => item.category))], [allItems]);
  const visible = useMemo(() => allItems.filter(({ item, restaurant }) => {
    const matchesQuery = `${item.name} ${item.description} ${restaurant.name}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (category === "Barchasi" || item.category === category) && item.available && restaurant.isOpen && !restaurant.isBlocked;
  }), [allItems, category, query]);

  return <CustomerShell active="dishes" cartCount={cartCount}>
    <Screen safeTop style={{ paddingBottom: isDesktop ? spacing.xxl : 124 }}>
      <View style={{ gap: 3 }}><AppText variant="title">Taomlar</AppText><AppText variant="caption" color={colors.muted}>{visible.length} ta taom — bugun nimani tatib ko‘rasiz?</AppText></View>
      <SearchField accessibilityLabel="Taom qidirish" value={query} onChangeText={setQuery} placeholder="Taom yoki restoran qidiring..." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
      {visible.length ? <ResponsiveGrid maxColumns={3} minItemWidth={280}>{visible.map(({ item, restaurant }) => <PressableScale key={`${restaurant.id}-${item.id}`} accessibilityLabel={`${item.name} tafsilotlarini ochish`} onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id, restaurantId: restaurant.id } })}>
        <View style={{ overflow: "hidden", borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: shadow.card }}>
          <View><Image source={{ uri: item.image }} contentFit="cover" style={{ width: "100%", height: 168, backgroundColor: colors.line }} />{item.discountPercent ? <View style={{ position: "absolute", left: 10, top: 10, paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.full, backgroundColor: colors.orange }}><AppText variant="caption" color={colors.white} style={{ fontSize: 10, fontWeight: "900" }}>−{item.discountPercent}%</AppText></View> : null}</View>
          <View style={{ padding: 14, gap: 6 }}><AppText style={{ fontWeight: "900" }} numberOfLines={1}>{item.name}</AppText><AppText variant="caption" color={colors.muted} numberOfLines={1}>{restaurant.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={13} color={colors.yellow} /><AppText variant="caption" color={colors.muted}>{restaurant.rating} · {restaurant.eta}</AppText></View><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><AppText color={colors.green} style={{ fontWeight: "900" }}>{money(item.discountPercent ? Math.round(item.price * (100 - item.discountPercent) / 100) : item.price)}</AppText><View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.green, boxShadow: shadow.subtle }}><Ionicons name="add" size={23} color={colors.white} /></View></View></View>
        </View>
      </PressableScale>)}</ResponsiveGrid> : <EmptyState icon="fast-food-outline" title="Taom topilmadi" text="Boshqa nom yoki toifani sinab ko‘ring." />}
    </Screen>
  </CustomerShell>;
}
