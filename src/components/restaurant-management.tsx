import { useState } from "react";
import { View } from "react-native";
import { catalogApiEnvironment } from "@/api/catalog-api";
import { parseHours } from "@/api/owner-api";
import { AppText, Button, Card, Chip, Field, Row, StatusPill } from "@/components/ui";
import { MapPicker } from "@/components/map-picker";
import { useAppStore } from "@/store/app-store";
import type { StaffRole } from "@/types";
import { colors, spacing } from "@/theme";
import { notify } from "@/utils/dialogs";

const roles: StaffRole[] = ["Egasi", "Administrator", "Operator", "Oshpaz"];

// Campaign discounts are not applied to order prices by the backend, and there is
// no customer inbox for broadcast notices. Both stay in the offline demo only, so
// a restaurant is never shown a control that has no effect for its customers.
const demoOnly = !catalogApiEnvironment.isConfigured;

export function RestaurantManagement({ restaurantId }: { restaurantId: string }) {
  const { restaurants, campaigns, reviews, staff, updateRestaurantHours, updateDeliveryZone, addRestaurantCategory, deleteRestaurantCategory, addCampaign, toggleCampaign, addStaffMember, toggleStaffMember, replyToReview, sendNotification } = useAppStore();
  const restaurant = restaurants.find((entry) => entry.id === restaurantId)!;
  const [hours, setHours] = useState(restaurant.hours);
  const [coordinate, setCoordinate] = useState(restaurant.latitude !== undefined && restaurant.longitude !== undefined ? { latitude: restaurant.latitude, longitude: restaurant.longitude } : undefined);
  const [deliveryRadius, setDeliveryRadius] = useState(String(restaurant.deliveryRadiusKm ?? 5));
  const [savingZone, setSavingZone] = useState(false);
  const [category, setCategory] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignPercent, setCampaignPercent] = useState("10");
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("Operator");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [reviewReplies, setReviewReplies] = useState<Record<string, string>>({});
  const categories = [...new Set([...(restaurant.categories ?? []), ...restaurant.menu.map((item) => item.category)])];
  const ownCampaigns = campaigns.filter((item) => !item.restaurantId || item.restaurantId === restaurantId);
  const ownReviews = reviews.filter((item) => item.restaurantId === restaurantId);
  const ownStaff = staff.filter((item) => item.restaurantId === restaurantId);

  return <View style={{ gap: spacing.md }}>
    <Card><AppText variant="heading">Ish vaqti</AppText><Field label="HAR KUNGI ISH VAQTI" value={hours} onChangeText={setHours} placeholder="09:00–23:00" /><AppText variant="caption" color={colors.muted}>Bu vaqtdan tashqarida mijozlar buyurtma bera olmaydi.</AppText><Button title="Ish vaqtini saqlash" icon="time-outline" onPress={() => { try { parseHours(hours); } catch (caught) { notify("Ish vaqti noto‘g‘ri", caught instanceof Error ? caught.message : "09:00–23:00 ko‘rinishida kiriting."); return; } updateRestaurantHours(restaurantId, hours.trim()); notify("Saqlandi", "Restoran ish vaqti yangilandi."); }} /></Card>

    <Card><AppText variant="heading">Yetkazish hududi</AppText><AppText variant="caption" color={colors.muted}>Restoran joyini belgilang va xizmat radiusini kiriting. Hududdan tashqaridagi buyurtmani server qabul qilmaydi.</AppText><MapPicker value={coordinate} onChange={setCoordinate} radiusKm={Number(deliveryRadius) || undefined} /><Field label="YETKAZISH RADIUSI (KM)" value={deliveryRadius} onChangeText={(value) => setDeliveryRadius(value.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="5" /><Button title="Yetkazish hududini saqlash" icon="map-outline" loading={savingZone} disabled={!coordinate || savingZone} onPress={async () => { if (!coordinate) return; const radius = Number(deliveryRadius); if (!Number.isFinite(radius) || radius < 0.5 || radius > 50) { notify("Radius noto‘g‘ri", "0.5 km dan 50 km gacha kiriting."); return; } setSavingZone(true); try { await updateDeliveryZone(restaurantId, coordinate.latitude, coordinate.longitude, radius); notify("Saqlandi", "Yetkazish hududi yangilandi."); } catch (caught) { notify("Saqlanmadi", caught instanceof Error ? caught.message : "Qayta urinib ko‘ring."); } finally { setSavingZone(false); } }} /></Card>

    <Card><AppText variant="heading">Kategoriyalar</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{categories.map((item) => <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingLeft: spacing.md, padding: spacing.xs, borderRadius: 999, backgroundColor: colors.greenSoft }}><AppText variant="caption" color={colors.green} style={{ fontWeight: "800" }}>{item}</AppText>{restaurant.categories?.includes(item) ? <Button title="×" size="sm" variant="danger" onPress={() => { if (restaurant.menu.some((dish) => dish.category === item)) { notify("Kategoriya bo‘sh emas", "Avval bu kategoriyadagi taomlarni boshqa kategoriyaga o‘tkazing yoki o‘chiring."); return; } deleteRestaurantCategory(restaurantId, item); }} /> : null}</View>)}</View><Field label="YANGI KATEGORIYA" value={category} onChangeText={setCategory} placeholder="Masalan: Desertlar" /><Button title="Kategoriya qo‘shish" icon="add-outline" disabled={category.trim().length < 2} onPress={() => { addRestaurantCategory(restaurantId, category); setCategory(""); }} /></Card>

    {demoOnly ? <Card><AppText variant="heading">Chegirma va aksiyalar</AppText>{ownCampaigns.map((item) => <Row key={item.id} icon="pricetag-outline" title={item.title} subtitle={`${item.discountPercent ?? 0}% chegirma${item.code ? ` · ${item.code}` : ""}`} right={<Button title={item.active ? "Faol" : "O‘chiq"} size="sm" variant={item.active ? "primary" : "danger"} onPress={() => toggleCampaign(item.id)} />} />)}<Field label="AKSIYA NOMI" value={campaignTitle} onChangeText={setCampaignTitle} placeholder="Tushlik uchun chegirma" /><Field label="CHEGIRMA FOIZI" value={campaignPercent} onChangeText={(value) => setCampaignPercent(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="10" /><Button title="Aksiyani yaratish" icon="pricetag-outline" disabled={campaignTitle.trim().length < 3} onPress={() => { addCampaign({ restaurantId, type: "Chegirma", title: campaignTitle.trim(), discountPercent: Math.min(90, Number(campaignPercent) || 0) }); setCampaignTitle(""); }} /></Card> : null}

    <Card><AppText variant="heading">Xodimlar va rollar</AppText><AppText variant="caption" color={colors.muted}>Xodimlar ro‘yxati aloqa uchun yuritiladi. Xodimlarning alohida kirish huquqi hozircha yo‘q.</AppText>{ownStaff.map((member) => <Row key={member.id} icon="person-outline" title={member.name} subtitle={`${member.role} · ${member.phone}`} right={<Button title={member.active ? "Faol" : "O‘chiq"} size="sm" variant={member.active ? "primary" : "danger"} onPress={() => toggleStaffMember(member.id)} />} />)}<Field label="XODIM ISMI" value={staffName} onChangeText={setStaffName} placeholder="Ism familiya" /><Field label="TELEFON" value={staffPhone} onChangeText={setStaffPhone} keyboardType="phone-pad" placeholder="+998 90 000 00 00" /><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{roles.map((role) => <Chip key={role} label={role} active={staffRole === role} onPress={() => setStaffRole(role)} />)}</View><Button title="Xodim qo‘shish" icon="person-add-outline" disabled={staffName.trim().length < 2 || staffPhone.trim().length < 7} onPress={() => { addStaffMember({ restaurantId, name: staffName.trim(), phone: staffPhone.trim(), role: staffRole }); setStaffName(""); setStaffPhone(""); }} /></Card>

    {demoOnly ? <Card><AppText variant="heading">Mijozlarga bildirishnoma</AppText><Field label="SARLAVHA" value={noticeTitle} onChangeText={setNoticeTitle} placeholder="Bugungi maxsus taklif" /><Field label="XABAR" value={noticeBody} onChangeText={setNoticeBody} multiline placeholder="Yangi taomlarimizni sinab ko‘ring" style={{ minHeight: 84, paddingTop: 14, textAlignVertical: "top" }} /><Button title="Bildirishnoma yuborish" icon="notifications-outline" disabled={noticeTitle.trim().length < 3 || noticeBody.trim().length < 5} onPress={() => { sendNotification(noticeTitle.trim(), noticeBody.trim()); setNoticeTitle(""); setNoticeBody(""); notify("Yuborildi", "Bildirishnoma mijozlar lentasiga qo‘shildi."); }} /></Card> : null}

    <Card><AppText variant="heading">Mijoz sharhlari</AppText>{ownReviews.length ? ownReviews.map((review) => <View key={review.id} style={{ gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line }}><View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><View style={{ flex: 1 }}><AppText style={{ fontWeight: "800" }}>{review.customerName} · {"★".repeat(review.rating)}</AppText><AppText color={colors.muted}>{review.comment}</AppText></View><StatusPill open={review.visible} label={review.visible ? "Ko‘rinadi" : "Yashirilgan"} /></View>{review.reply ? <View style={{ padding: spacing.sm, backgroundColor: colors.greenSoft, borderRadius: 12 }}><AppText variant="caption" color={colors.green}>Restoran javobi: {review.reply}</AppText></View> : <><Field label="JAVOB" value={reviewReplies[review.id] ?? ""} onChangeText={(value) => setReviewReplies((current) => ({ ...current, [review.id]: value }))} placeholder="Sharh uchun rahmat!" /><Button title="Javob yuborish" size="sm" disabled={(reviewReplies[review.id] ?? "").trim().length < 2} onPress={() => replyToReview(review.id, reviewReplies[review.id] ?? "")} /></>}</View>) : <AppText color={colors.muted}>Hozircha sharh yo‘q.</AppText>}</Card>
  </View>;
}
