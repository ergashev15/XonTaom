import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppText, Button, Card, Chip, CustomerShell, Field, Screen, useResponsiveLayout } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { colors, money, spacing } from "@/theme";
import { Order } from "@/types";
import { cartUnitPrice } from "@/utils/order-rules";

export default function CheckoutScreen() {
  const { cart, cartRestaurant, placeOrder } = useAppStore();
  const { isDesktop } = useResponsiveLayout();
  const [name, setName] = useState("Dilshod Karimov");
  const [phone, setPhone] = useState("+998 90 123 45 67");
  const [address, setAddress] = useState("");
  const [house, setHouse] = useState("");
  const [landmark, setLandmark] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<Order["payment"]>("Naqd");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + cartUnitPrice(item) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const submit = async () => {
    if (!name.trim() || phone.replace(/\D/g, "").length < 12 || !address.trim() || !house.trim()) { setError("Ism, to‘liq telefon raqami, manzil va uy raqamini kiriting."); return; }
    setPending(true);
    setError("");
    try {
      const result = await placeOrder({ name, phone, address: `${address}, ${house}-uy${landmark ? `. Mo‘ljal: ${landmark}` : ""}`, note, payment });
      if (!result) { setError("Buyurtma yuborilmadi. Restoran holati yoki savatchani tekshiring."); return; }
      router.replace({ pathname: "/orders", params: { created: result.id } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Buyurtma serverga yuborilmadi.");
    } finally { setPending(false); }
  };

  const form = <View style={{ gap: spacing.md }}><Card><AppText variant="heading">Aloqa ma’lumotlari</AppText><Field label="Ismingiz" value={name} onChangeText={setName} /><Field label="Telefon raqami" keyboardType="phone-pad" value={phone} onChangeText={setPhone} /></Card><Card><AppText variant="heading">Yetkazish manzili</AppText><Field label="Ko‘cha / MFY" value={address} onChangeText={setAddress} placeholder="Masalan: Mustaqillik ko‘chasi" /><Field label="Uy raqami" value={house} onChangeText={setHouse} placeholder="42" /><Field label="Mo‘ljal" value={landmark} onChangeText={setLandmark} placeholder="Maktab ro‘parasida" /><Field label="Buyurtma izohi" value={note} onChangeText={setNote} placeholder="Kuryer uchun qo‘shimcha izoh" multiline style={{ minHeight: 86, paddingTop: 14 }} /><Button title="Xaritadan belgilash (demo)" variant="ghost" icon="map-outline" onPress={() => setAddress("Xonobod markazi, Amir Temur ko‘chasi")} /></Card><Card><AppText variant="heading">To‘lov usuli</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}><Chip label="Naqd" active={payment === "Naqd"} onPress={() => setPayment("Naqd")} /><Chip label="Yetkazilganda karta orqali" active={payment === "Yetkazilganda karta orqali"} onPress={() => setPayment("Yetkazilganda karta orqali")} /></View></Card></View>;
  const summary = <View style={{ gap: spacing.md }}><Card><AppText variant="heading">Buyurtma xulosasi</AppText><View style={{ gap: spacing.sm }}><AppText color={colors.muted}>{cartRestaurant?.name}</AppText><AppText color={colors.orange}>Taxminiy yetib kelish: {cartRestaurant?.eta}</AppText>{cart.map((item) => <View key={item.lineId} style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}><AppText style={{ flex: 1 }}>{item.quantity} × {item.name}</AppText><AppText>{money(cartUnitPrice(item) * item.quantity)}</AppText></View>)}<View style={{ height: 1, backgroundColor: colors.line }} /><AppText>Taomlar: {money(subtotal)}</AppText><AppText>Yetkazish: {money(cartRestaurant?.deliveryFee ?? 0)}</AppText><AppText variant="title" color={colors.green}>Jami: {money(subtotal + (cartRestaurant?.deliveryFee ?? 0))}</AppText></View></Card>{error ? <Card style={{ backgroundColor: colors.redSoft }}><AppText selectable color={colors.red}>{error}</AppText></Card> : null}<Button title="Buyurtmani tasdiqlash" size="lg" icon="checkmark-circle-outline" loading={pending} disabled={pending} onPress={submit} /></View>;

  return <CustomerShell active="cart" cartCount={cartCount}><Screen style={{ paddingBottom: isDesktop ? spacing.xxl : 118 }}><View><AppText variant="title">Buyurtmani rasmiylashtirish</AppText><AppText color={colors.muted}>Ma’lumotlarni tekshiring va buyurtmani tasdiqlang.</AppText></View><View style={{ flexDirection: isDesktop ? "row" : "column", alignItems: "flex-start", gap: spacing.lg }}><View style={{ flex: isDesktop ? 1.45 : undefined, width: isDesktop ? undefined : "100%" }}>{form}</View><View style={{ flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : "100%" }}>{summary}</View></View></Screen></CustomerShell>;
}
