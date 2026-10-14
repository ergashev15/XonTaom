import { Ionicons } from "@expo/vector-icons";
import { Image, type ImageSource } from "expo-image";
import { router as expoRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, CustomerShell, PressableScale, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, radius, shadow, spacing } from "@/theme";

const router = expoRouter as typeof expoRouter & { push: (href: string | object) => void };

const categories: { label: string; query: string; image: ImageSource }[] = [
  { label: "Osh", query: "osh", image: require("../../assets/categories/milliy-osh.jpg") },
  { label: "Somsa", query: "manti", image: require("../../assets/categories/fast-food-lavash.jpg") },
  { label: "Shashlik", query: "shashlik", image: require("../../assets/categories/kabob.jpg") },
  { label: "Milliy taomlar", query: "milliy", image: require("../../assets/categories/milliy-osh.jpg") },
  { label: "Salatlar", query: "salat", image: require("../../assets/categories/salat.jpg") }
];

export default function HomeScreen() {
  const { restaurants, cart, favorites, toggleFavorite } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const featured = restaurants.find((restaurant) => restaurant.isOpen && !restaurant.isBlocked) ?? restaurants[0];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return restaurants.filter((restaurant) => restaurant.isOpen && !restaurant.isBlocked);
    return restaurants.filter((restaurant) => `${restaurant.name} ${restaurant.cuisine} ${restaurant.menu.map((item) => `${item.name} ${item.category}`).join(" ")}`.toLowerCase().includes(needle));
  }, [query, restaurants]);

  return <CustomerShell active="home" cartCount={cartCount}>
    <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: isDesktop ? spacing.xxl : 104 }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: spacing.md, paddingBottom: 26, gap: spacing.md, backgroundColor: colors.greenDark }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <PressableScale accessibilityLabel="Yetkazish manzilini tanlash" onPress={() => router.push("/addresses")} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Ionicons name="location" size={23} color={colors.green} /><View style={{ flex: 1 }}><AppText variant="caption" color="#C7C5D1">Yetkazish manzili</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><AppText variant="caption" color={colors.white} style={{ fontWeight: "800" }} numberOfLines={1}>Xonobod shahri</AppText><Ionicons name="chevron-down" size={14} color={colors.white} /></View></View></PressableScale>
          <PressableScale accessibilityLabel="Buyurtmalar va bildirishnomalar" onPress={() => router.push("/orders")} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}><Ionicons name="notifications-outline" size={22} color={colors.white} /><View style={{ position: "absolute", right: 8, top: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.greenDark }} /></PressableScale>
        </View>

        <AppText variant="hero" color={colors.white} style={{ fontSize: 36, lineHeight: 39 }}>Nima tanovul{`\n`}<AppText variant="hero" color={colors.green} style={{ fontSize: 36, lineHeight: 39 }}>qilamiz?</AppText></AppText>

        <View style={{ height: 48, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}><Ionicons name="search" size={21} color={colors.white} /><TextInput accessibilityLabel="Taom yoki restoran qidirish" value={query} onChangeText={setQuery} placeholder="Taom yoki restoran qidirish..." placeholderTextColor="#E0DEE7" returnKeyType="search" style={{ flex: 1, color: colors.white, fontSize: 14, fontWeight: "600" }} />{query ? <PressableScale accessibilityLabel="Qidiruvni tozalash" onPress={() => setQuery("")}><Ionicons name="close-circle" size={20} color={colors.white} /></PressableScale> : null}</View>

        {!query && featured ? <PressableScale accessibilityLabel={`${featured.name} restoranini ochish`} onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: featured.id } })} style={{ height: 176, overflow: "hidden", borderRadius: 26, borderCurve: "continuous", backgroundColor: "#282B49", boxShadow: shadow.raised }}>
          <Image source={{ uri: featured.menu[0]?.image || featured.image }} contentFit="cover" style={{ position: "absolute", inset: 0 }} />
          <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(8,10,28,0.30)" }} />
          <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md, paddingRight: 70, backgroundColor: "rgba(8,10,28,0.58)" }}><AppText variant="heading" color={colors.white}>{featured.name}</AppText><AppText variant="caption" color={colors.white}>{featured.eta}</AppText></View>
          <View style={{ position: "absolute", right: 14, bottom: 14, width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.green }}><Ionicons name="arrow-forward" size={22} color={colors.white} /></View>
        </PressableScale> : null}
      </View>

      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 22 }}>
        {!query ? <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText variant="heading">Kategoriyalar</AppText><PressableScale accessibilityLabel="Barcha taomlarni ko‘rish" onPress={() => router.push("/dishes")} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><AppText variant="caption" color={colors.ink}>Barchasini ko‘rish</AppText><Ionicons name="chevron-forward" size={14} color={colors.ink} /></PressableScale></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.md }}>{categories.map((category) => <PressableScale key={category.label} accessibilityLabel={`${category.label} bo‘yicha qidirish`} onPress={() => setQuery(category.query)} style={{ width: 64, alignItems: "center", gap: 6 }}><View style={{ width: 62, height: 62, overflow: "hidden", borderRadius: 18, backgroundColor: colors.surfaceMuted }}><Image source={category.image} contentFit="cover" style={{ width: "100%", height: "100%" }} /></View><AppText variant="caption" style={{ fontSize: 10, fontWeight: "700", textAlign: "center" }} numberOfLines={1}>{category.label}</AppText></PressableScale>)}</ScrollView>
        </View> : null}

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText variant="heading">{query ? "Qidiruv natijalari" : "Siz uchun"}</AppText>{!query ? <PressableScale accessibilityLabel="Barcha restoranlarni ko‘rish" onPress={() => router.push("/restaurants")} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><AppText variant="caption">Barchasini ko‘rish</AppText><Ionicons name="chevron-forward" size={14} color={colors.ink} /></PressableScale> : null}</View>
          {filtered.length ? <ScrollView horizontal={!query} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: spacing.md, flexDirection: query ? "column" : "row" }}>{filtered.map((restaurant) => <PressableScale key={restaurant.id} accessibilityLabel={`${restaurant.name} restoranini ochish`} onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } })} style={{ width: query ? "100%" : 198, overflow: "hidden", borderRadius: 18, borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.card }}>
            <View><Image source={{ uri: restaurant.image }} contentFit="cover" style={{ width: "100%", height: 110, backgroundColor: colors.surfaceMuted }} /><View style={{ position: "absolute", left: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: "rgba(255,253,249,0.94)" }}><Ionicons name="time-outline" size={13} color={colors.ink} /><AppText variant="caption" style={{ fontSize: 10 }}>{restaurant.eta}</AppText></View><PressableScale accessibilityLabel={favorites.includes(restaurant.id) ? "Sevimlidan olib tashlash" : "Sevimliga qo‘shish"} onPress={(event) => { event.stopPropagation(); toggleFavorite(restaurant.id); }} style={{ position: "absolute", right: 8, top: 8, width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: "rgba(22,25,52,0.62)" }}><Ionicons name={favorites.includes(restaurant.id) ? "heart" : "heart-outline"} size={18} color={colors.white} /></PressableScale></View>
            <View style={{ padding: 10, gap: 3 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}><AppText variant="caption" style={{ flex: 1, fontWeight: "900" }} numberOfLines={1}>{restaurant.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Ionicons name="star" size={12} color={colors.yellow} /><AppText variant="caption" style={{ fontSize: 10 }}>{restaurant.rating}</AppText></View></View><AppText variant="caption" color={colors.muted} style={{ fontSize: 10 }} numberOfLines={1}>{restaurant.cuisine}</AppText></View>
          </PressableScale>)}</ScrollView> : <View style={{ paddingVertical: 48, alignItems: "center", gap: spacing.sm }}><Ionicons name="search-outline" size={38} color={colors.muted} /><AppText variant="heading">Hech narsa topilmadi</AppText><AppText color={colors.muted}>Boshqa so‘z bilan qidirib ko‘ring.</AppText></View>}
        </View>
      </View>
    </ScrollView>
  </CustomerShell>;
}
