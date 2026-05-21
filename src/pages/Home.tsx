import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles, ShieldCheck, FileText, Lock, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { enableDevMode, isDevMode, useDevMode } from "@/lib/dev-mode";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, LEGAL_VERSION, LEGAL_UPDATED } from "@/lib/legal-content";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const CONSENT_KEY = "nexora_consent_v1";

type ConsentRecord = {
  privacy: boolean;
  terms: boolean;
  age: boolean;
  ts: string;
  version?: string;
};

function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

function writeConsent(rec: ConsentRecord) {
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(rec)); } catch { /* noop */ }
}

/**
 * SCRIPTORA — Premium landing.
 * Flow: utente apre la Home → deve accettare privacy/termini + confermare 16+
 * prima di poter cliccare Start. Dev Mode (3 click sul logo) bypassa
 * il consenso per evitare di re-inserirlo ogni volta in sviluppo.
 */
export default function Home() {
  const navigate = useNavigate();
  const devOn = useDevMode();
  const [mounted, setMounted] = useState(false);
  const { user, loading: authLoading } = useAuth();

  // Utente già loggato → vai dritto alla dashboard, non perde il flusso
  useEffect(() => {
    if (!authLoading && user && !isDevMode()) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Consent state
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readConsent());
  const [consentOpen, setConsentOpen] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [confirmAge, setConfirmAge] = useState(false);
  const [activeTab, setActiveTab] = useState<"privacy" | "terms">("privacy");
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [readTerms, setReadTerms] = useState(false);
  const privacyRef = useRef<HTMLDivElement | null>(null);
  const termsRef = useRef<HTMLDivElement | null>(null);

  // Hidden dev-mode trigger (3 clicks on the logo)
  const [logoClicks, setLogoClicks] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Reset click counter if user pauses tapping
  useEffect(() => {
    if (logoClicks === 0) return;
    const t = setTimeout(() => setLogoClicks(0), 1500);
    return () => clearTimeout(t);
  }, [logoClicks]);

  const consentValid = !!(consent?.privacy && consent?.terms && consent?.age && consent?.version === LEGAL_VERSION);
  const canStart = devOn || isDevMode() || consentValid;

  const handleLogoClick = () => {
    const next = logoClicks + 1;
    if (next >= 3) {
      setLogoClicks(0);
      enableDevMode();
      toast.success("Developer Mode attivato");
      navigate("/dashboard");
    } else {
      setLogoClicks(next);
    }
  };

  const handleStart = () => {
    if (canStart) {
      navigate("/dashboard");
    } else {
      openConsent();
    }
  };

  const openConsent = () => {
    setAgreePrivacy(false);
    setAgreeTerms(false);
    setConfirmAge(false);
    setReadPrivacy(false);
    setReadTerms(false);
    setActiveTab("privacy");
    setConsentOpen(true);
  };

  const submitConsent = () => {
    if (!agreePrivacy || !agreeTerms || !confirmAge) return;
    const rec: ConsentRecord = {
      privacy: true,
      terms: true,
      age: true,
      ts: new Date().toISOString(),
      version: LEGAL_VERSION,
    };
    writeConsent(rec);
    setConsent(rec);
    setConsentOpen(false);
    toast.success("Consenso registrato");
    navigate("/dashboard");
  };

  // Mark a document as "read" when user scrolls to the bottom (within 24px tolerance).
  const handleDocScroll = (which: "privacy" | "terms") => (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const reached = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (!reached) return;
    if (which === "privacy" && !readPrivacy) setReadPrivacy(true);
    if (which === "terms" && !readTerms) setReadTerms(true);
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Animated aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--accent)/0.14),transparent_60%)]" />
        <div className="nexora-aurora absolute -top-1/3 left-1/2 h-[120vh] w-[120vh] -translate-x-1/2 rounded-full bg-[conic-gradient(from_120deg,hsl(var(--primary)/0.25),transparent_40%,hsl(var(--accent)/0.22),transparent_70%,hsl(var(--primary)/0.25))] opacity-60 blur-3xl" />
        <div className="nexora-grid absolute inset-0 opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* Top brand bar */}
      <header
        className={`relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Hidden dev-mode trigger: 3 taps on the logo */}
          <button
            type="button"
            onClick={handleLogoClick}
            aria-label="SCRIPTORA"
            title="SCRIPTORA"
            className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </button>
          <span className="text-sm font-semibold tracking-[0.25em] text-foreground">
            SCRIPTORA
          </span>
          {devOn && (
            <span className="ml-2 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              Dev
            </span>
          )}
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.3em] text-muted-foreground sm:block">
          Build Books That Sell
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-6 text-center">
        <div
          className={`mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground backdrop-blur-md transition-all duration-700 delay-100 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
          AI-native publishing engine
        </div>

        <h1
          className={`nexora-title bg-gradient-to-b from-foreground via-foreground to-foreground/60 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-8xl md:text-9xl transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ letterSpacing: "-0.04em" }}
        >
          SCRIPTORA
        </h1>

        <p
          className={`mt-5 max-w-xl text-base text-muted-foreground sm:text-lg md:text-xl transition-all duration-1000 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          From idea to bestselling book — powered by AI.
        </p>

        <div
          className={`mt-10 flex flex-col items-center gap-3 transition-all duration-1000 delay-300 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <button
            onClick={handleStart}
            className="nexora-cta group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-primary to-accent px-10 text-base font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_15px_60px_-10px_hsl(var(--primary)/0.9)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Start SCRIPTORA"
          >
            <span className="relative z-10">Start</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>

          {!canStart && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80">
              <ShieldCheck className="h-3 w-3" />
              Privacy, Termini ed età richiesti prima di iniziare
            </p>
          )}
          {canStart && !devOn && (
            <p className="text-[11px] text-muted-foreground/60">
              Consenso registrato ✓
            </p>
          )}
        </div>

        <p
          className={`mt-8 text-[11px] uppercase tracking-[0.3em] text-muted-foreground/60 transition-all duration-1000 delay-500 ${
            mounted ? "opacity-100" : "opacity-0"
          }`}
        >
          Premium · Intelligent · AI-native
        </p>
      </section>

      {/* Consent dialog with inline scrollable Privacy + Terms */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Prima di iniziare
            </DialogTitle>
            <DialogDescription>
              Leggi Privacy Policy e Termini di Servizio, poi conferma sotto. Versione {LEGAL_VERSION} · {LEGAL_UPDATED}.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b border-border/60 bg-muted/20">
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === "privacy"
                  ? "text-primary border-b-2 border-primary bg-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Privacy
              {readPrivacy && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === "terms"
                  ? "text-primary border-b-2 border-primary bg-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Termini
              {readTerms && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            </button>
          </div>

          {/* Scrollable legal text */}
          <div className="relative">
            {activeTab === "privacy" && (
              <div
                ref={privacyRef}
                onScroll={handleDocScroll("privacy")}
                className="h-[300px] overflow-y-auto px-6 py-5 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-line"
              >
                {PRIVACY_POLICY}
              </div>
            )}
            {activeTab === "terms" && (
              <div
                ref={termsRef}
                onScroll={handleDocScroll("terms")}
                className="h-[300px] overflow-y-auto px-6 py-5 text-[13px] leading-relaxed text-foreground/90 whitespace-pre-line"
              >
                {TERMS_OF_SERVICE}
              </div>
            )}
            {((activeTab === "privacy" && !readPrivacy) || (activeTab === "terms" && !readTerms)) && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  Scorri fino in fondo per continuare ↓
                </span>
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div className="px-6 py-4 border-t border-border/60 space-y-2.5 text-sm bg-muted/10">
            <label className={`flex items-start gap-3 ${!readPrivacy ? "opacity-50" : ""}`}>
              <Checkbox
                checked={agreePrivacy}
                disabled={!readPrivacy}
                onCheckedChange={(v) => setAgreePrivacy(v === true)}
                className="mt-0.5"
              />
              <span className="leading-snug">
                Ho letto e accetto la <strong>Privacy Policy</strong> (GDPR / CCPA).
              </span>
            </label>

            <label className={`flex items-start gap-3 ${!readTerms ? "opacity-50" : ""}`}>
              <Checkbox
                checked={agreeTerms}
                disabled={!readTerms}
                onCheckedChange={(v) => setAgreeTerms(v === true)}
                className="mt-0.5"
              />
              <span className="leading-snug">
                Accetto i <strong>Termini di Servizio</strong> e l'uso di contenuti generati da AI.
              </span>
            </label>

            <label className="flex items-start gap-3">
              <Checkbox
                checked={confirmAge}
                onCheckedChange={(v) => setConfirmAge(v === true)}
                className="mt-0.5"
              />
              <span className="leading-snug">
                Confermo di avere <strong>almeno 16 anni</strong>.
              </span>
            </label>
          </div>

          {/* Footer CTA */}
          <div className="px-6 py-4 border-t border-border/60 bg-background">
            <button
              onClick={submitConsent}
              disabled={!agreePrivacy || !agreeTerms || !confirmAge}
              className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Conferma e continua
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              Il consenso è memorizzato localmente sul tuo dispositivo.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
