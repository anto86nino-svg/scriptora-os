import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck, FileText, Lock, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { enableDevMode, useDevMode } from "@/lib/dev-mode";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, LEGAL_VERSION, LEGAL_UPDATED } from "@/lib/legal-content";
import { hasValidConsent, readConsent, writeConsent, type ConsentRecord } from "@/lib/legal-consent";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ScriptoraLanding } from "@/components/landing/ScriptoraLanding";

type HomeLocationState = {
  legalRequired?: boolean;
  legalReturnTo?: string;
} | null;

/**
 * SCRIPTORA — Premium landing.
 * Flow: utente apre la Home → deve accettare privacy/termini + confermare 16+
 * prima di poter entrare nelle rotte protette di Scriptora OS.
 */
export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const devOn = useDevMode();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const legalState = location.state as HomeLocationState;
  const legalReturnTo = legalState?.legalReturnTo || "/dashboard";

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

  const consentValid = hasValidConsent(consent);
  const canStart = consentValid;

  useEffect(() => {
    if (legalState?.legalRequired && !consentValid) {
      openConsent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalState?.legalRequired, consentValid]);

  const handleLogoClick = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const localDevHost = host === "localhost" || host === "127.0.0.1";
    if (import.meta.env.PROD && !localDevHost) return;
    const next = logoClicks + 1;
    if (next >= 3) {
      setLogoClicks(0);
      enableDevMode();
      toast.success("Developer Mode attivato");
      if (consentValid) {
        navigate("/dashboard");
      } else {
        openConsent();
      }
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
    navigate(legalReturnTo, { replace: !!legalState?.legalRequired });
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
    <>
      <ScriptoraLanding
        mounted={mounted}
        devOn={devOn}
        canStart={canStart}
        isSignedIn={!!user}
        onEnter={handleStart}
        onLogoClick={handleLogoClick}
      />

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
    </>
  );
}
