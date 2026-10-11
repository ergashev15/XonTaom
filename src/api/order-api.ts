import { fetch } from "expo/fetch";
import { CartItem, Order } from "@/types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type OrderInput = {
  accessToken: string;
  restaurantId: string;
  payment: Order["payment"];
  name: string;
  phone: string;
  address: string;
  note: string;
  items: CartItem[];
  // Stays the same across retries of one checkout so the server creates a single order.
  requestId: string;
};

type CreatedOrder = { id: string; order_number: number; created_at: string };

export async function createServerOrder(input: OrderInput) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Buyurtma serveri sozlanmagan.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/place_order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({
      p_restaurant_id: input.restaurantId,
      p_payment_method: input.payment === "Naqd" ? "cash" : "card_on_delivery",
      p_address_snapshot: { address: input.address },
      p_customer_snapshot: { name: input.name, phone: input.phone },
      p_note: input.note,
      p_items: input.items.map((item) => ({ menu_item_id: item.id, quantity: item.quantity, note: item.note ?? "" })),
      p_client_request_id: input.requestId
    })
  });
  const body = await response.json().catch(() => null) as CreatedOrder[] | { message?: string; hint?: string } | null;
  if (!response.ok) {
    const failure = body && !Array.isArray(body) ? body : null;
    throw new Error(failure?.message || failure?.hint || "Buyurtma serverga yuborilmadi.");
  }
  const created = Array.isArray(body) ? body[0] : null;
  if (!created) throw new Error("Server buyurtma raqamini qaytarmadi.");
  return created;
}

export async function cancelServerOrder(serverId: string, accessToken: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Buyurtma serveri sozlanmagan.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(serverId)}&select=id`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}`, Prefer: "return=representation" },
    body: JSON.stringify({ status: "cancelled" })
  });
  const body = await response.json().catch(() => null) as { id: string }[] | { message?: string; hint?: string } | null;
  if (!response.ok) {
    const failure = body && !Array.isArray(body) ? body : null;
    throw new Error(failure?.message || failure?.hint || "Buyurtma bekor qilinmadi.");
  }
  // No updated row means the restaurant has already answered the order.
  if (!Array.isArray(body) || !body.length) throw new Error("Restoran buyurtmani qabul qilib bo‘lgan. Bekor qilish uchun restoranga qo‘ng‘iroq qiling.");
}
