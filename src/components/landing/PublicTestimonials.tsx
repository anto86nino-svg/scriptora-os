import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { UILanguage } from "@/lib/i18n";

export type PublicTestimonial = {
  id: string;
  initials: string;
  tone: "cyan" | "violet" | "amber";
  name: string;
  role: string;
  quote: string;
  metric: string;
  /** Must be true for demo cards shown in UI */
  isPlaceholder?: boolean;
};

/** Real testimonials only — leave empty until authorized quotes are provided. */
export const AUTHOR_TESTIMONIALS: PublicTestimonial[] = [];

const DEMO_PROMISES: Record<UILanguage, { title: string; items: string[] }> = {
  it: {
    title: "Cosa promette Scriptora agli autori",
    items: [
      "Un filo narrativo che non si disperde tra strumenti",
      "Diagnosi editoriale prima di pubblicare",
      "Packaging KDP, titolo e radar nello stesso progetto",
      "Export professionale quando il libro è davvero pronto",
    ],
  },
  en: {
    title: "What Scriptora promises authors",
    items: [
      "A narrative thread that does not drift across tools",
      "Editorial diagnosis before you publish",
      "KDP packaging, title and radar in one project",
      "Professional export when the book is truly ready",
    ],
  },
  es: {
    title: "Lo que Scriptora promete a los autores",
    items: [
      "Un hilo narrativo que no se dispersa entre herramientas",
      "Diagnostico editorial antes de publicar",
      "Packaging KDP, titulo y radar en un proyecto",
      "Export profesional cuando el libro esta listo",
    ],
  },
  fr: {
    title: "Ce que Scriptora promet aux auteurs",
    items: [
      "Un fil narratif qui ne se disperse pas entre outils",
      "Diagnostic editorial avant publication",
      "Packaging KDP, titre et radar dans un projet",
      "Export professionnel quand le livre est pret",
    ],
  },
  de: {
    title: "Was Scriptora Autoren verspricht",
    items: [
      "Ein Erzahlfaden, der nicht zwischen Tools verloren geht",
      "Editoriale Diagnose vor der Veroffentlichung",
      "KDP-Packaging, Titel und Radar in einem Projekt",
      "Professioneller Export wenn das Buch wirklich bereit ist",
    ],
  },
};

const PLACEHOLDER_EXAMPLES: PublicTestimonial[] = [
  {
    id: "beta-a",
    initials: "GF",
    tone: "cyan",
    name: "Giulia F.",
    role: "Autrice romance · esempio beta",
    quote: "Scriptora tiene insieme struttura, voce e revisione come un unico studio — non come chat sparse.",
    metric: "Direzione narrativa",
    isPlaceholder: true,
  },
  {
    id: "beta-b",
    initials: "ML",
    tone: "violet",
    name: "Marco L.",
    role: "Non-fiction · esempio beta",
    quote: "Per la prima volta blueprint, capitoli e export sembrano parti dello stesso libro.",
    metric: "Coerenza di flusso",
    isPlaceholder: true,
  },
  {
    id: "beta-c",
    initials: "ER",
    tone: "amber",
    name: "Elena R.",
    role: "Publisher KDP · esempio beta",
    quote: "Titolo, cover, radar e KDP Launch nello stesso progetto — meno emergenze, più controllo.",
    metric: "Packaging commerciale",
    isPlaceholder: true,
  },
];

const TONE_CLASS: Record<PublicTestimonial["tone"], string> = {
  cyan: "from-cyan-400/30 to-sky-500/10",
  violet: "from-violet-400/30 to-fuchsia-500/10",
  amber: "from-amber-400/30 to-orange-500/10",
};

type Props = {
  lang: UILanguage;
  onEnter: () => void;
};

export function PublicTestimonials({ lang, onEnter }: Props) {
  const promises = DEMO_PROMISES[lang] ?? DEMO_PROMISES.en;
  const real = AUTHOR_TESTIMONIALS;
  const cards = real.length > 0 ? real : PLACEHOLDER_EXAMPLES;

  return (
    <section id="testimonials" className="scriptora-landing-section scriptora-testimonials-section">
      <div className="scriptora-landing-section-label">
        {real.length > 0
          ? (lang === "it" ? "Voci autore" : "Author voices")
          : (lang === "it" ? "Beta · proof" : "Beta · proof")}
      </div>

      {real.length === 0 ? (
        <div className="scriptora-public-beta-cta">
          <h2>{lang === "it" ? "Vuoi essere tra i primi autori beta?" : "Want to be among the first beta authors?"}</h2>
          <p>{promises.title}</p>
          <ul className="scriptora-public-promise-list">
            {promises.items.map((item) => (
              <li key={item}>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onEnter} className="scriptora-landing-primary">
            {lang === "it" ? "Entra in Scriptora" : "Enter Scriptora"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="scriptora-testimonials-header">
          <h2>{lang === "it" ? "Autori che usano Scriptora" : "Authors using Scriptora"}</h2>
        </div>
      )}

      <div className="scriptora-testimonials-grid">
        {cards.map((item) => (
          <article key={item.id} className="scriptora-testimonial-card">
            {item.isPlaceholder && (
              <span className="scriptora-testimonial-placeholder-badge">
                {lang === "it" ? "Esempio beta / placeholder" : "Beta example / placeholder"}
              </span>
            )}
            <div className="scriptora-testimonial-person">
              <span className={`scriptora-testimonial-avatar bg-gradient-to-br ${TONE_CLASS[item.tone]}`}>
                {item.initials}
              </span>
              <div>
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </div>
            </div>
            <p>{item.quote}</p>
            <div className="scriptora-testimonial-metric">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {item.metric}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
