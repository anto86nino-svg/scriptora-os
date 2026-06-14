import { useEffect, useMemo, useState } from "react";
import {
  BarChart3, BookOpen, FileDown, ImagePlus, Layers3, PenLine, Rocket, Scissors, Sparkles, Wand2,
} from "lucide-react";
import type { UILanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FLOW_STEPS = [
  { id: "idea", icon: Sparkles, label: { it: "Idea", en: "Idea" } },
  { id: "blueprint", icon: Layers3, label: { it: "Blueprint", en: "Blueprint" } },
  { id: "chapter", icon: PenLine, label: { it: "Capitoli", en: "Chapters" } },
  { id: "analysis", icon: Wand2, label: { it: "Diagnosi", en: "Diagnosis" } },
  { id: "patch", icon: Scissors, label: { it: "Patch", en: "Patch" } },
  { id: "cover", icon: ImagePlus, label: { it: "Cover", en: "Cover" } },
  { id: "radar", icon: BarChart3, label: { it: "Radar", en: "Radar" } },
  { id: "export", icon: FileDown, label: { it: "Export", en: "Export" } },
] as const;

const PANEL_COPY: Record<string, { it: string; en: string }> = {
  idea: { it: "Promessa, genere e lettore target", en: "Promise, genre and target reader" },
  blueprint: { it: "Struttura, capitoli e direzione narrativa", en: "Structure, chapters and narrative direction" },
  chapter: { it: "Scrittura con memoria e continuità", en: "Writing with memory and continuity" },
  analysis: { it: "Ritmo, dialoghi, sottotesto editoriale", en: "Pacing, dialogue, editorial subtext" },
  patch: { it: "Correzione chirurgica senza perdere voce", en: "Surgical fixes without losing voice" },
  cover: { it: "Direzione visiva da scaffale digitale", en: "Shelf-ready visual direction" },
  radar: { it: "Score commerciale e leve di crescita", en: "Commercial score and growth levers" },
  export: { it: "EPUB, PDF, DOCX pronti per KDP", en: "EPUB, PDF, DOCX ready for KDP" },
};

function L(value: { it: string; en: string }, lang: UILanguage) {
  return lang === "it" ? value.it : value.en;
}

export function ProductFlowPreview({ lang }: { lang: UILanguage }) {
  const [active, setActive] = useState(0);
  const [videoOk, setVideoOk] = useState(false);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % FLOW_STEPS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const step = FLOW_STEPS[active];
  const StepIcon = step.icon;

  return (
    <section id="product-flow" className="scriptora-product-flow">
      <div className="scriptora-product-flow-header">
        <div>
          <div className="scriptora-landing-section-label">
            {lang === "it" ? "Anteprima del flusso Scriptora" : "Scriptora flow preview"}
          </div>
          <h2>{lang === "it" ? "Un solo flusso. Tutto il libro." : "One flow. The whole book."}</h2>
        </div>
        <p className="scriptora-product-flow-sub">
          {lang === "it"
            ? "Anteprima prodotto animata con moduli reali di Scriptora OS — non un video registrato."
            : "Animated product preview using real Scriptora OS modules — not a recorded video."}
        </p>
      </div>

      <div className="scriptora-product-flow-shell">
        <div className="scriptora-product-flow-rail" aria-hidden={reducedMotion}>
          {FLOW_STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "scriptora-product-flow-step",
                  index === active && "is-active",
                  index < active && "is-done",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{L(item.label, lang)}</span>
              </button>
            );
          })}
        </div>

        <div className="scriptora-product-flow-stage">
          <video
            className={cn("scriptora-product-flow-video", !videoOk && "hidden")}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster=""
            onCanPlay={() => setVideoOk(true)}
            onError={() => setVideoOk(false)}
          >
            <source src="/scriptora-flow-preview.mp4" type="video/mp4" />
          </video>

          {!videoOk && (
            <div className="scriptora-product-flow-panel">
              <div className="scriptora-product-flow-panel-head">
                <span className="scriptora-product-flow-panel-icon">
                  <StepIcon className="h-4 w-4" />
                </span>
                <div>
                  <p>{lang === "it" ? "Modulo attivo" : "Active module"}</p>
                  <h3>{L(step.label, lang)}</h3>
                </div>
                <span className="scriptora-product-flow-live">
                  <i />
                  {lang === "it" ? "Anteprima" : "Preview"}
                </span>
              </div>
              <p className="scriptora-product-flow-panel-copy">{L(PANEL_COPY[step.id], lang)}</p>
              <div className="scriptora-product-flow-mini-grid">
                <MiniCard
                  icon={BookOpen}
                  title={lang === "it" ? "Writer OS" : "Writer OS"}
                  value={lang === "it" ? "Capitolo in continuità" : "Chapter in continuity"}
                />
                <MiniCard
                  icon={Rocket}
                  title="KDP Launch"
                  value={lang === "it" ? "Posizionamento mercato" : "Market positioning"}
                />
                <MiniCard
                  icon={BarChart3}
                  title="Bestseller Radar"
                  value={lang === "it" ? "Score progetto" : "Project score"}
                />
              </div>
              <div className="scriptora-product-flow-progress" aria-hidden="true">
                <span style={{ width: `${((active + 1) / FLOW_STEPS.length) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof BookOpen;
  title: string;
  value: string;
}) {
  return (
    <div className="scriptora-product-flow-mini-card">
      <Icon className="h-3.5 w-3.5 text-cyan-200/80" />
      <div>
        <strong>{title}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}
