import type { CartItem } from "@/types";

export function calculateTotals(items: CartItem[], deliveryFee: number) {
  const subtotal = items.reduce((sum, item) => sum + cartUnitPrice(item) * item.quantity, 0);
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export function cartUnitPrice(item: CartItem) {
  const discounted = item.discountPercent ? Math.round(item.price * (100 - item.discountPercent) / 100) : item.price;
  return discounted + (item.selectedVariant?.priceDelta ?? 0) + item.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
}

export function canAddFromRestaurant(cartRestaurantId: string | undefined, nextRestaurantId: string, cartSize: number) {
  return cartSize === 0 || !cartRestaurantId || cartRestaurantId === nextRestaurantId;
}

export function meetsMinimum(subtotal: number, minimum: number) {
  return subtotal >= minimum;
}
