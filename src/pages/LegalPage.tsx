import { Link } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";
import {
  AI_DISCLAIMER,
  COOKIE_POLICY,
  COPYRIGHT_POLICY,
  CREDITS_POLICY,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
} from "@/lib/legal-content";

const LEGAL_DOCS = [
  { id: "privacy", title: "Privacy Policy", body: PRIVACY_POLICY },
  { id: "terms", title: "Termini di Servizio", body: TERMS_OF_SERVICE },
  { id: "cookies", title: "Cookie Policy", body: COOKIE_POLICY },
  { id: "credits", title: "Credits Policy", body: CREDITS_POLICY },
  { id: "ai-disclaimer", title: "Disclaimer AI", body: AI_DISCLAIMER },
  { id: "copyright", title: "Copyright & Content Policy", body: COPYRIGHT_POLICY },
] as const;

export default function LegalPage() {
  return (
    <div className="scriptora-feature-page bg-background text-foreground">
      <header className="shrink-0 border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Legal · v{LEGAL_VERSION}
            </span>
          </div>
        </div>
      </header>

      <main className="scriptora-feature-scroll mx-auto max-w-5xl px-6 py-10 sm:py-14">
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
            Compliance Center
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Documenti legali Scriptora
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Privacy, termini, crediti, cookie, disclaimer AI e policy copyright. Ultimo aggiornamento: {LEGAL_UPDATED}.
          </p>
        </section>

        <nav className="mb-8 flex flex-wrap gap-2">
          {LEGAL_DOCS.map((doc) => (
            <a
              key={doc.id}
              href={`#${doc.id}`}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <FileText className="h-3.5 w-3.5" />
              {doc.title}
            </a>
          ))}
        </nav>

        <div className="space-y-6">
          {LEGAL_DOCS.map((doc) => (
            <section
              key={doc.id}
              id={doc.id}
              className="scroll-mt-6 rounded-lg border border-border bg-card/60 p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-lg font-bold">{doc.title}</h2>
              <div className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {doc.body}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
