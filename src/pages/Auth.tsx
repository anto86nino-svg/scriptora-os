import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link, type NavigateFunction } from "react-router-dom";
import { Sparkles, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { enableDevMode } from "@/lib/dev-mode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { t, tt, useUILanguage } from "@/lib/i18n";
import {
  AUTH_DEBUG_PREFIX,
  getStorageDebugState,
  logAuthDebug,
  summarizeAuthError,
  summarizeSession,
} from "@/lib/auth-debug";

const CANONICAL_APP_URL = "https://scriptora-os.vercel.app/app";
const CANONICAL_AUTH_URL = "https://scriptora-os.vercel.app/auth";

function getAuthRedirectUrl(): string {
  if (typeof window === "undefined") return CANONICAL_AUTH_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${window.location.origin}/auth`;
  }
  return CANONICAL_AUTH_URL;
}

function getAppRedirectUrl(): string {
  if (typeof window === "undefined") return CANONICAL_APP_URL;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return `${window.location.origin}/app`;
  }
  return CANONICAL_APP_URL;
}

function redirectToApp(navigate: NavigateFunction) {
  const redirectUrl = getAppRedirectUrl();
  if (typeof window !== "undefined" && redirectUrl.startsWith(`${window.location.origin}/`)) {
    const target = new URL(redirectUrl);
    navigate(`${target.pathname}${target.search}${target.hash}`, { replace: true });
    return;
  }
  window.location.replace(redirectUrl);
}

function getAuthCallbackState() {
  if (typeof window === "undefined") return { hasCallback: false, error: "", code: "" };
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = search.get("code") || "";
  const error =
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error") ||
    "";
  const hasCallback =
    !!code ||
    search.has("error") ||
    search.has("error_description") ||
    hash.has("access_token") ||
    hash.has("refresh_token") ||
    hash.has("error") ||
    hash.has("error_description");
  return { hasCallback, error, code };
}

function clearAuthCallbackUrl() {
  if (typeof window === "undefined") return;
  const { hasCallback } = getAuthCallbackState();
  if (!hasCallback) return;
  window.history.replaceState(window.history.state, "", window.location.pathname || "/auth");
}

/**
 * Pagina /auth — Login + Registrazione.
 * Email + password (verifica obbligatoria) e Google OAuth.
 */
export default function AuthPage() {
  useUILanguage();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const redirectingRef = useRef(false);
  const callbackHandledRef = useRef(false);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [authenticating, setAuthenticating] = useState(() => getAuthCallbackState().hasCallback);
  const [logoClicks, setLogoClicks] = useState(0);

  const goToApp = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    clearAuthCallbackUrl();
    redirectToApp(navigate);
  }, [navigate]);

  useEffect(() => {
    const { hasCallback, error, code } = getAuthCallbackState();
    logAuthDebug("Auth mounted", {
      href: typeof window !== "undefined" ? window.location.href : null,
      hasCallback,
      hasCode: !!code,
      hasError: !!error,
      error,
      storage: getStorageDebugState(),
    });

    if (error) {
      console.warn(AUTH_DEBUG_PREFIX, "OAuth callback error", { error });
      toast.error(tt("google_access_incomplete_with_error", { message: error }));
      clearAuthCallbackUrl();
      setAuthenticating(false);
      setBusy(false);
      return;
    }

    if (hasCallback) {
      setAuthenticating(true);
      setBusy(true);
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const finishIfSessionExists = async (allowFallbackToast: boolean) => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      logAuthDebug("getSession result", {
        allowFallbackToast,
        session: summarizeSession(data.session),
        error: summarizeAuthError(sessionError),
      });
      if (cancelled) return;
      if (sessionError) {
        console.error(AUTH_DEBUG_PREFIX, "Session check failed", summarizeAuthError(sessionError));
        toast.error(t("google_access_incomplete"));
        clearAuthCallbackUrl();
        setAuthenticating(false);
        setBusy(false);
        return;
      }
      if (data.session?.user) {
        goToApp();
        return;
      }
      if (hasCallback) {
        timeoutId = window.setTimeout(async () => {
          const { data: lateData, error: lateError } = await supabase.auth.getSession();
          logAuthDebug("late getSession result", {
            session: summarizeSession(lateData.session),
            error: summarizeAuthError(lateError),
          });
          if (cancelled) return;
          if (lateData.session?.user) {
            goToApp();
            return;
          }
          if (lateError) console.error(AUTH_DEBUG_PREFIX, "Late session check failed", summarizeAuthError(lateError));
          clearAuthCallbackUrl();
          setAuthenticating(false);
          setBusy(false);
          if (allowFallbackToast) {
            toast.error(t("google_access_incomplete"));
          }
        }, 12000);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      logAuthDebug("onAuthStateChange", {
        event: _event,
        session: summarizeSession(newSession),
      });
      if (newSession?.user) goToApp();
    });

    const completeOAuthCallback = async () => {
      if (!hasCallback || callbackHandledRef.current) {
        await finishIfSessionExists(false);
        return;
      }

      callbackHandledRef.current = true;

      if (code) {
        logAuthDebug("exchangeCodeForSession start", { hasCode: true });
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        logAuthDebug("exchangeCodeForSession result", {
          session: summarizeSession(exchangeData.session),
          userId: exchangeData.user?.id ?? null,
          userEmail: exchangeData.user?.email ?? null,
          error: summarizeAuthError(exchangeError),
        });
        if (cancelled) return;
        if (exchangeData.session?.user) {
          goToApp();
          return;
        }
        if (exchangeError) {
          console.warn(AUTH_DEBUG_PREFIX, "OAuth code exchange failed", summarizeAuthError(exchangeError));
          clearAuthCallbackUrl();
          setAuthenticating(false);
          setBusy(false);
          toast.error(tt("google_access_incomplete_with_error", { message: exchangeError.message }));
          return;
        }
      }

      await finishIfSessionExists(true);
    };

    completeOAuthCallback();

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [goToApp]);

  // Già autenticato → vai via
  useEffect(() => {
    if (!loading && user) goToApp();
  }, [user, loading, goToApp]);

  useEffect(() => {
    if (logoClicks === 0) return;
    const t = setTimeout(() => setLogoClicks(0), 1500);
    return () => clearTimeout(t);
  }, [logoClicks]);

  const handleLogoClick = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const localDevHost = host === "localhost" || host === "127.0.0.1";
    if (import.meta.env.PROD && !localDevHost) return;
    const next = logoClicks + 1;
    if (next >= 3) {
      setLogoClicks(0);
      enableDevMode();
      toast.success(t("toast_dev_enabled"));
      navigate("/dashboard", { replace: true });
      return;
    }
    setLogoClicks(next);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("invalid")) {
        toast.error(t("email_or_password_wrong"));
      } else if (error.message.toLowerCase().includes("not confirmed")) {
        toast.error(t("confirm_email_first"));
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(t("welcome_back_toast"));
    goToApp();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("password_min_error"));
      return;
    }
    setBusy(true);
    const redirectUrl = getAuthRedirectUrl();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        toast.error(t("email_already_registered"));
        setTab("signin");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(t("account_created_check_email"));
  };

  const handleGoogle = async () => {
    setBusy(true);
    logAuthDebug("signInWithOAuth start", { redirectTo: getAuthRedirectUrl() });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    logAuthDebug("signInWithOAuth result", { error: summarizeAuthError(error) });
    if (error) {
      setBusy(false);
      toast.error(tt("google_access_failed", { message: error.message }));
      return;
    }
    // Il browser farà redirect verso Google e poi tornerà su /auth per completare la sessione.
  };

  if (authenticating) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <h1 className="text-lg font-semibold">{t("auth_in_progress")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("auth_in_progress_desc")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.14),transparent_60%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label="Scriptora"
            title="SCRIPTORA"
            className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-accent outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </button>
          <span className="truncate text-sm font-semibold tracking-[0.2em] sm:tracking-[0.25em]">SCRIPTORA</span>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-md flex-col items-stretch px-6 pb-12 pt-6">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">
          {tab === "signin" ? t("signin_title") : t("signup_title")}
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {tab === "signin"
            ? t("signin_subtitle")
            : t("signup_subtitle")}
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">{t("sign_in")}</TabsTrigger>
            <TabsTrigger value="signup">{t("sign_up")}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">{t("email_label")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email-in" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder={t("email_placeholder")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-in">{t("password_label")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pwd-in" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sign_in")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name-up">{t("optional_name")}</Label>
                <Input id="name-up" type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("name_placeholder")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-up">{t("email_label")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email-up" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder={t("email_placeholder")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-up">{t("password_label")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="pwd-up" type="password" required autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder={t("password_min_placeholder")} />
                </div>
                <p className="text-[11px] text-muted-foreground">{t("password_help")}</p>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("create_free_account")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("or")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" disabled={busy} onClick={handleGoogle} className="w-full">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t("continue_with_google")}
        </Button>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          {t("terms_notice")}
        </p>
      </section>
    </main>
  );
}
