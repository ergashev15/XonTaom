import { Alert } from "react-native";

// React Native's Alert does nothing on web, so confirmations and messages fall
// back to the browser's own dialogs there.
const isWeb = process.env.EXPO_OS === "web";

export function notify(title: string, message?: string) {
  if (isWeb) { globalThis.alert?.(message ? `${title}\n\n${message}` : title); return; }
  Alert.alert(title, message);
}

export function confirmAction(options: { title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean; onConfirm: () => void }) {
  const { title, message, confirmLabel, cancelLabel = "Yo‘q", destructive = false, onConfirm } = options;
  if (isWeb) {
    if (globalThis.confirm?.(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [{ text: cancelLabel, style: "cancel" }, { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm }]);
}
