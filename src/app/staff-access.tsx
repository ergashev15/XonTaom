import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { View } from "react-native";
import { AppText, Button, Card, PressableScale, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";
import { routeForRole } from "@/auth/auth-service";

const staffRoles = [
  { role: "restaurant" as const, title: "Restoran xodimi", subtitle: "Buyurtmalar va menyuni boshqarish", icon: "storefront-outline" as const },
  { role: "admin" as const, title: "Administrator", subtitle: "Tizim nazorati va boshqaruvi", icon: "shield-checkmark-outline" as const }
];

export default function StaffAccessScreen() {
  return <Screen maxWidth={560} style={{ justifyContent: "center", minHeight: "100%" }}>
    <View style={{ alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 72, height: 72, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.greenSoft }}><Ionicons name="key" size={30} color={colors.green} /></View>
      <AppText variant="title" style={{ textAlign: "center" }}>Xodimlar kirishi</AppText>
      <AppText color={colors.muted} style={{ textAlign: "center" }}>Bu bo‘lim faqat restoran xodimlari va administratorlar uchun.</AppText>
    </View>
    <Card>
      {staffRoles.map((item, index) => <View key={item.role}>
        {index > 0 ? <View style={{ height: 1, backgroundColor: colors.line }} /> : null}
        <PressableScale accessibilityLabel={item.title} onPress={() => router.replace(routeForRole(item.role))} style={{ minHeight: 76, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: item.role === "restaurant" ? colors.orangeSoft : colors.greenSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name={item.icon} size={23} color={item.role === "restaurant" ? colors.orange : colors.green} /></View>
          <View style={{ flex: 1, gap: 2 }}><AppText style={{ fontWeight: "800" }}>{item.title}</AppText><AppText variant="caption" color={colors.muted}>{item.subtitle}</AppText></View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </PressableScale>
      </View>)}
    </Card>
    <Card style={{ backgroundColor: "rgba(255,240,233,0.72)" }}><View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}><View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="add-circle-outline" size={26} color={colors.orange} /></View><View style={{ flex: 1, gap: 2 }}><AppText variant="heading">Restoraningiz hali yo‘qmi?</AppText><AppText variant="caption" color={colors.muted}>Ariza yuboring va tasdiqlangandan keyin shaxsiy panelni oling.</AppText></View></View><Button title="Restoran qo‘shish" icon="storefront-outline" variant="secondary" onPress={() => router.push("/restaurant-application" as never)} /></Card>
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.xs }}><Ionicons name="shield-checkmark" size={15} color={colors.muted} /><AppText variant="caption" color={colors.muted}>Kirish huquqi server orqali tekshiriladi</AppText></View>
  </Screen>;
}
