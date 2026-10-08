import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius } from "@/theme";

export function GlassSurface({ children, style, tone = "light", interactive = false, intensity = 74 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; tone?: "light" | "dark"; interactive?: boolean; intensity?: number }) {
  void interactive;
  void intensity;
  const base: ViewStyle = { borderRadius: radius.lg, borderCurve: "continuous", borderWidth: 1, borderColor: tone === "dark" ? "rgba(255,255,255,0.18)" : colors.line, backgroundColor: tone === "dark" ? colors.greenDark : colors.surface };
  return <View style={[base, style]}>{children}</View>;
}

export function DropletBackdrop() {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} />;
}
