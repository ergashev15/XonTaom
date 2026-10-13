import { Platform } from "react-native";
import { rest } from "@/api/rest";

export function registerPushToken(token: string, deviceName: string | null, accessToken: string) {
  return rest("rpc/register_push_token", accessToken, {
    method: "POST",
    prefer: "return=minimal",
    body: { p_token: token, p_platform: Platform.OS, p_device_name: deviceName }
  });
}

export function unregisterPushToken(token: string, accessToken: string) {
  return rest("rpc/unregister_push_token", accessToken, {
    method: "POST",
    prefer: "return=minimal",
    body: { p_token: token }
  });
}
