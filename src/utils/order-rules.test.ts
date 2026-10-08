import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateTotals, canAddFromRestaurant, meetsMinimum } from "./order-rules.ts";

describe("order business rules", () => {
  it("snapshotted item prices and delivery are totaled", () => {
    const result = calculateTotals([{ id: "1", lineId: "1", category: "Osh", name: "Osh", description: "", price: 32000, image: "", available: true, quantity: 2, selectedExtras: [] }], 8000);
    assert.deepEqual(result, { subtotal: 64000, deliveryFee: 8000, total: 72000 });
  });
  it("includes selected extras in every item unit", () => {
    const result = calculateTotals([{ id: "1", lineId: "1:qazi", category: "Osh", name: "Osh", description: "", price: 32000, image: "", available: true, quantity: 2, selectedExtras: [{ id: "qazi", name: "Qazi", price: 12000 }] }], 8000);
    assert.deepEqual(result, { subtotal: 88000, deliveryFee: 8000, total: 96000 });
  });
  it("applies discount and selected portion variant", () => {
    const result = calculateTotals([{ id: "1", lineId: "1:large", category: "Osh", name: "Osh", description: "", price: 40000, discountPercent: 10, image: "", available: true, quantity: 1, selectedVariant: { id: "large", name: "Katta", priceDelta: 10000 }, selectedExtras: [] }], 0);
    assert.deepEqual(result, { subtotal: 46000, deliveryFee: 0, total: 46000 });
  });
  it("prevents mixing restaurants in a non-empty cart", () => {
    assert.equal(canAddFromRestaurant("a", "b", 1), false);
    assert.equal(canAddFromRestaurant("a", "a", 1), true);
  });
  it("enforces restaurant minimum order", () => {
    assert.equal(meetsMinimum(29999, 30000), false);
    assert.equal(meetsMinimum(30000, 30000), true);
  });
});
