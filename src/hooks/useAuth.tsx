import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { enableDevMode, exitDevMode, isDevMode, isOwnerEmail } from "@/lib/dev-mode";
import { clearDevPlanOverride } from "@/lib/dev-plan-override";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST (per evitare race condition), poi getSession
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (isOwnerEmail(newSession?.user?.email) && !isDevMode()) {
        enableDevMode();
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
      if (isOwnerEmail(existing?.user?.email) && !isDevMode()) {
        enableDevMode();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clean dev-mode + sandbox traces so the next login starts from a neutral
    // state (Free plan, no simulated tier). The owner's real Premium projects
    // are stored under the real user.id and survive this cleanup.
    try {
      exitDevMode();
      clearDevPlanOverride();
      sessionStorage.removeItem("nexora-active-run");
      sessionStorage.removeItem("nexora-open-project");
      sessionStorage.removeItem("nexora-open-section");
      sessionStorage.removeItem("nexora-new-book");
      localStorage.removeItem("nexora-last-project");
      localStorage.removeItem("nexora_plan_cache_v1");
    } catch { /* noop */ }
    await supabase.auth.signOut();
  };

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