import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { AuthError, isRegistrationComplete, normalizeEmailAddress, roleOf, routeForRole, signInWithEmail, signInWithGoogle } from "@/auth/auth-service";
import { AuthBrand, AuthDivider, AuthErrorBanner, AuthField, AuthPrimaryButton, AuthScreen, GoogleButton, PasswordVisibilityButton, authColors } from "@/components/auth-ui";
import { AppText } from "@/components/ui";
import { colors, radius, shadow, spacing } from "@/theme";

type LoadingAction = "email" | "google" | null;

export default function LoginScreen() {
  const { setSession } = useAuth();
  const [screen, setScreen] = useState<"welcome" | "login">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [error, setError] = useState("");

  if (screen === "welcome") return <WelcomeScreen onLogin={() => setScreen("login")} />;

  const finishSignIn = (session: Awaited<ReturnType<typeof signInWithEmail>>) => {
    setSession(session);
    router.replace(isRegistrationComplete(session) ? routeForRole(roleOf(session)) : "/register");
  };

  const loginWithEmail = async () => {
    if (loading) return;
    const normalizedEmail = normalizeEmailAddress(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError("To‘g‘ri email manzilini kiriting."); return; }
    if (password.length < 6) { setError("Parol kamida 6 ta belgidan iborat bo‘lishi kerak."); return; }
    setError("");
    setLoading("email");
    try {
      finishSignIn(await signInWithEmail(normalizedEmail, password));
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Kirish amalga oshmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(null);
    }
  };

  const loginWithGoogle = async () => {
    if (loading) return;
    setError("");
    setLoading("google");
    try {
      finishSignIn(await signInWithGoogle());
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === "OAUTH_CANCELLED") return;
      setError(caught instanceof AuthError ? caught.message : "Google orqali kirish amalga oshmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(null);
    }
  };

  return <AuthScreen back onBack={() => setScreen("welcome")} footer={<View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xs }}><Pressable accessibilityRole="link" onPress={() => router.push("/terms" as never)}><AppText variant="caption" color={authColors.muted} style={{ textDecorationLine: "underline" }}>Foydalanish shartlari</AppText></Pressable><AppText variant="caption" color={authColors.muted}>·</AppText><Pressable accessibilityRole="link" onPress={() => router.push("/privacy-policy" as never)}><AppText variant="caption" color={authColors.muted} style={{ textDecorationLine: "underline" }}>Maxfiylik siyosati</AppText></Pressable></View>}>
    <AuthBrand subtitle="Sevimli taomlaringizga bir qadam qoldi" />
    <View style={{ alignItems: "center", gap: spacing.xs, paddingTop: spacing.sm }}><AppText variant="hero" color={authColors.text} style={{ fontSize: 34, lineHeight: 40 }}>Kirish</AppText><AppText color={authColors.muted}>Akkauntingizga xavfsiz kiring</AppText></View>
    {error ? <AuthErrorBanner message={error} /> : null}
    <View style={{ gap: 12 }}>
      <AuthField icon="mail-outline" placeholder="E-pochta" value={email} onChangeText={(value) => { setEmail(value); if (error) setError(""); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" editable={!loading} />
      <AuthField icon="lock-closed-outline" placeholder="Parol" value={password} onChangeText={(value) => { setPassword(value); if (error) setError(""); }} secureTextEntry={passwordHidden} textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={() => void loginWithEmail()} editable={!loading} right={<PasswordVisibilityButton hidden={passwordHidden} onPress={() => setPasswordHidden((value) => !value)} />} />
      <Pressable accessibilityRole="button" onPress={() => router.push("/forgot-password" as never)} style={({ pressed }) => ({ alignSelf: "flex-end", paddingVertical: spacing.xs, opacity: pressed ? 0.55 : 1 })}><AppText color={authColors.text} style={{ fontWeight: "800" }}>Parolni unutdingizmi?</AppText></Pressable>
    </View>
    <AuthPrimaryButton title="KIRISH" loading={loading === "email"} disabled={Boolean(loading)} onPress={() => void loginWithEmail()} />
    <AuthDivider />
    <GoogleButton loading={loading === "google"} disabled={Boolean(loading)} onPress={() => void loginWithGoogle()} />
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: spacing.xs, paddingTop: spacing.sm }}><AppText color={authColors.muted}>Hisobingiz yo‘qmi?</AppText><Pressable accessibilityRole="button" onPress={() => router.push("/register")} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}><AppText color={authColors.text} style={{ fontWeight: "900" }}>Ro‘yxatdan o‘tish</AppText></Pressable></View>
  </AuthScreen>;
}

function WelcomeScreen({ onLogin }: { onLogin: () => void }) {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: "#FFF5E9" }}>
    <View style={{ flex: 0.47, minHeight: 340, alignItems: "center", justifyContent: "center", paddingTop: insets.top + spacing.md, gap: spacing.sm, zIndex: 2 }}>
      <BrandMark />
      <View style={{ alignItems: "center", gap: 2 }}><AppText variant="hero" color={colors.greenDark} style={{ fontSize: 42, lineHeight: 48, letterSpacing: -1.5 }}>XonTaom</AppText><AppText color="#555267" style={{ textAlign: "center", lineHeight: 22 }}>Yaxshi taom{`\n`}yaqinlashtiradi</AppText></View>
    </View>
    <View style={{ flex: 0.53, overflow: "hidden", backgroundColor: colors.greenDark }}><Image source={require("../../assets/welcome-national-foods.png")} contentFit="cover" contentPosition={{ left: "73%", top: "center" }} style={{ position: "absolute", inset: 0 }} /><View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(12,14,37,0.18)" }} /></View>
    <View style={{ position: "absolute", left: spacing.lg, right: spacing.lg, bottom: insets.bottom + 18, gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ro‘yxatdan o‘tish" onPress={() => router.push("/register")} style={({ pressed }) => ({ minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.full, backgroundColor: colors.green, boxShadow: shadow.raised, opacity: pressed ? 0.84 : 1 })}><AppText color={colors.white} style={{ fontWeight: "900" }}>Assalomu alaykum</AppText><Ionicons name="arrow-forward" size={20} color={colors.white} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Kirish" onPress={onLogin} style={({ pressed }) => ({ minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: "rgba(24,27,60,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", opacity: pressed ? 0.84 : 1 })}><AppText color={colors.white} style={{ fontWeight: "800" }}>Kirish</AppText></Pressable>
    </View>
  </View>;
}

function BrandMark() {
  return <View accessibilityLabel="XonTaom belgisi" style={{ width: 124, height: 124 }}>
    <View style={{ position: "absolute", left: 17, top: 19, width: 57, height: 28, borderTopLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: "#29245D", transform: [{ rotate: "36deg" }] }} />
    <View style={{ position: "absolute", right: 17, top: 19, width: 57, height: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, backgroundColor: "#83D43C", transform: [{ rotate: "-36deg" }] }} />
    <View style={{ position: "absolute", left: 17, bottom: 19, width: 57, height: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, backgroundColor: "#FF5A2A", transform: [{ rotate: "-36deg" }] }} />
    <View style={{ position: "absolute", right: 17, bottom: 19, width: 57, height: 28, borderTopLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: "#29245D", transform: [{ rotate: "36deg" }] }} />
  </View>;
}
