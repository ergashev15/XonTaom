import { fetch } from "expo/fetch";
import { ensurePublicImage } from "@/api/storage-api";
import type { NewMenuItemInput } from "@/store/app-store";
import type { OrderStatus } from "@/types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function headers(accessToken: string, prefer = "return=minimal") {
  return {
    apikey: SUPABASE_KEY ?? "",
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Prefer: prefer
  };
}

async function request(path: string, accessToken: string, init: RequestInit) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Server sozlanmagan.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers(accessToken), ...(init.headers ?? {}) }
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body && typeof body === "object" ? body as Record<string, unknown> : {};
    throw new Error(String(details.message ?? details.hint ?? "O‘zgarish serverga saqlanmadi."));
  }
  return body;
}

const orderStatus: Record<OrderStatus, string> = {
  "Yangi buyurtma": "new",
  "Restoran tasdig‘i kutilmoqda": "awaiting_confirmation",
  "Qabul qilindi": "accepted",
  "Tayyorlanmoqda": "preparing",
  "Yetkazishga chiqdi": "out_for_delivery",
  "Yetkazildi": "delivered",
  "Rad etildi": "rejected",
  "Bekor qilindi": "cancelled"
};

async function findCategoryId(restaurantId: string, name: string, accessToken: string) {
  // Category names are unique per restaurant regardless of letter case.
  const rows = await request(
    `categories?select=id&restaurant_id=eq.${encodeURIComponent(restaurantId)}&name=ilike.${encodeURIComponent(name.trim().replace(/[%_*\\]/g, "\\$&"))}&limit=1`,
    accessToken,
    { method: "GET" }
  ) as { id: string }[];
  return rows[0]?.id;
}

async function categoryId(restaurantId: string, name: string, accessToken: string) {
  const id = await findCategoryId(restaurantId, name, accessToken);
  if (!id) throw new Error(`“${name}” kategoriyasi serverda topilmadi.`);
  return id;
}

// A dish can be saved under a category typed for the first time.
async function ensureCategoryId(restaurantId: string, name: string, accessToken: string) {
  const existing = await findCategoryId(restaurantId, name, accessToken);
  if (existing) return existing;
  const created = await request("categories?select=id", accessToken, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ restaurant_id: restaurantId, name: name.trim() })
  }) as { id: string }[];
  return created[0].id;
}

export function updateOwnedRestaurantOpen(restaurantId: string, isOpen: boolean, accessToken: string) {
  return request(`restaurants?id=eq.${encodeURIComponent(restaurantId)}`, accessToken, { method: "PATCH", body: JSON.stringify({ is_open: isOpen }) });
}

export function updateOwnedDeliveryZone(restaurantId: string, latitude: number, longitude: number, radiusKm: number, accessToken: string) {
  return request("rpc/update_restaurant_delivery_zone", accessToken, {
    method: "POST",
    body: JSON.stringify({ p_restaurant_id: restaurantId, p_latitude: latitude, p_longitude: longitude, p_radius_km: radiusKm })
  });
}

export function updateOwnedMenuAvailability(itemId: string, available: boolean, accessToken: string) {
  return request(`menu_items?id=eq.${encodeURIComponent(itemId)}`, accessToken, { method: "PATCH", body: JSON.stringify({ is_available: available }) });
}

export function updateRestaurantBlocked(restaurantId: string, isBlocked: boolean, accessToken: string) {
  return request(`restaurants?id=eq.${encodeURIComponent(restaurantId)}`, accessToken, { method: "PATCH", body: JSON.stringify({ is_blocked: isBlocked }) });
}

function menuPayload(restaurantId: string, category: string, categoryIdValue: string, item: NewMenuItemInput) {
  return {
    restaurant_id: restaurantId,
    category_id: categoryIdValue,
    name: item.name.trim(),
    description: item.description.trim(),
    image_url: item.image || null,
    price: item.price,
    is_available: (item.stock ?? 1) > 0,
    stock: item.stock ?? null,
    prep_minutes: item.prepMinutes ?? 25
  };
}

export async function createOwnedMenuItem(restaurantId: string, item: NewMenuItemInput, ownerId: string, accessToken: string) {
  const category = await ensureCategoryId(restaurantId, item.category, accessToken);
  const image = await ensurePublicImage(item.image, ownerId, "menu", accessToken);
  return request("menu_items", accessToken, { method: "POST", body: JSON.stringify(menuPayload(restaurantId, item.category, category, { ...item, image })) });
}

export async function updateOwnedMenuItem(restaurantId: string, itemId: string, item: NewMenuItemInput, ownerId: string, accessToken: string) {
  const category = await ensureCategoryId(restaurantId, item.category, accessToken);
  const image = await ensurePublicImage(item.image, ownerId, "menu", accessToken);
  const { is_available: inStock, ...payload } = menuPayload(restaurantId, item.category, category, { ...item, image });
  // Editing a dish must not put a paused dish back on sale; only running out of stock changes availability.
  return request(`menu_items?id=eq.${encodeURIComponent(itemId)}`, accessToken, { method: "PATCH", body: JSON.stringify(inStock ? payload : { ...payload, is_available: false }) });
}

export function deleteOwnedMenuItem(itemId: string, accessToken: string) {
  return request(`menu_items?id=eq.${encodeURIComponent(itemId)}`, accessToken, { method: "DELETE" });
}

export function updateOwnedOrder(serverId: string, status: OrderStatus, rejectionReason: string | undefined, accessToken: string) {
  // accepted_at and delivered_at are stamped by the database when the status changes.
  const payload = {
    status: orderStatus[status],
    rejection_reason: status === "Rad etildi" ? rejectionReason?.trim() || "Sabab ko‘rsatilmagan" : null
  };
  return request(`orders?id=eq.${encodeURIComponent(serverId)}`, accessToken, { method: "PATCH", body: JSON.stringify(payload) });
}

export function parseHours(value: string) {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)\s*[–-]\s*([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw new Error("Ish vaqtini 09:00–23:00 ko‘rinishida kiriting.");
  return { opens_at: `${match[1]}:${match[2]}:00`, closes_at: `${match[3]}:${match[4]}:00` };
}

export function updateOwnedRestaurantHours(restaurantId: string, value: string, accessToken: string) {
  const range = parseHours(value);
  const rows = Array.from({ length: 7 }, (_, weekday) => ({ restaurant_id: restaurantId, weekday, ...range, is_closed: false }));
  return request("restaurant_hours?on_conflict=restaurant_id,weekday", accessToken, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
}

export function createOwnedCategory(restaurantId: string, name: string, sortOrder: number, accessToken: string) {
  return request("categories", accessToken, { method: "POST", body: JSON.stringify({ restaurant_id: restaurantId, name: name.trim(), sort_order: sortOrder }) });
}

export async function deleteOwnedCategory(restaurantId: string, name: string, accessToken: string) {
  const id = await categoryId(restaurantId, name, accessToken);
  return request(`categories?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "DELETE" });
}
