import {
  BarChart3, BookOpen, FileDown, Fingerprint, ImagePlus, Layers3, PenLine, Rocket,
  Search, Sparkles, Target, Users, Wand2,
} from "lucide-react";
import type { UILanguage } from "@/lib/i18n";

type Props = {
  lang: UILanguage;
};

const FEATURES = [
  { icon: Layers3, title: { it: "Blueprint intelligente", en: "Smart blueprint" }, text: { it: "Struttura, pubblico e promessa in un piano coerente.", en: "Structure, audience and promise in one coherent plan." } },
  { icon: PenLine, title: { it: "Writer OS", en: "Writer OS" }, text: { it: "Capitoli con memoria narrativa e continuità di voce.", en: "Chapters with narrative memory and voice continuity." } },
  { icon: Users, title: { it: "Character Studio", en: "Character Studio" }, text: { it: "Personaggi, relazioni e pressione scenica integrate.", en: "Characters, relationships and scene pressure integrated." } },
  { icon: Wand2, title: { it: "Analysis Pro", en: "Analysis Pro" }, text: { it: "Diagnosi editoriale su ritmo, dialoghi e sottotesto.", en: "Editorial diagnosis on pacing, dialogue and subtext." } },
  { icon: Target, title: { it: "Patch editoriale", en: "Editorial patch" }, text: { it: "Correzioni chirurgiche senza tradire trama e voce.", en: "Surgical fixes without betraying plot and voice." } },
  { icon: ImagePlus, title: { it: "Cover Studio", en: "Cover Studio" }, text: { it: "Direzione visiva da scaffale digitale.", en: "Shelf-ready visual direction." } },
  { icon: Rocket, title: { it: "KDP Launch", en: "KDP Launch" }, text: { it: "Posizionamento, promessa e flusso narrativo commerciale.", en: "Positioning, promise and commercial narrative flow." } },
  { icon: Search, title: { it: "Title Domination", en: "Title Domination" }, text: { it: "Titoli con tensione commerciale e fit KDP.", en: "Titles with commercial tension and KDP fit." } },
  { icon: BarChart3, title: { it: "Bestseller Radar", en: "Bestseller Radar" }, text: { it: "Score commerciale basato sul progetto reale.", en: "Commercial score based on your real project." } },
  { icon: FileDown, title: { it: "Export EPUB/PDF/DOCX", en: "EPUB/PDF/DOCX export" }, text: { it: "Packaging finale quando il libro è pronto.", en: "Final packaging when the book is ready." } },
  { icon: BookOpen, title: { it: "Study OS", en: "Study OS" }, text: { it: "Materiale → quiz, flashcard e studio guidato.", en: "Material → quizzes, flashcards and guided study." } },
  { icon: Fingerprint, title: { it: "Identità autore", en: "Author identity" }, text: { it: "Voce, stile e promessa coerenti in tutto il flusso.", en: "Voice, style and promise coherent across the flow." } },
] as const;

function L<T extends { it: string; en: string }>(value: T, lang: UILanguage) {
  return lang === "it" ? value.it : value.en;
}

export function PublicHomeWow({ lang }: Props) {
  return (
    <>
      <section id="features" className="scriptora-landing-section scriptora-public-features">
        <div className="scriptora-landing-section-label">
          {lang === "it" ? "Cosa fa Scriptora" : "What Scriptora does"}
        </div>
        <h2>{lang === "it" ? "Tutto il libro. Un solo sistema." : "The whole book. One system."}</h2>
        <div className="scriptora-public-features-grid">
          {FEATURES.map((item) => (
            <article key={item.title.en} className="scriptora-public-feature-card">
              <item.icon className="h-4 w-4 text-cyan-200" />
              <h3>{L(item.title, lang)}</h3>
              <p>{L(item.text, lang)}</p>
              <span>{lang === "it" ? "Integrato nel flusso" : "Built into the flow"}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="difference" className="scriptora-landing-section scriptora-public-difference">
        <div className="scriptora-landing-section-label">
          {lang === "it" ? "Perché è diversa" : "Why it's different"}
        </div>
        <div className="scriptora-public-difference-grid">
          <div>
            <h2>{lang === "it" ? "Le AI scrivono pagine. Scriptora costruisce libri." : "AIs write pages. Scriptora builds books."}</h2>
            <p>
              {lang === "it"
                ? "Non genera soltanto testo. Tiene insieme storia, mercato, cover, titolo e pubblicazione."
                : "It doesn't just generate text. It holds story, market, cover, title and publishing together."}
            </p>
          </div>
          <ul className="scriptora-public-difference-list">
            {(lang === "it"
              ? ["Memoria narrativa tra capitoli", "Controllo editoriale capitolo per capitolo", "Diagnosi e patch integrate", "Radar commerciale sul progetto", "Packaging KDP e export unificati", "Workflow unico dall'idea al file"]
              : ["Narrative memory across chapters", "Chapter-by-chapter editorial control", "Integrated diagnosis and patch", "Commercial radar on your project", "Unified KDP packaging and export", "One workflow from idea to file"]
            ).map((line) => (
              <li key={line}>
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-fuchsia-200" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="before-after" className="scriptora-landing-section scriptora-public-before-after">
        <div className="scriptora-landing-section-label">
          {lang === "it" ? "Prima / Dopo" : "Before / After"}
        </div>
        <div className="scriptora-public-ba-grid">
          <article className="scriptora-public-ba-card is-before">
            <h3>{lang === "it" ? "Prima" : "Before"}</h3>
            <p>
              {lang === "it"
                ? "Idea sparsa, titolo debole, capitoli scollegati, nessuna direzione commerciale."
                : "Scattered idea, weak title, disconnected chapters, no commercial direction."}
            </p>
          </article>
          <article className="scriptora-public-ba-card is-after">
            <h3>{lang === "it" ? "Dopo Scriptora" : "After Scriptora"}</h3>
            <p>
              {lang === "it"
                ? "Blueprint, struttura, capitoli, diagnosi, cover, radar, export — un unico studio editoriale."
                : "Blueprint, structure, chapters, diagnosis, cover, radar, export — one editorial studio."}
            </p>
          </article>
        </div>
      </section>

      <section id="radar-preview" className="scriptora-landing-section scriptora-public-radar">
        <div className="scriptora-landing-section-label">Bestseller Radar · KDP</div>
        <div className="scriptora-public-radar-shell">
          <div>
            <h2>{lang === "it" ? "Potenziale commerciale, onestamente." : "Commercial potential, honestly."}</h2>
            <p>
              {lang === "it"
                ? "Score editoriale basato sul tuo progetto — titolo, promessa, blueprint e manoscritto."
                : "Editorial score based on your project — title, promise, blueprint and manuscript."}
            </p>
            <span className="scriptora-public-radar-badge">
              {lang === "it" ? "Stima editoriale basata sul progetto" : "Editorial estimate based on project"}
            </span>
          </div>
          <div className="scriptora-public-radar-scores">
            <div className="scriptora-public-radar-overall">
              <strong>78</strong>
              <span>/100</span>
            </div>
            <div className="scriptora-public-radar-metrics">
              {[
                { label: "Hook", value: 82 },
                { label: lang === "it" ? "Titolo" : "Title", value: 66 },
                { label: "KDP Fit", value: 74 },
                { label: "Readiness", value: 81 },
              ].map((m) => (
                <div key={m.label}>
                  <span>{m.label}</span>
                  <strong>{m.value}</strong>
                  <div><i style={{ width: `${m.value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
