import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Sparkles, Zap } from "lucide-react";
import type {
  ExpressBookFormat,
  ExpressControlLevel,
  ExpressForgeInput,
  ExpressTitleMode,
} from "@/lib/guided-interview/express-forge-types";
import {
  getExpressDefaultTone,
  getExpressIdeaFieldConfig,
  getExpressLengthOptions,
  getExpressPanelIntro,
  getExpressTones,
} from "@/lib/guided-interview/express-genre-config";
import {
  applyBestTitleOption,
  buildExpressTitleGeneratorInput,
  generateTitleSubtitleOptions,
  type TitleSubtitleOption,
} from "@/lib/guided-interview/book-foundation-lock";
import { regenerateSimilarTitleOptions } from "./studio-express-title-helpers";
import { expressSubmitAllowed } from "./studio-express-ui";
import { cn } from "@/lib/utils";

const GENRES = [
  "romance",
  "dark romance",
  "thriller",
  "horror",
  "fantasy",
  "self-help",
  "business",
  "manuale",
  "saggio",
  "poesia",
  "altro",
];

const BOOK_FORMATS: { value: ExpressBookFormat; label: string }[] = [
  { value: "novel", label: "Romanzo" },
  { value: "novella", label: "Novella / romanzo breve" },
  { value: "poetry_collection", label: "Raccolta poetica" },
  { value: "short_story_collection", label: "Raccolta di racconti" },
  { value: "essay", label: "Saggio" },
  { value: "memoir", label: "Memoir" },
  { value: "self_help", label: "Self-help / crescita personale" },
  { value: "study_material", label: "Materiale di studio" },
  { value: "children_book", label: "Libro per bambini" },
  { value: "mixed_or_unknown", label: "Misto / non so ancora" },
];

const LANGUAGES = ["Italiano", "Inglese", "Spagnolo", "Francese", "Tedesco", "Auto"];
const CONTROL_LEVELS: { id: ExpressControlLevel; label: string }[] = [
  { id: "auto", label: "Fai tu, voglio partire subito" },
  { id: "scenarios", label: "Fammi scegliere tra 3 libri possibili" },
  { id: "minimal", label: "Chiedimi solo se manca qualcosa di critico" },
];

const AUTO_PROMISES = [
  "Titolo",
  "Sottotitolo",
  "Hook",
  "Personaggi",
  "Struttura",
  "Fondamenta del libro",
] as const;

export type StudioExpressPanelProps = {
  onSubmit: (input: ExpressForgeInput) => void;
  onClose: () => void;
  preparing?: boolean;
  compact?: boolean;
  className?: string;
};

export function StudioExpressPanel({
  onSubmit,
  onClose,
  preparing = false,
  compact = false,
  className,
}: StudioExpressPanelProps) {
  const [bookFormat, setBookFormat] = useState<ExpressBookFormat>("novel");
  const [genre, setGenre] = useState("dark romance");
  const [language, setLanguage] = useState("Italiano");
  const [titleMode, setTitleMode] = useState<ExpressTitleMode>("suggest");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [titleCandidates, setTitleCandidates] = useState<TitleSubtitleOption[]>([]);
  const [recommendedIndex, setRecommendedIndex] = useState<number | null>(null);
  const [manualLocked, setManualLocked] = useState(false);
  const [ideaSeed, setIdeaSeed] = useState("");
  const [tone, setTone] = useState("oscuro");
  const [length, setLength] = useState<ExpressForgeInput["length"]>("medio");
  const [controlLevel, setControlLevel] = useState<ExpressControlLevel>("scenarios");

  const titleEditRef = useRef<HTMLInputElement>(null);
  const manualEditRef = useRef<HTMLDivElement>(null);

  const isAutoMode = controlLevel === "auto";
  const ideaField = getExpressIdeaFieldConfig(genre);
  const tones = getExpressTones(genre);
  const lengthOptions = getExpressLengthOptions(genre);
  const panelIntro = getExpressPanelIntro(genre);

  useEffect(() => {
    if (bookFormat === "poetry_collection" && genre !== "poesia") {
      setGenre("poesia");
    }
  }, [bookFormat, genre]);

  useEffect(() => {
    const available = getExpressTones(genre);
    const defaultTone = getExpressDefaultTone(genre);
    setTone((current) => (available.includes(current) ? current : defaultTone));
  }, [genre]);

  const titleGenInput = useMemo(
    () =>
      buildExpressTitleGeneratorInput({
        genre,
        language,
        tone,
        length,
        ideaSeed,
        titleMode,
        title,
        subtitle,
      }),
    [genre, language, tone, length, ideaSeed, titleMode, title, subtitle],
  );

  const recommendedOption = useMemo(() => {
    if (!titleCandidates.length) return null;
    return applyBestTitleOption(titleCandidates);
  }, [titleCandidates]);

  const applyOption = useCallback((option: TitleSubtitleOption, lockManual = false) => {
    setTitle(option.title);
    setSubtitle(option.subtitle);
    if (lockManual) setManualLocked(false);
  }, []);

  const generateTitles = useCallback(
    (opts?: { applyBest?: boolean; overwriteManual?: boolean }) => {
      if (manualLocked && !opts?.overwriteManual) return false;
      const options = generateTitleSubtitleOptions(titleGenInput);
      setTitleCandidates(options);
      const best = applyBestTitleOption(options);
      const bestIdx = options.findIndex(
        (o) => o.title === best.title && o.subtitle === best.subtitle,
      );
      setRecommendedIndex(bestIdx >= 0 ? bestIdx : 0);
      if (opts?.applyBest) {
        applyOption(best);
      }
      return true;
    },
    [applyOption, manualLocked, titleGenInput],
  );

  const handleTitleModeChange = (mode: ExpressTitleMode) => {
    setTitleMode(mode);
    if (mode === "suggest") {
      generateTitles({ applyBest: true, overwriteManual: !manualLocked });
    }
  };

  const handleGenerateClick = () => {
    if (manualLocked) {
      const ok = window.confirm(
        "Hai già scritto titolo o sottotitolo. Sostituirli con nuove proposte?",
      );
      if (!ok) return;
      setManualLocked(false);
    }
    generateTitles({ applyBest: false, overwriteManual: true });
  };

  const handleRegenerateSimilar = (anchor: TitleSubtitleOption) => {
    if (manualLocked) {
      const ok = window.confirm("Sostituire le proposte con varianti simili?");
      if (!ok) return;
      setManualLocked(false);
    }
    const similar = regenerateSimilarTitleOptions(titleGenInput, anchor);
    setTitleCandidates(similar);
    setRecommendedIndex(0);
  };

  const handleUseBest = () => {
    if (!recommendedOption) {
      generateTitles({ applyBest: true, overwriteManual: manualLocked ? false : true });
      return;
    }
    if (manualLocked) {
      const ok = window.confirm("Sostituire titolo e sottotitolo con la proposta consigliata?");
      if (!ok) return;
      setManualLocked(false);
    }
    applyOption(recommendedOption);
  };

  const handleUseOption = (option: TitleSubtitleOption, index: number) => {
    if (manualLocked) {
      const ok = window.confirm("Sostituire titolo e sottotitolo con questa proposta?");
      if (!ok) return;
      setManualLocked(false);
    }
    applyOption(option);
    setRecommendedIndex(index);
  };

  const focusManualEdit = () => {
    window.requestAnimationFrame(() => {
      manualEditRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      titleEditRef.current?.focus();
    });
  };

  const handleModifyOption = (option: TitleSubtitleOption) => {
    setTitleMode("provided");
    setTitle(option.title);
    setSubtitle(option.subtitle);
    setManualLocked(true);
    focusManualEdit();
  };

  const handleWriteMyOwn = () => {
    setTitleMode("provided");
    setManualLocked(true);
    focusManualEdit();
  };

  const titleIncomplete = !title.trim() || !subtitle.trim();
  const canSubmit = expressSubmitAllowed(controlLevel, ideaSeed);

  const submitExpress = (level: ExpressControlLevel = controlLevel) => {
    if (!expressSubmitAllowed(level, ideaSeed) || preparing) return;
    let finalTitle = title.trim();
    let finalSubtitle = subtitle.trim();
    if (level !== "auto" && titleMode === "suggest" && (!finalTitle || !finalSubtitle)) {
      const options = generateTitleSubtitleOptions(titleGenInput);
      const best = applyBestTitleOption(options);
      finalTitle = best.title;
      finalSubtitle = best.subtitle;
    }
    onSubmit({
      bookFormat,
      genre,
      language,
      titleMode: level === "auto" ? "suggest" : titleMode,
      title: finalTitle || undefined,
      subtitle: finalSubtitle || undefined,
      ideaSeed: ideaSeed.trim(),
      tone,
      length,
      controlLevel: level,
    });
  };

  const handleSubmit = () => submitExpress();

  const handleCreateAll = () => {
    setControlLevel("auto");
    submitExpress("auto");
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-violet-400/25 bg-gradient-to-b from-violet-500/12 to-transparent p-4",
        className,
      )}
      aria-label="Studio Express"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/90">
            <Zap className="h-3.5 w-3.5" />
            Studio Express
          </p>
          <p className="mt-1 text-sm leading-6 text-white/70">
            {isAutoMode
              ? "Scegli genere e lingua — Scriptora costruisce il resto."
              : panelIntro}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-white/45 hover:text-white/70"
        >
          Voglio costruirlo con calma
        </button>
      </div>

      <button
        type="button"
        onClick={handleCreateAll}
        disabled={preparing}
        className="mt-4 flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300/45 bg-gradient-to-r from-amber-500/35 via-violet-500/35 to-violet-600/35 px-4 py-3 text-sm font-bold tracking-wide text-white shadow-lg shadow-violet-900/25 disabled:opacity-40"
      >
        {preparing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Sparkles className="h-5 w-5 text-amber-200" />
        )}
        ✨ CREA TUTTO TU
      </button>

      <div className={cn("mt-4 grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        <Field label="Genere">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lingua">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Formato libro">
          <select
            value={bookFormat}
            onChange={(e) => setBookFormat(e.target.value as ExpressBookFormat)}
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          >
            {BOOK_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
        </Field>

        {bookFormat === "poetry_collection" && (
          <div className={cn("rounded-xl border border-fuchsia-300/25 bg-fuchsia-500/10 p-3", compact ? "" : "sm:col-span-2")}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-fuchsia-100/90">
              Modalità poesia rilevata
            </p>
            <p className="mt-1 text-xs leading-5 text-fuchsia-50/80">
              Scriptora costruirà voce poetica, sezioni, immagini ricorrenti ed eco finale. Niente struttura da romanzo, niente tropi romance forzati.
            </p>
          </div>
        )}

        {isAutoMode ? (
          <div className={cn("rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3", compact ? "" : "sm:col-span-2")}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/90">
              Scriptora creerà automaticamente
            </p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {AUTO_PROMISES.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-xs text-emerald-50/90">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Field label="Titolo" className={compact ? "" : "sm:col-span-2"}>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["provided", "Ho un titolo"],
                  ["provisional", "Titolo provvisorio"],
                  ["suggest", "Proponi tu"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleTitleModeChange(mode)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-medium",
                    titleMode === mode
                      ? "border-violet-300/50 bg-violet-500/20 text-violet-100"
                      : "border-white/10 bg-white/[0.04] text-white/55",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <TitleAction
                label="Genera titolo e sottotitolo"
                primary
                onClick={handleGenerateClick}
                ariaLabel="Genera titolo e sottotitolo — principale"
              />
              <TitleAction
                label="Rigenera 3 opzioni"
                onClick={handleGenerateClick}
                disabled={titleCandidates.length === 0}
              />
              <TitleAction label="Usa il migliore" onClick={handleUseBest} />
              <TitleAction label="Scrivo io" onClick={handleWriteMyOwn} />
            </div>

            {titleIncomplete && (
              <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-100/90">
                Titolo o sottotitolo mancante —{" "}
                <button
                  type="button"
                  onClick={handleGenerateClick}
                  className="font-semibold underline underline-offset-2"
                >
                  Genera titolo e sottotitolo
                </button>
              </p>
            )}

            {(titleMode === "provided" || titleMode === "provisional") && (
              <div ref={manualEditRef} className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  ref={titleEditRef}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setManualLocked(true);
                  }}
                  placeholder="Titolo del libro"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
                />
                <input
                  value={subtitle}
                  onChange={(e) => {
                    setSubtitle(e.target.value);
                    setManualLocked(true);
                  }}
                  placeholder="Sottotitolo commerciale"
                  className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
                />
              </div>
            )}

            {titleMode === "suggest" && (title.trim() || subtitle.trim()) && (
              <div className="mt-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/70">
                  Scelta attuale
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{title || "—"}</p>
                <p className="text-xs italic text-white/55">{subtitle || "—"}</p>
              </div>
            )}

            {titleCandidates.length > 0 && (
              <div className="mt-3 grid gap-2">
                {titleCandidates.map((opt, i) => (
                  <article
                    key={`title-opt-${opt.title}-${i}`}
                    className={cn(
                      "rounded-xl border p-3",
                      recommendedIndex === i
                        ? "border-emerald-300/35 bg-emerald-500/10"
                        : "border-white/10 bg-white/[0.04]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {recommendedIndex === i && (
                        <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                          Consigliato
                        </span>
                      )}
                      <span className="text-[10px] text-white/40">{opt.genreFit}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">{opt.title}</p>
                    <p className="mt-0.5 text-xs italic text-white/55">{opt.subtitle}</p>
                    <p className="mt-1 text-[10px] text-white/45">{opt.commercialReason}</p>
                    <dl className="mt-2 grid gap-0.5 text-[10px] text-white/40 sm:grid-cols-2">
                      <div>
                        <dt className="inline">Tono: </dt>
                        <dd className="inline text-white/55">{opt.toneFit}</dd>
                      </div>
                      <div>
                        <dt className="inline">Rischio: </dt>
                        <dd className="inline text-white/55">{opt.risk}</dd>
                      </div>
                    </dl>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <TitleAction
                        label="Usa questo"
                        onClick={() => handleUseOption(opt, i)}
                      />
                      <TitleAction label="Modifica" onClick={() => handleModifyOption(opt)} />
                      <TitleAction
                        label="Rigenera simili"
                        onClick={() => handleRegenerateSimilar(opt)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Field>
        )}

        <Field
          label={isAutoMode ? `${ideaField.label} (opzionale)` : ideaField.label}
          className={compact ? "" : "sm:col-span-2"}
        >
          <textarea
            value={ideaSeed}
            onChange={(e) => setIdeaSeed(e.target.value)}
            placeholder={
              isAutoMode
                ? "Opzionale — più dettagli = libro più preciso"
                : ideaField.placeholder
            }
            rows={isAutoMode ? 2 : 3}
            className="w-full resize-none rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm leading-6 text-white"
          />
        </Field>

        {!isAutoMode && (
          <>
            <Field label="Tono">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
              >
                {tones.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lunghezza">
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as ExpressForgeInput["length"])}
                className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
              >
                {lengthOptions.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {!isAutoMode && (
          <Field label="Quanto vuoi guidare Scriptora?" className={compact ? "" : "sm:col-span-2"}>
            <div className="grid gap-2">
              {CONTROL_LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setControlLevel(level.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs font-medium",
                    controlLevel === level.id
                      ? "border-violet-300/45 bg-violet-500/15 text-violet-100"
                      : "border-white/10 bg-white/[0.04] text-white/60",
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </Field>
        )}
      </div>

      {!isAutoMode && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || preparing}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Prepara 3 libri possibili
          </button>
        </div>
      )}
    </section>
  );
}

function TitleAction({
  label,
  onClick,
  primary = false,
  disabled = false,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-medium disabled:opacity-35",
        primary
          ? "border-violet-300/40 bg-violet-500/25 text-violet-50"
          : "border-white/12 bg-white/[0.05] text-white/70",
      )}
    >
      {primary && <Sparkles className="h-3 w-3" />}
      {label}
    </button>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}
