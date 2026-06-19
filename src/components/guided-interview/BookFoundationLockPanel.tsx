import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Lock, RefreshCw, Sparkles, Users } from "lucide-react";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type {
  BookFoundationLock,
  BookLengthPreset,
  CommercialHookOption,
  TitleSubtitleOption,
} from "@/lib/guided-interview/book-foundation-lock";
import {
  LENGTH_PRESET_CONFIGS,
  generateCommercialHookOptions,
  generateFoundationSuggestions,
  generateGenreAwareCharacters,
  generateTitleSubtitleOptions,
  foundationInputFromState,
  validateBookFoundationFields,
} from "@/lib/guided-interview/book-foundation-lock";
import { isNonfictionExpressGenre } from "@/lib/guided-interview/express-genre-config";
import { cn } from "@/lib/utils";

export type BookFoundationLockPanelProps = {
  state: GuidedInterviewState;
  foundation: BookFoundationLock;
  onUpdate: (foundation: BookFoundationLock) => void;
  onConfirm: () => void;
  compact?: boolean;
  className?: string;
};

export function BookFoundationLockPanel({
  state,
  foundation,
  onUpdate,
  onConfirm,
  compact = false,
  className,
}: BookFoundationLockPanelProps) {
  const [customTitle, setCustomTitle] = useState(foundation.title);
  const [customSubtitle, setCustomSubtitle] = useState(foundation.subtitle);
  const input = useMemo(() => foundationInputFromState(state), [state]);

  const isNonfiction = isNonfictionExpressGenre(foundation.genre);
  const canConfirm = foundation.missingFields.length === 0;

  const applyFoundation = (next: Partial<BookFoundationLock>) => {
    const merged = { ...foundation, ...next };
    merged.missingFields = validateBookFoundationFields(merged);
    onUpdate(merged);
  };

  const handleGenerateAll = () => {
    const suggested = generateFoundationSuggestions(state);
    applyFoundation(suggested);
    setCustomTitle(suggested.title);
    setCustomSubtitle(suggested.subtitle);
  };

  const handleGenerateCharacters = () => {
    applyFoundation({ characters: generateGenreAwareCharacters(input) });
  };

  const handleRegenerateTitles = () => {
    const options = generateTitleSubtitleOptions(input);
    applyFoundation({ titleCandidates: options });
  };

  const handleRegenerateHooks = () => {
    const hooks = generateCommercialHookOptions(input);
    applyFoundation({
      hookCandidates: hooks,
      commercialHook: hooks[1]?.hook || hooks[0]?.hook || "",
    });
  };

  const handleSelectTitle = (option: TitleSubtitleOption) => {
    setCustomTitle(option.title);
    setCustomSubtitle(option.subtitle);
    applyFoundation({ title: option.title, subtitle: option.subtitle });
  };

  const handleSelectHook = (option: CommercialHookOption) => {
    applyFoundation({ commercialHook: option.hook });
  };

  const handleLengthChange = (preset: BookLengthPreset) => {
    const config = LENGTH_PRESET_CONFIGS[preset];
    applyFoundation({
      lengthPreset: preset,
      chapterCount: config.chapterCount,
      subchaptersEnabled: config.subchaptersDefault,
      structurePreset: `${preset} · ${config.pacing}`,
    });
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-amber-400/25 bg-gradient-to-b from-amber-500/10 to-transparent p-4",
        className,
      )}
      aria-label="Configura fondamenta del libro"
    >
      <div>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/90">
          <Lock className="h-3.5 w-3.5" />
          Configura fondamenta del libro
        </p>
        <p className="mt-1 text-sm leading-6 text-white/70">
          Prima del blueprint blocchiamo titolo, personaggi, hook, lingua e struttura — così non partiamo deboli.
        </p>
      </div>

      {foundation.missingFields.length > 0 && (
        <div className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200/90">
            Mancano le fondamenta del libro
          </p>
          <p className="mt-1 text-xs text-rose-100/80">{foundation.missingFields.join(" · ")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MiniAction label="Genera tutto" onClick={handleGenerateAll} />
            <MiniAction label="Genera personaggi" onClick={handleGenerateCharacters} />
            <MiniAction label="Genera 3 titoli" onClick={handleRegenerateTitles} />
            <MiniAction label="Genera hook" onClick={handleRegenerateHooks} />
          </div>
        </div>
      )}

      <div className={cn("mt-4 grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-2")}>
        <Block title="Lunghezza e struttura" icon={<BookOpen className="h-3.5 w-3.5" />}>
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
                {LENGTH_PRESET_CONFIGS[preset].label} (
                {foundation.lengthPreset === preset
                  ? foundation.chapterCount
                  : LENGTH_PRESET_CONFIGS[preset].chapterCount}{" "}
                cap.)
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/45">
            {LENGTH_PRESET_CONFIGS[foundation.lengthPreset]?.description}
          </p>
        </Block>

        <Block title="Lingua e genere" icon={<Sparkles className="h-3.5 w-3.5" />}>
          <dl className="space-y-1 text-[11px] text-white/60">
            <Row label="Genere" value={foundation.genre} />
            <Row label="Lingua" value={foundation.language} />
            <Row label="Capitoli" value={String(foundation.chapterCount)} />
            <Row label="Sottocapitoli" value={foundation.subchaptersEnabled ? "Sì" : "No"} />
          </dl>
        </Block>
      </div>

      <Block
        className="mt-4"
        title={isNonfiction ? "Lettore, problema e metodo" : "Personaggi e forze del libro"}
        icon={<Users className="h-3.5 w-3.5" />}
        actions={
          <>
            <MiniAction label="Genera personaggi" onClick={handleGenerateCharacters} />
            <MiniAction label="Rigenera variante" onClick={handleGenerateAll} />
          </>
        }
      >
        {isNonfiction && foundation.nonfictionSubjects ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            <Row label="Lettore ideale" value={foundation.nonfictionSubjects.idealReader ?? foundation.targetAudience} />
            <Row label="Problema" value={foundation.nonfictionSubjects.readerProblem ?? ""} />
            <Row label="Metodo" value={foundation.nonfictionSubjects.methodFramework ?? ""} />
            <Row label="Trasformazione" value={foundation.nonfictionSubjects.transformationPromise ?? ""} />
          </dl>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {foundation.characters.map((c) => (
              <article key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">{c.role}</p>
                <p className="mt-1 text-sm font-semibold text-white">{c.name}</p>
                {c.wound && <p className="mt-1 text-[11px] text-white/55">Ferita: {c.wound}</p>}
                {c.desire && <p className="text-[11px] text-white/45">Desiderio: {c.desire}</p>}
              </article>
            ))}
          </div>
        )}
      </Block>

      <Block
        className="mt-4"
        title="Titolo, sottotitolo e hook"
        icon={<Sparkles className="h-3.5 w-3.5" />}
        actions={
          <>
            <MiniAction label="Rigenera 3 opzioni" onClick={handleRegenerateTitles} />
            <MiniAction label="Rigenera hook" onClick={handleRegenerateHooks} />
          </>
        }
      >
        <div className="grid gap-2">
          <input
            value={customTitle}
            onChange={(e) => {
              setCustomTitle(e.target.value);
              applyFoundation({ title: e.target.value });
            }}
            placeholder="Titolo del libro"
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          />
          <input
            value={customSubtitle}
            onChange={(e) => {
              setCustomSubtitle(e.target.value);
              applyFoundation({ subtitle: e.target.value });
            }}
            placeholder="Sottotitolo commerciale"
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          />
        </div>

        {(foundation.titleCandidates ?? []).length > 0 && (
          <div className="mt-3 grid gap-2">
            {(foundation.titleCandidates ?? []).map((opt, i) => (
              <button
                key={`title-${i}`}
                type="button"
                onClick={() => handleSelectTitle(opt)}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left hover:border-amber-300/30"
              >
                <p className="text-sm font-semibold text-white">{opt.title}</p>
                <p className="mt-0.5 text-xs italic text-white/55">{opt.subtitle}</p>
                <p className="mt-1 text-[10px] text-white/40">{opt.commercialReason}</p>
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">Hook commerciale</p>
        <p className="mt-1 text-xs leading-5 text-violet-100/90">{foundation.commercialHook || "—"}</p>
        <div className="mt-2 grid gap-2">
          {(foundation.hookCandidates ?? []).map((hook) => (
            <button
              key={hook.type}
              type="button"
              onClick={() => handleSelectHook(hook)}
              className="rounded-lg border border-white/10 px-3 py-2 text-left text-[11px] text-white/70 hover:border-violet-300/30"
            >
              <span className="font-semibold text-white/50">{hook.label}: </span>
              {hook.hook}
            </button>
          ))}
        </div>
      </Block>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black disabled:opacity-40"
      >
        <Lock className="h-4 w-4" />
        Conferma fondamenta e genera blueprint
      </button>
    </section>
  );
}

function Block({
  title,
  icon,
  children,
  actions,
  className,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
          {icon}
          {title}
        </p>
        {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-white/40">{label}</dt>
      <dd className="line-clamp-2 text-white/70">{value || "—"}</dd>
    </div>
  );
}

function MiniAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-white/12 px-2 py-1 text-[10px] font-medium text-white/65 hover:text-white"
    >
      <RefreshCw className="h-3 w-3" />
      {label}
    </button>
  );
}
