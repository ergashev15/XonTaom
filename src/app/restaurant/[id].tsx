import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Chip, EmptyState, PressableScale, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, layout, money, radius, shadow, spacing } from "@/theme";
import { cartUnitPrice } from "@/utils/order-rules";

type DetailTab = "menu" | "reviews" | "info";

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { restaurants, reviews, favorites, toggleFavorite, cart, cartRestaurant } = useAppStore();
  const restaurant = restaurants.find((entry) => entry.id === id);
  const categories = useMemo(() => [...new Set(restaurant?.menu.map((item) => item.category) ?? [])], [restaurant]);
  const [category, setCategory] = useState("Barchasi");
  const [tab, setTab] = useState<DetailTab>("menu");
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsiveLayout();

  if (!restaurant) return <View style={{ flex: 1, padding: spacing.md }}><EmptyState title="Restoran topilmadi" text="Bu restoran o‘chirilgan yoki mavjud emas." /></View>;
  const canOrder = restaurant.isOpen && !restaurant.isBlocked;
  const restaurantReviews = reviews.filter((review) => review.restaurantId === restaurant.id && review.visible);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + cartUnitPrice(item) * item.quantity, 0);
  const showCart = cartCount > 0 && cartRestaurant?.id === restaurant.id;
  const menu = restaurant.menu.filter((item) => category === "Barchasi" || item.category === category);

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentInsetAdjustmentBehavior="never" stickyHeaderIndices={tab === "menu" ? [2] : undefined} contentContainerStyle={{ paddingBottom: showCart ? 104 + insets.bottom : spacing.xxl }}>
      <View style={{ height: isDesktop ? 390 : 280, width: "100%", maxWidth: layout.contentMax, alignSelf: "center", backgroundColor: colors.line }}>
        <Image source={{ uri: restaurant.image }} contentFit="cover" transition={180} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(3,18,10,0.18)" }]} />
        <PressableScale accessibilityLabel="Orqaga" onPress={() => router.back()} style={{ position: "absolute", left: spacing.md, top: insets.top + spacing.sm, width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.52)" }}><Ionicons name="chevron-back" size={24} color={colors.white} /></PressableScale>
        <PressableScale accessibilityLabel={favorites.includes(restaurant.id) ? "Sevimlidan olib tashlash" : "Sevimliga qo‘shish"} onPress={() => toggleFavorite(restaurant.id)} style={{ position: "absolute", right: spacing.md, top: insets.top + spacing.sm, width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.52)" }}><Ionicons name={favorites.includes(restaurant.id) ? "heart" : "heart-outline"} size={23} color={favorites.includes(restaurant.id) ? colors.red : colors.white} /></PressableScale>
      </View>

      <View style={{ marginTop: -22, paddingTop: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.surface, width: "100%", maxWidth: layout.contentMax, alignSelf: "center", boxShadow: shadow.card }}>
        <View style={{ gap: spacing.xs }}><AppText variant="heading">{restaurant.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={15} color={colors.yellow} /><AppText variant="caption" style={{ fontWeight: "800" }}>{restaurant.rating}</AppText><AppText variant="caption" color={colors.muted}>({restaurant.reviews})</AppText></View><View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted }} /><AppText variant="caption" color={colors.muted}>{restaurant.cuisine}</AppText></View></View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <InfoStat icon="time-outline" title={restaurant.eta} subtitle="Yetkazib berish" />
          <InfoStat icon="bicycle-outline" title={restaurant.deliveryFee ? money(restaurant.deliveryFee) : "Bepul"} subtitle="Yetkazib berish" />
          <InfoStat icon="location-outline" title="Xonobod" subtitle="hududi" />
        </View>

        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <DetailTabButton label="Menu" active={tab === "menu"} onPress={() => setTab("menu")} />
          <DetailTabButton label="Reytinglar" active={tab === "reviews"} onPress={() => setTab("reviews")} />
          <DetailTabButton label="Ma’lumot" active={tab === "info"} onPress={() => setTab("info")} />
        </View>
      </View>

      {tab === "menu" ? <View style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.line }}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, width: isDesktop ? layout.contentMax : undefined, alignSelf: "center" }}><Chip label="Barchasi" active={category === "Barchasi"} onPress={() => setCategory("Barchasi")} />{categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView></View> : <View />}

      <View style={{ padding: spacing.md, gap: spacing.sm, width: "100%", maxWidth: layout.contentMax, alignSelf: "center" }}>
        {tab === "menu" ? menu.map((item) => <PressableScale key={item.id} accessibilityLabel={`${item.name} taomini tanlash`} disabled={!item.available || !canOrder} onPress={() => router.push({ pathname: "/item/[id]", params: { id: item.id, restaurantId: restaurant.id } })} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <Image source={{ uri: item.image }} contentFit="cover" style={{ width: 88, height: 72, borderRadius: radius.sm, backgroundColor: colors.line }} />
          <View style={{ flex: 1, gap: 3 }}><AppText variant="caption" style={{ fontWeight: "900" }}>{item.name}</AppText><AppText variant="caption" color={colors.muted} numberOfLines={1}>{item.description}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText variant="caption" style={{ fontWeight: "800" }}>{money(item.discountPercent ? Math.round(item.price * (100 - item.discountPercent) / 100) : item.price)}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Ionicons name="star" size={12} color={colors.yellow} /><AppText variant="caption" color={colors.muted}>{restaurant.rating}</AppText></View></View></View>
          {item.available && canOrder ? <View style={{ width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.green }}><Ionicons name="add" size={21} color={colors.white} /></View> : null}
        </PressableScale>) : null}

        {tab === "reviews" ? (restaurantReviews.length ? restaurantReviews.map((review) => <View key={review.id} style={{ gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><AppText style={{ fontWeight: "800" }}>{review.customerName}</AppText><View style={{ flexDirection: "row", gap: 3 }}>{[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name="star" size={14} color={star <= review.rating ? colors.yellow : colors.line} />)}</View></View><AppText color={colors.muted}>{review.comment}</AppText>{review.reply ? <View style={{ padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.greenSoft }}><AppText variant="caption" color={colors.green}>Restoran javobi: {review.reply}</AppText></View> : null}</View>) : <EmptyState icon="star-outline" title="Hali reyting yo‘q" text="Birinchi fikrni buyurtmadan keyin qoldirishingiz mumkin." />) : null}

        {tab === "info" ? <View style={{ gap: spacing.sm }}><InfoRow icon="location-outline" title="Manzil" value={restaurant.address} /><InfoRow icon="time-outline" title="Ish vaqti" value={restaurant.hours} /><InfoRow icon="call-outline" title="Telefon" value={restaurant.phone} onPress={() => Linking.openURL(`tel:${restaurant.phone}`)} /><InfoRow icon="cash-outline" title="Minimal buyurtma" value={money(restaurant.minOrder)} /></View> : null}
      </View>
    </ScrollView>

    {showCart ? <View style={{ position: "absolute", left: spacing.md, right: spacing.md, bottom: Math.max(insets.bottom, spacing.sm), padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.green, boxShadow: shadow.raised }}><PressableScale accessibilityLabel="Savatga o‘tish" onPress={() => router.push("/cart")} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><Ionicons name="cart-outline" size={21} color={colors.white} /><AppText color={colors.white} style={{ fontWeight: "900" }}>Savatga o‘tish · {cartCount} ta</AppText></View><AppText color={colors.white} style={{ fontWeight: "900" }}>{money(cartTotal)}</AppText></PressableScale></View> : null}
  </View>;
}

function InfoStat({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return <View style={{ flex: 1, minHeight: 70, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.greenSoft }}><Ionicons name={icon} size={18} color={colors.green} /><AppText variant="caption" color={colors.ink} style={{ textAlign: "center", fontWeight: "900", fontSize: 11 }} numberOfLines={1}>{title}</AppText><AppText variant="caption" color={colors.muted} style={{ textAlign: "center", fontSize: 9 }} numberOfLines={1}>{subtitle}</AppText></View>;
}

function DetailTabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <PressableScale accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={onPress} style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: active ? colors.green : "transparent" }}><AppText variant="caption" color={active ? colors.green : colors.muted} style={{ fontWeight: active ? "900" : "600" }}>{label}</AppText></PressableScale>;
}

function InfoRow({ icon, title, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; onPress?: () => void }) {
  const content = <><Ionicons name={icon} size={21} color={colors.green} /><View style={{ flex: 1, gap: 2 }}><AppText variant="caption" color={colors.muted}>{title}</AppText><AppText variant="caption" style={{ fontWeight: "800" }}>{value}</AppText></View>{onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}</>;
  const style = { minHeight: 62, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface };
  return onPress ? <PressableScale accessibilityLabel={`${title}: ${value}`} onPress={onPress} style={style}>{content}</PressableScale> : <View style={style}>{content}</View>;
}
