import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type UserRole = "customer" | "restaurant" | "admin";

export type AuthUser = {
  id: string;
  phone?: string;
  email?: string;
  app_metadata?: { role?: UserRole; restaurant_id?: string };
  user_metadata?: { full_name?: string; name?: string; user_name?: string; avatar_url?: string };
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: AuthUser;
};

const SESSION_KEY = "xontaom.auth.session.v1";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DEV_AUTH = __DEV__ && process.env.EXPO_PUBLIC_AUTH_DEV_MODE === "true";
const AUTH_REQUIRED = process.env.EXPO_PUBLIC_AUTH_REQUIRED === "true";

export class AuthError extends Error {
  constructor(message: string, public code = "AUTH_ERROR", public status = 0) {
    super(message);
    this.name = "AuthError";
  }
}

function assertConfigured() {
  if (DEV_AUTH) return;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new AuthError("Kirish serveri sozlanmagan. Administratorga murojaat qiling.", "AUTH_NOT_CONFIGURED");
  }
}

function headers(accessToken?: string) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY ?? "",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const raw = String(body.message ?? body.msg ?? body.error_description ?? body.error ?? "So‘rov bajarilmadi.");
    const message = /unsupported phone provider|sms provider|phone provider/i.test(raw)
      ? "Telefon orqali kirish xizmati hali ishga tushirilmagan. Iltimos, administratorga murojaat qiling."
      : response.status === 429
        ? "Juda ko‘p urinish. Bir oz kutib, qayta urinib ko‘ring."
        : /invalid login credentials/i.test(raw)
          ? "Email yoki parol noto‘g‘ri. Qayta tekshirib kiriting."
          : /email not confirmed/i.test(raw)
            ? "Email manzilingiz hali tasdiqlanmagan. Tasdiqlash xatini tekshiring."
            : /user already registered/i.test(raw)
              ? "Bu email bilan hisob mavjud. “Kirish” tugmasidan foydalaning."
              : /invalid.*email|email.*invalid/i.test(raw)
                ? "Email manzil noto‘g‘ri kiritilgan."
                : response.status === 400 && /otp|token/i.test(raw) && /expired|invalid/i.test(raw)
                  ? "Tasdiqlash kodi noto‘g‘ri yoki muddati tugagan."
                  : raw;
    throw new AuthError(message, String(body.error_code ?? "AUTH_REQUEST_FAILED"), response.status);
  }
  return body as T;
}

export function normalizeEmailAddress(value: string) {
  const normalized = value.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  return `${local}@${domain === "gmial.com" ? "gmail.com" : domain}`;
}

export function normalizeUzPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  if (digits.length > 9) digits = digits.slice(-9);
  return digits.length === 9 ? `+998${digits}` : "";
}

export function formatUzPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean);
  return `+998${parts.length ? ` ${parts.join(" ")}` : ""}`;
}

export function roleOf(session: AuthSession): UserRole {
  const role = session.user.app_metadata?.role;
  return role === "admin" || role === "restaurant" ? role : "customer";
}

export function routeForRole(role: UserRole): "/home" | "/restaurant-panel" | "/admin-panel" {
  if (role === "admin") return "/admin-panel";
  if (role === "restaurant") return "/restaurant-panel";
  return "/home";
}

async function writeSession(session: AuthSession | null) {
  if (Platform.OS === "web") {
    if (typeof sessionStorage === "undefined") return;
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function readSession() {
  const raw = Platform.OS === "web"
    ? typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(SESSION_KEY)
    : await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthSession; } catch { await writeSession(null); return null; }
}

export async function requestPhoneOtp(phone: string) {
  assertConfigured();
  if (DEV_AUTH) return { retryAfter: 60, devCode: "123456" };
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ phone, create_user: true, channel: "sms" })
  });
  await parseResponse<Record<string, never>>(response);
  return { retryAfter: 60 };
}

export async function verifyPhoneOtp(phone: string, token: string, requestedRole: UserRole = "customer") {
  assertConfigured();
  if (DEV_AUTH) {
    if (token !== "123456") throw new AuthError("Sinov kodi noto‘g‘ri.", "INVALID_OTP", 400);
    const session: AuthSession = {
      access_token: "dev-access-token",
      refresh_token: "dev-refresh-token",
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      token_type: "bearer",
      user: { id: `dev-${phone}`, phone, app_metadata: { role: requestedRole }, user_metadata: { full_name: "XonTaom foydalanuvchisi" } }
    };
    await writeSession(session);
    return session;
  }
  const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ phone, token, type: "sms" })
  });
  const session = await parseResponse<AuthSession>(response);
  await writeSession(session);
  return session;
}

export async function signInWithEmail(email: string, password: string) {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email: normalizeEmailAddress(email), password })
    });
  } catch {
    throw new AuthError("Internet bilan aloqa yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.", "NETWORK_ERROR");
  }
  const session = await parseResponse<AuthSession>(response);
  await writeSession(session);
  return session;
}

export async function signUpWithEmail(email: string, password: string) {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ email: normalizeEmailAddress(email), password, data: { full_name: "XonTaom foydalanuvchisi" } })
    });
  } catch {
    throw new AuthError("Internet bilan aloqa yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.", "NETWORK_ERROR");
  }
  const result = await parseResponse<Partial<AuthSession> & { user: AuthUser }>(response);
  if (result.access_token && result.refresh_token && result.expires_in && result.token_type) {
    const session = result as AuthSession;
    await writeSession(session);
    return session;
  }
  return null;
}

export async function restoreSession() {
  assertConfigured();
  const stored = await readSession();
  if (!stored) return null;
  if (DEV_AUTH) return stored;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ refresh_token: stored.refresh_token })
  });
  if (!response.ok) { await writeSession(null); return null; }
  const session = await parseResponse<AuthSession>(response);
  await writeSession(session);
  return session;
}

export async function signOutSession(session: AuthSession | null) {
  try {
    if (session && !DEV_AUTH && SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: headers(session.access_token) });
    }
  } finally {
    await writeSession(null);
  }
}

export const authEnvironment = { isConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY), isDevMode: DEV_AUTH, isRequired: AUTH_REQUIRED };
