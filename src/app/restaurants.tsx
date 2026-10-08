import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, Chip, CustomerShell, EmptyState, PressableScale, Screen, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, radius, shadow, spacing } from "@/theme";

const filters = ["Barchasi", "Milliy", "Kabob", "Fast food", "Ochiq"];

export default function RestaurantsScreen() {
  const { restaurants, cart } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Barchasi");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const visible = useMemo(() => restaurants.filter((restaurant) => {
    const matchesQuery = `${restaurant.name} ${restaurant.cuisine}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "Barchasi" || (filter === "Ochiq" ? restaurant.isOpen : restaurant.cuisine.toLowerCase().includes(filter.toLowerCase()) || restaurant.menu.some((item) => item.category.toLowerCase().includes(filter.toLowerCase())));
    return matchesQuery && matchesFilter && !restaurant.isBlocked;
  }), [filter, query, restaurants]);

  return <CustomerShell active="restaurants" cartCount={cartCount}>
    <Screen safeTop maxWidth={820} style={{ paddingBottom: isDesktop ? spacing.xxl : 124 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ gap: 2 }}><AppText variant="title">Restoranlar</AppText><AppText variant="caption" color={colors.muted}>Xonoboddagi sevimli maskanlar</AppText></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Ionicons name="location" size={16} color={colors.green} /><AppText variant="caption">Xonobod</AppText></View>
      </View>

      <View style={{ minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.subtle }}>
        <Ionicons name="search" size={21} color={colors.muted} />
        <TextInput accessibilityLabel="Restoran qidirish" value={query} onChangeText={setQuery} placeholder="Restoran yoki taom turini qidiring..." placeholderTextColor="#7D8C84" style={{ flex: 1, minHeight: 54, color: colors.ink, fontSize: 15 }} />
        {query ? <PressableScale accessibilityLabel="Qidiruvni tozalash" onPress={() => setQuery("")}><Ionicons name="close-circle" size={22} color={colors.muted} /></PressableScale> : <Ionicons name="options-outline" size={21} color={colors.green} />}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{filters.map((item) => <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</ScrollView>

      <View style={{ gap: spacing.sm }}>
        {visible.map((restaurant) => <PressableScale key={restaurant.id} accessibilityLabel={`${restaurant.name} sahifasini ochish`} onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } })} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.subtle }}>
          <Image source={{ uri: restaurant.image }} contentFit="cover" style={{ width: 92, height: 82, borderRadius: radius.sm, backgroundColor: colors.line }} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><AppText style={{ flex: 1, fontWeight: "800" }} numberOfLines={1}>{restaurant.name}</AppText><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Ionicons name="star" size={14} color={colors.yellow} /><AppText variant="caption">{restaurant.rating} ({restaurant.reviews})</AppText><AppText variant="caption" color={colors.muted}>· {restaurant.cuisine}</AppText></View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>◷ {restaurant.eta}</AppText><View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: restaurant.isOpen ? colors.greenSoft : colors.redSoft }}><AppText variant="caption" color={restaurant.isOpen ? colors.green : colors.red}>{restaurant.isOpen ? "Yetkazib berish" : "Yopiq"}</AppText></View></View>
          </View>
        </PressableScale>)}
        {!visible.length ? <EmptyState icon="search-outline" title="Restoran topilmadi" text="Qidiruv so‘zi yoki filtrni o‘zgartirib ko‘ring." /> : null}
      </View>
    </Screen>
  </CustomerShell>;
}
