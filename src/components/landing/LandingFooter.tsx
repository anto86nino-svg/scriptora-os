import { useState } from "react";
import { Mail, Sparkles, X } from "lucide-react";
import { LEGAL_UPDATED, LEGAL_VERSION, PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/lib/legal-content";
import { useUILanguage } from "@/lib/i18n";
import { landingFooterCopy } from "./landing-v3-data";

type LegalDoc = "privacy" | "terms" | "cookies";

const COOKIE_POLICY = `
SCRIPTORA — Cookie Policy

Ultimo aggiornamento: ${LEGAL_UPDATED}

1. Cosa sono i cookie
I cookie sono piccoli file di testo salvati sul tuo dispositivo quando visiti Scriptora OS.

2. Cookie essenziali
Utilizziamo cookie strettamente necessari per:
- Mantenere la sessione di accesso (autenticazione).
- Memorizzare preferenze di lingua e interfaccia.
- Ricordare il consenso a Privacy e Termini di Servizio.

3. Cookie analitici
In produzione possiamo usare strumenti di analytics aggregati e anonimi per migliorare il prodotto. Non vendiamo dati a terze parti.

4. Gestione
Puoi cancellare i cookie dal browser in qualsiasi momento. Alcune funzioni dell'app potrebbero non essere disponibili senza cookie essenziali.

5. Contatti
Per domande: privacy@scriptora.app
`.trim();

interface LandingFooterProps {
  onLogoClick: () => void;
}

export function LandingFooter({ onLogoClick }: LandingFooterProps) {
  const lang = useUILanguage();
  const copy = landingFooterCopy[lang] ?? landingFooterCopy.en;
  const year = new Date().getFullYear();
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  const legalTitle =
    legalDoc === "privacy"
      ? copy.privacy
      : legalDoc === "terms"
        ? copy.terms
        : legalDoc === "cookies"
          ? copy.cookies
          : "";

  const legalBody =
    legalDoc === "privacy"
      ? PRIVACY_POLICY
      : legalDoc === "terms"
        ? TERMS_OF_SERVICE
        : legalDoc === "cookies"
          ? COOKIE_POLICY
          : "";

  return (
    <>
      <footer className="scriptora-v3-footer">
        <div className="scriptora-v3-footer-inner">
          <div className="scriptora-v3-footer-brand">
            <button type="button" onClick={onLogoClick} className="scriptora-v3-footer-logo" aria-label="Scriptora OS">
              <span className="scriptora-landing-brand-mark">
                <Sparkles className="h-4 w-4" />
              </span>
              <span>
                <strong>Scriptora</strong>
                <span>OS</span>
              </span>
            </button>
            <p className="scriptora-v3-footer-tagline">{copy.tagline}</p>
            <p className="scriptora-v3-footer-cookie-note">{copy.cookieNote}</p>
          </div>

          <div className="scriptora-v3-footer-columns">
            <div>
              <h3>{copy.productTitle}</h3>
              <ul>
                <li><a href="#demo">{copy.demo}</a></li>
                <li><a href="#systems">{copy.systems}</a></li>
                <li><a href="#testimonials">{copy.testimonials}</a></li>
                <li><a href="#pricing">{copy.pricing}</a></li>
              </ul>
            </div>
            <div>
              <h3>{copy.legalTitle}</h3>
              <ul>
                <li>
                  <button type="button" onClick={() => setLegalDoc("privacy")}>{copy.privacy}</button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalDoc("terms")}>{copy.terms}</button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalDoc("cookies")}>{copy.cookies}</button>
                </li>
              </ul>
            </div>
            <div>
              <h3>{copy.companyTitle}</h3>
              <ul>
                <li>
                  <a href="mailto:hello@scriptora.app" className="scriptora-v3-footer-contact">
                    <Mail className="h-3.5 w-3.5" />
                    {copy.contact}
                  </a>
                </li>
                <li>
                  <a href="mailto:privacy@scriptora.app">privacy@scriptora.app</a>
                </li>
                <li>
                  <a href="mailto:support@scriptora.app">support@scriptora.app</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="scriptora-v3-footer-bottom">
          <p>
            © {year} Scriptora. {copy.allRights}
          </p>
          <p className="scriptora-v3-footer-meta">
            Scriptora OS v{LEGAL_VERSION}
            <span aria-hidden="true"> · </span>
            {copy.legalDocs} {LEGAL_UPDATED}
          </p>
        </div>
      </footer>

      {legalDoc && (
        <div className="scriptora-v3-legal-overlay" role="dialog" aria-modal="true" aria-labelledby="scriptora-legal-title">
          <div className="scriptora-v3-legal-panel">
            <div className="scriptora-v3-legal-head">
              <h2 id="scriptora-legal-title">{legalTitle}</h2>
              <button type="button" onClick={() => setLegalDoc(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scriptora-v3-legal-body">{legalBody}</div>
          </div>
        </div>
      )}
    </>
  );
}
