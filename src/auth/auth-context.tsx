import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { AuthSession, authEnvironment, refreshSession, restoreSession, signOutSession } from "@/auth/auth-service";

// Refresh this long before the access token expires.
const REFRESH_MARGIN_MS = 60_000;
const REFRESH_RETRY_MS = 30_000;

type AuthContextValue = {
  session: AuthSession | null;
  ready: boolean;
  setSession: (session: AuthSession) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(!authEnvironment.isConfigured);

  useEffect(() => {
    if (!authEnvironment.isConfigured) return;
    let active = true;
    restoreSession().then((next) => { if (active) setSession(next); }).catch(() => { if (active) setSession(null); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  // Access tokens are short-lived. Renew them while the app stays open so
  // orders and panel requests keep working past the first hour.
  useEffect(() => {
    if (!session || authEnvironment.isDevMode || !authEnvironment.isConfigured) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expiresAtMs = (session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in) * 1000;
    const refresh = async () => {
      try {
        const next = await refreshSession(session);
        if (active) setSession(next);
      } catch {
        if (active) timer = setTimeout(() => void refresh(), REFRESH_RETRY_MS);
      }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void refresh(), Math.max(0, expiresAtMs - Date.now() - REFRESH_MARGIN_MS));
    };
    schedule();
    // Timers do not run reliably while the app is in the background.
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") schedule(); });
    return () => { active = false; if (timer) clearTimeout(timer); subscription.remove(); };
  }, [session]);

  const signOut = useCallback(async () => {
    await signOutSession(session);
    setSession(null);
  }, [session]);

  const value = useMemo(() => ({ session, ready, setSession, signOut }), [session, ready, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
