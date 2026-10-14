import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, Chip, CustomerShell, EmptyState, PressableScale, Screen, SearchField, useResponsiveLayout } from "@/components/ui";
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
        <View style={{ gap: 3 }}><AppText variant="title">Restoranlar</AppText><AppText variant="caption" color={colors.muted}>{visible.length} ta mazali manzil</AppText></View>
        <PressableScale accessibilityLabel="Yetkazish manzilini tanlash" onPress={() => router.push("/addresses" as never)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: 8, paddingHorizontal: 11, borderRadius: radius.full, backgroundColor: colors.greenSoft }}><Ionicons name="location" size={15} color={colors.green} /><AppText variant="caption" color={colors.green} style={{ fontWeight: "800" }}>Xonobod</AppText><Ionicons name="chevron-down" size={13} color={colors.green} /></PressableScale>
      </View>

      <SearchField accessibilityLabel="Restoran qidirish" value={query} onChangeText={setQuery} placeholder="Restoran yoki taom turini qidiring..." />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{filters.map((item) => <Chip key={item} label={item} active={filter === item} onPress={() => setFilter(item)} />)}</ScrollView>

      <View style={{ gap: spacing.sm }}>
        {visible.map((restaurant) => <PressableScale key={restaurant.id} accessibilityLabel={`${restaurant.name} sahifasini ochish`} onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 10, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: shadow.card }}>
          <Image source={{ uri: restaurant.image }} contentFit="cover" style={{ width: 112, height: 104, borderRadius: radius.md, backgroundColor: colors.line }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><AppText style={{ flex: 1, fontWeight: "900" }} numberOfLines={1}>{restaurant.name}</AppText><View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.surfaceMuted }}><Ionicons name="chevron-forward" size={16} color={colors.ink} /></View></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Ionicons name="star" size={14} color={colors.yellow} /><AppText variant="caption" style={{ fontWeight: "800" }}>{restaurant.rating}</AppText><AppText variant="caption" color={colors.muted}>({restaurant.reviews}) · {restaurant.cuisine}</AppText></View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Ionicons name="time-outline" size={14} color={colors.muted} /><AppText variant="caption" color={colors.muted}>{restaurant.eta}</AppText><AppText variant="caption" color={colors.muted}>·</AppText><AppText variant="caption" color={restaurant.deliveryFee ? colors.muted : colors.green} style={{ fontWeight: "700" }}>{restaurant.deliveryFee ? `${restaurant.deliveryFee.toLocaleString("uz-UZ")} so‘m` : "Bepul"}</AppText></View>
            <View style={{ alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.full, backgroundColor: restaurant.isOpen ? colors.greenSoft : colors.redSoft }}><AppText variant="caption" color={restaurant.isOpen ? colors.green : colors.red} style={{ fontSize: 10, fontWeight: "800" }}>{restaurant.isOpen ? "Yetkazib berish" : "Hozir yopiq"}</AppText></View>
          </View>
        </PressableScale>)}
        {!visible.length ? <EmptyState icon="search-outline" title="Restoran topilmadi" text="Qidiruv so‘zi yoki filtrni o‘zgartirib ko‘ring." /> : null}
      </View>
    </Screen>
  </CustomerShell>;
}
