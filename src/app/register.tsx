import { Checkbox, Host } from "@expo/ui";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { AuthError, completeCustomerRegistration, formatUzPhone, normalizeEmailAddress, roleOf, routeForRole, signInWithGoogle, signOutSession } from "@/auth/auth-service";
import { AuthBrand, AuthErrorBanner, AuthField, AuthPrimaryButton, AuthScreen, authColors } from "@/components/auth-ui";
import { AppText } from "@/components/ui";
import { radius, spacing } from "@/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ gap: 12 }}><AppText variant="caption" color={authColors.lime} style={{ letterSpacing: 1.1, fontWeight: "900" }}>{title}</AppText>{children}</View>;
}

export default function RegisterScreen() {
  const { session, setSession, signOut } = useAuth();
  const [firstName, setFirstName] = useState(session?.user.user_metadata?.first_name ?? "");
  const [lastName, setLastName] = useState(session?.user.user_metadata?.last_name ?? "");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [phone, setPhone] = useState(session?.user.phone ? formatUzPhone(session.user.phone) : "+998 ");
  const [city, setCity] = useState("Xonobod shahri");
  const [address, setAddress] = useState("");
  const [house, setHouse] = useState("");
  const [landmark, setLandmark] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (session?.user.email) setEmail(session.user.email); }, [session?.user.email]);

  const leaveRegistration = async () => {
    if (loading) return;
    if (session) await signOut();
    router.replace("/");
  };

  const submit = async () => {
    if (loading) return;
    setError("");
    const normalizedEmail = normalizeEmailAddress(email);
    if (firstName.trim().length < 2) { setError("Ismingizni to‘liq kiriting."); return; }
    if (lastName.trim().length < 2) { setError("Familiyangizni to‘liq kiriting."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) { setError("To‘g‘ri email manzilini kiriting."); return; }
    if (phone.replace(/\D/g, "").length !== 12) { setError("Telefon raqamini +998 bilan to‘liq kiriting."); return; }
    if (city.trim().length < 2 || address.trim().length < 4 || !house.trim()) { setError("Shahar, ko‘cha yoki MFY va uy raqamini to‘liq kiriting."); return; }
    if (!accepted) { setError("Davom etish uchun ma’lumotlarni qayta ishlashga rozilik bering."); return; }
    setLoading(true);
    let authenticated = session;
    try {
      if (!authenticated) authenticated = await signInWithGoogle();
      const updated = await completeCustomerRegistration(authenticated, { firstName, lastName, email: normalizedEmail, phone, city, address, house, landmark });
      setSession(updated);
      router.replace(routeForRole(roleOf(updated)));
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === "OAUTH_CANCELLED") return;
      if (!session && authenticated && caught instanceof AuthError && caught.code === "GOOGLE_EMAIL_MISMATCH") await signOutSession(authenticated);
      setError(caught instanceof AuthError ? caught.message : "Ro‘yxatdan o‘tish yakunlanmadi. Qayta urinib ko‘ring.");
    } finally { setLoading(false); }
  };

  return <AuthScreen back onBack={() => void leaveRegistration()} footer={<AppText variant="caption" color={authColors.muted} style={{ textAlign: "center" }}>Ma’lumotlaringiz xavfsiz uzatiladi va himoyalangan holda saqlanadi.</AppText>}>
    <AuthBrand />
    <View style={{ alignItems: "center", gap: spacing.xs }}><AppText variant="title" color={authColors.text}>Ro‘yxatdan o‘tish</AppText><AppText color={authColors.muted} style={{ textAlign: "center" }}>Buyurtma va yetkazib berish uchun profilingizni to‘ldiring</AppText></View>
    {error ? <AuthErrorBanner message={error} /> : null}
    <Section title="SHAXSIY MA’LUMOTLAR">
      <AuthField icon="person-outline" placeholder="Ismingiz" value={firstName} onChangeText={(value) => { setFirstName(value); if (error) setError(""); }} autoCapitalize="words" textContentType="givenName" autoComplete="name-given" editable={!loading} />
      <AuthField icon="person-outline" placeholder="Familiyangiz" value={lastName} onChangeText={(value) => { setLastName(value); if (error) setError(""); }} autoCapitalize="words" textContentType="familyName" autoComplete="name-family" editable={!loading} />
      <AuthField icon="mail-outline" placeholder="E-pochta" value={email} onChangeText={(value) => { setEmail(value); if (error) setError(""); }} editable={!session?.user.email && !loading} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
      <AuthField icon="call-outline" placeholder="+998 90 123 45 67" value={phone} onChangeText={(value) => { setPhone(formatUzPhone(value)); if (error) setError(""); }} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" editable={!loading} />
    </Section>
    <Section title="ASOSIY YETKAZISH MANZILI">
      <AuthField icon="location-outline" placeholder="Shahar / tuman" value={city} onChangeText={setCity} autoCapitalize="words" editable={!loading} />
      <AuthField icon="map-outline" placeholder="Ko‘cha yoki MFY" value={address} onChangeText={(value) => { setAddress(value); if (error) setError(""); }} autoCapitalize="words" textContentType="streetAddressLine1" autoComplete="street-address" editable={!loading} />
      <AuthField icon="home-outline" placeholder="Uy / xonadon" value={house} onChangeText={(value) => { setHouse(value); if (error) setError(""); }} editable={!loading} />
      <AuthField icon="navigate-outline" placeholder="Mo‘ljal (ixtiyoriy)" value={landmark} onChangeText={setLandmark} editable={!loading} />
    </Section>
    <View style={{ padding: spacing.md, borderRadius: radius.lg, borderCurve: "continuous", borderWidth: 1, borderColor: authColors.border, backgroundColor: authColors.surface }}>
      <Host matchContents colorScheme="dark" seedColor={authColors.lime}><Checkbox value={accepted} onValueChange={(value) => { setAccepted(value); if (error) setError(""); }} label="Ma’lumotlarimni hisob va yetkazib berish uchun qayta ishlashga roziman" disabled={loading} /></Host>
    </View>
    <AuthPrimaryButton title={session ? "RO‘YXATDAN O‘TISHNI YAKUNLASH" : "GOOGLE ORQALI TASDIQLASH"} loading={loading} disabled={loading} onPress={() => void submit()} />
  </AuthScreen>;
}
