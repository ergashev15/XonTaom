import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { View } from "react-native";
import { AppText, Button, CustomerShell, EmptyState, PressableScale, Screen, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, shadow, spacing } from "@/theme";
import { cartUnitPrice } from "@/utils/order-rules";

export default function CartScreen() {
  const { cart, cartRestaurant, setCartQuantity, clearCart } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const subtotal = cart.reduce((sum, item) => sum + cartUnitPrice(item) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!cart.length || !cartRestaurant) return <CustomerShell active="cart"><Screen safeTop style={{ paddingBottom: isDesktop ? spacing.xxl : 116 }}><EmptyState icon="bag-handle-outline" title="Savat bo‘sh" text="Restoran menyusidan o‘zingizga yoqqan taomlarni qo‘shing." action={<Button title="Restoranlarni ko‘rish" onPress={() => router.replace("/restaurants" as never)} />} /></Screen></CustomerShell>;

  const total = subtotal + cartRestaurant.deliveryFee;
  return <CustomerShell active="cart" cartCount={cartCount}><Screen safeTop maxWidth={820} style={{ paddingBottom: isDesktop ? spacing.xxl : 116 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View><AppText variant="title">Savat</AppText><AppText variant="caption" color={colors.muted}>{cartRestaurant.name}</AppText></View><PressableScale accessibilityLabel="Savatni tozalash" onPress={clearCart} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.surface }}><Ionicons name="trash-outline" size={20} color={colors.muted} /></PressableScale></View>

    <View style={{ gap: 0, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, boxShadow: shadow.subtle }}>{cart.map((item, index) => <View key={item.lineId} style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: index === cart.length - 1 ? 0 : 1, borderBottomColor: colors.line }}>
      <Image source={{ uri: item.image }} contentFit="cover" style={{ width: 72, height: 64, borderRadius: radius.sm, backgroundColor: colors.line }} />
      <View style={{ flex: 1, gap: 5 }}><AppText variant="caption" style={{ fontWeight: "900" }}>{item.name}</AppText><AppText variant="caption" color={colors.muted}>{money(cartUnitPrice(item))}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}><PressableScale accessibilityLabel="Kamaytirish" onPress={() => setCartQuantity(item.lineId, item.quantity - 1)} style={{ width: 28, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: colors.surfaceMuted }}><Ionicons name="remove" size={15} color={colors.ink} /></PressableScale><AppText variant="caption" style={{ width: 24, textAlign: "center", fontWeight: "800", fontVariant: ["tabular-nums"] }}>{item.quantity}</AppText><PressableScale accessibilityLabel="Ko‘paytirish" onPress={() => setCartQuantity(item.lineId, item.quantity + 1)} style={{ width: 28, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 7, backgroundColor: colors.surfaceMuted }}><Ionicons name="add" size={15} color={colors.ink} /></PressableScale></View></View>
      <View style={{ alignSelf: "stretch", alignItems: "flex-end", justifyContent: "space-between" }}><PressableScale accessibilityLabel="Mahsulotni olib tashlash" onPress={() => setCartQuantity(item.lineId, 0)} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={17} color={colors.muted} /></PressableScale><AppText variant="caption" style={{ fontWeight: "900" }}>{money(cartUnitPrice(item) * item.quantity)}</AppText></View>
    </View>)}</View>

    <PressableScale accessibilityLabel="Buyurtma uchun izoh qo‘shish" onPress={() => router.push("/checkout")} style={{ minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}><View style={{ gap: 2 }}><AppText variant="caption" style={{ fontWeight: "900" }}>Buyurtma uchun izoh</AppText><AppText variant="caption" color={colors.muted}>Masalan: kam achchiq, qo‘shimcha sous...</AppText></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></PressableScale>

    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><AppText variant="caption" color={colors.muted}>Taomlar</AppText><AppText variant="caption">{money(subtotal)}</AppText></View><View style={{ flexDirection: "row", justifyContent: "space-between" }}><AppText variant="caption" color={colors.muted}>Yetkazib berish</AppText><AppText variant="caption" color={cartRestaurant.deliveryFee ? colors.ink : colors.green}>{cartRestaurant.deliveryFee ? money(cartRestaurant.deliveryFee) : "Bepul"}</AppText></View><View style={{ height: 1, backgroundColor: colors.line }} /><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><AppText style={{ fontWeight: "900" }}>Jami</AppText><AppText variant="heading">{money(total)}</AppText></View>{subtotal < cartRestaurant.minOrder ? <AppText variant="caption" color={colors.red}>Minimal buyurtmagacha {money(cartRestaurant.minOrder - subtotal)} yetmayapti.</AppText> : null}</View>

    <PressableScale accessibilityLabel={`Buyurtma berish, ${money(total)}`} accessibilityState={{ disabled: subtotal < cartRestaurant.minOrder || !cartRestaurant.isOpen }} disabled={subtotal < cartRestaurant.minOrder || !cartRestaurant.isOpen} onPress={() => router.push("/checkout")} style={{ minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.green }}><AppText color={colors.white} style={{ fontWeight: "900" }}>Buyurtma berish</AppText><Ionicons name="arrow-forward" size={18} color={colors.white} /></PressableScale>
  </Screen></CustomerShell>;
}
