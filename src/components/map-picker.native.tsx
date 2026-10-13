import * as Location from "expo-location";
import { useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { AppText, Button } from "@/components/ui";
import { colors, radius, spacing } from "@/theme";
import type { Coordinate } from "@/utils/geo";

const XONOBOD: Coordinate = { latitude: 40.7997, longitude: 72.5587 };

export function MapPicker({ value, onChange, radiusKm }: { value?: Coordinate; onChange: (value: Coordinate) => void; radiusKm?: number }) {
  const map = useRef<WebView>(null);
  const [locating, setLocating] = useState(false);
  const center = value ?? XONOBOD;
  const html = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0} .leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map').setView([${center.latitude},${center.longitude}],15);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);let marker=L.marker([${center.latitude},${center.longitude}]).addTo(map);${radiusKm ? `L.circle([${center.latitude},${center.longitude}],{radius:${radiusKm * 1000},color:'#18B66A',fillOpacity:.08}).addTo(map);` : ""}map.on('click',e=>{marker.setLatLng(e.latlng);window.ReactNativeWebView.postMessage(JSON.stringify({latitude:e.latlng.lat,longitude:e.latlng.lng}))});window.moveToPoint=(lat,lng)=>{marker.setLatLng([lat,lng]);map.setView([lat,lng],16)};</script></body></html>`, [center.latitude, center.longitude, radiusKm]);

  const locate = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return;
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      onChange(point);
      map.current?.injectJavaScript(`moveToPoint(${point.latitude},${point.longitude});true;`);
    } finally { setLocating(false); }
  };

  return <View style={{ gap: spacing.sm }}>
    <View style={{ height: 270, overflow: "hidden", borderRadius: radius.lg, backgroundColor: colors.surfaceMuted }}>
      <WebView ref={map} source={{ html }} originWhitelist={["*"]} javaScriptEnabled onMessage={(event) => { try { onChange(JSON.parse(event.nativeEvent.data) as Coordinate); } catch { /* Ignore malformed map messages. */ } }} />
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}><AppText variant="caption" color={colors.muted} style={{ flex: 1 }}>{value ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}` : "Xaritaga bosib nuqtani belgilang"}</AppText><Button title="Joriy joyim" size="sm" variant="secondary" icon="locate-outline" loading={locating} onPress={() => void locate()} /></View>
  </View>;
}
