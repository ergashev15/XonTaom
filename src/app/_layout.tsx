import "@/utils/animation-polyfill";
import { Stack } from "expo-router/stack";
import { router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/auth/auth-context";
import { authEnvironment, roleOf, routeForRole } from "@/auth/auth-service";
import { AppStoreProvider } from "@/store/app-store";
import { colors } from "@/theme";

function AppNavigator() {
  const { session, ready } = useAuth();
  const segments = useSegments();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!ready || !authEnvironment.isRequired) return;
    const first = String(segments[0] ?? "");
    const protectedRoute = ["home", "restaurants", "dishes", "restaurant", "item", "cart", "checkout", "orders", "profile", "restaurant-panel", "admin-panel"].includes(first);
    if (!session && protectedRoute) { router.replace("/"); return; }
    if (!session) return;
    const role = roleOf(session);
    if ((first === "admin-panel" && role !== "admin") || (first === "restaurant-panel" && role !== "restaurant" && role !== "admin")) router.replace(routeForRole(role));
  }, [ready, session, segments]);

  if (!ready) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.green} /></View>;
  return (
    <><StatusBar style="dark" /><Stack screenOptions={{ animation: reducedMotion ? "fade" : "default", headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.green, headerTitleStyle: { color: colors.ink, fontWeight: "800" }, headerBackButtonDisplayMode: "minimal", contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="staff-access" options={{ title: "Xodimlar kirishi", presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.65, 1] }} />
        <Stack.Screen name="restaurant-application" options={{ title: "Restoran qo‘shish" }} />
        <Stack.Screen name="home" options={{ title: "XonTaom", headerShown: false, animation: reducedMotion ? "fade" : "none" }} />
        <Stack.Screen name="restaurants" options={{ title: "Restoranlar", headerShown: false, animation: reducedMotion ? "fade" : "none" }} />
        <Stack.Screen name="dishes" options={{ title: "Taomlar", headerShown: false, animation: reducedMotion ? "fade" : "none" }} />
        <Stack.Screen name="restaurant/[id]" options={{ title: "Restoran", headerShown: false }} />
        <Stack.Screen name="item/[id]" options={{ title: "Taomni tanlash", headerShown: false }} />
        <Stack.Screen name="cart" options={{ title: "Savatcha", headerShown: false, animation: reducedMotion ? "fade" : "none" }} />
        <Stack.Screen name="checkout" options={{ title: "Buyurtmani rasmiylashtirish" }} />
        <Stack.Screen name="orders" options={{ title: "Buyurtmalarim", headerShown: false, animation: reducedMotion ? "fade" : "none" }} />
        <Stack.Screen name="profile" options={{ title: "Profil", headerShown: false, animation: reducedMotion ? "fade" : "none" }} />
        <Stack.Screen name="restaurant-panel" options={{ title: "Restoran paneli" }} />
        <Stack.Screen name="admin-panel" options={{ title: "Administrator paneli" }} />
      </Stack></>
  );
}

export default function RootLayout() {
  return <AuthProvider><AppStoreProvider><AppNavigator /></AppStoreProvider></AuthProvider>;
}
