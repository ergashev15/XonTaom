import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/auth-context";
import { authEnvironment } from "@/auth/auth-service";
import { AppText, Button, Card, CustomerShell, Row, Screen, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, radius, spacing, useAppTheme } from "@/theme";

function ProfileSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Oynani yopish"
          onPress={onClose}
          style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.58)" }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxHeight: "90%",
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: colors.background,
            boxShadow: "0 -12px 36px rgba(0, 0, 0, 0.24)"
          }}
        >
          <View style={{ width: 42, height: 4, borderRadius: radius.full, alignSelf: "center", marginBottom: spacing.lg, backgroundColor: colors.muted }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { cart } = useAppStore();
  const { isDark, mode, setMode } = useAppTheme();
  const { isDesktop } = useResponsiveLayout();
  const [supportVisible, setSupportVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [infoSheet, setInfoSheet] = useState<{ title: string; message: string; icon: keyof typeof Ionicons.glyphMap } | null>(null);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const fullName = session?.user.user_metadata?.full_name || "XonTaom foydalanuvchisi";
  const initials = fullName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <CustomerShell active="profile" cartCount={cartCount}><Screen safeTop style={{ paddingBottom: isDesktop ? spacing.xxl : 118 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.greenDark }}><View style={{ width: 78, height: 78, borderRadius: radius.full, borderWidth: 3, borderColor: colors.white, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" }}><AppText variant="title" color={colors.white}>{initials}</AppText></View><View style={{ flex: 1, gap: spacing.xs }}><AppText variant="heading" color={colors.white}>{fullName}</AppText><AppText color="#D9EFE2">{session?.user.phone || "+998 90 123 45 67"}</AppText><View style={{ alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 9, borderRadius: radius.full, backgroundColor: colors.green }}><AppText variant="caption" color={colors.white}>Premium</AppText></View></View><Ionicons name="settings-outline" size={23} color={colors.white} /></View>
    <Card style={{ alignSelf: "center", width: "100%", maxWidth: 760, gap: 0 }}><Row icon="receipt-outline" title="Mening buyurtmalarim" onPress={() => router.push("/orders")} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="location-outline" title="Manzillarim" onPress={() => setInfoSheet({ title: "Manzil", message: "Mustaqillik ko‘chasi 42, 16-uy", icon: "location" })} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="card-outline" title="To‘lov usullari" onPress={() => setInfoSheet({ title: "To‘lov usullari", message: "Naqd yoki yetkazilganda karta orqali", icon: "card" })} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="gift-outline" title="Kuponlar va chegirmalar" onPress={() => setInfoSheet({ title: "Kuponlar", message: "Faol kuponlar hozircha yo‘q.", icon: "gift" })} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="globe-outline" title="Til" right={<View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>O‘zbekcha</AppText><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>} onPress={() => setInfoSheet({ title: "Til", message: "Rus tili keyingi versiyada qo‘shiladi.", icon: "language" })} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="help-circle-outline" title="Yordam va qo‘llab-quvvatlash" onPress={() => setSupportVisible(true)} /><View style={{ height: 1, backgroundColor: colors.line }} /><Row icon="settings-outline" title="Sozlamalar" right={<View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText variant="caption" color={colors.muted}>{mode === "system" ? "Tizimga mos" : isDark ? "Tungi" : "Kunduzgi"}</AppText><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View>} onPress={() => setSettingsVisible(true)} /></Card>
    {authEnvironment.isRequired
      ? <Button title="Hisobdan chiqish" variant="danger" onPress={async () => { await signOut(); router.replace("/"); }} />
      : <Button title="Bosh sahifaga qaytish" variant="secondary" icon="arrow-back" onPress={() => router.replace("/")} />}
      <ProfileSheet visible={infoSheet !== null} onClose={() => setInfoSheet(null)}>
        <View style={{ gap: spacing.lg, alignItems: "center" }}>
          <View style={{ width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft }}>
            <Ionicons name={infoSheet?.icon ?? "information-circle"} size={34} color={colors.green} />
          </View>
          <View style={{ width: "100%", alignItems: "center", gap: spacing.sm }}>
            <AppText variant="title" style={{ textAlign: "center" }}>{infoSheet?.title ?? "Ma’lumot"}</AppText>
            <AppText color={colors.muted} style={{ textAlign: "center", maxWidth: 360 }}>{infoSheet?.message ?? ""}</AppText>
          </View>
          <Button title="Tushunarli" size="lg" icon="checkmark" onPress={() => setInfoSheet(null)} style={{ width: "100%" }} />
        </View>
      </ProfileSheet>
      <ProfileSheet visible={supportVisible} onClose={() => setSupportVisible(false)}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ alignItems: "center", gap: spacing.md }}><View style={{ width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft }}><Ionicons name="headset" size={34} color={colors.green} /></View><View style={{ alignItems: "center", gap: spacing.xs }}><AppText variant="title" style={{ textAlign: "center" }}>Yordam kerakmi?</AppText><AppText color={colors.muted} style={{ textAlign: "center" }}>Operatorlarimiz har kuni 09:00 dan 23:00 gacha sizga yordam beradi.</AppText></View></View>
          <View style={{ padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.xs, alignItems: "center" }}><AppText variant="caption" color={colors.muted}>YORDAM TELEFONI</AppText><AppText variant="heading" color={colors.green} selectable>+998 74 200 00 00</AppText></View>
          <Button title="Qo‘ng‘iroq qilish" size="lg" icon="call" onPress={() => { setSupportVisible(false); void Linking.openURL("tel:+998742000000"); }} />
          <Button title="Hozir emas" variant="ghost" onPress={() => setSupportVisible(false)} />
        </View>
      </ProfileSheet>
      <ProfileSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)}>
        <View style={{ gap: spacing.lg }}>
          <View style={{ alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft }}><Ionicons name={isDark ? "moon" : "sunny"} size={34} color={colors.green} /></View>
            <View style={{ alignItems: "center", gap: spacing.xs }}><AppText variant="title">Ko‘rinish</AppText><AppText color={colors.muted} style={{ textAlign: "center" }}>Ilova ranglarini ko‘zingizga qulay rejimda ishlating.</AppText></View>
          </View>
          <View style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: colors.surface }}>
            <View style={{ flex: 1, gap: spacing.xs }}><AppText style={{ fontWeight: "800" }}>Tungi rejim</AppText><AppText variant="caption" color={colors.muted}>{isDark ? "Yoqilgan" : "O‘chirilgan"}</AppText></View>
            <Switch
              accessibilityLabel="Tungi rejim"
              value={isDark}
              onValueChange={(enabled) => setMode(enabled ? "dark" : "light")}
              trackColor={{ false: colors.line, true: colors.green }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.line}
            />
          </View>
          <Button title="Tizim rejimidan foydalanish" variant={mode === "system" ? "secondary" : "ghost"} icon={mode === "system" ? "checkmark-circle" : "phone-portrait-outline"} onPress={() => setMode("system")} />
          <Button title="Yopish" size="lg" onPress={() => setSettingsVisible(false)} />
        </View>
      </ProfileSheet>
  </Screen></CustomerShell>;
}
