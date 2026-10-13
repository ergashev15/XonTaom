import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/auth/auth-context";
import { registerCurrentDevice } from "@/notifications/push-service";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

function openNotification(data?: Record<string, unknown>) {
  if (!data) return;
  const route = typeof data.route === "string" ? data.route : undefined;
  if (route === "/restaurant-panel" || route === "/orders") router.push(route);
}

export function PushNotificationBridge() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.access_token) return;
    let active = true;
    registerCurrentDevice(session.access_token)
      .catch((error) => { if (active && __DEV__) console.warn("Push ro‘yxatdan o‘tmadi", error); });
    return () => { active = false; };
  }, [session?.access_token]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotification(response.notification.request.content.data);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response.notification.request.content.data);
    });
    return () => responseSubscription.remove();
  }, []);

  return null;
}
