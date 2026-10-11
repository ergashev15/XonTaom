import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AuthError, normalizeEmailAddress, requestPasswordReset } from "@/auth/auth-service";
import { AuthBrand, AuthErrorBanner, AuthField, AuthPrimaryButton, AuthScreen, AuthTextButton, authColors } from "@/components/auth-ui";
import { AppText } from "@/components/ui";
import { spacing } from "@/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async () => {
    if (loading) return;
    const normalized = normalizeEmailAddress(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setError("To‘g‘ri email manzilini kiriting."); return; }
    setError("");
    setLoading(true);
    try { await requestPasswordReset(normalized); setSent(true); }
    catch (caught) { setError(caught instanceof AuthError ? caught.message : "Tiklash xatini yuborib bo‘lmadi. Qayta urinib ko‘ring."); }
    finally { setLoading(false); }
  };
  return <AuthScreen back>
    <AuthBrand />
    <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}><AppText variant="title" color={authColors.text}>Parolni tiklash</AppText><AppText color={authColors.muted} style={{ textAlign: "center" }}>Email manzilingizni kiriting. Sizga xavfsiz tiklash havolasini yuboramiz.</AppText></View>
    {error ? <AuthErrorBanner message={error} /> : null}
    {sent ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.lg, borderRadius: 18, borderWidth: 1, borderColor: authColors.borderFocused, backgroundColor: authColors.surface, gap: spacing.sm }}><AppText variant="heading" color={authColors.lime}>Xat yuborildi</AppText><AppText selectable color={authColors.text}>{normalizeEmailAddress(email)} manzilidagi xatni oching va ko‘rsatmaga amal qiling.</AppText><AuthTextButton title="Kirish sahifasiga qaytish" onPress={() => router.replace("/")} /></View> : <><AuthField icon="mail-outline" placeholder="E-pochta" value={email} onChangeText={(value) => { setEmail(value); if (error) setError(""); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="send" onSubmitEditing={() => void submit()} editable={!loading} /><AuthPrimaryButton title="TIKLASH XATINI YUBORISH" loading={loading} disabled={loading} onPress={() => void submit()} /></>}
  </AuthScreen>;
}
