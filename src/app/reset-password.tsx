import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { AuthError, updatePasswordWithRecoveryToken } from "@/auth/auth-service";
import { AuthBrand, AuthErrorBanner, AuthField, AuthPrimaryButton, AuthScreen, AuthTextButton, PasswordVisibilityButton, authColors } from "@/components/auth-ui";
import { AppText } from "@/components/ui";
import { spacing } from "@/theme";

function tokenFromUrl(url: string | null, routeToken?: string | string[]) {
  if (typeof routeToken === "string" && routeToken) return routeToken;
  if (!url) return "";
  const hash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
  return new URLSearchParams(hash).get("access_token") ?? "";
}

export default function ResetPasswordScreen() {
  const currentUrl = Linking.useURL();
  const params = useLocalSearchParams<{ access_token?: string | string[] }>();
  const accessToken = useMemo(() => tokenFromUrl(currentUrl, params.access_token), [currentUrl, params.access_token]);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hidden, setHidden] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const submit = async () => {
    if (loading) return;
    if (!accessToken) { setError("Tiklash havolasi yaroqsiz yoki muddati tugagan. Yangi havola so‘rang."); return; }
    if (password.length < 8) { setError("Yangi parol kamida 8 ta belgidan iborat bo‘lsin."); return; }
    if (password !== confirmation) { setError("Kiritilgan parollar bir xil emas."); return; }
    setLoading(true);
    setError("");
    try { await updatePasswordWithRecoveryToken(accessToken, password); setComplete(true); setPassword(""); setConfirmation(""); }
    catch (caught) { setError(caught instanceof AuthError ? caught.message : "Parolni yangilab bo‘lmadi. Yangi havola bilan qayta urinib ko‘ring."); }
    finally { setLoading(false); }
  };
  return <AuthScreen>
    <AuthBrand />
    <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}><AppText variant="title" color={authColors.text}>Yangi parol</AppText><AppText color={authColors.muted} style={{ textAlign: "center" }}>Akkauntingiz uchun yangi va ishonchli parol yarating.</AppText></View>
    {error ? <AuthErrorBanner message={error} /> : null}
    {complete ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.lg, borderRadius: 18, borderWidth: 1, borderColor: authColors.borderFocused, backgroundColor: authColors.surface, gap: spacing.sm }}><AppText variant="heading" color={authColors.lime}>Parol yangilandi</AppText><AppText color={authColors.text}>Endi yangi parolingiz bilan akkauntga kirishingiz mumkin.</AppText><AuthTextButton title="Kirish" onPress={() => router.replace("/")} /></View> : <><AuthField icon="lock-closed-outline" placeholder="Yangi parol" value={password} onChangeText={(value) => { setPassword(value); if (error) setError(""); }} secureTextEntry={hidden} textContentType="newPassword" autoComplete="new-password" editable={!loading} right={<PasswordVisibilityButton hidden={hidden} onPress={() => setHidden((value) => !value)} />} /><AuthField icon="shield-checkmark-outline" placeholder="Parolni takrorlang" value={confirmation} onChangeText={(value) => { setConfirmation(value); if (error) setError(""); }} secureTextEntry={hidden} textContentType="newPassword" autoComplete="new-password" returnKeyType="done" onSubmitEditing={() => void submit()} editable={!loading} /><AuthPrimaryButton title="PAROLNI YANGILASH" loading={loading} disabled={loading} onPress={() => void submit()} /></>}
  </AuthScreen>;
}
