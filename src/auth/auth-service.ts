import { fetch } from "expo/fetch";
import * as AuthSessionBrowser from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

export type UserRole = "customer" | "restaurant" | "admin";

export type AuthUser = {
  id: string;
  phone?: string;
  email?: string;
  app_metadata?: { role?: UserRole; restaurant_id?: string; onboarding_completed?: boolean };
  user_metadata?: { full_name?: string; first_name?: string; last_name?: string; name?: string; user_name?: string; avatar_url?: string };
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
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID;
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
      : /unsupported provider|provider is not enabled/i.test(raw)
        ? "Google orqali kirish serverda hali yoqilmagan. Administrator Google provayderini sozlashi kerak."
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

export function isRegistrationComplete(session: AuthSession) {
  return session.user.app_metadata?.onboarding_completed === true;
}

type ProfileAccessRow = {
  role?: UserRole;
  name?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  onboarding_completed?: boolean;
};
type OwnedRestaurantRow = { id: string };

async function hydrateSessionAccess(session: AuthSession) {
  if (DEV_AUTH || !SUPABASE_URL || !SUPABASE_KEY) return session;
  const accessHeaders = headers(session.access_token);
  const [profileResponse, restaurantResponse] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/profiles?select=role,name,phone,first_name,last_name,onboarding_completed&id=eq.${session.user.id}&limit=1`, { headers: accessHeaders }),
    fetch(`${SUPABASE_URL}/rest/v1/restaurants?select=id&owner_id=eq.${session.user.id}&order=created_at.asc&limit=1`, { headers: accessHeaders })
  ]);
  const profileRows = await parseResponse<ProfileAccessRow[]>(profileResponse);
  const restaurantRows = await parseResponse<OwnedRestaurantRow[]>(restaurantResponse);
  const profile = profileRows[0];
  const profileRole = profile?.role;
  const ownedRestaurantId = restaurantRows[0]?.id;
  const role: UserRole = profileRole === "admin" ? "admin" : ownedRestaurantId ? "restaurant" : "customer";
  const { restaurant_id: _previousRestaurantId, ...appMetadata } = session.user.app_metadata ?? {};
  return {
    ...session,
    user: {
      ...session.user,
      phone: profile?.phone || session.user.phone,
      user_metadata: {
        ...session.user.user_metadata,
        ...(profile?.name ? { full_name: profile.name } : {}),
        ...(profile?.first_name ? { first_name: profile.first_name } : {}),
        ...(profile?.last_name ? { last_name: profile.last_name } : {})
      },
      app_metadata: {
        ...appMetadata,
        role,
        onboarding_completed: profile?.onboarding_completed === true,
        ...(ownedRestaurantId ? { restaurant_id: ownedRestaurantId } : {})
      }
    }
  } satisfies AuthSession;
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
  const session = await hydrateSessionAccess(await parseResponse<AuthSession>(response));
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
  const session = await hydrateSessionAccess(await parseResponse<AuthSession>(response));
  await writeSession(session);
  return session;
}

function oauthCallbackParams(callbackUrl: string) {
  const parsed = new URL(callbackUrl);
  const params = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  fragment.forEach((value, key) => params.set(key, value));
  return params;
}

async function signInWithGoogleBrowser() {
  assertConfigured();
  if (DEV_AUTH) {
    throw new AuthError("Google kirishini haqiqiy server ulanishida sinash mumkin.", "GOOGLE_AUTH_DEV_MODE");
  }

  const redirectUri = Platform.OS === "web"
    ? AuthSessionBrowser.makeRedirectUri({ path: "auth/callback" })
    : AuthSessionBrowser.makeRedirectUri({ scheme: "xontaom", path: "auth/callback", native: "xontaom://auth/callback" });
  const authorizeUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}`;

  try {
    const availability = await fetch(authorizeUrl, { headers: headers(), redirect: "manual" });
    if (availability.status >= 400) await parseResponse<Record<string, never>>(availability);
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("Internet bilan aloqa yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.", "NETWORK_ERROR");
  }

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectUri, {
    toolbarColor: "#056B35",
    controlsColor: "#FFFFFF",
    preferEphemeralSession: false
  });
  if (result.type !== "success") {
    throw new AuthError("Google orqali kirish bekor qilindi.", "OAUTH_CANCELLED");
  }

  const params = oauthCallbackParams(result.url);
  const oauthError = params.get("error_description") ?? params.get("error");
  if (oauthError) throw new AuthError(oauthError, params.get("error_code") ?? "OAUTH_FAILED");

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in") ?? 3600);
  if (!accessToken || !refreshToken) {
    throw new AuthError("Google kirishidan xavfsiz sessiya olinmadi. Qayta urinib ko‘ring.", "OAUTH_SESSION_MISSING");
  }

  let userResponse: Response;
  try {
    userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(accessToken) });
  } catch {
    throw new AuthError("Internet bilan aloqa yo‘q. Ulanishni tekshirib, qayta urinib ko‘ring.", "NETWORK_ERROR");
  }
  const user = await parseResponse<AuthUser>(userResponse);
  const session = await hydrateSessionAccess({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number.isFinite(expiresIn) ? expiresIn : 3600,
    expires_at: Number(params.get("expires_at")) || Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    token_type: params.get("token_type") ?? "bearer",
    user
  });
  await writeSession(session);
  return session;
}

async function signInWithGoogleNative() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new AuthError("Google native kirishi sozlanmagan. Administratorga murojaat qiling.", "GOOGLE_CLIENT_NOT_CONFIGURED");
  }

  const {
    GoogleOneTapSignIn,
    isCancelledResponse,
    isErrorWithCode,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
    statusCodes
  } = await import("react-native-nitro-google-signin");

  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  GoogleOneTapSignIn.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    nonce: hashedNonce,
    autoSelectOnSignIn: false
  });

  try {
    await GoogleOneTapSignIn.checkPlayServices();
    let response = await GoogleOneTapSignIn.signIn();
    if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
    if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (isCancelledResponse(response)) throw new AuthError("Google orqali kirish bekor qilindi.", "OAUTH_CANCELLED");
    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new AuthError("Google akkauntidan xavfsiz token olinmadi. Qayta urinib ko‘ring.", "GOOGLE_TOKEN_MISSING");
    }

    const googleTokens = await GoogleOneTapSignIn.getTokens();
    const tokenResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=id_token`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        provider: "google",
        id_token: response.data.idToken,
        access_token: googleTokens.accessToken,
        nonce
      })
    });
    const session = await hydrateSessionAccess(await parseResponse<AuthSession>(tokenResponse));
    await writeSession(session);
    return session;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new AuthError("Google orqali kirish bekor qilindi.", "OAUTH_CANCELLED");
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new AuthError("Google Play xizmatlari mavjud emas yoki yangilanishi kerak.", "PLAY_SERVICES_NOT_AVAILABLE");
      }
      if (error.code === statusCodes.DEVELOPER_ERROR) {
        throw new AuthError("Google kirish sozlamasi qurilma imzosiga mos emas.", "GOOGLE_OAUTH_CONFIG_ERROR");
      }
    }
    throw new AuthError("Google orqali kirish amalga oshmadi. Internetni tekshirib, qayta urinib ko‘ring.", "GOOGLE_SIGN_IN_FAILED");
  }
}

export async function signInWithGoogle() {
  assertConfigured();
  if (Platform.OS === "web") return signInWithGoogleBrowser();
  if (DEV_AUTH) {
    throw new AuthError("Google kirishini haqiqiy server ulanishida sinash mumkin.", "GOOGLE_AUTH_DEV_MODE");
  }
  return signInWithGoogleNative();
}

export type CustomerRegistrationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  house: string;
  landmark?: string;
};

export async function completeCustomerRegistration(session: AuthSession, input: CustomerRegistrationInput) {
  assertConfigured();
  const verifiedEmail = normalizeEmailAddress(session.user.email ?? "");
  const requestedEmail = normalizeEmailAddress(input.email);
  if (!verifiedEmail || verifiedEmail !== requestedEmail) {
    throw new AuthError("Tanlangan Google akkaunti kiritilgan Gmail manziliga mos kelmadi.", "GOOGLE_EMAIL_MISMATCH");
  }

  const phone = normalizeUzPhone(input.phone);
  if (!phone) throw new AuthError("Telefon raqamini +998 bilan to‘liq kiriting.", "INVALID_PHONE");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_customer_registration`, {
    method: "POST",
    headers: headers(session.access_token),
    body: JSON.stringify({
      p_first_name: input.firstName.trim(),
      p_last_name: input.lastName.trim(),
      p_phone: phone,
      p_city: input.city.trim(),
      p_address: input.address.trim(),
      p_house: input.house.trim(),
      p_landmark: input.landmark?.trim() || null
    })
  });
  await parseResponse<null>(response);

  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`;
  const updatedSession = await hydrateSessionAccess({
    ...session,
    user: {
      ...session.user,
      phone,
      user_metadata: {
        ...session.user.user_metadata,
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        full_name: fullName
      },
      app_metadata: {
        ...session.user.app_metadata,
        onboarding_completed: true
      }
    }
  });
  await writeSession(updatedSession);
  return updatedSession;
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
    const session = await hydrateSessionAccess(result as AuthSession);
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
  const session = await hydrateSessionAccess(await parseResponse<AuthSession>(response));
  await writeSession(session);
  return session;
}

export async function signOutSession(session: AuthSession | null) {
  try {
    if (session && !DEV_AUTH && SUPABASE_URL && SUPABASE_KEY) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: headers(session.access_token) });
    }
  } finally {
    if (Platform.OS !== "web") {
      const { GoogleOneTapSignIn } = await import("react-native-nitro-google-signin");
      await GoogleOneTapSignIn.signOut().catch(() => undefined);
    }
    await writeSession(null);
  }
}

export const authEnvironment = { isConfigured: Boolean(SUPABASE_URL && SUPABASE_KEY), isDevMode: DEV_AUTH, isRequired: AUTH_REQUIRED };
