import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  TextInput,
  type TextInputProps,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui";
import { radius, spacing } from "@/theme";

export const authColors = {
  background: "#12152F",
  surface: "rgba(255,255,255,0.075)",
  surfaceStrong: "rgba(255,255,255,0.105)",
  border: "rgba(216,255,225,0.16)",
  borderFocused: "rgba(255,112,69,0.88)",
  text: "#F6FBF7",
  muted: "#9DAEA3",
  lime: "#FF6537",
  limePressed: "#E94F23",
  ink: "#FFFFFF",
  danger: "#FF9B9B",
  dangerSurface: "rgba(124,31,37,0.38)"
} as const;

export function AuthScreen({ children, back = false, onBack, footer }: { children: ReactNode; back?: boolean; onBack?: () => void; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = width >= 700 ? spacing.xl : spacing.lg;
  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: authColors.background }}>
      <View pointerEvents="none" style={{ position: "absolute", top: -140, left: -120, width: 360, height: 360, borderRadius: 999, backgroundColor: "rgba(255,101,55,0.12)" }} />
      <View pointerEvents="none" style={{ position: "absolute", bottom: -180, right: -160, width: 420, height: 420, borderRadius: 999, backgroundColor: "rgba(112,89,190,0.13)" }} />
      <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: 560, alignSelf: "center", paddingTop: Math.max(insets.top + spacing.sm, spacing.lg), paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl), paddingHorizontal: horizontal }}>
        <View style={{ minHeight: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {back ? <Pressable accessibilityRole="button" accessibilityLabel="Orqaga" hitSlop={12} onPress={onBack ?? (() => router.back())} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? authColors.surfaceStrong : "transparent", opacity: pressed ? 0.82 : 1 })}><Ionicons name="arrow-back" size={27} color={authColors.text} /></Pressable> : <View style={{ width: 48 }} />}
          <View accessibilityLabel="Ilova tili: O‘zbekcha" style={{ minHeight: 44, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Ionicons name="globe-outline" size={17} color={authColors.muted} /><AppText variant="caption" color={authColors.muted} style={{ fontWeight: "800" }}>O‘Z</AppText></View>
        </View>
        <View style={{ flex: 1, paddingTop: spacing.xl, gap: spacing.lg }}>{children}</View>
        {footer ? <View style={{ paddingTop: spacing.xl }}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthBrand({ subtitle }: { subtitle?: string }) {
  return <View style={{ alignItems: "center", gap: spacing.sm }}><View style={{ width: 58, height: 58, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: authColors.lime, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-3deg" }], boxShadow: "0 10px 28px rgba(255,101,55,0.22)" }}><Ionicons name="restaurant" size={30} color={authColors.ink} /></View><View style={{ flexDirection: "row" }}><AppText variant="title" color={authColors.text} style={{ fontWeight: "900" }}>Xon</AppText><AppText variant="title" color={authColors.lime} style={{ fontWeight: "900" }}>Taom</AppText></View>{subtitle ? <AppText color={authColors.muted} style={{ textAlign: "center", maxWidth: 360 }}>{subtitle}</AppText> : null}</View>;
}

export function AuthField({ icon, error, right, ...props }: TextInputProps & { icon: keyof typeof Ionicons.glyphMap; error?: boolean; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ minHeight: 62, borderRadius: radius.xl, borderCurve: "continuous", borderWidth: 1, borderColor: error ? authColors.danger : focused ? authColors.borderFocused : authColors.border, backgroundColor: focused ? authColors.surfaceStrong : authColors.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, gap: 13 }}><Ionicons name={icon} size={22} color={focused ? authColors.lime : authColors.muted} /><TextInput placeholderTextColor={authColors.muted} selectionColor={authColors.lime} {...props} onFocus={(event) => { setFocused(true); props.onFocus?.(event); }} onBlur={(event) => { setFocused(false); props.onBlur?.(event); }} style={[{ flex: 1, minHeight: 60, color: authColors.text, fontSize: 17, fontWeight: "600" }, props.style]} />{right}</View>;
}

export function PasswordVisibilityButton({ hidden, onPress }: { hidden: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={hidden ? "Parolni ko‘rsatish" : "Parolni yashirish"} hitSlop={10} onPress={onPress} style={({ pressed }) => ({ width: 42, height: 42, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}><Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={23} color={authColors.muted} /></Pressable>;
}

export function AuthPrimaryButton({ title, loading, disabled, onPress }: { title: string; loading?: boolean; disabled?: boolean; onPress: () => void }) {
  const unavailable = Boolean(disabled || loading);
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: unavailable, busy: Boolean(loading) }} disabled={unavailable} onPress={onPress} style={({ pressed }) => ({ minHeight: 62, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? authColors.limePressed : authColors.lime, opacity: unavailable ? 0.48 : 1, boxShadow: unavailable ? undefined : "0 12px 30px rgba(255,101,55,0.20)" })}>{loading ? <ActivityIndicator color={authColors.ink} /> : <AppText color={authColors.ink} style={{ fontSize: 17, fontWeight: "900", letterSpacing: 0.8 }}>{title}</AppText>}</Pressable>;
}

export function AuthDivider() {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}><View style={{ flex: 1, height: 1, backgroundColor: authColors.border }} /><AppText variant="caption" color={authColors.muted} style={{ letterSpacing: 2 }}>YOKI</AppText><View style={{ flex: 1, height: 1, backgroundColor: authColors.border }} /></View>;
}

export function GoogleButton({ loading, disabled, onPress }: { loading?: boolean; disabled?: boolean; onPress: () => void }) {
  const unavailable = Boolean(disabled || loading);
  return <Pressable accessibilityRole="button" accessibilityLabel="Google bilan kirish" accessibilityState={{ disabled: unavailable, busy: Boolean(loading) }} disabled={unavailable} onPress={onPress} style={({ pressed }) => ({ minHeight: 58, borderRadius: radius.full, borderWidth: 1, borderColor: authColors.border, backgroundColor: pressed ? authColors.surfaceStrong : authColors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, opacity: unavailable ? 0.5 : 1 })}>{loading ? <ActivityIndicator color={authColors.text} /> : <><Ionicons name="logo-google" size={21} color={authColors.text} /><AppText color={authColors.text} style={{ fontWeight: "800" }}>Google bilan davom etish</AppText></>}</Pressable>;
}

export function AuthErrorBanner({ message }: { message: string }) {
  return <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, borderCurve: "continuous", borderWidth: 1, borderColor: "rgba(255,155,155,0.22)", backgroundColor: authColors.dangerSurface, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}><Ionicons name="alert-circle-outline" size={20} color={authColors.danger} /><AppText selectable color={authColors.danger} style={{ flex: 1 }}>{message}</AppText></View>;
}

export function AuthTextButton({ title, onPress, muted = false }: { title: string; onPress: () => void; muted?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}><AppText color={muted ? authColors.muted : authColors.text} style={{ fontWeight: "800" }}>{title}</AppText></Pressable>;
}
