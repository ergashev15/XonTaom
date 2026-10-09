import React, { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { AuthSession, authEnvironment, restoreSession, signOutSession } from "@/auth/auth-service";

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
