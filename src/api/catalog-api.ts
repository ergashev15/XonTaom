import { fetch } from "expo/fetch";
import type { ApprovalStatus, CartItem, MenuItem, Order, OrderStatus, Restaurant } from "@/types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type RestaurantRow = {
  id: string;
  name: string;
  cuisine: string;
  phone: string;
  address: string;
  image_url: string | null;
  is_open: boolean;
  is_blocked: boolean;
  min_order: number;
  delivery_fee: number;
  eta_min: number;
  commission_rate: number;
  approval_status?: ApprovalStatus;
  rejection_reason?: string | null;
};

type CategoryRow = { id: string; restaurant_id: string; name: string; sort_order: number };
type RestaurantHoursRow = { restaurant_id: string; weekday: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };
type RatingRow = { restaurant_id: string; rating: number; reviews: number };
type MenuItemRow = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string | null;
  price: number;
  is_available: boolean;
  stock: number | null;
  prep_minutes: number;
  approval_status?: ApprovalStatus;
  rejection_reason?: string | null;
};

export const catalogApiEnvironment = { isConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY) };

function headers(accessToken?: string) {
  return { apikey: SUPABASE_KEY ?? "", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
}

async function readRows<T>(path: string, signal?: AbortSignal, accessToken?: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(accessToken), signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body && typeof body === "object" ? body as Record<string, unknown> : {};
    throw new Error(String(details.message ?? details.hint ?? "Katalog serverdan olinmadi."));
  }
  return body as T;
}

// Ratings come from a view added in a later migration; the catalog must still
// load if it is missing or temporarily unavailable.
function readRatings(signal?: AbortSignal) {
  return readRows<RatingRow[]>("restaurant_ratings?select=restaurant_id,rating,reviews", signal).catch(() => [] as RatingRow[]);
}

function mapCatalog(restaurants: RestaurantRow[], categories: CategoryRow[], menuItems: MenuItemRow[], hours: RestaurantHoursRow[] = [], ratings: RatingRow[] = []) {
  const ratingByRestaurant = new Map(ratings.map((entry) => [entry.restaurant_id, entry]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const menuByRestaurant = new Map<string, MenuItem[]>();
  for (const row of menuItems) {
    const item: MenuItem = {
      id: row.id,
      category: categoriesById.get(row.category_id)?.name ?? "Boshqa",
      name: row.name,
      description: row.description,
      price: Number(row.price),
      image: row.image_url ?? "",
      available: row.is_available && (row.stock === null || row.stock > 0),
      stock: row.stock ?? undefined,
      prepMinutes: row.prep_minutes,
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason ?? undefined
    };
    menuByRestaurant.set(row.restaurant_id, [...(menuByRestaurant.get(row.restaurant_id) ?? []), item]);
  }

  // restaurant_hours.weekday follows JavaScript's Date#getDay (0 = Sunday).
  const weekday = new Date().getDay();
  return restaurants.map((row) => {
    const today = hours.find((entry) => entry.restaurant_id === row.id && entry.weekday === weekday);
    const openHours = today && !today.is_closed && today.opens_at && today.closes_at ? today : undefined;
    return ({
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    // Restaurants without reviews yet keep the neutral starting score.
    rating: Number(ratingByRestaurant.get(row.id)?.rating ?? 5),
    reviews: ratingByRestaurant.get(row.id)?.reviews ?? 0,
    image: row.image_url ?? "",
    phone: row.phone,
    address: row.address,
    hours: openHours ? `${openHours.opens_at!.slice(0, 5)}–${openHours.closes_at!.slice(0, 5)}` : today?.is_closed ? "Bugun yopiq" : "Ish vaqtini restorandan aniqlang",
    isOpen: row.is_open,
    isBlocked: row.is_blocked,
    approvalStatus: row.approval_status,
    rejectionReason: row.rejection_reason ?? undefined,
    minOrder: Number(row.min_order),
    deliveryFee: Number(row.delivery_fee),
    eta: `${row.eta_min}–${row.eta_min + 15} daqiqa`,
    commission: Number(row.commission_rate),
    categories: categories.filter((category) => category.restaurant_id === row.id).map((category) => category.name),
    menu: menuByRestaurant.get(row.id) ?? []
    });
  });
}

export async function fetchCatalog(signal?: AbortSignal): Promise<Restaurant[]> {
  if (!catalogApiEnvironment.isConfigured) return [];
  const [restaurants, categories, menuItems, hours, ratings] = await Promise.all([
    readRows<RestaurantRow[]>("restaurants?select=id,name,cuisine,phone,address,image_url,is_open,is_blocked,min_order,delivery_fee,eta_min,commission_rate&approval_status=eq.approved&is_blocked=eq.false&order=name.asc", signal),
    readRows<CategoryRow[]>("categories?select=id,restaurant_id,name,sort_order&is_active=eq.true&order=sort_order.asc,name.asc", signal),
    readRows<MenuItemRow[]>("menu_items?select=id,restaurant_id,category_id,name,description,image_url,price,is_available,stock,prep_minutes&approval_status=eq.approved&order=created_at.desc", signal),
    readRows<RestaurantHoursRow[]>("restaurant_hours?select=restaurant_id,weekday,opens_at,closes_at,is_closed&order=weekday.asc", signal),
    readRatings(signal)
  ]);
  return mapCatalog(restaurants, categories, menuItems, hours, ratings);
}

// Administrators also see blocked and unapproved restaurants so they can moderate them.
export async function fetchAdminCatalog(accessToken: string, signal?: AbortSignal): Promise<Restaurant[]> {
  if (!catalogApiEnvironment.isConfigured) return [];
  const [restaurants, categories, menuItems, hours, ratings] = await Promise.all([
    readRows<RestaurantRow[]>("restaurants?select=id,name,cuisine,phone,address,image_url,is_open,is_blocked,min_order,delivery_fee,eta_min,commission_rate,approval_status,rejection_reason&order=name.asc", signal, accessToken),
    readRows<CategoryRow[]>("categories?select=id,restaurant_id,name,sort_order&order=sort_order.asc,name.asc", signal, accessToken),
    readRows<MenuItemRow[]>("menu_items?select=id,restaurant_id,category_id,name,description,image_url,price,is_available,stock,prep_minutes,approval_status,rejection_reason&order=created_at.desc", signal, accessToken),
    readRows<RestaurantHoursRow[]>("restaurant_hours?select=restaurant_id,weekday,opens_at,closes_at,is_closed&order=weekday.asc", signal, accessToken),
    readRatings(signal)
  ]);
  return mapCatalog(restaurants, categories, menuItems, hours, ratings);
}

export async function fetchOwnedRestaurant(restaurantId: string, accessToken: string, signal?: AbortSignal): Promise<Restaurant | null> {
  if (!catalogApiEnvironment.isConfigured) return null;
  const encodedId = encodeURIComponent(restaurantId);
  const [restaurants, categories, menuItems, hours, ratings] = await Promise.all([
    readRows<RestaurantRow[]>(`restaurants?select=id,name,cuisine,phone,address,image_url,is_open,is_blocked,min_order,delivery_fee,eta_min,commission_rate,approval_status,rejection_reason&id=eq.${encodedId}&limit=1`, signal, accessToken),
    readRows<CategoryRow[]>(`categories?select=id,restaurant_id,name,sort_order&restaurant_id=eq.${encodedId}&order=sort_order.asc,name.asc`, signal, accessToken),
    readRows<MenuItemRow[]>(`menu_items?select=id,restaurant_id,category_id,name,description,image_url,price,is_available,stock,prep_minutes,approval_status,rejection_reason&restaurant_id=eq.${encodedId}&order=created_at.desc`, signal, accessToken),
    readRows<RestaurantHoursRow[]>(`restaurant_hours?select=restaurant_id,weekday,opens_at,closes_at,is_closed&restaurant_id=eq.${encodedId}&order=weekday.asc`, signal, accessToken),
    readRatings(signal)
  ]);
  return mapCatalog(restaurants, categories, menuItems, hours, ratings)[0] ?? null;
}

type OrderItemRow = { id: string; menu_item_id: string | null; name_snapshot: string; price_snapshot: number; quantity: number; note: string | null };
type OrderRow = {
  id: string; order_number: number; customer_id: string; restaurant_id: string; status: string; payment_method: string;
  subtotal: number; delivery_fee: number; total: number; address_snapshot: { address?: string } | null;
  customer_snapshot: { name?: string; phone?: string } | null; note: string | null; rejection_reason: string | null;
  accepted_at: string | null; delivered_at: string | null; created_at: string; order_items: OrderItemRow[];
  restaurants: { name: string; phone: string } | null;
};

const orderStatus: Record<string, OrderStatus> = {
  new: "Yangi buyurtma", awaiting_confirmation: "Restoran tasdig‘i kutilmoqda", accepted: "Qabul qilindi",
  preparing: "Tayyorlanmoqda", out_for_delivery: "Yetkazishga chiqdi", delivered: "Yetkazildi",
  rejected: "Rad etildi", cancelled: "Bekor qilindi"
};

type OrderScope = { restaurantId: string } | { customerId: string } | "all";

// Row level security decides which orders are visible; the scope only narrows
// the query to what the current screen needs.
export async function fetchOrders(scope: OrderScope, accessToken: string, signal?: AbortSignal): Promise<Order[]> {
  const filter = scope === "all" ? "" : "restaurantId" in scope
    ? `restaurant_id=eq.${encodeURIComponent(scope.restaurantId)}&`
    : `customer_id=eq.${encodeURIComponent(scope.customerId)}&`;
  const rows = await readRows<OrderRow[]>(`orders?${filter}select=*,order_items(*),restaurants(name,phone)&order=created_at.desc&limit=100`, signal, accessToken);
  return rows.map((row) => {
    const items: CartItem[] = (row.order_items ?? []).map((item) => ({
      id: item.menu_item_id ?? item.id,
      lineId: item.id,
      category: "Buyurtma",
      name: item.name_snapshot,
      description: "",
      price: Number(item.price_snapshot),
      image: "",
      available: true,
      quantity: item.quantity,
      note: item.note ?? undefined,
      selectedExtras: []
    }));
    return {
      id: `XT-${row.order_number}`,
      serverId: row.id,
      customerId: row.customer_id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurants?.name ?? "Restoran",
      courierPhone: row.restaurants?.phone || undefined,
      customerName: row.customer_snapshot?.name ?? "Mijoz",
      phone: row.customer_snapshot?.phone ?? "",
      address: row.address_snapshot?.address ?? "Manzil ko‘rsatilmagan",
      note: row.note ?? undefined,
      items,
      subtotal: Number(row.subtotal),
      deliveryFee: Number(row.delivery_fee),
      total: Number(row.total),
      payment: row.payment_method === "cash" ? "Naqd" : "Yetkazilganda karta orqali",
      status: orderStatus[row.status] ?? "Restoran tasdig‘i kutilmoqda",
      rejectionReason: row.rejection_reason ?? undefined,
      createdAt: row.created_at,
      confirmationDeadline: new Date(new Date(row.created_at).getTime() + 5 * 60_000).toISOString(),
      acceptedAt: row.accepted_at ?? undefined,
      deliveredAt: row.delivered_at ?? undefined
    };
  });
}
