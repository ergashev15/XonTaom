import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Link, router as expoRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle, useWindowDimensions, type GestureResponderEvent, type Insets } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { cubicBezier, useReducedMotion } from "react-native-reanimated";
import { breakpoints, colors, layout, money, radius, shadow, spacing, type } from "@/theme";
import { Restaurant } from "@/types";
import { DropletBackdrop, GlassSurface } from "@/components/glass-surface";

const router = expoRouter as typeof expoRouter & { replace: (href: string) => void };

export function Screen({ children, style, maxWidth, safeTop = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; maxWidth?: number; safeTop?: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const edgePadding = width >= breakpoints.desktop ? spacing.lg : spacing.md;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}><DropletBackdrop /><ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: "transparent" }} contentContainerStyle={[{ paddingHorizontal: edgePadding, paddingTop: safeTop ? Math.max(edgePadding, insets.top + spacing.sm) : edgePadding, gap: spacing.lg, alignSelf: "center", width: "100%", maxWidth: maxWidth ?? (width >= breakpoints.tablet ? layout.contentMax : layout.phoneMax), paddingBottom: spacing.xxl }, style]}>{children}</ScrollView></View>
  );
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const tier = width >= breakpoints.desktop ? "desktop" : width >= breakpoints.tablet ? "tablet" : "mobile";
  return { width, height, tier, isMobile: tier === "mobile", isTablet: tier === "tablet", isDesktop: tier === "desktop" } as const;
}

export function ResponsiveGrid({ children, maxColumns = 3, minItemWidth = 300, style }: { children: React.ReactNode; maxColumns?: 2 | 3 | 4; minItemWidth?: number; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const available = Math.min(width >= breakpoints.desktop ? width - layout.desktopRail - spacing.xxl : width, layout.contentMax) - spacing.xl;
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((available + spacing.md) / (minItemWidth + spacing.md))));
  const itemWidth = columns === 1 ? "100%" : `${(100 - (columns - 1) * 1.5) / columns}%`;
  return <View style={[{ flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap: spacing.md }, style]}>{React.Children.map(children, (child) => <View style={{ width: itemWidth as `${number}%`, minWidth: 0 }}>{child}</View>)}</View>;
}

export function AppText({ children, variant = "body", color, style, selectable = false, numberOfLines }: { children: React.ReactNode; variant?: "hero" | "title" | "heading" | "body" | "caption"; color?: string; style?: StyleProp<TextStyle>; selectable?: boolean; numberOfLines?: number }) {
  return <Text selectable={selectable} numberOfLines={numberOfLines} style={[type[variant], { color: color ?? colors.ink }, style]}>{children}</Text>;
}

export function PressableScale({ children, onPress, style, accessibilityLabel, accessibilityState, disabled = false, hitSlop }: { children: React.ReactNode; onPress: (event: GestureResponderEvent) => void; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityState?: { selected?: boolean; disabled?: boolean }; disabled?: boolean; hitSlop?: number | Insets }) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ ...accessibilityState, disabled }} disabled={disabled} hitSlop={hitSlop} pressRetentionOffset={16} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={[motionStyles.base, pressed && !reducedMotion ? motionStyles.pressed : undefined, { opacity: disabled ? 0.45 : pressed ? 0.82 : 1 }, style]}>{children}</AnimatedPressable>;
}

export function Button({ title, onPress, variant = "primary", icon, disabled, loading, size = "md", style }: { title: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; loading?: boolean; size?: "sm" | "md" | "lg"; style?: StyleProp<ViewStyle> }) {
  const palette = variant === "primary" ? [colors.green, colors.white] : variant === "danger" ? ["rgba(252,235,236,0.84)", colors.red] : variant === "secondary" ? ["rgba(255,240,233,0.82)", colors.orange] : [colors.glassStrong, colors.green];
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  return (
    <AnimatedPressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} pressRetentionOffset={16} style={[motionStyles.base, pressed && !reducedMotion ? motionStyles.pressed : undefined, { minHeight: size === "lg" ? 58 : size === "sm" ? 44 : 50, paddingHorizontal: size === "sm" ? 12 : spacing.md, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: palette[0], alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm, opacity: disabled ? 0.42 : pressed ? 0.8 : 1 }, style]}>
      {loading ? <ActivityIndicator color={palette[1]} /> : <>{icon ? <Ionicons name={icon} size={19} color={palette[1]} /> : null}<AppText variant="body" color={palette[1]} style={{ fontWeight: "800" }}>{title}</AppText></>}
    </AnimatedPressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>{label}</AppText><TextInput placeholderTextColor="#74827B" {...props} style={[{ minHeight: 54, backgroundColor: "rgba(255,255,255,0.50)", borderWidth: 1, borderColor: "rgba(255,255,255,0.82)", borderRadius: radius.md, borderCurve: "continuous", paddingHorizontal: spacing.md, color: colors.ink, fontSize: 16 }, props.style]} /></View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <GlassSurface style={[{ padding: spacing.md, gap: spacing.md, boxShadow: shadow.glass }, style]}>{children}</GlassSurface>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  return <AnimatedPressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} pressRetentionOffset={16} style={[motionStyles.base, pressed && !reducedMotion ? motionStyles.pressed : undefined, { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, backgroundColor: active ? colors.green : colors.glassStrong, borderRadius: radius.full, borderWidth: 1, borderColor: active ? colors.green : colors.glassRim, boxShadow: active ? shadow.card : shadow.subtle, opacity: pressed ? 0.82 : 1 }]}><AppText variant="caption" color={active ? colors.white : colors.muted} style={{ fontWeight: "800" }}>{label}</AppText></AnimatedPressable>;
}

export function StatusPill({ open, label }: { open: boolean; label?: string }) {
  return <View style={{ alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 10, backgroundColor: open ? colors.greenSoft : colors.redSoft, borderRadius: radius.full }}><AppText variant="caption" color={open ? colors.green : colors.red} style={{ fontWeight: "800" }}>{label ?? (open ? "Ochiq" : "Yopiq")}</AppText></View>;
}

export function RestaurantCard({ restaurant, favorite, onFavorite }: { restaurant: Restaurant; favorite: boolean; onFavorite: () => void }) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  return (
    <Link href={{ pathname: "/restaurant/[id]", params: { id: restaurant.id } }} asChild>
      <Pressable onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} pressRetentionOffset={16}>
        <Animated.View style={[motionStyles.base, pressed && !reducedMotion ? motionStyles.pressed : undefined, { opacity: pressed ? 0.9 : 1 }]}><Card style={{ padding: 0, overflow: "hidden", gap: 0, borderRadius: radius.lg }}>
          <View>
            <Image source={{ uri: restaurant.image }} style={{ width: "100%", height: 190, backgroundColor: colors.line }} contentFit="cover" transition={200} />
            <PressableScale accessibilityLabel={favorite ? "Sevimlidan olib tashlash" : "Sevimliga qo‘shish"} onPress={(event) => { event.stopPropagation(); onFavorite(); }} style={{ position: "absolute", right: 12, top: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)", borderRadius: radius.full }}><Ionicons name={favorite ? "heart" : "heart-outline"} size={23} color={favorite ? colors.orange : colors.ink} /></PressableScale>
            <View style={{ position: "absolute", left: 12, bottom: 12, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: "rgba(23,33,27,0.88)", borderRadius: radius.full }}><AppText variant="caption" color={colors.white}>⏱ {restaurant.eta}</AppText></View>
            {!restaurant.isOpen || restaurant.isBlocked ? <View style={{ position: "absolute", left: 12, top: 12 }}><StatusPill open={false} label={restaurant.isBlocked ? "Vaqtincha mavjud emas" : "Yopiq"} /></View> : null}
          </View>
          <View style={{ padding: spacing.md, gap: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><AppText variant="heading" style={{ flex: 1 }}>{restaurant.name}</AppText><AppText variant="body" color={colors.orange}>★ {restaurant.rating}</AppText></View>
            <AppText variant="caption" color={colors.muted}>{restaurant.cuisine}</AppText>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}><AppText variant="caption" color={colors.green} style={{ fontWeight: "800" }}>Yetkazish {money(restaurant.deliveryFee)}</AppText><AppText variant="caption" color={colors.muted}>min. {money(restaurant.minOrder)}</AppText></View>
          </View>
        </Card></Animated.View>
      </Pressable>
    </Link>
  );
}

export function Metric({ label, value, tone = "green" }: { label: string; value: string; tone?: "green" | "orange" }) {
  return <GlassSurface style={{ minWidth: 150, flex: 1, backgroundColor: tone === "green" ? "rgba(226,242,233,0.52)" : "rgba(255,240,233,0.52)", borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs }}><AppText variant="caption" color={colors.muted}>{label}</AppText><AppText variant="title" color={tone === "green" ? colors.green : colors.orange}>{value}</AppText></GlassSurface>;
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}><AppText variant="heading">{title}</AppText>{action ? <AppText variant="caption" color={colors.green}>{action}</AppText> : null}</View>;
}

export function BottomDock({ active, cartCount = 0 }: { active: CustomerRoute; cartCount?: number }) {
  const items = customerNavItems(cartCount);
  return <GlassSurface intensity={92} style={{ flexDirection: "row", borderRadius: 0, paddingTop: 6, paddingBottom: 4, paddingHorizontal: 4, borderWidth: 0, borderTopWidth: 1, borderTopColor: colors.line, boxShadow: "0 -4px 18px rgba(23,33,27,0.06)" }}>{items.map((item) => <DockItem key={item.key} item={item} selected={item.key === active} />)}</GlassSurface>;
}

type CustomerRoute = "home" | "restaurants" | "dishes" | "cart" | "profile" | "orders";
function customerNavItems(cartCount: number): { key: CustomerRoute; label: string; icon: keyof typeof Ionicons.glyphMap; href: "/home" | "/restaurants" | "/dishes" | "/cart" | "/profile"; badge?: number }[] {
  return [
    { key: "home", label: "Bosh sahifa", icon: "home", href: "/home" },
    { key: "restaurants", label: "Restoranlar", icon: "restaurant", href: "/restaurants" },
    { key: "dishes", label: "Taomlar", icon: "fast-food", href: "/dishes" },
    { key: "cart", label: "Savat", icon: "bag-handle", href: "/cart", badge: cartCount || undefined },
    { key: "profile", label: "Profil", icon: "person", href: "/profile" }
  ];
}

function DockItem({ item, selected }: { item: ReturnType<typeof customerNavItems>[number]; selected: boolean }) {
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={item.badge ? `${item.label}, ${item.badge} ta` : item.label} accessibilityState={{ selected }} onPress={() => { if (!selected) router.replace(item.href); }} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} pressRetentionOffset={16} style={[motionStyles.base, pressed && !reducedMotion ? motionStyles.pressed : undefined, { flex: 1, minHeight: 56, borderRadius: radius.md, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: "transparent", opacity: pressed ? 0.72 : 1 }]}><View><Ionicons name={item.icon} size={21} color={selected ? colors.green : colors.muted} />{item.badge ? <View style={{ position: "absolute", right: -9, top: -6, minWidth: 16, height: 16, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.surface }}><AppText color={colors.white} style={{ fontSize: 8, lineHeight: 10, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{item.badge}</AppText></View> : null}</View><AppText variant="caption" color={selected ? colors.green : colors.muted} style={{ fontSize: 9, fontWeight: selected ? "900" : "600" }}>{item.label}</AppText></AnimatedPressable>;
}

export function CustomerShell({ active, cartCount = 0, children }: { active: CustomerRoute; cartCount?: number; children: React.ReactNode }) {
  const { isDesktop } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const items = customerNavItems(cartCount);
  return <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column", backgroundColor: colors.background }}>
    {isDesktop ? <View style={{ width: layout.desktopRail, padding: spacing.md, zIndex: 2 }}><GlassSurface intensity={90} style={{ flex: 1, padding: spacing.md, justifyContent: "space-between", boxShadow: shadow.raised }}><View style={{ gap: spacing.xl }}><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }}><Ionicons name="restaurant" size={22} color={colors.white} /></View><AppText variant="heading" color={colors.green}>XonTaom</AppText></View><View style={{ gap: spacing.sm }}>{items.map((item) => { const selected = active === item.key; return <PressableScale key={item.key} accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => { if (!selected) router.replace(item.href); }} style={{ minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: selected ? colors.green : "transparent" }}><Ionicons name={item.icon} size={21} color={selected ? colors.white : colors.muted} /><AppText color={selected ? colors.white : colors.ink} style={{ fontWeight: "800" }}>{item.label}</AppText></PressableScale>; })}</View></View><View style={{ gap: spacing.xs }}><AppText variant="caption" color={colors.muted}>Yetkazish hududi</AppText><AppText variant="caption">Xonobod shahri</AppText></View></GlassSurface></View> : null}
    <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    {!isDesktop ? <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.surface, zIndex: 10 }}><BottomDock active={active} cartCount={cartCount} /></View> : null}
  </View>;
}

export function EmptyState({ icon = "restaurant-outline", title, text, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; text: string; action?: React.ReactNode }) {
  return <View style={{ paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.md }}><View style={{ width: 72, height: 72, borderRadius: radius.full, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={34} color={colors.green} /></View><AppText variant="heading" style={{ textAlign: "center" }}>{title}</AppText><AppText color={colors.muted} style={{ textAlign: "center", maxWidth: 360 }}>{text}</AppText>{action}</View>;
}

export function Row({ icon, title, subtitle, right, onPress }: { icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void }) {
  const content = <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center", paddingVertical: spacing.sm }}>{icon ? <View style={{ width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={21} color={colors.green} /></View> : null}<View style={{ flex: 1, gap: 2 }}><AppText variant="body" style={{ fontWeight: "700" }}>{title}</AppText>{subtitle ? <AppText variant="caption" color={colors.muted}>{subtitle}</AppText> : null}</View>{right ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={colors.muted} /> : null)}</View>;
  return onPress ? <PressableScale accessibilityLabel={title} onPress={onPress}>{content}</PressableScale> : content;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const motionStyles = StyleSheet.create({
  base: { transform: [{ scale: 1 }], transitionProperty: "transform", transitionDuration: "120ms", transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1) as unknown as Function },
  pressed: { transform: [{ scale: 0.97 }] }
});
