import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, EmptyState, PressableScale } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, shadow, spacing } from "@/theme";

export default function ItemOptionsScreen() {
  const { id, restaurantId } = useLocalSearchParams<{ id: string; restaurantId: string }>();
  const { restaurants, addToCart } = useAppStore();
  const restaurant = restaurants.find((entry) => entry.id === restaurantId);
  const item = restaurant?.menu.find((entry) => entry.id === id);
  const [quantity, setQuantity] = useState(1);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [variantId, setVariantId] = useState<string>();
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();
  const selectedExtras = useMemo(() => item?.extras?.filter((extra) => extraIds.includes(extra.id)) ?? [], [item, extraIds]);

  if (!restaurant || !item) return <View style={{ flex: 1, padding: spacing.md }}><EmptyState title="Taom topilmadi" text="Menyu yangilangan bo‘lishi mumkin." /></View>;
  const selectedVariant = item.variants?.find((variant) => variant.id === variantId) ?? item.variants?.[0];
  const discountedPrice = item.discountPercent ? Math.round(item.price * (100 - item.discountPercent) / 100) : item.price;
  const total = (discountedPrice + (selectedVariant?.priceDelta ?? 0) + selectedExtras.reduce((sum, extra) => sum + extra.price, 0)) * quantity;

  const submit = () => {
    if (!addToCart(restaurant.id, item, quantity, note, selectedExtras, selectedVariant)) {
      Alert.alert("Savatchada boshqa restoran bor", "Avvalgi savatchani yakunlang yoki tozalang.", [{ text: "Yopish" }, { text: "Savatchaga o‘tish", onPress: () => router.replace("/cart") }]);
      return;
    }
    router.back();
  };

  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 102 + insets.bottom }}>
      <View style={{ height: 330, backgroundColor: colors.line }}><Image source={{ uri: item.image }} contentFit="cover" transition={180} style={StyleSheet.absoluteFill} /><View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(3,18,10,0.12)" }]} /><PressableScale accessibilityLabel="Orqaga" onPress={() => router.back()} style={{ position: "absolute", left: spacing.md, top: insets.top + spacing.sm, width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.52)" }}><Ionicons name="chevron-back" size={24} color={colors.white} /></PressableScale><View style={{ position: "absolute", right: spacing.md, top: insets.top + spacing.sm, width: 42, height: 42, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.52)" }}><Ionicons name="heart-outline" size={23} color={colors.white} /></View></View>

      <View style={{ marginTop: -22, padding: spacing.md, gap: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, backgroundColor: colors.surface, boxShadow: shadow.card }}>
        <View style={{ gap: spacing.sm }}><AppText variant="heading">{item.name}</AppText><View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="star" size={14} color={colors.yellow} /><AppText variant="caption" style={{ fontWeight: "800" }}>{restaurant.rating}</AppText><AppText variant="caption" color={colors.muted}>({restaurant.reviews})</AppText></View><View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted }} /><AppText variant="caption" color={colors.muted}>{restaurant.name}</AppText></View><AppText color={colors.muted}>{item.description}</AppText><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText variant="heading">{money(discountedPrice)}</AppText>{item.discountPercent ? <AppText variant="caption" color={colors.muted} style={{ textDecorationLine: "line-through" }}>{money(item.price)}</AppText> : null}</View></View>

        {item.variants?.length ? <View style={{ gap: spacing.sm }}><AppText style={{ fontWeight: "900" }}>Porsiyani tanlang</AppText>{item.variants.map((variant) => { const active = (variantId ?? item.variants?.[0]?.id) === variant.id; return <OptionRow key={variant.id} label={variant.name} price={variant.priceDelta ? `+ ${money(variant.priceDelta)}` : "Kiritilgan"} active={active} type="radio" onPress={() => setVariantId(variant.id)} />; })}</View> : null}

        {item.extras?.length ? <View style={{ gap: spacing.sm }}><AppText style={{ fontWeight: "900" }}>Qo‘shimcha</AppText>{item.extras.map((extra) => <OptionRow key={extra.id} label={extra.name} price={`+ ${money(extra.price)}`} active={extraIds.includes(extra.id)} type="check" onPress={() => setExtraIds((current) => current.includes(extra.id) ? current.filter((entry) => entry !== extra.id) : [...current, extra.id])} />)}</View> : null}

        <View style={{ gap: spacing.sm }}><AppText style={{ fontWeight: "900" }}>Buyurtma uchun izoh</AppText><TextInput accessibilityLabel="Taom uchun izoh" value={note} onChangeText={setNote} placeholder="Masalan: piyozsiz, kam achchiq..." placeholderTextColor="#8A938E" multiline style={{ minHeight: 86, padding: spacing.md, textAlignVertical: "top", borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceMuted, color: colors.ink, fontSize: 15 }} /></View>
      </View>
    </ScrollView>

    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md), borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface }}>
      <View style={{ height: 52, flexDirection: "row", alignItems: "center", borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}><PressableScale accessibilityLabel="Miqdorni kamaytirish" disabled={quantity === 1} onPress={() => setQuantity((current) => Math.max(1, current - 1))} style={{ width: 44, height: 52, alignItems: "center", justifyContent: "center" }}><Ionicons name="remove" size={20} color={colors.green} /></PressableScale><AppText style={{ minWidth: 24, textAlign: "center", fontWeight: "900", fontVariant: ["tabular-nums"] }}>{quantity}</AppText><PressableScale accessibilityLabel="Miqdorni oshirish" onPress={() => setQuantity((current) => current + 1)} style={{ width: 44, height: 52, alignItems: "center", justifyContent: "center" }}><Ionicons name="add" size={20} color={colors.green} /></PressableScale></View>
      <PressableScale accessibilityLabel={`Savatga qo‘shish, ${money(total)}`} onPress={submit} style={{ flex: 1, minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.green }}><AppText color={colors.white} style={{ fontWeight: "900" }}>Savatga qo‘shish</AppText><AppText color={colors.white} style={{ fontWeight: "900" }}>{money(total)}</AppText></PressableScale>
    </View>
  </View>;
}

function OptionRow({ label, price, active, type, onPress }: { label: string; price: string; active: boolean; type: "check" | "radio"; onPress: () => void }) {
  return <PressableScale accessibilityLabel={`${label}, ${price}`} accessibilityState={{ selected: active }} onPress={onPress} style={{ minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }}><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><View style={{ width: 21, height: 21, alignItems: "center", justifyContent: "center", borderRadius: type === "radio" ? radius.full : 5, borderWidth: 2, borderColor: active ? colors.green : "#B7BEB9", backgroundColor: active ? colors.green : colors.surface }}>{active ? <Ionicons name={type === "radio" ? "ellipse" : "checkmark"} size={type === "radio" ? 8 : 15} color={colors.white} /> : null}</View><AppText variant="caption" style={{ fontWeight: "700" }}>{label}</AppText></View><AppText variant="caption" color={colors.muted}>{price}</AppText></PressableScale>;
}
