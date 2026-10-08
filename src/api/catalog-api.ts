import { fetch } from "expo/fetch";
import type { MenuItem, Restaurant } from "@/types";

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
};

type CategoryRow = { id: string; restaurant_id: string; name: string; sort_order: number };
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
};

export const catalogApiEnvironment = { isConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY) };

function headers() {
  return { apikey: SUPABASE_KEY ?? "" };
}

async function readRows<T>(path: string, signal?: AbortSignal) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(), signal });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body && typeof body === "object" ? body as Record<string, unknown> : {};
    throw new Error(String(details.message ?? details.hint ?? "Katalog serverdan olinmadi."));
  }
  return body as T;
}

export async function fetchCatalog(signal?: AbortSignal): Promise<Restaurant[]> {
  if (!catalogApiEnvironment.isConfigured) return [];
  const [restaurants, categories, menuItems] = await Promise.all([
    readRows<RestaurantRow[]>("restaurants?select=id,name,cuisine,phone,address,image_url,is_open,is_blocked,min_order,delivery_fee,eta_min,commission_rate&approval_status=eq.approved&is_blocked=eq.false&order=name.asc", signal),
    readRows<CategoryRow[]>("categories?select=id,restaurant_id,name,sort_order&is_active=eq.true&order=sort_order.asc,name.asc", signal),
    readRows<MenuItemRow[]>("menu_items?select=id,restaurant_id,category_id,name,description,image_url,price,is_available,stock,prep_minutes&approval_status=eq.approved&order=created_at.desc", signal)
  ]);

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
      prepMinutes: row.prep_minutes
    };
    menuByRestaurant.set(row.restaurant_id, [...(menuByRestaurant.get(row.restaurant_id) ?? []), item]);
  }

  return restaurants.map((row) => ({
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    rating: 5,
    reviews: 0,
    image: row.image_url ?? "",
    phone: row.phone,
    address: row.address,
    hours: "Ish vaqtini restorandan aniqlang",
    isOpen: row.is_open,
    isBlocked: row.is_blocked,
    minOrder: Number(row.min_order),
    deliveryFee: Number(row.delivery_fee),
    eta: `${row.eta_min}–${row.eta_min + 15} daqiqa`,
    commission: Number(row.commission_rate),
    categories: categories.filter((category) => category.restaurant_id === row.id).map((category) => category.name),
    menu: menuByRestaurant.get(row.id) ?? []
  }));
}
