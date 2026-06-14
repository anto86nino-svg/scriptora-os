import { ArrowRight, BookOpen, GraduationCap, PenLine, Sparkles } from "lucide-react";
import type { UILanguage } from "@/lib/i18n";

type Props = {
  lang: UILanguage;
  onEnter: () => void;
};

const copy = {
  it: {
    label: "Due percorsi · una piattaforma",
    title: "Non solo scrittura. Anche studio.",
    subtitle: "Scriptora OS unisce Author Studio e Study OS: libri da idea a pubblicazione, materiale da lezione a quiz e ripasso.",
    writeTitle: "Scrivere libri",
    writeText: "Blueprint, capitoli, diagnosi editoriale, cover, KDP Launch, Radar ed export.",
    writeCta: "Crea il tuo libro",
    writeTags: ["Romanzi", "Saggistica", "KDP", "Self-publishing"],
    studyTitle: "Studiare meglio",
    studyText: "PDF, dispense, appunti e capitoli → riassunti, flashcard, quiz e simulazioni.",
    studyCta: "Apri Study OS",
    studyTags: ["Università", "Liceo", "Medicina", "Giurisprudenza", "STEM"],
    foot: "Autori e studenti nello stesso ecosistema creativo.",
  },
  en: {
    label: "Two paths · one platform",
    title: "Not just writing. Study too.",
    subtitle: "Scriptora OS combines Author Studio and Study OS: books from idea to publish, coursework to quizzes and review.",
    writeTitle: "Write books",
    writeText: "Blueprint, chapters, editorial diagnosis, cover, KDP Launch, Radar and export.",
    writeCta: "Start your book",
    writeTags: ["Fiction", "Non-fiction", "KDP", "Self-publishing"],
    studyTitle: "Study smarter",
    studyText: "PDFs, notes and chapters → summaries, flashcards, quizzes and practice.",
    studyCta: "Open Study OS",
    studyTags: ["University", "High school", "Medicine", "Law", "STEM"],
    foot: "Authors and students in the same creative ecosystem.",
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

        <article className="scriptora-dual-path-card is-study">
          <div className="scriptora-dual-path-icon is-study">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="scriptora-dual-path-card-head">
            <Sparkles className="h-4 w-4 text-emerald-200/80" />
            <h3>{c.studyTitle}</h3>
          </div>
          <p>{c.studyText}</p>
          <div className="scriptora-dual-path-tags">
            {c.studyTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <button type="button" onClick={onEnter} className="scriptora-dual-path-cta is-study">
            {c.studyCta}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </article>
      </div>

      <p className="scriptora-dual-path-foot">{c.foot}</p>
    </section>
  );
}
