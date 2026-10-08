import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, Chip, CustomerShell, EmptyState, PressableScale, ResponsiveGrid, Screen, useResponsiveLayout } from "@/components/ui";
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
      <View style={{ gap: 2 }}><AppText variant="title">Taomlar</AppText><AppText variant="caption" color={colors.muted}>Bugun nimani tatib ko‘rasiz?</AppText></View>
      <View style={{ minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.subtle }}>
        <Ionicons name="search" size={21} color={colors.muted} /><TextInput accessibilityLabel="Taom qidirish" value={query} onChangeText={setQuery} placeholder="Taom yoki restoran qidiring..." placeholderTextColor="#7D8C84" style={{ flex: 1, minHeight: 54, color: colors.ink, fontSize: 15 }} />
        {query ? <PressableScale accessibilityLabel="Qidiruvni tozalash" onPress={() => setQuery("")}><Ionicons name="close-circle" size={22} color={colors.muted} /></PressableScale> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
      {visible.length ? <ResponsiveGrid maxColumns={3} minItemWidth={280}>{visible.map(({ item, restaurant }) => <PressableScale key={`${restaurant.id}-${item.id}`} accessibilityLabel={`${item.name} tafsilotlarini ochish`} onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id, restaurantId: restaurant.id } })}>
        <View style={{ overflow: "hidden", borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.card }}>
          <Image source={{ uri: item.image }} contentFit="cover" style={{ width: "100%", height: 150, backgroundColor: colors.line }} />
          <View style={{ padding: spacing.md, gap: spacing.xs }}><AppText style={{ fontWeight: "800" }} numberOfLines={1}>{item.name}</AppText><AppText variant="caption" color={colors.muted} numberOfLines={1}>{restaurant.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><AppText color={colors.green} style={{ fontWeight: "900" }}>{money(item.discountPercent ? Math.round(item.price * (100 - item.discountPercent) / 100) : item.price)}</AppText><View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.green }}><Ionicons name="add" size={22} color={colors.white} /></View></View></View>
        </View>
      </PressableScale>)}</ResponsiveGrid> : <EmptyState icon="fast-food-outline" title="Taom topilmadi" text="Boshqa nom yoki toifani sinab ko‘ring." />}
    </Screen>
  </CustomerShell>;
}
