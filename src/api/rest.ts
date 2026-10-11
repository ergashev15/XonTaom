import { fetch } from "expo/fetch";

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

type RestOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; prefer?: string; signal?: AbortSignal };

// Minimal PostgREST client. Row level security decides what each token may read or write.
export async function rest<T>(path: string, accessToken?: string, options: RestOptions = {}): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Server sozlanmagan.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method ?? "GET",
    signal: options.signal,
    headers: {
      apikey: SUPABASE_KEY,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const details = body && typeof body === "object" ? body as Record<string, unknown> : {};
    throw new Error(String(details.message ?? details.hint ?? "So‘rov bajarilmadi."));
  }
  return body as T;
}
