import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Sparkles, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { enableDevMode } from "@/lib/dev-mode";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/**
 * Pagina /auth — Login + Registrazione.
 * Email + password (verifica obbligatoria) e Google OAuth.
 */
export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // Già autenticato → vai via
  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, navigate, from]);

  useEffect(() => {
    if (logoClicks === 0) return;
    const t = setTimeout(() => setLogoClicks(0), 1500);
    return () => clearTimeout(t);
  }, [logoClicks]);

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    if (next >= 3) {
      setLogoClicks(0);
      enableDevMode();
      toast.success("Developer Mode attivato");
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
        toast.error("Email o password non corretti");
      } else if (error.message.toLowerCase().includes("not confirmed")) {
        toast.error("Conferma la tua email prima di accedere");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Bentornato!");
    navigate(from, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La password deve avere almeno 8 caratteri");
      return;
    }
    setBusy(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
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
        toast.error("Email già registrata. Prova ad accedere.");
        setTab("signin");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Account creato! Controlla la tua email per confermare.");
  };

  const handleGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setBusy(false);
      toast.error(`Accesso con Google fallito: ${error.message}`);
      return;
    }
    // Il browser farà redirect verso Google e poi tornerà su /dashboard
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.14),transparent_60%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label="Attiva Developer Mode"
            title="SCRIPTORA"
            className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-accent outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </button>
          <span className="text-sm font-semibold tracking-[0.25em]">SCRIPTORA</span>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex max-w-md flex-col items-stretch px-6 pb-12 pt-6">
        <h1 className="mb-2 text-center text-3xl font-bold tracking-tight">
          {tab === "signin" ? "Accedi al tuo account" : "Crea il tuo account"}
        </h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          {tab === "signin"
            ? "Bentornato. Continua a costruire il tuo prossimo bestseller."
            : "Inizia gratis. Nessuna carta richiesta."}
        </p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Accedi</TabsTrigger>
            <TabsTrigger value="signup">Registrati</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email-in" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="tu@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-in">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pwd-in" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
                </div>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accedi"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name-up">Nome (opzionale)</Label>
                <Input id="name-up" type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Come ti chiami?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email-up" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="tu@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd-up">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="pwd-up" type="password" required autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="Minimo 8 caratteri" />
                </div>
                <p className="text-[11px] text-muted-foreground">Min 8 caratteri. Le password compromesse vengono rifiutate.</p>
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crea account gratuito"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">oppure</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button type="button" variant="outline" disabled={busy} onClick={handleGoogle} className="w-full">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continua con Google
        </Button>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          Registrandoti accetti i Termini e la Privacy Policy.
        </p>
      </section>
    </main>
  );
}
