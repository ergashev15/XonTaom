import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, View } from "react-native";
import { AppText, Button, Card, Field, PressableScale } from "@/components/ui";
import type { NewMenuItemInput } from "@/store/app-store";
import type { MenuItem } from "@/types";
import { colors, radius, spacing } from "@/theme";

type Props = { initial?: MenuItem; onCancel: () => void; onSubmit: (item: NewMenuItemInput) => void };

function serializeRows(rows: { name: string; price?: number; priceDelta?: number }[] | undefined) {
  return rows?.map((row) => `${row.name}:${row.price ?? row.priceDelta ?? 0}`).join("\n") ?? "";
}

function parseRows(value: string, prefix: string) {
  return value.split("\n").map((row) => row.trim()).filter(Boolean).map((row, index) => {
    const [name, rawPrice = "0"] = row.split(":");
    return { id: `${prefix}-${Date.now()}-${index}`, name: name.trim(), price: Math.max(0, Number(rawPrice.replace(/\D/g, "")) || 0) };
  }).filter((row) => row.name);
}

export function MenuItemForm({ initial, onCancel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [image, setImage] = useState(initial?.image ?? "");
  const [stock, setStock] = useState(String(initial?.stock ?? 30));
  const [prepMinutes, setPrepMinutes] = useState(String(initial?.prepMinutes ?? 25));
  const [discountPercent, setDiscountPercent] = useState(String(initial?.discountPercent ?? 0));
  const [variants, setVariants] = useState(serializeRows(initial?.variants));
  const [extras, setExtras] = useState(serializeRows(initial?.extras));
  const [error, setError] = useState("");
  const [pickingImage, setPickingImage] = useState(false);

  const chooseImage = async () => {
    setPickingImage(true);
    setError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Galereya ruxsati kerak", "Taom rasmini tanlash uchun XonTaom’ga rasmlar galereyasiga kirishga ruxsat bering.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        let selectedUri = result.assets[0].uri;
        if (process.env.EXPO_OS !== "web") {
          const source = new File(selectedUri);
          const extension = source.extension || ".jpg";
          const destination = new File(Paths.document, `menu-${Date.now()}${extension}`);
          await source.copy(destination);
          selectedUri = destination.uri;
        }
        setImage(selectedUri);
        void Haptics.selectionAsync();
      }
    } catch {
      setError("Rasmni ochib bo‘lmadi. Qayta urinib ko‘ring.");
    } finally {
      setPickingImage(false);
    }
  };

  const save = () => {
    const amount = Number(price);
    if (!image) { setError("Taom rasmini tanlang."); return; }
    if (name.trim().length < 2) { setError("Taom nomini kiriting."); return; }
    if (category.trim().length < 2) { setError("Kategoriya nomini kiriting."); return; }
    if (description.trim().length < 5) { setError("Taom haqida qisqacha tavsif kiriting."); return; }
    if (!Number.isFinite(amount) || amount < 1000) { setError("Narxni so‘mda to‘g‘ri kiriting."); return; }
    const parsedVariants = parseRows(variants, "variant").map(({ price: priceDelta, ...row }) => ({ ...row, priceDelta }));
    onSubmit({ name: name.trim(), category: category.trim(), description: description.trim(), price: amount, image, stock: Math.max(0, Number(stock) || 0), prepMinutes: Math.max(1, Number(prepMinutes) || 1), discountPercent: Math.min(90, Math.max(0, Number(discountPercent) || 0)), variants: parsedVariants, extras: parseRows(extras, "extra") });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return <Card style={{ gap: spacing.md }}>
    <View style={{ gap: spacing.xs }}><AppText variant="heading">{initial ? "Taomni tahrirlash" : "Yangi taom"}</AppText><AppText variant="caption" color={colors.muted}>Rasm, narx, qoldiq, variant va qo‘shimchalarni boshqaring.</AppText></View>
    <PressableScale accessibilityLabel={image ? "Taom rasmini almashtirish" : "Taom rasmini tanlash"} disabled={pickingImage} onPress={chooseImage} style={{ height: 210, overflow: "hidden", borderRadius: radius.lg, borderWidth: 1, borderStyle: "dashed", borderColor: colors.green, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" }}>
      {image ? <><Image source={{ uri: image }} contentFit="cover" style={{ width: "100%", height: "100%" }} /><View style={{ position: "absolute", right: spacing.sm, bottom: spacing.sm, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: "rgba(23,33,27,0.82)", flexDirection: "row", alignItems: "center", gap: spacing.xs }}><Ionicons name="images-outline" size={16} color={colors.white} /><AppText variant="caption" color={colors.white}>Almashtirish</AppText></View></> : <View style={{ alignItems: "center", gap: spacing.sm, padding: spacing.lg }}><Ionicons name="image-outline" size={42} color={colors.green} /><AppText color={colors.green} style={{ fontWeight: "800", textAlign: "center" }}>{pickingImage ? "Galereya ochilmoqda…" : "Galereyadan rasm tanlash"}</AppText></View>}
    </PressableScale>
    <Field label="TAOM NOMI" value={name} onChangeText={setName} placeholder="Masalan: Xonobod oshi" />
    <Field label="KATEGORIYA" value={category} onChangeText={setCategory} placeholder="Masalan: Milliy taomlar" />
    <View style={{ flexDirection: "row", gap: spacing.sm }}><View style={{ flex: 1 }}><Field label="NARXI" value={price} onChangeText={(value) => setPrice(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="32000" /></View><View style={{ flex: 1 }}><Field label="QOLDIQ" value={stock} onChangeText={(value) => setStock(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="30" /></View></View>
    <View style={{ flexDirection: "row", gap: spacing.sm }}><View style={{ flex: 1 }}><Field label="TAYYORLASH (DAQ.)" value={prepMinutes} onChangeText={(value) => setPrepMinutes(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="25" /></View><View style={{ flex: 1 }}><Field label="CHEGIRMA (%)" value={discountPercent} onChangeText={(value) => setDiscountPercent(value.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="0" /></View></View>
    <Field label="TAVSIF" value={description} onChangeText={setDescription} multiline placeholder="Masalliqlar va porsiya haqida" style={{ minHeight: 90, paddingTop: 14, textAlignVertical: "top" }} />
    <Field label="VARIANTLAR — NOM:NARX FARQI" value={variants} onChangeText={setVariants} multiline placeholder={"Kichik:0\nKatta:10000"} style={{ minHeight: 90, paddingTop: 14, textAlignVertical: "top" }} />
    <Field label="QO‘SHIMCHALAR — NOM:NARX" value={extras} onChangeText={setExtras} multiline placeholder={"Qazi:12000\nSous:3000"} style={{ minHeight: 90, paddingTop: 14, textAlignVertical: "top" }} />
    {error ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft }}><AppText selectable color={colors.red}>{error}</AppText></View> : null}
    <View style={{ flexDirection: "row", gap: spacing.sm }}><Button title="Bekor qilish" variant="ghost" onPress={onCancel} style={{ flex: 1 }} /><Button title={initial ? "Saqlash" : "Menyuga qo‘shish"} icon="checkmark" onPress={save} style={{ flex: 1 }} /></View>
  </Card>;
}
