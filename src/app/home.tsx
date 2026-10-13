import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router as expoRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, CustomerShell, EmptyState, PressableScale, Screen, SearchField, SectionHeader, useResponsiveLayout } from "@/components/ui";
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
    <Screen safeTop style={{ gap: 22, paddingBottom: isDesktop ? spacing.xxl : 124 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><AppText variant="title">Xon</AppText><AppText variant="title" color={colors.green}>Taom</AppText></View>
          <PressableScale accessibilityLabel="Yetkazish manzilini tanlash" onPress={() => router.push("/addresses")} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="location" size={14} color={colors.green} /><AppText variant="caption" color={colors.muted}>Xonobod shahri</AppText><Ionicons name="chevron-down" size={13} color={colors.muted} /></PressableScale>
        </View>
        <PressableScale accessibilityLabel="Bildirishnomalar" onPress={() => router.push("/orders")} style={{ width: 46, height: 46, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: shadow.subtle }}><Ionicons name="notifications-outline" size={22} color={colors.ink} /><View style={{ position: "absolute", right: 10, top: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange, borderWidth: 2, borderColor: colors.surface }} /></PressableScale>
      </View>

      <SearchField accessibilityLabel="Taom yoki restoran qidirish" value={query} onChangeText={setQuery} placeholder="Taom yoki restoran qidiring..." />

      {!query ? <View style={{ height: isDesktop ? 260 : 208, overflow: "hidden", borderRadius: radius.xl, borderCurve: "continuous", backgroundColor: colors.greenDark, boxShadow: shadow.raised }}>
        <Image source={require("../../assets/welcome-national-foods.png")} contentFit="cover" contentPosition="center" style={{ position: "absolute", inset: 0 }} />
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(2,20,11,0.48)" }} />
        <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(3,71,39,0.18)" }} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "flex-start", gap: spacing.sm, padding: spacing.lg, maxWidth: isDesktop ? 430 : 300 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 11, borderRadius: radius.full, backgroundColor: "rgba(17,168,80,0.92)" }}><Ionicons name="sparkles" size={13} color={colors.white} /><AppText variant="caption" color={colors.white} style={{ fontWeight: "800" }}>Bugungi maxsus taklif</AppText></View>
          <AppText variant={isDesktop ? "title" : "heading"} color={colors.white} style={{ fontWeight: "900" }}>Sevimli taomlaringiz{`\n`}endi yanada yaqin</AppText>
          <AppText variant="caption" color="#E8F5EC">Tanlangan taomlarga 50% gacha chegirma</AppText>
          <PressableScale accessibilityLabel="Takliflarni ko‘rish" onPress={() => router.push("/dishes")} style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: 14, borderRadius: radius.full, backgroundColor: colors.green, boxShadow: shadow.card }}><AppText variant="caption" color={colors.white} style={{ fontWeight: "900" }}>Takliflarni ko‘rish</AppText><Ionicons name="arrow-forward" size={15} color={colors.white} /></PressableScale>
        </View>
      </View> : null}

      {!query ? <View style={{ flexDirection: "row", justifyContent: "center", gap: 5 }}><View style={{ width: 18, height: 5, borderRadius: 3, backgroundColor: colors.green }} /><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line }} /><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line }} /></View> : null}

      {!query ? <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Benefit icon="flash" title="Tez" subtitle="30–40 daqiqa" />
        <Benefit icon="shield-checkmark" title="Ishonchli" subtitle="Xavfsiz to‘lov" />
        <Benefit icon="restaurant" title="Mazali" subtitle="Sifatli taom" />
      </View> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>{categories.map((entry) => {
        const active = category === entry.label;
        return <PressableScale key={entry.label} accessibilityLabel={entry.label} accessibilityState={{ selected: active }} onPress={() => setCategory(entry.label)} style={{ width: 68, alignItems: "center", gap: 7 }}><View style={{ width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: active ? colors.green : colors.surface, borderWidth: 1, borderColor: active ? colors.green : colors.line, boxShadow: active ? shadow.card : shadow.subtle }}><Ionicons name={entry.icon} size={23} color={active ? colors.white : colors.ink} /></View><AppText variant="caption" color={active ? colors.green : colors.ink} style={{ fontSize: 11, fontWeight: active ? "900" : "700" }}>{entry.label}</AppText></PressableScale>;
      })}</ScrollView>

      <View style={{ gap: spacing.md }}><SectionHeader title={query ? "Qidiruv natijalari" : "Mashhur taomlar"} subtitle={!query ? "Xonobodliklar ko‘p buyurtma bergan" : undefined} action={!query ? "Barchasi" : undefined} onAction={!query ? () => router.push("/dishes") : undefined} />
        {dishes.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.md }}>{dishes.slice(0, 8).map(({ item, restaurant }, index) => <PressableScale key={`${restaurant.id}-${item.id}`} accessibilityLabel={`${item.name} tafsilotlari`} onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id, restaurantId: restaurant.id } })} style={{ width: 204, overflow: "hidden", borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, boxShadow: shadow.card }}><View><Image source={{ uri: item.image }} contentFit="cover" style={{ width: "100%", height: 132, backgroundColor: colors.line }} />{index < 2 ? <View style={{ position: "absolute", left: 10, top: 10, paddingVertical: 5, paddingHorizontal: 9, borderRadius: radius.full, backgroundColor: colors.green }}><AppText variant="caption" color={colors.white} style={{ fontSize: 10, fontWeight: "900" }}>{index === 0 ? "TOP TANLOV" : "ENG MASHHUR"}</AppText></View> : null}</View><View style={{ padding: 12, gap: 5 }}><AppText style={{ fontWeight: "900" }} numberOfLines={1}>{item.name}</AppText><AppText variant="caption" color={colors.muted} numberOfLines={1}>{restaurant.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={13} color={colors.yellow} /><AppText variant="caption" color={colors.muted}>{restaurant.rating}</AppText></View><AppText variant="caption" color={colors.green} style={{ fontWeight: "900" }}>{money(item.price)}</AppText></View></View></PressableScale>)}</ScrollView> : <EmptyState icon="search-outline" title="Taom topilmadi" text="Boshqa so‘zni yoki toifani tanlab ko‘ring." />}
      </View>
    </Screen>
  </CustomerShell>;
}

function Benefit({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return <View style={{ flex: 1, minWidth: 0, alignItems: "center", gap: 3, paddingVertical: 11, paddingHorizontal: 4, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}><Ionicons name={icon} size={18} color={colors.green} /><AppText variant="caption" style={{ fontWeight: "900", fontSize: 11 }}>{title}</AppText><AppText variant="caption" color={colors.muted} style={{ fontSize: 9 }} numberOfLines={1}>{subtitle}</AppText></View>;
}
