export type Coordinate = { latitude: number; longitude: number };

export function distanceKm(a: Coordinate, b: Coordinate) {
  const radians = (value: number) => value * Math.PI / 180;
  const earthKm = 6371;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isInsideDeliveryZone(restaurant: Coordinate & { deliveryRadiusKm: number }, address: Coordinate) {
  return distanceKm(restaurant, address) <= restaurant.deliveryRadiusKm;
}
