import { memo, useMemo } from "react";
import type { AutoDetectionProposal } from "@/lib/book-forge/auto-detection-engine";
import {
  BOOK_FORMAT_OPTIONS,
  getGenresForFormat,
  isAuthorFoundationsComplete,
  type AuthorBookFormatId,
  type AuthorFoundations,
} from "@/lib/book-forge/author-format-genre-catalog";
import { CheckCircle2, Sparkles } from "lucide-react";
import AutoDetectionProposalCard from "@/components/book-forge/AutoDetectionProposal";

type Props = {
  idea?: string;
  value: Partial<AuthorFoundations>;
  onChange: (next: Partial<AuthorFoundations>) => void;
  onConfirm: () => void;
  detectionSuggestion?: AutoDetectionProposal | null;
  onAcceptDetection?: () => void;
  onModifyDetection?: () => void;
  variant?: "light" | "dark";
  confirmLabel?: string;
};

const inputDark =
  "w-full rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-300/40";
const inputLight =
  "w-full rounded-xl border border-[#d9c9b0] bg-[#faf6ee] px-3 py-2.5 text-sm text-[#1a1209] outline-none focus:border-[#f2c400]/70 focus:bg-white";

export default memo(function AuthorBookFoundationsStep({
  idea,
  value,
  onChange,
  onConfirm,
  detectionSuggestion,
  onAcceptDetection,
  onModifyDetection,
  variant = "dark",
  confirmLabel = "Conferma fondamenta",
}: Props) {
  const isDark = variant === "dark";
  const inputClass = isDark ? inputDark : inputLight;
  const labelClass = isDark
    ? "text-[10px] font-bold uppercase tracking-[0.14em] text-white/52"
    : "text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b7355]";
  const ready = isAuthorFoundationsComplete(value);

  const genreOptions = useMemo(
    () => (value.formatId ? getGenresForFormat(value.formatId) : []),
    [value.formatId],
  );

  const handleFormatChange = (formatId: AuthorBookFormatId) => {
    const format = BOOK_FORMAT_OPTIONS.find((f) => f.id === formatId);
    const genres = getGenresForFormat(formatId);
    onChange({
      ...value,
      formatId,
      formatLabel: format?.label,
      genreId: undefined,
      genreLabel: undefined,
      subgenre: genres[0]?.label,
    });
  };

  const handleGenreChange = (genreId: string) => {
    const genre = genreOptions.find((g) => g.id === genreId);
    onChange({
      ...value,
      genreId,
      genreLabel: genre?.label,
      subgenre: value.subgenre || genre?.label,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className={isDark ? "text-xl font-semibold text-white" : "text-xl font-black text-[#1a1209]"}>
          Conferma le fondamenta del libro
        </h2>
        <p className={isDark ? "mt-1 text-sm leading-6 text-white/65" : "mt-1 text-sm leading-6 text-[#5c4030]"}>
          Scegli formato e genere — Scriptora non li imposta senza la tua conferma.
        </p>
        {idea?.trim() && (
          <p className={isDark ? "mt-2 text-xs leading-5 text-white/45" : "mt-2 text-xs leading-5 text-[#8b7355]"}>
            Idea: <span className={isDark ? "text-white/70" : "text-[#5c4030]"}>{idea.trim().slice(0, 160)}{idea.trim().length > 160 ? "…" : ""}</span>
          </p>
        )}
      </div>

      {detectionSuggestion && onAcceptDetection && onModifyDetection && (
        <AutoDetectionProposalCard
          proposal={detectionSuggestion}
          onAccept={onAcceptDetection}
          onModify={onModifyDetection}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className={labelClass}>Formato *</span>
          <select
            value={value.formatId || ""}
            onChange={(event) => handleFormatChange(event.target.value as AuthorBookFormatId)}
            className={inputClass}
          >
            <option value="">Seleziona formato</option>
            {BOOK_FORMAT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Genere *</span>
          <select
            value={value.genreId || ""}
            onChange={(event) => handleGenreChange(event.target.value)}
            disabled={!value.formatId}
            className={`${inputClass} disabled:opacity-50`}
          >
            <option value="">Seleziona genere</option>
            {genreOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className={labelClass}>Sottogenere</span>
          <input
            value={value.subgenre || ""}
            onChange={(event) => onChange({ ...value, subgenre: event.target.value })}
            placeholder="Opzionale — es. thriller psicologico, poesia contemporanea"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Target lettore</span>
          <input
            value={value.targetReader || ""}
            onChange={(event) => onChange({ ...value, targetReader: event.target.value })}
            placeholder="Opzionale"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className={labelClass}>Tono</span>
          <input
            value={value.tone || ""}
            onChange={(event) => onChange({ ...value, tone: event.target.value })}
            placeholder="Opzionale"
            className={inputClass}
          />
        </label>
      </div>

      {!ready && (
        <p className={isDark ? "text-xs text-amber-200/80" : "text-xs text-[#8b7355]"}>
          Seleziona formato e genere per continuare.
        </p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!ready}
        className={
          isDark
            ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            : "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#f2c400] px-4 text-sm font-black text-[#1a1209] shadow-[0_12px_28px_rgba(242,196,0,0.22)] transition hover:bg-[#ffe06a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        }
      >
        {ready ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {confirmLabel}
      </button>
    </div>
  );
});
