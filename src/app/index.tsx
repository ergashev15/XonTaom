import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { AuthError, isRegistrationComplete, roleOf, routeForRole, signInWithGoogle } from "@/auth/auth-service";
import { AppText, Button } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const session = await signInWithGoogle();
      setSession(session);
      router.replace(isRegistrationComplete(session) ? routeForRole(roleOf(session)) : "/register");
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === "OAUTH_CANCELLED") return;
      setError(caught instanceof AuthError ? caught.message : "Google orqali kirish amalga oshmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
  };

  return <View style={{ flex: 1, backgroundColor: "#06170F" }}>
    <Image source={require("../../assets/welcome-national-foods.png")} contentFit="cover" contentPosition="center" style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(1,16,10,0.58)" }]} />
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg }}>
      <View style={{ width: 76, height: 76, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, borderWidth: 3, borderColor: "#62DC7E", transform: [{ rotate: "-4deg" }] }}><Ionicons name="restaurant-outline" size={42} color="#62DC7E" /></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><AppText variant="hero" color={colors.white}>Xon</AppText><AppText variant="hero" color="#62DC7E">Taom</AppText></View>
      <AppText color="#ECF5EF" style={{ textAlign: "center", fontWeight: "700" }}>Eng yaxshi taomlar{`\n`}siz uchun!</AppText>
    </View>
    <View style={{ paddingHorizontal: spacing.lg, paddingBottom: Math.max(insets.bottom + spacing.lg, 36), alignItems: "center", gap: spacing.sm }}>
      {error ? <View accessibilityLiveRegion="polite" style={{ width: "100%", maxWidth: 360, padding: spacing.md, borderRadius: radius.md, backgroundColor: "rgba(127,29,29,0.9)" }}><AppText selectable color={colors.white} style={{ textAlign: "center" }}>{error}</AppText></View> : null}
      <Button
        title="Ro‘yxatdan o‘tish"
        icon="person-add-outline"
        size="lg"
        disabled={loading}
        onPress={() => router.push("/register")}
        style={{ width: "100%", maxWidth: 360, backgroundColor: "#62DC7E", borderRadius: radius.lg }}
      />
      <Button
        title="Google bilan kirish"
        icon="logo-google"
        size="lg"
        loading={loading}
        disabled={loading}
        onPress={() => void signIn()}
        variant="ghost"
        style={{ width: "100%", maxWidth: 360, borderRadius: radius.lg }}
      />
      <AppText variant="caption" color="#ECF5EF" style={{ maxWidth: 360, textAlign: "center" }}>Mijozlar va restoran hamkorlari uchun yagona xavfsiz kirish</AppText>
    </View>
  </View>;
}
