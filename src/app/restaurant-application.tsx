import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { AppText, Button, Card, Chip, Field, PressableScale, Screen, StatusPill } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, radius, spacing } from "@/theme";

type PhotoField = "logo" | "image" | "document";
const cuisines = ["Milliy taomlar", "Osh markazi", "Kafe", "Fast food", "Kabob", "Qandolat"];

export default function RestaurantApplicationScreen() {
  const { restaurantApplications, submitRestaurantApplication } = useAppStore();
  const [ownerName, setOwnerName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("09:00–23:00");
  const [cuisine, setCuisine] = useState("Milliy taomlar");
  const [deliveryFee, setDeliveryFee] = useState("8000");
  const [minOrder, setMinOrder] = useState("30000");
  const [logo, setLogo] = useState("");
  const [image, setImage] = useState("");
  const [documentImage, setDocumentImage] = useState("");
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<string>();
  const [picking, setPicking] = useState<PhotoField>();
  const submitted = restaurantApplications.find((entry) => entry.id === submittedId);

  const pickPhoto = async (field: PhotoField) => {
    setPicking(field);
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("Ruxsat kerak", "Rasm va hujjat nusxasini tanlash uchun galereyaga kirish ruxsatini bering."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: field !== "document", aspect: field === "logo" ? [1, 1] : [4, 3], quality: 0.82 });
      if (result.canceled || !result.assets[0]) return;
      let uri = result.assets[0].uri;
      if (process.env.EXPO_OS !== "web") {
        const source = new File(uri);
        const destination = new File(Paths.document, `restaurant-${field}-${Date.now()}${source.extension || ".jpg"}`);
        await source.copy(destination);
        uri = destination.uri;
      }
      if (field === "logo") setLogo(uri);
      if (field === "image") setImage(uri);
      if (field === "document") setDocumentImage(uri);
    } catch {
      setError("Rasmni saqlab bo‘lmadi. Qayta urinib ko‘ring.");
    } finally {
      setPicking(undefined);
    }
  };

  const submit = () => {
    const delivery = Number(deliveryFee);
    const minimum = Number(minOrder);
    if (ownerName.trim().length < 3) { setError("Restoran egasining ism-familiyasini kiriting."); return; }
    if (restaurantName.trim().length < 3) { setError("Restoran yoki oshxona nomini kiriting."); return; }
    if (phone.replace(/\D/g, "").length < 12) { setError("Telefon raqamini to‘liq kiriting."); return; }
    if (address.trim().length < 8) { setError("Restoran manzilini to‘liq kiriting."); return; }
    if (!logo || !image || !documentImage) { setError("Logotip, restoran rasmi va tasdiqlovchi hujjat rasmini yuklang."); return; }
    if (!delivery || delivery < 0 || !minimum || minimum < 1000) { setError("Yetkazish narxi va minimal buyurtmani to‘g‘ri kiriting."); return; }
    const application = submitRestaurantApplication({ ownerName: ownerName.trim(), restaurantName: restaurantName.trim(), phone: phone.trim(), address: address.trim(), hours: hours.trim(), cuisine, logo, image, documentImage, deliveryFee: delivery, minOrder: minimum });
    setSubmittedId(application.id);
  };

  if (submitted) return <Screen maxWidth={700} style={{ justifyContent: "center", minHeight: "100%" }}>
    <Card style={{ alignItems: "center", gap: spacing.lg, padding: spacing.lg }}>
      <View style={{ width: 86, height: 86, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: submitted.status === "Tasdiqlandi" ? colors.greenSoft : submitted.status === "Rad etildi" ? colors.redSoft : colors.orangeSoft }}><Ionicons name={submitted.status === "Tasdiqlandi" ? "checkmark-circle" : submitted.status === "Rad etildi" ? "close-circle" : "time"} size={44} color={submitted.status === "Tasdiqlandi" ? colors.green : submitted.status === "Rad etildi" ? colors.red : colors.orange} /></View>
      <View style={{ alignItems: "center", gap: spacing.sm }}><StatusPill open={submitted.status === "Tasdiqlandi"} label={submitted.status} /><AppText variant="title" style={{ textAlign: "center" }}>{submitted.restaurantName}</AppText><AppText color={colors.muted} style={{ textAlign: "center" }}>{submitted.status === "Kutilmoqda" ? "Arizangiz administratorga yuborildi. Tekshiruvdan keyin restoran paneli ochiladi." : submitted.status === "Tasdiqlandi" ? "Restoran tasdiqlandi. Endi menyu va xodimlarni boshqarishingiz mumkin." : `Rad etish sababi: ${submitted.rejectionReason}`}</AppText></View>
      {submitted.status === "Tasdiqlandi" && submitted.restaurantId ? <Button title="Restoran panelini ochish" icon="storefront-outline" size="lg" onPress={() => router.replace({ pathname: "/restaurant-panel", params: { restaurantId: submitted.restaurantId } })} style={{ width: "100%" }} /> : null}
      <Button title="Bosh sahifaga qaytish" variant="ghost" onPress={() => router.replace("/")} style={{ width: "100%" }} />
    </Card>
  </Screen>;

  const PhotoPicker = ({ field, title, value, icon }: { field: PhotoField; title: string; value: string; icon: keyof typeof Ionicons.glyphMap }) => <PressableScale accessibilityLabel={title} disabled={Boolean(picking)} onPress={() => pickPhoto(field)} style={{ flex: 1, minWidth: 180, height: 150, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderStyle: "dashed", borderColor: value ? colors.green : colors.orange, backgroundColor: value ? colors.greenSoft : colors.orangeSoft, alignItems: "center", justifyContent: "center" }}>{value ? <><Image source={{ uri: value }} contentFit="cover" style={{ width: "100%", height: "100%" }} /><View style={{ position: "absolute", right: 8, bottom: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: "rgba(23,33,27,0.82)" }}><AppText variant="caption" color={colors.white}>Almashtirish</AppText></View></> : <View style={{ alignItems: "center", gap: spacing.sm, padding: spacing.md }}><Ionicons name={icon} size={32} color={colors.green} /><AppText variant="caption" color={colors.ink} style={{ textAlign: "center", fontWeight: "800" }}>{picking === field ? "Ochilmoqda…" : title}</AppText></View>}</PressableScale>;

  return <Screen maxWidth={820}>
    <View style={{ gap: spacing.xs }}><AppText variant="title">Restoran qo‘shish</AppText><AppText color={colors.muted}>Ma’lumotlarni to‘liq kiriting. Administrator tekshirganidan keyin shaxsiy boshqaruv panelingiz ochiladi.</AppText></View>
    <Card><AppText variant="heading">1. Egasi va restoran ma’lumotlari</AppText><Field label="EGASINING ISM-FAMILIYASI" value={ownerName} onChangeText={setOwnerName} placeholder="Ali Valiyev" /><Field label="RESTORAN YOKI OSHXONA NOMI" value={restaurantName} onChangeText={setRestaurantName} placeholder="Xonobod milliy taomlari" /><Field label="TELEFON RAQAMI" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+998 90 000 00 00" /><Field label="TO‘LIQ MANZIL" value={address} onChangeText={setAddress} placeholder="Xonobod shahri, ko‘cha va uy raqami" /><Field label="ISH VAQTI" value={hours} onChangeText={setHours} placeholder="09:00–23:00" /></Card>
    <Card><AppText variant="heading">2. Oshxona turi</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{cuisines.map((item) => <Chip key={item} label={item} active={cuisine === item} onPress={() => setCuisine(item)} />)}</View></Card>
    <Card><AppText variant="heading">3. Rasmlar va hujjat</AppText><AppText variant="caption" color={colors.muted}>Hujjat sifatida pasport yoki tadbirkorlik guvohnomasining aniq rasmini yuklang.</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}><PhotoPicker field="logo" title="Logotip" value={logo} icon="image-outline" /><PhotoPicker field="image" title="Restoran rasmi" value={image} icon="storefront-outline" /><PhotoPicker field="document" title="Pasport yoki guvohnoma" value={documentImage} icon="document-text-outline" /></View></Card>
    <Card><AppText variant="heading">4. Buyurtma shartlari</AppText><Field label="YETKAZISH NARXI (SO‘M)" value={deliveryFee} onChangeText={(value) => setDeliveryFee(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="8000" /><Field label="MINIMAL BUYURTMA (SO‘M)" value={minOrder} onChangeText={(value) => setMinOrder(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="30000" /><View style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.greenSoft }}><AppText variant="caption" color={colors.green}>Mijozlar uchun: yetkazish {money(Number(deliveryFee) || 0)}, minimal buyurtma {money(Number(minOrder) || 0)}</AppText></View></Card>
    {error ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft }}><AppText selectable color={colors.red}>{error}</AppText></View> : null}
    <Button title="Arizani administratorga yuborish" icon="paper-plane-outline" size="lg" onPress={submit} />
  </Screen>;
}
