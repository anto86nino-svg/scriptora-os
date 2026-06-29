import { useMemo, useState } from "react";
import { compressLightSummary, parseStudyNotesPro, sanitizeStudyText, type StudyNotesSection } from "@/lib/study-ux";
import type { StudyLearningPackage, StudySessionResult, StudySummaryMode } from "@/lib/study-session";
import {
  buildRiassuntoPro,
  getRiassuntoProLevelLabel,
  RIASSUNTO_PRO_LEVELS,
  type RiassuntoProSection,
} from "@/lib/study-os/riassunti-pro";
import type { RiassuntoProLevel, StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import { StudyDictionaryPopover } from "@/components/study/StudyDictionaryPopover";

interface StudySummaryPanelProps {
  lightSummary: string;
  mediumSummary: string;
  proSummary: string;
  studyNotesPro: string;
  summaries?: Partial<Record<StudySummaryMode, string>>;
  learningPackage?: StudyLearningPackage;
  result?: StudySessionResult;
  recommendedLevel?: RiassuntoProLevel;
  initialLevel?: RiassuntoProLevel;
  onLevelChange?: (level: RiassuntoProLevel) => void;
  kernelPlan?: StudyKernelPlan | null;
}

const SUMMARY_MODE_LABELS: Array<{ key: StudySummaryMode; title: string; badge: string }> = [
  { key: "brief", title: "Breve", badge: "Sintesi rapida" },
  { key: "complete", title: "Completo", badge: "Studio base" },
  { key: "university", title: "Universitario", badge: "Approfondito" },
  { key: "oral", title: "Interrogazione", badge: "Risposta a voce" },
  { key: "ultraSimple", title: "Ultra semplice", badge: "Spiegato facile" },
  { key: "quickReview", title: "Ripasso veloce", badge: "5 minuti" },
  { key: "chronological", title: "Cronologico", badge: "Sequenza" },
  { key: "causeEffect", title: "Causa-effetto", badge: "Relazioni" },
  { key: "bulletPoints", title: "Punti elenco", badge: "Checklist" },
  { key: "oralExam", title: "Esame orale", badge: "Metodo professore" },
];

function RiassuntoProPanel({
  section,
  level,
  onLevelChange,
  recommendedLevel,
}: {
  section: RiassuntoProSection;
  level: RiassuntoProLevel;
  onLevelChange: (level: RiassuntoProLevel) => void;
  recommendedLevel?: RiassuntoProLevel;
}) {
  return (
    <div className="study-card-enter rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-emerald-50">Riassunti Pro</h3>
          <p className="mt-1 text-xs text-emerald-100/75">5 livelli strutturati — concetti, definizioni, esempi, formule, errori comuni.</p>
        </div>
        {recommendedLevel === level && (
          <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-100">
            Consigliato
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {RIASSUNTO_PRO_LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onLevelChange(item)}
            className={[
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
              level === item
                ? "bg-emerald-300 text-slate-950"
                : "border border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {getRiassuntoProLevelLabel(item)}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-background/35 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Testo</p>
        <div className="mt-2 space-y-1.5 text-sm leading-6 text-foreground/85">
          {sanitizeStudyText(section.body).split("\n").filter(Boolean).map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {section.keyConcepts.length > 0 && (
          <StructuredList title="Concetti chiave" items={section.keyConcepts} />
        )}
        {section.definitions.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Definizioni</p>
            <ul className="mt-2 space-y-2 text-sm leading-5 text-muted-foreground">
              {section.definitions.map((item) => (
                <li key={item.term}>
                  <span className="font-semibold text-foreground/90">{item.term}: </span>
                  {item.definition}
                </li>
              ))}
            </ul>
          </div>
        )}
        {section.examples.length > 0 && <StructuredList title="Esempi" items={section.examples} />}
        {section.formulas.length > 0 && <StructuredList title="Formule" items={section.formulas} />}
        {section.commonErrors.length > 0 && (
          <StructuredList title="Errori comuni" items={section.commonErrors} danger />
        )}
      </div>
    </div>
  );
}

function StructuredList({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${danger ? "border-amber-300/20 bg-amber-400/10" : "border-white/10 bg-background/35"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className={danger ? "text-amber-300/80" : "text-emerald-300/70"}>•</span>
            <span>{sanitizeStudyText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({ title, text, badge }: { title: string; text: string; badge?: string }) {
  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        {badge && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1.5 text-sm leading-6 text-foreground/85">
        {text.split("\n").map((line, i) => {
          const clean = sanitizeStudyText(line);
          if (!clean) return null;
          const isBullet = /^[•\-]/.test(line.trim()) || clean.startsWith("•");
          const content = clean.replace(/^[•\-]\s*/, "");
          return isBullet ? (
            <p key={i} className="flex gap-2">
              <span className="mt-0.5 text-emerald-300/70">•</span>
              <span>{content}</span>
            </p>
          ) : (
            <p key={i}>{content}</p>
          );
        })}
      </div>
    </div>
  );
}

function NotesSectionCard({ section }: { section: StudyNotesSection }) {
  if (section.variant === "chain" && section.chain && section.chain.length > 0) {
    return (
      <div className="study-card-enter rounded-2xl border border-white/10 bg-background/45 p-3 sm:col-span-2">
        <p className="text-sm font-bold text-foreground">
          {section.icon} {section.title}
        </p>
        <div className="mt-3 flex flex-col items-center gap-1">
          {section.chain.map((step, i) => (
            <div key={i} className="flex w-full flex-col items-center">
              <div className="w-full rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-center text-sm text-foreground/90">
                {step}
              </div>
              {i < section.chain!.length - 1 && (
                <span className="my-0.5 text-lg text-emerald-300/60">↓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.variant === "question" && section.lines[0]) {
    return (
      <div className="study-card-enter rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 sm:col-span-2">
        <p className="text-sm font-bold text-amber-100">
          {section.icon} {section.title}
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground/90 italic">
          &ldquo;{section.lines[0]}&rdquo;
        </p>
      </div>
    );
  }

  if (section.variant === "warning") {
    return (
      <div className="study-card-enter rounded-2xl border border-rose-300/15 bg-rose-400/5 p-3">
        <p className="text-sm font-bold text-rose-100/90">
          {section.icon} {section.title}
        </p>
        <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
          {section.lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-rose-300/60">!</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (section.variant === "concepts") {
    return (
      <div className="study-card-enter rounded-2xl border border-white/10 bg-background/45 p-3 sm:col-span-2">
        <p className="text-sm font-bold text-foreground">
          {section.icon} {section.title}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {section.lines.map((line, i) => (
            <span
              key={i}
              className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-100"
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="study-card-enter rounded-2xl border border-white/10 bg-background/45 p-3">
      <p className="text-sm font-bold text-foreground">
        {section.icon} {section.title}
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
        {section.lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-emerald-300/60 shrink-0">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LearningPackagePanel({ pack }: { pack?: StudyLearningPackage }) {
  if (!pack) return null;
  const keyConcepts = pack.keyConcepts || [];
  const mistakes = pack.commonMistakes || [];
  const questions = pack.examQuestions || [];

  return (
    <div className="study-card-enter rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-emerald-50">Pacchetto studio immediato</h3>
          <p className="mt-1 text-xs text-emerald-100/75">Una sola elaborazione: capire, ricordare, preparare l&apos;esame.</p>
        </div>
        <span className="rounded-full border border-emerald-200/20 bg-black/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
          6 output
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">Ultra breve</p>
          <p className="mt-2 text-sm leading-6 text-foreground/85">{sanitizeStudyText(pack.summaryUltraBrief)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">Standard</p>
          <p className="mt-2 text-sm leading-6 text-foreground/85">{sanitizeStudyText(pack.summaryStandard)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/35 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">Approfondito</p>
          <p className="mt-2 text-sm leading-6 text-foreground/85">{sanitizeStudyText(pack.summaryDeep)}</p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <MiniList title="Concetti chiave" items={keyConcepts} />
        <MiniList title="Errori comuni" items={mistakes} danger />
        <MiniList title="Domande d'esame" items={questions} />
      </div>
    </div>
  );
}

function MiniList({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  if (!items.length) return null;
  return (
    <div className={`rounded-2xl border p-3 ${danger ? "border-amber-300/20 bg-amber-400/10" : "border-white/10 bg-background/35"}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-muted-foreground">
        {items.slice(0, 6).map((item) => (
          <li key={item} className="flex gap-2">
            <span className={danger ? "text-amber-300/80" : "text-emerald-300/70"}>•</span>
            <span>{sanitizeStudyText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudySummaryPanel({
  lightSummary,
  mediumSummary,
  proSummary,
  studyNotesPro,
  summaries,
  learningPackage,
  result,
  recommendedLevel,
  initialLevel,
  onLevelChange,
  kernelPlan,
}: StudySummaryPanelProps) {
  const [level, setLevel] = useState<RiassuntoProLevel>(initialLevel ?? recommendedLevel ?? "dettagliato");
  const lightCompressed = compressLightSummary(lightSummary);
  const notesSections = parseStudyNotesPro(studyNotesPro);
  const modeCards = SUMMARY_MODE_LABELS
    .map((mode) => ({ ...mode, text: summaries?.[mode.key] || "" }))
    .filter((mode) => mode.text.trim().length > 0);

  const riassuntoSection = useMemo(() => {
    if (!result) return null;
    return buildRiassuntoPro(result, level);
  }, [result, level]);

  function handleLevelChange(next: RiassuntoProLevel) {
    setLevel(next);
    onLevelChange?.(next);
  }

  return (
    <div className="space-y-4">
      {result && (result.difficultWords?.length || result.keyConcepts?.length) ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
          <StudyDictionaryPopover
            difficultWords={result.difficultWords ?? []}
            keyConcepts={result.keyConcepts ?? []}
            kernelPlan={kernelPlan}
          />
        </div>
      ) : null}

      {riassuntoSection && (
        <RiassuntoProPanel
          section={riassuntoSection}
          level={level}
          onLevelChange={handleLevelChange}
          recommendedLevel={recommendedLevel}
        />
      )}

      <LearningPackagePanel pack={learningPackage} />

      {modeCards.length >= 4 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {modeCards.map((mode) => (
            <SummaryCard key={mode.key} title={mode.title} text={sanitizeStudyText(mode.text)} badge={mode.badge} />
          ))}
        </div>
      ) : (
        <>
          <SummaryCard title="Riassunto leggero" text={lightCompressed} badge="~150 parole · ripasso veloce" />
          <SummaryCard title="Riassunto medio" text={sanitizeStudyText(mediumSummary)} badge="Spiegazione scuola" />
          <SummaryCard title="Riassunto Pro" text={sanitizeStudyText(proSummary)} badge="Comprensione profonda" />
        </>
      )}

      <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <h3 className="font-semibold">Scheda Studio Pro</h3>
        <p className="mt-1 text-xs text-muted-foreground">Dashboard di apprendimento — scansione rapida, zero markdown.</p>

        {notesSections.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {notesSections.map((section) => (
              <NotesSectionCard key={section.title} section={section} />
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-1.5 text-sm leading-6 text-foreground/85">
            {sanitizeStudyText(studyNotesPro).split("\n").filter(Boolean).map((line, i) => (
              <p key={i}>{line.replace(/^[•\-]\s*/, "")}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
