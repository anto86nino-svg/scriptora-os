import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { enableDevMode, isDevMode } from "@/lib/dev-mode";
import { isOwnerEmail } from "@/lib/auth/owner";
import { setAuthSessionContext, clearAuthSessionContext } from "@/lib/auth/sessionContext";
import { performLogout } from "@/lib/auth/logout";
import { migrateLegacyWalletStorage } from "@/lib/billing/walletScope";
import { seedDevWalletIfNeeded } from "@/lib/billing/wallet";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applySessionToContext(
  newSession: Session | null,
  setSession: (s: Session | null) => void,
  setUser: (u: User | null) => void,
) {
  setSession(newSession);
  const nextUser = newSession?.user ?? null;
  setUser(nextUser);

  if (nextUser) {
    setAuthSessionContext({
      id: nextUser.id,
      email: nextUser.email ?? null,
    });
    migrateLegacyWalletStorage(nextUser.id);
    seedDevWalletIfNeeded();
    window.dispatchEvent(new Event("scriptora-credits-change"));
    if (isOwnerEmail(nextUser.email) && !isDevMode()) {
      enableDevMode();
    }
  } else {
    clearAuthSessionContext();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySessionToContext(newSession, setSession, setUser);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      applySessionToContext(existing, setSession, setUser);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    setSession(null);
    setUser(null);
    setLoading(false);
    clearAuthSessionContext();
    await performLogout();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
