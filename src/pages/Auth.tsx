import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link, type NavigateFunction } from "react-router-dom";
import { Sparkles, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { supabase, frozenOAuthCallback } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { enableDevMode } from "@/lib/dev-mode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { requestAppEntryLoading } from "@/lib/app-entry-loading";
import { hasValidConsent } from "@/lib/legal-consent";
import { t, tt, useUILanguage } from "@/lib/i18n";
import { getUserFriendlyError } from "@/lib/user-friendly-error";

const OAUTH_CALLBACK_HANDLED_KEY = "scriptora:oauth-callback-handled";
const OAUTH_AUTO_RETRY_KEY = "scriptora:oauth-auto-retry";

const AUTH_DEBUG_PREFIX = "[auth-debug]";

function logAuthDebug(label: string, details?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  if (details === undefined) {
    console.log(AUTH_DEBUG_PREFIX, label);
    appendAuthDebugTrace(label);
    return;
  }
  console.log(AUTH_DEBUG_PREFIX, label, details);
  appendAuthDebugTrace(label, details);
}

function appendAuthDebugTrace(label: string, details?: Record<string, unknown>) {
  if (typeof document === "undefined") return;
  try {
    const attr = "data-scriptora-auth-debug";
    const previous = document.documentElement.getAttribute(attr);
    const logs = previous ? JSON.parse(previous) : [];
    logs.push({
      at: new Date().toISOString(),
      href: typeof window !== "undefined" ? window.location.href : null,
      label,
      details: details ?? null,
    });
    document.documentElement.setAttribute(attr, JSON.stringify(logs.slice(-80)));
  } catch {
    // Console output remains the primary temporary diagnostic channel.
  }
}

function summarizeSession(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null | undefined) {
  return {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    expiresAt: session?.expires_at ?? null,
  };
}

function summarizeAuthError(error: { name?: string; message?: string; status?: number; code?: string } | null | undefined) {
  if (!error) return null;
  return {
    name: error.name ?? null,
    message: error.message ?? null,
    status: error.status ?? null,
    code: error.code ?? null,
  };
}

function getStorageDebugState() {
  if (typeof window === "undefined") {
    return { localStorageType: "server", sessionStorageType: "server", localStorageWorks: false, sessionStorageWorks: false };
  }

  const state = {
    localStorageType: typeof window.localStorage,
    sessionStorageType: typeof window.sessionStorage,
    localStorageWorks: false,
    sessionStorageWorks: false,
    authFlow: "pkce",
  };

  try {
    const key = "scriptora-auth-storage-test";
    window.localStorage.setItem(key, "1");
    state.localStorageWorks = window.localStorage.getItem(key) === "1";
    window.localStorage.removeItem(key);
  } catch {
    state.localStorageWorks = false;
  }

  try {
    const key = "scriptora-auth-session-test";
    window.sessionStorage.setItem(key, "1");
    state.sessionStorageWorks = window.sessionStorage.getItem(key) === "1";
    window.sessionStorage.removeItem(key);
  } catch {
    state.sessionStorageWorks = false;
  }

  return state;
}

function getAuthRedirectUrl(): string {
  if (typeof window === "undefined") return "/auth";
  return `${window.location.origin}/auth`;
}

function getDashboardRedirectUrl(): string {
  if (typeof window === "undefined") return "/dashboard";
  return `${window.location.origin}/dashboard`;
}

function redirectToDashboard(navigate: NavigateFunction) {
  const redirectUrl = getDashboardRedirectUrl();
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
  // PKCE flow: only a ?code= query param or an explicit error signal a
  // real OAuth callback. Hash-fragment access_token/refresh_token belong to
  // the implicit flow which we do NOT use — they are stripped by client.ts
  // before Supabase initialises, so we must not treat them as a callback here.
  const hasCallback =
    !!code ||
    search.has("error") ||
    search.has("error_description") ||
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

const OAUTH_COMPLETION_TIMEOUT_MS = 15_000;

const OAUTH_SESSION_EXPIRED_MESSAGE =
  "Sessione Google scaduta o interrotta. Riprova l'accesso da questa stessa finestra.";

function isPkceVerifierMissingError(error: { name?: string; message?: string }) {
  return (
    error.name === "AuthPKCECodeVerifierMissingError" ||
    (error.message?.includes("PKCE code verifier not found") ?? false)
  );
}

export function shouldRetryOAuthCallbackInFreshFlow(input: {
  hasCode: boolean;
  hasSession: boolean;
  recoverable: boolean;
  alreadyRetried: boolean;
}) {
  return input.hasCode && !input.hasSession && input.recoverable && !input.alreadyRetried;
}

/** Single owner of exchangeCodeForSession for PKCE OAuth callbacks. */
async function tryEstablishSessionFromOAuthCallback(code: string) {
  const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (!exchangeError) {
    return { session: exchanged.session ?? null, recoverable: false };
  }

  if (isPkceVerifierMissingError(exchangeError)) {
    const { data: retryData } = await supabase.auth.getSession();
    return {
      session: retryData.session?.user ? retryData.session : null,
      recoverable: true,
    };
  }

  throw exchangeError;
}

/**
 * Pagina /auth — Login + Registrazione.
 * Email + password (verifica obbligatoria) e Google OAuth.
 */
export default function AuthPage() {
  useUILanguage();
  useEffect(() => {
    document.title = "Scriptora OS — Accedi";
  }, []);
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const redirectingRef = useRef(false);
  const callbackHandledRef = useRef(false);
  const oauthCallbackRef = useRef(frozenOAuthCallback);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [authenticating, setAuthenticating] = useState(() => oauthCallbackRef.current.hasCallback);
  const [logoClicks, setLogoClicks] = useState(0);

  const releaseOAuthLoading = useCallback(() => {
    setAuthenticating(false);
    setBusy(false);
  }, []);

  const goToDashboard = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    clearAuthCallbackUrl();
    releaseOAuthLoading();
    try {
      sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
      sessionStorage.removeItem(OAUTH_AUTO_RETRY_KEY);
    } catch {
      /* private mode */
    }
    if (!hasValidConsent()) {
      navigate("/?legalRequired=true", {
        replace: true,
        state: { legalReturnTo: "/dashboard", fromAuth: true },
      });
      return;
    }
    requestAppEntryLoading();
    redirectToDashboard(navigate);
  }, [navigate, releaseOAuthLoading]);

  useEffect(() => {
    const { hasCallback, error, code } = oauthCallbackRef.current;
    const liveCallback = getAuthCallbackState();
    logAuthDebug("Auth mounted", {
      href: typeof window !== "undefined" ? window.location.href : null,
      frozenHasCallback: hasCallback,
      liveHasCallback: liveCallback.hasCallback,
      hasCode: !!code,
      hasError: !!error,
      error,
      storage: getStorageDebugState(),
    });

    if (error) {
      console.warn(AUTH_DEBUG_PREFIX, "OAuth callback error", { error });
      toast.error(tt("google_access_incomplete_with_error", { message: error }));
      clearAuthCallbackUrl();
      releaseOAuthLoading();
      return;
    }

    if (hasCallback) {
      setAuthenticating(true);
      setBusy(true);
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const failOAuth = (message?: string) => {
      if (cancelled) return;
      if (timeoutId) window.clearTimeout(timeoutId);
      clearAuthCallbackUrl();
      releaseOAuthLoading();
      try {
        sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
        sessionStorage.removeItem(OAUTH_AUTO_RETRY_KEY);
      } catch {
        /* private mode */
      }
      if (message) {
        toast.error(tt("google_access_incomplete_with_error", { message }));
      } else {
        toast.error(t("google_access_incomplete"));
      }
    };

    const finishWithSession = () => {
      if (cancelled) return;
      if (timeoutId) window.clearTimeout(timeoutId);
      goToDashboard();
    };

    const scheduleOAuthTimeout = () => {
      if (!hasCallback || timeoutId) return;
      timeoutId = window.setTimeout(async () => {
        const { data: lateData, error: lateError } = await supabase.auth.getSession();
        logAuthDebug("oauth completion timeout", {
          session: summarizeSession(lateData.session),
          error: summarizeAuthError(lateError),
        });
        if (cancelled) return;
        if (lateData.session?.user) {
          finishWithSession();
          return;
        }
        if (lateError) console.error(AUTH_DEBUG_PREFIX, "Late session check failed", summarizeAuthError(lateError));
        failOAuth();
      }, OAUTH_COMPLETION_TIMEOUT_MS);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      logAuthDebug("onAuthStateChange", {
        event: _event,
        session: summarizeSession(newSession),
      });
      if (newSession?.user) finishWithSession();
    });

    const completeOAuthCallback = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      logAuthDebug("getSession result", {
        session: summarizeSession(data.session),
        error: summarizeAuthError(sessionError),
      });
      if (cancelled) return;
      if (sessionError) {
        console.error(AUTH_DEBUG_PREFIX, "Session check failed", summarizeAuthError(sessionError));
        failOAuth();
        return;
      }
      if (data.session?.user) {
        finishWithSession();
        return;
      }

      if (!hasCallback) {
        releaseOAuthLoading();
        return;
      }

      const callbackFingerprint = code || error || "oauth-callback";
      try {
        if (sessionStorage.getItem(OAUTH_CALLBACK_HANDLED_KEY) === callbackFingerprint) {
          scheduleOAuthTimeout();
          return;
        }
        sessionStorage.setItem(OAUTH_CALLBACK_HANDLED_KEY, callbackFingerprint);
      } catch {
        /* private mode */
      }

      if (callbackHandledRef.current) {
        scheduleOAuthTimeout();
        return;
      }
      callbackHandledRef.current = true;

      logAuthDebug("OAuth callback resolving session", { hasCode: !!code });

      if (code) {
        try {
          const result = await tryEstablishSessionFromOAuthCallback(code);
          logAuthDebug("OAuth session established", { session: summarizeSession(result.session), recoverable: result.recoverable });
          if (cancelled) return;
          if (result.session?.user) {
            finishWithSession();
            return;
          }
          const alreadyRetried = (() => {
            try {
              return sessionStorage.getItem(OAUTH_AUTO_RETRY_KEY) === "1";
            } catch {
              return true;
            }
          })();
          if (shouldRetryOAuthCallbackInFreshFlow({
            hasCode: !!code,
            hasSession: false,
            recoverable: result.recoverable,
            alreadyRetried,
          })) {
            try {
              sessionStorage.setItem(OAUTH_AUTO_RETRY_KEY, "1");
              sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
            } catch {
              /* private mode */
            }
            logAuthDebug("OAuth callback recoverable — restarting Google flow once");
            clearAuthCallbackUrl();
            const { error: retryError } = await supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: getAuthRedirectUrl() },
            });
            if (retryError) throw retryError;
            return;
          }
          toast.error(OAUTH_SESSION_EXPIRED_MESSAGE);
          clearAuthCallbackUrl();
          releaseOAuthLoading();
          try {
            sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
          } catch {
            /* private mode */
          }
          return;
        } catch (callbackError) {
          if (cancelled) return;
          console.error(AUTH_DEBUG_PREFIX, "OAuth callback failed", callbackError);
          failOAuth(getUserFriendlyError(callbackError, {
            fallback: t("google_access_incomplete"),
          }));
          return;
        }
      }

      scheduleOAuthTimeout();
    };

    completeOAuthCallback().catch((callbackError) => {
      if (cancelled) return;
      console.error(AUTH_DEBUG_PREFIX, "OAuth callback failed", callbackError);
      failOAuth(getUserFriendlyError(callbackError, {
        fallback: t("google_access_incomplete"),
      }));
    });

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [goToDashboard, releaseOAuthLoading]);

  // Già autenticato → vai via
  useEffect(() => {
    if (!loading && user) {
      releaseOAuthLoading();
      goToDashboard();
    }
  }, [user, loading, goToDashboard, releaseOAuthLoading]);

  useEffect(() => {
    if (logoClicks === 0) return;
    const t = setTimeout(() => setLogoClicks(0), 1500);
    return () => clearTimeout(t);
  }, [logoClicks]);

  const handleLogoClick = () => {
    if (!import.meta.env.DEV) return;
    const next = logoClicks + 1;
    if (next >= 3) {
      setLogoClicks(0);
      enableDevMode();
      toast.success(t("toast_dev_enabled"));
      requestAppEntryLoading();
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
        toast.error(getUserFriendlyError(error, {
          fallback: "Accesso non riuscito. Controlla i dati e riprova.",
        }));
      }
      return;
    }
    toast.success(t("welcome_back_toast"));
    goToDashboard();
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
        toast.error(getUserFriendlyError(error, {
          fallback: "Registrazione non completata. Controlla i dati e riprova.",
        }));
      }
      return;
    }
    toast.success(t("account_created_check_email"));
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      sessionStorage.removeItem(OAUTH_CALLBACK_HANDLED_KEY);
      sessionStorage.removeItem(OAUTH_AUTO_RETRY_KEY);
    } catch {
      /* private mode */
    }
    logAuthDebug("signInWithOAuth start", { redirectTo: getAuthRedirectUrl() });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl(),
      },
    });
    logAuthDebug("signInWithOAuth result", { error: summarizeAuthError(error) });
    if (error) {
      setBusy(false);
      toast.error(tt("google_access_failed", {
        message: getUserFriendlyError(error, {
          fallback: "Accesso Google non completato. Riprova tra poco.",
        }),
      }));
      return;
    }
    // Il browser farà redirect verso Google e poi tornerà su /auth per completare la sessione.
  };

  if (authenticating) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background px-6 pb-safe pt-safe text-foreground">
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
    <main className="scriptora-page-scroll scriptora-brand-shell relative min-h-[100dvh] w-full overflow-x-hidden bg-[#050505] text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.14),transparent_60%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label={t("activate_dev_mode")}
            title="SCRIPTORA"
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-[#f2c400] shadow-[0_0_28px_rgba(242,196,0,0.30)] outline-none ring-1 ring-[#f2c400]/30 transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#f2c400]/60"
          >
            <img
              src="/brand/scriptora-logo.png"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          </button>
          <span className="text-sm font-black tracking-[0.25em] text-[#f2c400]">SCRIPTORA</span>
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
