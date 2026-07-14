import { ArrowRight, CheckCircle2, Star } from "lucide-react";
import type { UILanguage } from "@/lib/i18n";

export type PublicTestimonial = {
  id: string;
  avatar: string;
  name: string;
  role: string;
  quote: string;
  metric: string;
  kind: "writer";
  isPlaceholder: true;
};

/** Real testimonials only — replace when authorized quotes are available. */
export const AUTHOR_TESTIMONIALS: PublicTestimonial[] = [];

const PLACEHOLDER_EXAMPLES: PublicTestimonial[] = [
  {
    id: "w1",
    avatar: "/landing/avatars/demo-writer-1.svg",
    name: "Giulia F.",
    role: "Autrice romance",
    quote: "Non è un'altra chat che scrive pagine. È uno studio dove il libro resta coerente capitolo dopo capitolo.",
    metric: "Direzione narrativa",
    kind: "writer",
    isPlaceholder: true,
  },
  {
    id: "w2",
    avatar: "/landing/avatars/demo-writer-2.svg",
    name: "Marco L.",
    role: "Autore saggistica KDP",
    quote: "Blueprint, capitoli, radar e export nello stesso posto. Meno strumenti sparsi, più libro finito.",
    metric: "Flusso editoriale",
    kind: "writer",
    isPlaceholder: true,
  },
];

const headerCopy = {
  it: {
    label: "Voci dalla beta",
    title: "Autori che portano il libro fino alla pubblicazione.",
    text: "Scriptora tiene insieme voce, struttura, continuità narrativa e preparazione editoriale in un unico flusso autore.",
    badge: "Esempio beta / avatar illustrato",
    cta: "Prova gratis Scriptora",
    statWriters: "Author Studio",
    statMemory: "Memoria narrativa",
    statOne: "1 piattaforma",
  },
  en: {
    label: "Beta voices",
    title: "Authors who carry the book all the way to publication.",
    text: "Scriptora keeps voice, structure, narrative continuity and editorial preparation in one author workflow.",
    badge: "Beta example / illustrated avatar",
    cta: "Try Scriptora free",
    statWriters: "Author Studio",
    statMemory: "Narrative memory",
    statOne: "1 platform",
  },
} as const;

type Props = {
  lang: UILanguage;
  onEnter: () => void;
};

export function PublicTestimonials({ lang, onEnter }: Props) {
  const c = headerCopy[lang === "it" ? "it" : "en"];
  const cards = AUTHOR_TESTIMONIALS.length > 0 ? AUTHOR_TESTIMONIALS : PLACEHOLDER_EXAMPLES;

  return (
    <section id="testimonials" className="scriptora-landing-section scriptora-testimonials-section">
      <div className="scriptora-testimonials-conversion-head">
        <div className="scriptora-landing-section-label">{c.label}</div>
        <h2>{c.title}</h2>
        <p>{c.text}</p>
        <div className="scriptora-testimonials-stats">
          <span>{c.statWriters}</span>
          <span>{c.statMemory}</span>
          <span className="is-accent">{c.statOne}</span>
        </div>
      </div>

      {AUTHOR_TESTIMONIALS.length === 0 && (
        <p className="scriptora-testimonials-placeholder-notice mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs text-white/55">
          {lang === "it"
            ? "Esempi illustrati per la beta — non testimonianze di clienti reali."
            : "Illustrated beta examples — not quotes from real customers."}
        </p>
      )}

      <div className="scriptora-testimonials-grid">
        {cards.map((item) => (
          <article
            key={item.id}
            className="scriptora-testimonial-card is-writer"
          >
            <span className="scriptora-testimonial-placeholder-badge">{c.badge}</span>
            <div className="scriptora-testimonial-person">
              <img
                src={item.avatar}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                className="scriptora-testimonial-photo"
              />
              <div>
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </div>
              <div className="scriptora-testimonial-stars" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={`${item.id}-star-${i}`} className="h-3 w-3 fill-amber-300 text-amber-300" />
                ))}
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

      <div className="scriptora-testimonials-cta-bar">
        <p>{lang === "it" ? "Porta il tuo libro dall'idea alla pubblicazione con un solo account." : "Take your book from idea to publication with one account."}</p>
        <button type="button" onClick={onEnter} className="scriptora-landing-primary">
          {c.cta}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
