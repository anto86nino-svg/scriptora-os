import { useState, type ReactNode } from "react";
import { Loader2, Zap } from "lucide-react";
import type {
  ExpressControlLevel,
  ExpressForgeInput,
  ExpressTitleMode,
} from "@/lib/guided-interview/express-forge-types";
import { cn } from "@/lib/utils";

const GENRES = [
  "romance",
  "dark romance",
  "thriller",
  "horror",
  "fantasy",
  "self-help",
  "manuale",
  "poesia",
  "altro",
];

const LANGUAGES = ["Italiano", "Inglese", "Spagnolo", "Francese", "Tedesco", "Auto"];
const TONES = [
  "oscuro",
  "emozionale",
  "commerciale",
  "poetico",
  "diretto",
  "psicologico",
  "epico",
  "didattico",
];
const LENGTHS: ExpressForgeInput["length"][] = ["breve", "medio", "lungo", "pro"];
const CONTROL_LEVELS: { id: ExpressControlLevel; label: string }[] = [
  { id: "auto", label: "Fai tu, voglio partire subito" },
  { id: "scenarios", label: "Fammi scegliere tra 3 scenari" },
  { id: "minimal", label: "Chiedimi solo se manca qualcosa di critico" },
];

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
  const [genre, setGenre] = useState("dark romance");
  const [language, setLanguage] = useState("Italiano");
  const [titleMode, setTitleMode] = useState<ExpressTitleMode>("suggest");
  const [title, setTitle] = useState("");
  const [protagonistSeed, setProtagonistSeed] = useState("");
  const [tone, setTone] = useState("oscuro");
  const [length, setLength] = useState<ExpressForgeInput["length"]>("medio");
  const [controlLevel, setControlLevel] = useState<ExpressControlLevel>("scenarios");

  const canSubmit = protagonistSeed.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSubmit || preparing) return;
    onSubmit({
      genre,
      language,
      titleMode,
      title: title.trim() || undefined,
      protagonistSeed: protagonistSeed.trim(),
      tone,
      length,
      controlLevel,
    });
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
            Poche scelte essenziali. Scriptora completa il resto e ti porta subito al blueprint.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-white/45 hover:text-white/70"
        >
          Chiudi
        </button>
      </div>

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
                onClick={() => setTitleMode(mode)}
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
          {titleMode !== "suggest" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo del libro"
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
            />
          )}
        </Field>

        <Field label="Chi o cosa è al centro del libro?" className={compact ? "" : "sm:col-span-2"}>
          <input
            value={protagonistSeed}
            onChange={(e) => setProtagonistSeed(e.target.value)}
            placeholder="Es. una chef in fuga dal passato"
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          />
        </Field>

        <Field label="Tono">
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm text-white"
          >
            {TONES.map((t) => (
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
            {LENGTHS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Livello di controllo" className={compact ? "" : "sm:col-span-2"}>
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
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || preparing}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Prepara blueprint
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-white/12 px-4 py-3 text-sm font-medium text-white/70"
        >
          Voglio costruirlo con calma
        </button>
      </div>
    </section>
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
