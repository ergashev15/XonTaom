import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { AppText, Button, PressableScale } from "@/components/ui";
import { colors, radius, shadow, spacing, useAppTheme } from "@/theme";
import type { Coordinate } from "@/utils/geo";

const XONOBOD: Coordinate = { latitude: 40.7997, longitude: 72.5587 };

type MapMessage =
  | { type: "ready" }
  | { type: "select"; latitude: number; longitude: number };

function createMapHtml(center: Coordinate, isDark: boolean, hasSelectedValue: boolean, radiusKm?: number, zoneCenter?: Coordinate) {
  const zone = radiusKm ? zoneCenter ?? (hasSelectedValue ? center : undefined) : undefined;
  const zoneScript = zone
    ? `let zoneCircle=L.circle([${zone.latitude},${zone.longitude}],{radius:${radiusKm! * 1000},color:'#FF7045',weight:2,fillColor:'#FF7045',fillOpacity:.12,interactive:false}).addTo(map);`
    : "let zoneCircle=null;";
  const circleFollowsPin = Boolean(radiusKm && !zoneCenter);
  const tileFilter = isDark ? "filter:brightness(.72) contrast(1.08) saturate(.72) hue-rotate(178deg) invert(.88);" : "";

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      html,body,#map{height:100%;margin:0;background:${isDark ? "#222644" : "#F7EFE5"}}
      .leaflet-tile-pane{${tileFilter}}
      .leaflet-control-zoom{border:0!important;border-radius:14px!important;overflow:hidden;box-shadow:0 4px 16px rgba(12,14,35,.18)!important}
      .leaflet-control-zoom a{width:42px!important;height:42px!important;line-height:40px!important;border:0!important;color:${isDark ? "#F2F7F4" : "#12162F"}!important;background:${isDark ? "#1A1E3A" : "#FFFDF9"}!important;font-family:system-ui,sans-serif!important;font-weight:700!important}
      .leaflet-control-zoom a:first-child{border-bottom:1px solid ${isDark ? "#303451" : "#EEE4D9"}!important}
      .leaflet-control-attribution{padding:2px 5px!important;border-radius:7px 0 0 0!important;background:${isDark ? "rgba(26,30,58,.82)" : "rgba(255,255,255,.82)"}!important;color:${isDark ? "#AAA8B7" : "#777381"}!important;font:9px/13px system-ui,sans-serif!important}
      .leaflet-control-attribution a{color:#FF7045!important}
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const bridge = payload => window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      const map = L.map('map',{zoomControl:false,attributionControl:true}).setView([${center.latitude},${center.longitude}],16);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);
      L.control.zoom({position:'bottomright'}).addTo(map);
      ${zoneScript}
      let movedByApp = false;
      const updateZone = point => {
        if (!${circleFollowsPin}) return;
        if (zoneCircle) zoneCircle.setLatLng(point);
        else zoneCircle=L.circle(point,{radius:${(radiusKm ?? 0) * 1000},color:'#FF7045',weight:2,fillColor:'#FF7045',fillOpacity:.12,interactive:false}).addTo(map);
      };
      const selectCenter = () => {
        if (movedByApp) { movedByApp = false; return; }
        const point = map.getCenter();
        updateZone(point);
        bridge({type:'select',latitude:point.lat,longitude:point.lng});
      };
      map.on('moveend',selectCenter);
      map.on('click',event => map.panTo(event.latlng));
      window.moveToPoint = (lat,lng,animated) => {
        movedByApp = true;
        updateZone([lat,lng]);
        if (animated) map.flyTo([lat,lng],17,{duration:.55});
        else map.setView([lat,lng],map.getZoom(),{animate:false});
      };
      map.whenReady(() => bridge({type:'ready'}));
    </script>
  </body>
</html>`;
}

export function MapPicker({ value, onChange, radiusKm, zoneCenter }: { value?: Coordinate; onChange: (value: Coordinate) => void; radiusKm?: number; zoneCenter?: Coordinate }) {
  const map = useRef<WebView>(null);
  const lastMapSelection = useRef<Coordinate | undefined>(undefined);
  const initialCenter = useRef(value ?? zoneCenter ?? XONOBOD);
  const hadInitialValue = useRef(Boolean(value));
  const { isDark } = useAppTheme();
  const { height } = useWindowDimensions();
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [locationError, setLocationError] = useState("");
  const mapHeight = height < 700 ? 280 : 320;
  const html = useMemo(
    () => createMapHtml(initialCenter.current, isDark, hadInitialValue.current, radiusKm, zoneCenter),
    [isDark, mapKey, radiusKm, zoneCenter?.latitude, zoneCenter?.longitude]
  );

  useEffect(() => {
    if (mapReady || mapFailed) return;
    const timeout = setTimeout(() => setMapFailed(true), 15000);
    return () => clearTimeout(timeout);
  }, [html, mapFailed, mapReady]);

  useEffect(() => {
    if (!value || !mapReady) return;
    const selected = lastMapSelection.current;
    if (selected && Math.abs(selected.latitude - value.latitude) < 0.000001 && Math.abs(selected.longitude - value.longitude) < 0.000001) return;
    map.current?.injectJavaScript(`moveToPoint(${value.latitude},${value.longitude},false);true;`);
  }, [mapReady, value?.latitude, value?.longitude]);

  const handleMessage = useCallback((raw: string) => {
    try {
      const message = JSON.parse(raw) as MapMessage;
      if (message.type === "ready") {
        setMapReady(true);
        setMapFailed(false);
        return;
      }
      if (message.type === "select" && Number.isFinite(message.latitude) && Number.isFinite(message.longitude)) {
        const point = { latitude: message.latitude, longitude: message.longitude };
        lastMapSelection.current = point;
        setLocationError("");
        onChange(point);
      }
    } catch {
      // Ignore malformed messages coming from the embedded map.
    }
  }, [onChange]);

  const locate = async () => {
    if (locating) return;
    setLocating(true);
    setLocationError("");
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationError("Telefonda joylashuv xizmati o‘chiq. Uni yoqing yoki xaritani qo‘lda suring.");
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Joylashuvga ruxsat berilmadi. Xaritani qo‘lda surib nuqtani tanlang.");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      lastMapSelection.current = point;
      onChange(point);
      map.current?.injectJavaScript(`moveToPoint(${point.latitude},${point.longitude},true);true;`);
    } catch {
      setLocationError("Joriy joylashuv aniqlanmadi. Qayta urinib ko‘ring yoki xaritani qo‘lda suring.");
    } finally {
      setLocating(false);
    }
  };

  const retry = () => {
    setMapReady(false);
    setMapFailed(false);
    setMapKey((current) => current + 1);
  };

  return <View style={{ gap: spacing.sm }}>
    <View style={{ height: mapHeight, overflow: "hidden", borderRadius: radius.lg, borderCurve: "continuous", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surfaceMuted, boxShadow: shadow.card }}>
      {!mapFailed ? <WebView
        key={`${isDark}-${mapKey}`}
        ref={map}
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        androidLayerType="hardware"
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false}
        onLoadStart={() => { lastMapSelection.current = undefined; setMapReady(false); }}
        onMessage={(event) => handleMessage(event.nativeEvent.data)}
        onError={() => { setMapFailed(true); setMapReady(false); }}
        onHttpError={() => { setMapFailed(true); setMapReady(false); }}
        style={{ flex: 1, backgroundColor: colors.surfaceMuted }}
      /> : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md }}>
        <View style={{ width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.redSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="map-outline" size={25} color={colors.red} /></View>
        <AppText style={{ textAlign: "center", fontWeight: "700" }}>Xarita yuklanmadi</AppText>
        <Button title="Qayta urinish" size="sm" variant="secondary" onPress={retry} />
      </View>}

      {!mapReady && !mapFailed ? <View pointerEvents="none" style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted }}><ActivityIndicator color={colors.green} /><AppText variant="caption" color={colors.muted} style={{ paddingTop: spacing.sm }}>Xarita yuklanmoqda…</AppText></View> : null}

      {mapReady ? <>
        <View pointerEvents="none" style={{ position: "absolute", top: spacing.sm, left: spacing.sm, paddingVertical: 7, paddingHorizontal: 11, borderRadius: radius.full, backgroundColor: colors.floatingSurface, flexDirection: "row", alignItems: "center", gap: 6, boxShadow: shadow.subtle }}>
          <Ionicons name="move-outline" size={15} color={colors.green} />
          <AppText variant="caption" style={{ fontSize: 11, fontWeight: "800" }}>Xaritani surib nuqtani tanlang</AppText>
        </View>
        <View pointerEvents="none" style={{ position: "absolute", left: "50%", top: "50%", width: 48, height: 58, marginLeft: -24, marginTop: -50, alignItems: "center" }}>
          <View style={{ width: 44, height: 44, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.green, borderWidth: 4, borderColor: colors.white, boxShadow: "0 7px 14px rgba(18,22,47,0.30)" }}><Ionicons name="location" size={23} color={colors.white} /></View>
          <View style={{ width: 8, height: 8, marginTop: 3, borderRadius: radius.full, backgroundColor: "rgba(18,22,47,0.25)" }} />
        </View>
        <PressableScale accessibilityLabel="Joriy joylashuvimni ko‘rsatish" disabled={locating} onPress={() => void locate()} style={{ position: "absolute", right: 12, top: 52, width: 48, height: 48, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: colors.floatingSurface, boxShadow: shadow.raised }}>
          {locating ? <ActivityIndicator color={colors.green} /> : <Ionicons name="locate" size={23} color={colors.green} />}
        </PressableScale>
      </> : null}
    </View>

    <View style={{ minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, borderCurve: "continuous", backgroundColor: value ? colors.greenSoft : colors.surfaceMuted, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 34, height: 34, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: value ? colors.green : colors.line }}><Ionicons name={value ? "checkmark" : "location-outline"} size={19} color={value ? colors.white : colors.muted} /></View>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText variant="caption" color={value ? colors.green : colors.muted} style={{ fontWeight: "800" }}>{value ? "Yetkazish nuqtasi tanlandi" : "Yetkazish nuqtasini tanlang"}</AppText>
        <AppText selectable variant="caption" color={colors.muted} style={{ fontSize: 11, fontVariant: ["tabular-nums"] }}>{value ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}` : "Xaritani suring yoki joriy joylashuv tugmasini bosing"}</AppText>
      </View>
    </View>
    {locationError ? <View accessibilityLiveRegion="polite" style={{ padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.redSoft, flexDirection: "row", gap: spacing.sm }}><Ionicons name="alert-circle-outline" size={20} color={colors.red} /><AppText selectable variant="caption" color={colors.red} style={{ flex: 1 }}>{locationError}</AppText></View> : null}
  </View>;
}
