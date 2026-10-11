import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { createAddress, deleteAddress, fetchAddresses } from "@/api/account-api";
import { catalogApiEnvironment } from "@/api/catalog-api";
import { useAuth } from "@/auth/auth-context";
import { AppText, Button, Card, Chip, EmptyState, Field, Row, Screen } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";
import { SavedAddress } from "@/types";
import { confirmAction } from "@/utils/dialogs";

const labels = ["Uy", "Ish", "Boshqa"];
const MAX_ADDRESSES = 10;

export default function AddressesScreen() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [label, setLabel] = useState(labels[0]);
  const [address, setAddress] = useState("");
  const [house, setHouse] = useState("");
  const [landmark, setLandmark] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) return;
    try {
      setAddresses(await fetchAddresses(accessToken, signal));
      setError("");
    } catch (caught) {
      if (!signal?.aborted) setError(caught instanceof Error ? caught.message : "Manzillar yuklanmadi.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const add = async () => {
    if (!session || saving) return;
    if (address.trim().length < 4 || !house.trim()) { setError("Ko‘cha yoki MFY nomini va uy raqamini kiriting."); return; }
    if (addresses.length >= MAX_ADDRESSES) { setError(`Ko‘pi bilan ${MAX_ADDRESSES} ta manzil saqlash mumkin.`); return; }
    setSaving(true);
    setError("");
    try {
      const created = await createAddress({ label, address, house, landmark }, session.user.id, session.access_token);
      setAddresses((current) => [...current, created]);
      setAddress("");
      setHouse("");
      setLandmark("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Manzil saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (target: SavedAddress) => confirmAction({
    title: "Manzil o‘chirilsinmi?", message: `${target.label}: ${target.address}`, confirmLabel: "O‘chirish", destructive: true,
    onConfirm: () => {
      if (!accessToken) return;
      setAddresses((current) => current.filter((entry) => entry.id !== target.id));
      // Reload on failure so the address reappears instead of silently staying hidden.
      deleteAddress(target.id, accessToken).catch((caught) => { setError(caught instanceof Error ? caught.message : "Manzil o‘chirilmadi."); void load(); });
    }
  });

  if (!catalogApiEnvironment.isConfigured || !session) return <Screen maxWidth={760}><EmptyState icon="location-outline" title="Manzillar mavjud emas" text="Manzillarni saqlash uchun hisobga kiring." /></Screen>;

  return <Screen maxWidth={760}>
    <AppText color={colors.muted}>Saqlangan manzillar buyurtma berishda tanlash uchun chiqadi.</AppText>
    <Card style={{ gap: 0 }}>{addresses.map((entry, index) => <View key={entry.id}>{index ? <View style={{ height: 1, backgroundColor: colors.line }} /> : null}<Row icon="location-outline" title={entry.label} subtitle={`${entry.address}, ${entry.house}-uy${entry.landmark ? ` · ${entry.landmark}` : ""}`} right={<Button title="O‘chirish" size="sm" variant="danger" onPress={() => remove(entry)} />} /></View>)}{!addresses.length ? <AppText color={colors.muted}>{loading ? "Yuklanmoqda…" : "Hali manzil saqlanmagan."}</AppText> : null}</Card>
    <Card><AppText variant="heading">Yangi manzil</AppText><View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>{labels.map((item) => <Chip key={item} label={item} active={label === item} onPress={() => setLabel(item)} />)}</View><Field label="Ko‘cha / MFY" value={address} onChangeText={setAddress} placeholder="Masalan: Mustaqillik ko‘chasi" /><Field label="Uy raqami" value={house} onChangeText={setHouse} placeholder="42" /><Field label="Mo‘ljal" value={landmark} onChangeText={setLandmark} placeholder="Maktab ro‘parasida" />{error ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft }}><AppText selectable color={colors.red}>{error}</AppText></View> : null}<Button title="Manzilni saqlash" icon="add-outline" loading={saving} disabled={saving} onPress={() => void add()} /></Card>
  </Screen>;
}
