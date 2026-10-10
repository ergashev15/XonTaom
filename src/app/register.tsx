import { Checkbox, Host } from "@expo/ui";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import {
  AuthError,
  completeCustomerRegistration,
  formatUzPhone,
  normalizeEmailAddress,
  roleOf,
  routeForRole,
  signInWithGoogle,
  signOutSession
} from "@/auth/auth-service";
import { AppText, Button, Card, Field, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";

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

  useEffect(() => {
    if (session?.user.email) setEmail(session.user.email);
  }, [session?.user.email]);

  const submit = async () => {
    if (loading) return;
    setError("");
    const normalizedEmail = normalizeEmailAddress(email);
    if (firstName.trim().length < 2) { setError("Ismingizni to‘liq kiriting."); return; }
    if (lastName.trim().length < 2) { setError("Familiyangizni to‘liq kiriting."); return; }
    if (!/^[^\s@]+@gmail\.com$/i.test(normalizedEmail)) { setError("To‘g‘ri Gmail manzilini kiriting."); return; }
    if (phone.replace(/\D/g, "").length !== 12) { setError("Telefon raqamini +998 bilan to‘liq kiriting."); return; }
    if (city.trim().length < 2 || address.trim().length < 4 || !house.trim()) { setError("Shahar, ko‘cha yoki MFY va uy raqamini to‘liq kiriting."); return; }
    if (!accepted) { setError("Davom etish uchun ma’lumotlarni qayta ishlashga rozilik bering."); return; }

    setLoading(true);
    let authenticated = session;
    try {
      if (!authenticated) authenticated = await signInWithGoogle();
      const updated = await completeCustomerRegistration(authenticated, {
        firstName,
        lastName,
        email: normalizedEmail,
        phone,
        city,
        address,
        house,
        landmark
      });
      setSession(updated);
      router.replace(routeForRole(roleOf(updated)));
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === "OAUTH_CANCELLED") return;
      if (!session && authenticated && caught instanceof AuthError && caught.code === "GOOGLE_EMAIL_MISMATCH") {
        await signOutSession(authenticated);
      }
      setError(caught instanceof AuthError ? caught.message : "Ro‘yxatdan o‘tish yakunlanmadi. Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
  };

  return <Screen safeTop maxWidth={620} style={{ paddingBottom: 96 }}>
    <View style={{ gap: spacing.sm }}>
      <AppText variant="title">Ro‘yxatdan o‘tish</AppText>
      <AppText color={colors.muted}>Ma’lumotlaringiz buyurtma, yetkazib berish va hisob xavfsizligi uchun ishlatiladi.</AppText>
    </View>

    {error ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft }}><AppText selectable color={colors.red}>{error}</AppText></View> : null}

    <Card>
      <AppText variant="heading">Shaxsiy ma’lumotlar</AppText>
      <Field label="ISM" value={firstName} onChangeText={setFirstName} autoCapitalize="words" textContentType="givenName" autoComplete="name-given" placeholder="Ali" />
      <Field label="FAMILIYA" value={lastName} onChangeText={setLastName} autoCapitalize="words" textContentType="familyName" autoComplete="name-family" placeholder="Valiyev" />
      <Field label="GMAIL" value={email} onChangeText={setEmail} editable={!session?.user.email} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" placeholder="ali@gmail.com" />
      <AppText variant="caption" color={colors.muted}>Gmail manzili Google akkauntingiz orqali tasdiqlanadi.</AppText>
      <Field label="TELEFON RAQAMI" value={phone} onChangeText={(value) => setPhone(formatUzPhone(value))} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" placeholder="+998 90 123 45 67" />
    </Card>

    <Card>
      <AppText variant="heading">Asosiy yetkazish manzili</AppText>
      <Field label="SHAHAR / TUMAN" value={city} onChangeText={setCity} autoCapitalize="words" placeholder="Xonobod shahri" />
      <Field label="KO‘CHA YOKI MFY" value={address} onChangeText={setAddress} autoCapitalize="words" textContentType="streetAddressLine1" autoComplete="street-address" placeholder="Mustaqillik ko‘chasi" />
      <Field label="UY / XONADON" value={house} onChangeText={setHouse} placeholder="42-uy, 16-xonadon" />
      <Field label="MO‘LJAL (IXTIYORIY)" value={landmark} onChangeText={setLandmark} placeholder="Maktab ro‘parasida" />
    </Card>

    <Card>
      <Host matchContents>
        <Checkbox value={accepted} onValueChange={setAccepted} label="Ma’lumotlarimni hisob va yetkazib berish uchun qayta ishlashga roziman" />
      </Host>
    </Card>

    <Button title={session ? "Ro‘yxatdan o‘tishni yakunlash" : "Google orqali tasdiqlash"} icon="logo-google" size="lg" loading={loading} disabled={loading} onPress={() => void submit()} />
    <Button title="Kirish sahifasiga qaytish" variant="ghost" icon="arrow-back" disabled={loading} onPress={() => void (async () => { if (session) await signOut(); router.replace("/"); })()} />
  </Screen>;
}
