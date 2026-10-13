import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { distanceKm, isInsideDeliveryZone } from "./geo.ts";

describe("delivery zone rules", () => {
  const restaurant = { latitude: 40.7997, longitude: 72.5587, deliveryRadiusKm: 5 };

  it("accepts a point at the restaurant", () => {
    assert.equal(distanceKm(restaurant, restaurant), 0);
    assert.equal(isInsideDeliveryZone(restaurant, restaurant), true);
  });

  it("rejects a point beyond the configured radius", () => {
    assert.equal(isInsideDeliveryZone(restaurant, { latitude: 40.9, longitude: 72.5587 }), false);
  });
});
