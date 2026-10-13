import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { AuthError, isRegistrationComplete, normalizeEmailAddress, roleOf, routeForRole, signInWithEmail, signInWithGoogle } from "@/auth/auth-service";
import { AuthBrand, AuthDivider, AuthErrorBanner, AuthField, AuthPrimaryButton, AuthScreen, GoogleButton, PasswordVisibilityButton, authColors } from "@/components/auth-ui";
import { AppText } from "@/components/ui";
import { spacing } from "@/theme";

type LoadingAction = "email" | "google" | null;

export default function LoginScreen() {
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordHidden, setPasswordHidden] = useState(true);
  const [loading, setLoading] = useState<LoadingAction>(null);
  const [error, setError] = useState("");

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

  return <AuthScreen footer={<View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xs }}><Pressable accessibilityRole="link" onPress={() => router.push("/terms" as never)}><AppText variant="caption" color={authColors.muted} style={{ textDecorationLine: "underline" }}>Foydalanish shartlari</AppText></Pressable><AppText variant="caption" color={authColors.muted}>·</AppText><Pressable accessibilityRole="link" onPress={() => router.push("/privacy-policy" as never)}><AppText variant="caption" color={authColors.muted} style={{ textDecorationLine: "underline" }}>Maxfiylik siyosati</AppText></Pressable></View>}>
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
