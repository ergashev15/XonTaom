import { rest } from "@/api/rest";
import type { Review, SavedAddress } from "@/types";

export async function fetchFavorites(accessToken: string, signal?: AbortSignal) {
  const rows = await rest<{ restaurant_id: string }[]>("favorites?select=restaurant_id", accessToken, { signal });
  return rows.map((row) => row.restaurant_id);
}

export function addFavorite(restaurantId: string, userId: string, accessToken: string) {
  return rest("favorites?on_conflict=profile_id,restaurant_id", accessToken, {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: { profile_id: userId, restaurant_id: restaurantId }
  });
}

export function removeFavorite(restaurantId: string, userId: string, accessToken: string) {
  return rest(`favorites?profile_id=eq.${encodeURIComponent(userId)}&restaurant_id=eq.${encodeURIComponent(restaurantId)}`, accessToken, { method: "DELETE", prefer: "return=minimal" });
}

type AddressRow = { id: string; label: string | null; address: string; house: string | null; landmark: string | null };

const mapAddress = (row: AddressRow): SavedAddress => ({ id: row.id, label: row.label || "Manzil", address: row.address, house: row.house ?? "", landmark: row.landmark ?? "" });

export async function fetchAddresses(accessToken: string, signal?: AbortSignal) {
  // The address saved during registration ("Asosiy") is listed first.
  const rows = await rest<AddressRow[]>("addresses?select=id,label,address,house,landmark&order=label.asc", accessToken, { signal });
  return rows.map(mapAddress).sort((a, b) => Number(b.label === "Asosiy") - Number(a.label === "Asosiy"));
}

export async function createAddress(input: Omit<SavedAddress, "id">, userId: string, accessToken: string) {
  const rows = await rest<AddressRow[]>("addresses?select=id,label,address,house,landmark", accessToken, {
    method: "POST",
    prefer: "return=representation",
    body: { profile_id: userId, label: input.label.trim(), address: input.address.trim(), house: input.house.trim(), landmark: input.landmark.trim() || null }
  });
  return mapAddress(rows[0]);
}

export function deleteAddress(id: string, accessToken: string) {
  return rest(`addresses?id=eq.${encodeURIComponent(id)}`, accessToken, { method: "DELETE", prefer: "return=minimal" });
}

type ReviewRow = { id: string; order_id: string; customer_id: string; restaurant_id: string; customer_name: string; rating: number; comment: string | null; is_visible: boolean; reply: string | null };

// Returns visible reviews plus, for a signed-in user, their own, their
// restaurant's and (for administrators) hidden ones.
export async function fetchReviews(accessToken?: string, signal?: AbortSignal): Promise<Review[]> {
  const rows = await rest<ReviewRow[]>("reviews?select=id,order_id,customer_id,restaurant_id,customer_name,rating,comment,is_visible,reply&order=created_at.desc&limit=300", accessToken, { signal });
  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    restaurantId: row.restaurant_id,
    customerName: row.customer_name,
    rating: row.rating,
    comment: row.comment ?? "",
    visible: row.is_visible,
    reply: row.reply ?? undefined
  }));
}

export function createReview(input: { orderId: string; restaurantId: string; rating: number; comment: string }, userId: string, accessToken: string) {
  return rest("reviews", accessToken, {
    method: "POST",
    prefer: "return=minimal",
    body: { order_id: input.orderId, restaurant_id: input.restaurantId, customer_id: userId, rating: input.rating, comment: input.comment.trim() || null }
  });
}
