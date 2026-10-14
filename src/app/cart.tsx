import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button, EmptyState, PressableScale } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, shadow, spacing } from "@/theme";
import { cartUnitPrice } from "@/utils/order-rules";

export default function CartScreen() {
  const { cart, cartRestaurant, campaigns, setCartQuantity, clearCart } = useAppStore();
  const insets = useSafeAreaInsets();
  const [promoExpanded, setPromoExpanded] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + cartUnitPrice(item) * item.quantity, 0);

  if (!cart.length || !cartRestaurant) return <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: spacing.md, backgroundColor: colors.background }}><CartHeader onClear={clearCart} /><EmptyState icon="bag-handle-outline" title="Savat bo‘sh" text="Restoran menyusidan o‘zingizga yoqqan taomlarni qo‘shing." action={<Button title="Restoranlarni ko‘rish" onPress={() => router.replace("/restaurants" as never)} />} /></View>;

  const total = subtotal + cartRestaurant.deliveryFee;
  const disabled = subtotal < cartRestaurant.minOrder || !cartRestaurant.isOpen;
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 108, gap: 12 }}>
      <CartHeader onClear={clearCart} />

      <View style={{ gap: 10 }}>{cart.map((item) => <View key={item.lineId} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 9, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: colors.surface, boxShadow: shadow.subtle }}>
        <Image source={{ uri: item.image }} contentFit="cover" style={{ width: 78, height: 72, borderRadius: 12, backgroundColor: colors.line }} />
        <View style={{ flex: 1, gap: 3 }}><AppText variant="caption" style={{ fontWeight: "900" }} numberOfLines={1}>{item.name}</AppText><AppText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>{item.quantity} x {money(cartUnitPrice(item))}</AppText><AppText variant="caption" style={{ fontWeight: "900" }}>{money(cartUnitPrice(item) * item.quantity)}</AppText></View>
        <View style={{ minWidth: 94, height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: radius.full, backgroundColor: colors.surfaceMuted }}><PressableScale accessibilityLabel="Kamaytirish" onPress={() => setCartQuantity(item.lineId, item.quantity - 1)} style={{ width: 32, height: 38, alignItems: "center", justifyContent: "center" }}><Ionicons name="remove" size={17} color={colors.ink} /></PressableScale><AppText variant="caption" style={{ fontWeight: "900", fontVariant: ["tabular-nums"] }}>{item.quantity}</AppText><PressableScale accessibilityLabel="Ko‘paytirish" onPress={() => setCartQuantity(item.lineId, item.quantity + 1)} style={{ width: 32, height: 38, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={17} color={colors.ink} /></PressableScale></View>
      </View>)}</View>

      <ActionRow icon="pricetag" iconColor="#67B944" title="Promokod" subtitle={campaigns.some((campaign) => campaign.active && campaign.code) ? "Mavjud kodlarni ko‘rish" : "Faol kod yo‘q"} expanded={promoExpanded} onPress={() => setPromoExpanded((current) => !current)} />
      {promoExpanded ? <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}>{campaigns.filter((campaign) => campaign.active && campaign.code).length ? campaigns.filter((campaign) => campaign.active && campaign.code).map((campaign) => <View key={campaign.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.greenSoft }}><View style={{ flex: 1, gap: 2 }}><AppText variant="caption" style={{ fontWeight: "900" }}>{campaign.title}</AppText><AppText variant="caption" color={colors.muted}>{campaign.discountPercent ? `${campaign.discountPercent}% chegirma` : "Maxsus taklif"}</AppText></View><AppText selectable variant="caption" color={colors.green} style={{ fontWeight: "900" }}>{campaign.code}</AppText></View>) : <AppText variant="caption" color={colors.muted}>Hozircha faol promokod mavjud emas.</AppText>}</View> : null}

      <View style={{ gap: 9, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, boxShadow: shadow.subtle }}><PriceRow label="Taomlar narxi" value={money(subtotal)} /><PriceRow label="Yetkazib berish" value={cartRestaurant.deliveryFee ? money(cartRestaurant.deliveryFee) : "Bepul"} /><View style={{ height: 1, backgroundColor: colors.line }} /><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText style={{ fontWeight: "900" }}>Jami</AppText><AppText variant="heading">{money(total)}</AppText></View>{subtotal < cartRestaurant.minOrder ? <AppText variant="caption" color={colors.red}>Minimal buyurtmagacha {money(cartRestaurant.minOrder - subtotal)} yetmayapti.</AppText> : null}</View>

      <ActionRow icon="time-outline" title="Yetkazib berish vaqti" subtitle={cartRestaurant.eta} onPress={() => router.push("/checkout" as never)} />
      <ActionRow icon="card-outline" title="To‘lov usuli" subtitle="Yetkazilganda karta orqali" onPress={() => router.push({ pathname: "/checkout", params: { payment: "card" } })} />
    </ScrollView>

    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.background }}><PressableScale accessibilityLabel={`Buyurtma berish, ${money(total)}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => router.push("/checkout")} style={{ minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, borderRadius: 20, backgroundColor: colors.green, boxShadow: shadow.raised }}><AppText color={colors.white} style={{ fontWeight: "900", fontSize: 17 }}>Buyurtma berish</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText color={colors.white} style={{ fontWeight: "800" }}>{money(total)}</AppText><Ionicons name="arrow-forward" size={21} color={colors.white} /></View></PressableScale></View>
  </View>;
}

function CartHeader({ onClear }: { onClear: () => void }) {
  return <View style={{ minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><PressableScale accessibilityLabel="Orqaga" onPress={() => router.canGoBack() ? router.back() : router.replace("/home")} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}><Ionicons name="arrow-back" size={24} color={colors.ink} /></PressableScale><AppText variant="heading">Savatingiz</AppText><PressableScale accessibilityLabel="Savatni tozalash" onPress={onClear} style={{ width: 42, height: 42, alignItems: "center", justifyContent: "center" }}><Ionicons name="trash-outline" size={22} color={colors.ink} /></PressableScale></View>;
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><AppText variant="caption" color={colors.muted}>{label}</AppText><AppText variant="caption" style={{ fontWeight: "800" }}>{value}</AppText></View>;
}

function ActionRow({ icon, iconColor = colors.ink, title, subtitle, expanded, onPress }: { icon: keyof typeof Ionicons.glyphMap; iconColor?: string; title: string; subtitle?: string; expanded?: boolean; onPress: () => void }) {
  return <PressableScale accessibilityLabel={title} accessibilityState={expanded === undefined ? undefined : { selected: expanded }} onPress={onPress} style={{ minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, boxShadow: shadow.subtle }}><Ionicons name={icon} size={22} color={iconColor} /><View style={{ flex: 1, gap: 1 }}><AppText variant="caption" color={subtitle ? colors.muted : colors.ink}>{title}</AppText>{subtitle ? <AppText variant="caption" style={{ fontWeight: "900" }}>{subtitle}</AppText> : null}</View><Ionicons name={expanded === undefined ? "chevron-forward" : expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} /></PressableScale>;
}
