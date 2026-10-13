import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { requestAccountDeletion } from "@/api/privacy-api";
import { useAuth } from "@/auth/auth-context";
import { AppText, Button, Card, Screen } from "@/components/ui";
import { colors, spacing } from "@/theme";
import { confirmAction, notify } from "@/utils/dialogs";

export default function DeleteAccountScreen() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!session) return;
    setLoading(true);
    try {
      await requestAccountDeletion(session.access_token);
      await signOut();
      notify("So‘rov qabul qilindi", "Akkaunt va shaxsiy ma’lumotlarni o‘chirish jarayoni boshlandi.");
      router.replace("/");
    } catch (error) {
      notify("So‘rov yuborilmadi", error instanceof Error ? error.message : "Qayta urinib ko‘ring.");
    } finally {
      setLoading(false);
    }
  };

  return <Screen maxWidth={720} safeTop>
    <View style={{ gap: spacing.sm }}><AppText variant="title">Akkauntni o‘chirish</AppText><AppText color={colors.muted}>XonTaom akkaunti va unga bog‘liq shaxsiy ma’lumotlarni o‘chirish so‘rovini shu yerdan yuboring.</AppText></View>
    <Card>
      <AppText variant="heading">Nimalar o‘chiriladi?</AppText>
      <AppText color={colors.muted}>Profil, saqlangan manzillar, sevimlilar va push tokenlari o‘chiriladi. Moliyaviy yoki buyurtma yozuvlarining qonun talab qilgan qismi shaxsiy ma’lumotlardan tozalanib saqlanishi mumkin.</AppText>
      <AppText color={colors.red}>Jarayon yakunlangach akkauntni tiklab bo‘lmaydi.</AppText>
    </Card>
    {session
      ? <Button title="O‘chirish so‘rovini yuborish" variant="danger" loading={loading} onPress={() => confirmAction({ title: "Akkaunt o‘chirilsinmi?", message: "Bu amalni keyin bekor qilib bo‘lmasligi mumkin.", confirmLabel: "So‘rov yuborish", destructive: true, onConfirm: () => void submit() })} />
      : <Card><AppText color={colors.muted}>So‘rov yuborish uchun o‘chirmoqchi bo‘lgan akkauntingizga kiring.</AppText><Button title="Kirish" onPress={() => router.replace("/")} /></Card>}
    <Button title="Maxfiylik siyosati" variant="ghost" onPress={() => router.push("/privacy-policy" as never)} />
  </Screen>;
}
