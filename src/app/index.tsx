import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/home"), 1800);
    return () => clearTimeout(timer);
  }, []);

  return <Pressable accessibilityRole="button" accessibilityLabel="XonTaom ilovasini ochish" onPress={() => router.replace("/home")} style={{ flex: 1, backgroundColor: "#06170F" }}>
    <Image source={require("../../assets/welcome-national-foods.png")} contentFit="cover" contentPosition="center" style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(1,16,10,0.58)" }]} />
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg }}>
      <View style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, borderWidth: 3, borderColor: "#62DC7E", transform: [{ rotate: "-4deg" }] }}><Ionicons name="restaurant-outline" size={42} color="#62DC7E" /></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><AppText variant="hero" color={colors.white}>Xon</AppText><AppText variant="hero" color="#62DC7E">Taom</AppText></View>
      <AppText color="#ECF5EF" style={{ textAlign: "center", fontWeight: "700" }}>Eng yaxshi taomlar{`\n`}siz uchun!</AppText>
    </View>
    <View style={{ paddingHorizontal: 44, paddingBottom: Math.max(insets.bottom + spacing.lg, 36), gap: spacing.sm, alignItems: "center" }}><View style={{ width: "100%", maxWidth: 190, height: 5, overflow: "hidden", borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.35)" }}><View style={{ width: "42%", height: "100%", borderRadius: radius.full, backgroundColor: "#62DC7E" }} /></View><AppText variant="caption" color="#ECF5EF">Boshlanmoqda...</AppText></View>
  </Pressable>;
}
