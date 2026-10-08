import { BottomSheet, Host } from "@expo/ui";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Linking, View } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { authEnvironment } from "@/auth/auth-service";
import { AppText, Button, Card, CustomerShell, Row, Screen, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing } from "@/theme";

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { cart } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const [supportVisible, setSupportVisible] = useState(false);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const fullName = session?.user.user_metadata?.full_name || "XonTaom foydalanuvchisi";
  const initials = fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <CustomerShell active="profile" cartCount={cartCount}><Screen safeTop style={{ paddingBottom: isDesktop ? spacing.xxl : 118 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.greenDark }}><View style={{ width: 78, height: 78, borderRadius: radius.full, borderWidth: 3, borderColor: colors.white, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }}><AppText variant="title" color={colors.white}>{initials}</AppText></View><View style={{ flex: 1, gap: spacing.xs }}><AppText variant="heading" color={colors.white}>{fullName}</AppText><AppText color="#D9EFE2">{session?.user.phone || "+998 90 123 45 67"}</AppText><View style={{ alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.full, backgroundColor: colors.green }}><AppText variant="caption" color={colors.white}>Premium</AppText></View></View><Ionicons name="settings-outline" size={23} color={colors.white} /></View>
    <Card style={{ alignSelf: "center", width: "100%", maxWidth: 760, gap: 0 }}><Row icon="receipt-outline" title="Mening buyurtmalarim" onPress={() => router.push("/orders")} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="location-outline" title="Manzil manzillarim" onPress={() => Alert.alert("Manzil", "Mustaqillik ko‘chasi 42, 16-uy")} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="card-outline" title="To‘lov usullari" onPress={() => Alert.alert("To‘lov usullari", "Naqd yoki yetkazilganda karta orqali")} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="gift-outline" title="Kuponlar va chegirmalar" onPress={() => Alert.alert("Kuponlar", "Faol kuponlar hozircha yo‘q.")} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="globe-outline" title="Til" right={<View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>O‘zbekcha</AppText><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>} onPress={() => Alert.alert("Til", "Rus tili keyingi versiyada qo‘shiladi.")} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="help-circle-outline" title="Yordam va qo‘llab-quvvatlash" onPress={() => setSupportVisible(true)} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="settings-outline" title="Sozlamalar" onPress={() => Alert.alert("Sozlamalar", "Bildirishnoma va maxfiylik sozlamalari")} /></Card>
    {authEnvironment.isRequired
      ? <Button title="Hisobdan chiqish" variant="danger" onPress={async () => { await signOut(); router.replace("/"); }} />
      : <Button title="Bosh sahifaga qaytish" variant="secondary" icon="arrow-back" onPress={() => router.replace("/")} />}
    <Host matchContents>
      <BottomSheet isPresented={supportVisible} onDismiss={() => setSupportVisible(false)} showDragIndicator containerColor={colors.background} contentPadding={{ top: 12, left: 20, right: 20, bottom: 28 }}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ alignItems: "center", gap: spacing.md }}><View style={{ width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft }}><Ionicons name="headset" size={34} color={colors.green} /></View><View style={{ alignItems: "center", gap: spacing.xs }}><AppText variant="title" style={{ textAlign: "center" }}>Yordam kerakmi?</AppText><AppText color={colors.muted} style={{ textAlign: "center" }}>Operatorlarimiz har kuni 09:00 dan 23:00 gacha sizga yordam beradi.</AppText></View></View>
          <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.white, gap: spacing.xs, alignItems: "center" }}><AppText variant="caption" color={colors.muted}>YORDAM TELEFONI</AppText><AppText variant="heading" color={colors.green} selectable>+998 74 200 00 00</AppText></View>
          <Button title="Qo‘ng‘iroq qilish" size="lg" icon="call" onPress={() => { setSupportVisible(false); void Linking.openURL("tel:+998742000000"); }} />
          <Button title="Hozir emas" variant="ghost" onPress={() => setSupportVisible(false)} />
        </View>
      </BottomSheet>
    </Host>
  </Screen></CustomerShell>;
}
