import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router as expoRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { AppText, CustomerShell, EmptyState, PressableScale, Screen, SectionHeader, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, shadow, spacing } from "@/theme";

const router = expoRouter as typeof expoRouter & { push: (href: string) => void };

const categories = [
  { label: "Barchasi", icon: "grid-outline" as const },
  { label: "Osh", icon: "restaurant-outline" as const },
  { label: "Pitsa", icon: "pizza-outline" as const },
  { label: "Burger", icon: "fast-food-outline" as const },
  { label: "Shirinlik", icon: "ice-cream-outline" as const }
];

export default function HomeScreen() {
  const { restaurants, cart } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const dishes = useMemo(() => restaurants.flatMap((restaurant) => restaurant.menu.map((item) => ({ item, restaurant }))).filter(({ item, restaurant }) => {
    const searchable = `${item.name} ${item.description} ${restaurant.name}`.toLowerCase();
    const matchesQuery = searchable.includes(query.trim().toLowerCase());
    const matchesCategory = category === "Barchasi" || item.category.toLowerCase().includes(category.toLowerCase()) || item.name.toLowerCase().includes(category.toLowerCase());
    return matchesQuery && matchesCategory && item.available && restaurant.isOpen && !restaurant.isBlocked;
  }), [category, query, restaurants]);

  return <CustomerShell active="home" cartCount={cartCount}>
    <Screen safeTop style={{ gap: 20, paddingBottom: isDesktop ? spacing.xxl : 124 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><AppText variant="title">Xon</AppText><AppText variant="title" color={colors.green}>Taom</AppText></View>
        <PressableScale accessibilityLabel="Bildirishnomalar" onPress={() => router.push("/orders")} style={{ width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }}><Ionicons name="notifications-outline" size={23} color={colors.ink} /><View style={{ position: "absolute", right: 9, top: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.red }} /></PressableScale>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.input }}><Ionicons name="search" size={21} color={colors.muted} /><TextInput accessibilityLabel="Taom yoki restoran qidirish" value={query} onChangeText={setQuery} placeholder="Taom yoki restoran qidirish..." placeholderTextColor={colors.placeholder} style={{ flex: 1, minHeight: 52, color: colors.ink, fontSize: 15 }} />{query ? <PressableScale accessibilityLabel="Qidiruvni tozalash" onPress={() => setQuery("")}><Ionicons name="close-circle" size={21} color={colors.muted} /></PressableScale> : null}</View>
        <View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.input }}><Ionicons name="options-outline" size={22} color={colors.ink} /></View>
      </View>

      {!query ? <View style={{ height: 178, overflow: "hidden", borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.greenDark, boxShadow: shadow.card }}>
        <Image source={require("../../assets/categories/fast-food-lavash.jpg")} contentFit="cover" contentPosition="right center" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "62%" }} />
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(3,30,18,0.48)" }} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md, maxWidth: 260 }}>
          <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.green }}><AppText variant="caption" color={colors.white}>Maxsus taklif</AppText></View>
          <AppText variant="heading" color={colors.white}>Sevimli taomlaringiz{`\n`}endi yanada yaqin!</AppText>
          <AppText variant="caption" color="#E8F5EC">50% gacha chegirma</AppText>
          <PressableScale accessibilityLabel="Takliflarni ko‘rish" onPress={() => router.push("/dishes")} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.green }}><AppText variant="caption" color={colors.white}>Batafsil</AppText><Ionicons name="arrow-forward" size={15} color={colors.white} /></PressableScale>
        </View>
      </View> : null}

      {!query ? <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}><View style={{ width: 18, height: 5, borderRadius: 3, backgroundColor: colors.green }} /><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line }} /><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line }} /></View> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{categories.map((entry) => {
        const active = category === entry.label;
        return <PressableScale key={entry.label} accessibilityLabel={entry.label} accessibilityState={{ selected: active }} onPress={() => setCategory(entry.label)} style={{ width: 68, alignItems: "center", gap: 6 }}><View style={{ width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: active ? colors.green : colors.surfaceMuted, borderWidth: 1, borderColor: active ? colors.green : colors.line }}><Ionicons name={entry.icon} size={23} color={active ? colors.white : colors.ink} /></View><AppText variant="caption" color={active ? colors.green : colors.ink} style={{ fontSize: 11 }}>{entry.label}</AppText></PressableScale>;
      })}</ScrollView>

      <View style={{ gap: spacing.md }}><SectionHeader title={query ? "Qidiruv natijalari" : "Mashhur taomlar"} action="Barchasi →" />
        {dishes.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{dishes.slice(0, 8).map(({ item, restaurant }) => <PressableScale key={`${restaurant.id}-${item.id}`} accessibilityLabel={`${item.name} tafsilotlari`} onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id, restaurantId: restaurant.id } })} style={{ width: 190, overflow: "hidden", borderRadius: radius.md, backgroundColor: colors.surface, boxShadow: shadow.subtle }}><Image source={{ uri: item.image }} contentFit="cover" style={{ width: "100%", height: 112, backgroundColor: colors.line }} /><View style={{ padding: 10, gap: 4 }}><AppText variant="caption" style={{ fontWeight: "800" }} numberOfLines={1}>{item.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={13} color={colors.yellow} /><AppText variant="caption" color={colors.muted}>{restaurant.rating} ({restaurant.reviews})</AppText></View><AppText variant="caption" style={{ fontWeight: "800" }}>{money(item.price)}</AppText></View></PressableScale>)}</ScrollView> : <EmptyState icon="search-outline" title="Taom topilmadi" text="Boshqa so‘zni yoki toifani tanlab ko‘ring." />}
      </View>
    </Screen>
  </CustomerShell>;
}
