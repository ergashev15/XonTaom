import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { AuthError, type AuthSession, roleOf, routeForRole, signInWithEmail, signInWithGoogle, signOutSession } from "@/auth/auth-service";
import { AppText, Button, Card, Field, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

export default function StaffAccessScreen() {
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");

  const openRestaurantPanel = async (session: AuthSession) => {
    const role = roleOf(session);
    if (role === "customer") {
      await signOutSession(session);
      setError("Bu Google akkauntiga restoran biriktirilmagan. Avval hamkorlar saytida shu akkaunt bilan restoran qo‘shing.");
      return;
    }
    setSession(session);
    router.replace(routeForRole(role));
  };

  const submitGoogle = async () => {
    if (loading) return;
    setLoading("google");
    setError("");
    try {
      await openRestaurantPanel(await signInWithGoogle());
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === "OAUTH_CANCELLED") return;
      setError(caught instanceof AuthError ? caught.message : "Google orqali kirish amalga oshmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(null);
    }
  };

  const submit = async () => {
    if (loading || !email.trim() || password.length < 6) return;
    setLoading("email");
    setError("");
    try {
      await openRestaurantPanel(await signInWithEmail(email, password));
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Kirish amalga oshmadi. Internet va akkaunt ma’lumotlarini tekshiring.");
    } finally {
      setLoading(null);
    }
  };

  return <Screen maxWidth={560} style={{ justifyContent: "center", minHeight: "100%" }}>
    <View style={{ alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft }}><Ionicons name="storefront" size={30} color={colors.green} /></View>
      <AppText variant="title" style={{ textAlign: "center" }}>Restoran egasi kirishi</AppText>
      <AppText color={colors.muted} style={{ textAlign: "center" }}>Hamkorlar saytida ishlatgan Google akkauntingiz bilan davom eting.</AppText>
    </View>
    <Card style={{ gap: spacing.md }}>
      <Button title="Google bilan kirish" icon="logo-google" size="lg" variant="ghost" loading={loading === "google"} disabled={loading !== null} onPress={() => void submitGoogle()} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <AppText variant="caption" color={colors.muted}>yoki email va parol bilan</AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>
      <Field label="GMAIL YOKI EMAIL" value={email} onChangeText={setEmail} placeholder="restoran@gmail.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="username" />
      <Field label="PAROL" value={password} onChangeText={setPassword} placeholder="Kamida 6 ta belgi" secureTextEntry autoCapitalize="none" textContentType="password" onSubmitEditing={() => void submit()} />
      {error ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft }}><AppText color={colors.red}>{error}</AppText></View> : null}
      <Button title="Email orqali kirish" icon="log-in-outline" size="lg" loading={loading === "email"} disabled={loading !== null || !email.trim() || password.length < 6} onPress={() => void submit()} />
    </Card>
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs }}><Ionicons name="shield-checkmark" size={15} color={colors.muted} /><AppText variant="caption" color={colors.muted}>Restoran egasi serverdagi owner_id orqali tekshiriladi</AppText></View>
  </Screen>;
}
