import { ArrowRight, BookOpen, PenLine, Sparkles } from "lucide-react";
import type { UILanguage } from "@/lib/i18n";

type Props = {
  lang: UILanguage;
  onEnter: () => void;
};

const copy = {
  it: {
    label: "Un percorso completo · una piattaforma",
    title: "Dall'idea al libro pubblicato.",
    subtitle: "Scriptora OS accompagna l'autore dalla prima idea al manoscritto, fino alla copertina e ai file pronti per la pubblicazione.",
    writeTitle: "Progetta il libro",
    writeText: "Idea, lettore, promessa, blueprint, personaggi e canone in un progetto coerente.",
    writeCta: "Crea il tuo libro",
    writeTags: ["Romanzi", "Saggistica", "Blueprint", "Canone"],
    publishTitle: "Scrivi e pubblica",
    publishText: "Capitoli con memoria, diagnosi editoriale, cover, KDP Launch ed export.",
    publishCta: "Apri lo studio autore",
    publishTags: ["Writer", "Cover", "KDP", "Self-publishing"],
    foot: "Tutto il ciclo editoriale in un unico ecosistema autore.",
  },
  en: {
    label: "One complete path · one platform",
    title: "From first idea to published book.",
    subtitle: "Scriptora OS guides authors from the initial idea to the manuscript, cover and publication-ready files.",
    writeTitle: "Design the book",
    writeText: "Idea, reader, promise, blueprint, characters and canon in one coherent project.",
    writeCta: "Start your book",
    writeTags: ["Fiction", "Non-fiction", "Blueprint", "Canon"],
    publishTitle: "Write and publish",
    publishText: "Chapters with memory, editorial diagnosis, cover, KDP Launch and export.",
    publishCta: "Open Author Studio",
    publishTags: ["Writer", "Cover", "KDP", "Self-publishing"],
    foot: "The complete editorial cycle in one author ecosystem.",
  },
} as const;

function t(lang: UILanguage) {
  return lang === "it" ? copy.it : copy.en;
}

export function PublicDualPath({ lang, onEnter }: Props) {
  const c = t(lang);

  return (
    <section id="dual-path" className="scriptora-dual-path">
      <div className="scriptora-dual-path-intro">
        <div className="scriptora-landing-section-label">{c.label}</div>
        <h2>{c.title}</h2>
        <p>{c.subtitle}</p>
      </div>

      <div className="scriptora-dual-path-grid">
        <article className="scriptora-dual-path-card is-write">
          <div className="scriptora-dual-path-icon">
            <PenLine className="h-5 w-5" />
          </div>
          <div className="scriptora-dual-path-card-head">
            <BookOpen className="h-4 w-4 text-cyan-200/80" />
            <h3>{c.writeTitle}</h3>
          </div>
          <p>{c.writeText}</p>
          <div className="scriptora-dual-path-tags">
            {c.writeTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <button type="button" onClick={onEnter} className="scriptora-dual-path-cta">
            {c.writeCta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>

        <article className="scriptora-dual-path-card">
          <div className="scriptora-dual-path-icon">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="scriptora-dual-path-card-head">
            <Sparkles className="h-4 w-4 text-emerald-200/80" />
            <h3>{c.publishTitle}</h3>
          </div>
          <p>{c.publishText}</p>
          <div className="scriptora-dual-path-tags">
            {c.publishTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <button type="button" onClick={onEnter} className="scriptora-dual-path-cta">
            {c.publishCta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>
      </div>

      <p className="scriptora-dual-path-foot">{c.foot}</p>
    </section>
  );
}
