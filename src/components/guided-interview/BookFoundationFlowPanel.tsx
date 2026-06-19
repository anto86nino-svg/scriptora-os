import { useMemo, useState } from "react";
import { ArrowRight, Check, Lock, Sparkles, Wand2 } from "lucide-react";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type {
  BookFoundationFlowStep,
  BookFoundationLock,
  BookLengthPreset,
} from "@/lib/guided-interview/book-foundation-lock";
import {
  LENGTH_PRESET_CONFIGS,
  advanceFoundationFlowStep,
  applyBestTitleOption,
  autoCompleteMissingFoundationFields,
  foundationInputFromState,
  generateChapterStructure,
  generateCommercialHookOptions,
  generateFoundationCast,
  generateNonfictionSubjects,
  generateTitleSubtitleOptions,
  getMissingFieldActions,
  resolveFoundationFlowStep,
  validateBookFoundationFields,
} from "@/lib/guided-interview/book-foundation-lock";
import { isNonfictionExpressGenre } from "@/lib/guided-interview/express-genre-config";
import { foundationCastToForge } from "@/lib/guided-interview/character-foundation-studio";
import { CharacterFoundationStudioLite } from "./CharacterFoundationStudioLite";
import { cn } from "@/lib/utils";

const STEPS: { id: BookFoundationFlowStep; label: string }[] = [
  { id: "setup", label: "Setup rapido" },
  { id: "characters", label: "Personaggi / soggetti" },
  { id: "titleHook", label: "Titolo e hook" },
  { id: "lock", label: "Foundation Lock" },
];

export type BookFoundationFlowPanelProps = {
  state: GuidedInterviewState;
  foundation: BookFoundationLock;
  onUpdate: (foundation: BookFoundationLock) => void;
  onConfirm: () => void;
  compact?: boolean;
  className?: string;
};

export function BookFoundationFlowPanel({
  state,
  foundation,
  onUpdate,
  onConfirm,
  compact = false,
  className,
}: BookFoundationFlowPanelProps) {
  const input = useMemo(() => foundationInputFromState(state), [state]);
  const [customTitle, setCustomTitle] = useState(foundation.title);
  const [customSubtitle, setCustomSubtitle] = useState(foundation.subtitle);
  const [customHook, setCustomHook] = useState(foundation.commercialHook);
  const [customAudience, setCustomAudience] = useState(foundation.targetAudience);
  const [customTone, setCustomTone] = useState(foundation.tone || input.tone);

  const step = foundation.flowStep ?? resolveFoundationFlowStep(foundation);
  const isNonfiction = isNonfictionExpressGenre(foundation.genre);
  const missingActions = getMissingFieldActions(foundation.missingFields);
  const canConfirm = foundation.missingFields.length === 0;

  const applyFoundation = (next: Partial<BookFoundationLock>) => {
    const merged = { ...foundation, ...next };
    merged.missingFields = validateBookFoundationFields(merged);
    onUpdate(merged);
  };

  const handleAutoComplete = () => {
    const completed = autoCompleteMissingFoundationFields(state, foundation);
    onUpdate(completed);
    setCustomTitle(completed.title);
    setCustomSubtitle(completed.subtitle);
    setCustomHook(completed.commercialHook);
  };

  const handleLengthChange = (preset: BookLengthPreset) => {
    const config = LENGTH_PRESET_CONFIGS[preset];
    applyFoundation({
      lengthPreset: preset,
      chapterCount: config.chapterCount,
      subchaptersEnabled: config.subchaptersDefault,
      structurePreset: `${preset} · ${config.pacing}`,
      chapterStructure: generateChapterStructure(input, config.chapterCount),
    });
  };

  const handleGenerateStructure = () => {
    applyFoundation({
      chapterStructure: generateChapterStructure(input, foundation.chapterCount),
      structurePreset: `${foundation.lengthPreset} · ${LENGTH_PRESET_CONFIGS[foundation.lengthPreset].pacing}`,
    });
  };

  const handleGenerateTitles = () => {
    const options = generateTitleSubtitleOptions(input);
    applyFoundation({ titleCandidates: options });
  };

  const handleProponiTu = () => {
    const options = foundation.titleCandidates?.length
      ? foundation.titleCandidates
      : generateTitleSubtitleOptions(input);
    const best = applyBestTitleOption(options);
    setCustomTitle(best.title);
    setCustomSubtitle(best.subtitle);
    applyFoundation({
      title: best.title,
      subtitle: best.subtitle,
      titleCandidates: options,
      fieldProvenance: {
        ...foundation.fieldProvenance,
        title: { source: "auto" },
        subtitle: { source: "auto" },
      },
    });
  };

  const handleGenerateHooks = () => {
    const hooks = generateCommercialHookOptions(input);
    const hook = hooks[1]?.hook || hooks[0]?.hook || "";
    setCustomHook(hook);
    applyFoundation({ hookCandidates: hooks, commercialHook: hook });
  };

  const handleGenerateNonfiction = () => {
    const nf = generateNonfictionSubjects(input);
    applyFoundation({
      nonfictionSubjects: nf,
      targetAudience: nf.idealReader ?? foundation.targetAudience,
      marketPromise: nf.transformationPromise ?? foundation.marketPromise,
    });
  };

  const goToStep = (nextStep: BookFoundationFlowStep) => {
    applyFoundation({ flowStep: nextStep });
  };

  const handleNextStep = () => {
    applyFoundation(advanceFoundationFlowStep(foundation, step));
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-500/10 to-transparent p-4",
        className,
      )}
      aria-label="Fondamenta del libro"
    >
      <header>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/90">
          <Sparkles className="h-3.5 w-3.5" />
          Fondamenta del libro · click-first
        </p>
        <p className="mt-1 text-sm leading-6 text-white/70">
          Scriptora propone — tu confermi, modifichi o rigeneri. Nessun campo critico ti lascia bloccato.
        </p>
      </header>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goToStep(s.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[10px] font-medium",
              step === s.id
                ? "border-amber-300/45 bg-amber-500/25 text-amber-50"
                : "border-white/10 bg-white/[0.04] text-white/45",
            )}
          >
            {i + 1}. {s.label}
          </button>
        ))}
      </nav>

      {foundation.missingFields.length > 0 && (
        <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200/90">
            Campi da completare
          </p>
          <ul className="mt-2 space-y-1.5">
            {missingActions.map((action) => (
              <li key={action.field} className="flex flex-wrap items-center gap-2 text-xs text-rose-100/85">
                <span>{action.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (action.action === "characters") {
                      const cast = generateFoundationCast(input);
                      applyFoundation({
                        foundationCharacters: cast,
                        characters: foundationCastToForge(cast),
                      });
                    } else if (action.action === "titles") handleGenerateTitles();
                    else if (action.action === "hook") handleGenerateHooks();
                    else if (action.action === "structure") handleGenerateStructure();
                    else if (action.action === "nonfiction") handleGenerateNonfiction();
                    else handleAutoComplete();
                  }}
                  className="rounded-md border border-rose-300/35 bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-50"
                >
                  {action.cta}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleAutoComplete}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-violet-300/35 bg-violet-500/20 px-3 py-1.5 text-[11px] font-semibold text-violet-100"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Completa ciò che manca
          </button>
        </div>
      )}

      {step === "setup" && (
        <div className={cn("mt-4 grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-2")}>
          <Panel title="Lunghezza e struttura">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LENGTH_PRESET_CONFIGS) as BookLengthPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleLengthChange(preset)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-[10px] font-medium",
                    foundation.lengthPreset === preset
                      ? "border-amber-300/45 bg-amber-500/20 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-white/55",
                  )}
                >
                  {LENGTH_PRESET_CONFIGS[preset].label} ({LENGTH_PRESET_CONFIGS[preset].chapterCount} cap.)
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/45">
              {LENGTH_PRESET_CONFIGS[foundation.lengthPreset]?.description}
            </p>
            <button
              type="button"
              onClick={handleGenerateStructure}
              className="mt-2 text-[10px] font-medium text-amber-200/80 underline-offset-2 hover:underline"
            >
              Genera struttura capitoli
            </button>
          </Panel>

          <Panel title="Pubblico e tono">
            <label className="block text-[10px] text-white/45">Target lettore</label>
            <input
              value={customAudience}
              onChange={(e) => {
                setCustomAudience(e.target.value);
                applyFoundation({ targetAudience: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
            <label className="mt-2 block text-[10px] text-white/45">Tono</label>
            <input
              value={customTone}
              onChange={(e) => {
                setCustomTone(e.target.value);
                applyFoundation({ tone: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
            <dl className="mt-3 space-y-1 text-[11px] text-white/55">
              <Row label="Genere" value={foundation.genre} />
              <Row label="Lingua" value={foundation.language} />
              <Row label="Sottocapitoli" value={foundation.subchaptersEnabled ? "Sì" : "No"} />
            </dl>
          </Panel>
        </div>
      )}

      {step === "characters" && (
        <div className="mt-4">
          {isNonfiction ? (
            <Panel title="Lettore ideale, problema e metodo">
              <div className="flex flex-wrap gap-1.5">
                <MiniBtn label="Genera lettore/metodo" onClick={handleGenerateNonfiction} />
              </div>
              {foundation.nonfictionSubjects && (
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Row label="Lettore ideale" value={foundation.nonfictionSubjects.idealReader ?? ""} />
                  <Row label="Problema" value={foundation.nonfictionSubjects.readerProblem ?? ""} />
                  <Row label="Metodo" value={foundation.nonfictionSubjects.methodFramework ?? ""} />
                  <Row label="Trasformazione" value={foundation.nonfictionSubjects.transformationPromise ?? ""} />
                </dl>
              )}
            </Panel>
          ) : (
            <CharacterFoundationStudioLite
              foundation={foundation}
              input={input}
              onUpdate={onUpdate}
            />
          )}
        </div>
      )}

      {step === "titleHook" && (
        <div className="mt-4 space-y-4">
          <Panel
            title="Titolo e sottotitolo"
            actions={
              <>
                <MiniBtn label="Genera titolo e sottotitolo" onClick={handleGenerateTitles} />
                <MiniBtn label="Proponi tu" onClick={handleProponiTu} />
                <MiniBtn label="Rigenera 3 titoli" onClick={handleGenerateTitles} />
              </>
            }
          >
            <input
              value={customTitle}
              onChange={(e) => {
                setCustomTitle(e.target.value);
                applyFoundation({
                  title: e.target.value,
                  fieldProvenance: { ...foundation.fieldProvenance, title: { source: "user" } },
                });
              }}
              placeholder="Titolo"
              className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
            <input
              value={customSubtitle}
              onChange={(e) => {
                setCustomSubtitle(e.target.value);
                applyFoundation({
                  subtitle: e.target.value,
                  fieldProvenance: { ...foundation.fieldProvenance, subtitle: { source: "user" } },
                });
              }}
              placeholder="Sottotitolo"
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
            <div className="mt-3 grid gap-2">
              {(foundation.titleCandidates ?? []).map((opt, i) => (
                <button
                  key={`title-${i}`}
                  type="button"
                  onClick={() => {
                    setCustomTitle(opt.title);
                    setCustomSubtitle(opt.subtitle);
                    applyFoundation({ title: opt.title, subtitle: opt.subtitle });
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left hover:border-amber-300/30"
                >
                  <p className="text-sm font-semibold text-white">{opt.title}</p>
                  <p className="mt-0.5 text-xs italic text-white/55">{opt.subtitle}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel
            title="Hook commerciale"
            actions={
              <>
                <MiniBtn label="Genera hook" onClick={handleGenerateHooks} />
                <MiniBtn label="Rigenera hook" onClick={handleGenerateHooks} />
              </>
            }
          >
            <textarea
              value={customHook}
              onChange={(e) => {
                setCustomHook(e.target.value);
                applyFoundation({
                  commercialHook: e.target.value,
                  fieldProvenance: { ...foundation.fieldProvenance, commercialHook: { source: "user" } },
                });
              }}
              rows={3}
              className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
            <div className="mt-2 grid gap-2">
              {(foundation.hookCandidates ?? []).map((h, i) => (
                <button
                  key={`hook-${i}`}
                  type="button"
                  onClick={() => {
                    setCustomHook(h.hook);
                    applyFoundation({ commercialHook: h.hook });
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-left text-xs text-white/70"
                >
                  <span className="text-[10px] font-bold uppercase text-white/40">{h.label}</span>
                  <p className="mt-1">{h.hook}</p>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {step === "lock" && (
        <div className="mt-4 space-y-3">
          <Panel title="Riepilogo fondamenta" icon={<Lock className="h-3.5 w-3.5" />}>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Row label="Titolo" value={foundation.title} />
              <Row label="Sottotitolo" value={foundation.subtitle} />
              <Row label="Hook" value={foundation.commercialHook} />
              <Row label="Capitoli" value={String(foundation.chapterCount)} />
              <Row label="Struttura" value={foundation.structurePreset} />
              <Row label="Pubblico" value={foundation.targetAudience} />
            </dl>
            {!isNonfiction && (
              <p className="mt-2 text-[11px] text-white/50">
                Cast: {(foundation.foundationCharacters ?? []).map((c) => c.name).filter(Boolean).join(" · ") || "—"}
              </p>
            )}
          </Panel>
        </div>
      )}

      <footer className="mt-4 flex flex-wrap items-center gap-2">
        {step !== "lock" && (
          <button
            type="button"
            onClick={handleNextStep}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/80"
          >
            Avanti
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
        {step === "lock" && (
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold",
              canConfirm
                ? "border border-emerald-300/40 bg-emerald-500/25 text-emerald-50"
                : "border border-white/10 bg-white/[0.04] text-white/35",
            )}
          >
            <Check className="h-3.5 w-3.5" />
            Conferma fondamenta e continua
          </button>
        )}
        <button
          type="button"
          onClick={handleAutoComplete}
          className="inline-flex items-center gap-1 rounded-xl border border-violet-300/30 bg-violet-500/15 px-3 py-2 text-xs font-medium text-violet-100"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Completa ciò che manca
        </button>
      </footer>
    </section>
  );
}

function Panel({
  title,
  children,
  actions,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
          {icon}
          {title}
        </p>
        {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-white/35">{label}</dt>
      <dd className="text-xs text-white/75">{value || "—"}</dd>
    </div>
  );
}

function MiniBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-amber-300/25 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-100"
    >
      {label}
    </button>
  );
}
