import { LISTENING_NOTE_OPTIONS } from "@/lib/reading-session";
import type { ListeningNoteType } from "@/lib/reading-session";

interface Props {
  onNote: (type: ListeningNoteType) => void;
  lastSavedType?: ListeningNoteType | null;
  compact?: boolean;
}

export function ReadingSessionQuickNotes({ onNote, lastSavedType, compact = false }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-2.5 sm:p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Quick listening notes</p>
        {lastSavedType && (
          <span className="text-[10px] font-medium text-emerald-300/90 animate-pulse">Saved</span>
        )}
      </div>
      <div className={`flex gap-2 overflow-x-auto pb-1 ${compact ? "flex-nowrap" : "flex-wrap sm:flex-nowrap"}`}>
        {LISTENING_NOTE_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => onNote(option.type)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-left text-[11px] font-semibold transition active:scale-[0.98] ${
              option.category === "positive"
                ? "border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                : "border-rose-300/25 bg-rose-300/10 text-rose-100 hover:bg-rose-300/15"
            } ${lastSavedType === option.type ? "ring-1 ring-emerald-300/50" : ""}`}
            title={option.label}
          >
            <span className="mr-1">{option.category === "positive" ? "★" : "⚠"}</span>
            {compact ? option.shortLabel : option.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-white/40">One tap — playback continues. Your observations only, no AI analysis.</p>
    </div>
  );
}
