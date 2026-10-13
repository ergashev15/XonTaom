import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { registerPushToken, unregisterPushToken } from "@/api/push-api";

let currentExpoPushToken: string | null = null;

function projectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
}

export async function registerCurrentDevice(accessToken: string) {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Buyurtmalar",
      description: "Yangi buyurtmalar va buyurtma holati yangiliklari",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: "#18B66A",
      sound: "default"
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;
  const easProjectId = projectId();
  if (!easProjectId) {
    if (__DEV__) console.warn("Push token olinmadi: Expo projectId hali sozlanmagan.");
    return null;
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: easProjectId })).data;
  await registerPushToken(token, Device.deviceName ?? null, accessToken);
  currentExpoPushToken = token;
  return token;
}

export async function unregisterCurrentDevice(accessToken: string) {
  if (!currentExpoPushToken) return;
  const token = currentExpoPushToken;
  currentExpoPushToken = null;
  await unregisterPushToken(token, accessToken).catch(() => undefined);
}
