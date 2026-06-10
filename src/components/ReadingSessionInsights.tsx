import { X, ExternalLink } from "lucide-react";
import {
  LISTENING_NOTE_OPTIONS,
  groupNotesByChapter,
  type ChapterNoteGroup,
  type ListeningNote,
} from "@/lib/reading-session";

interface Props {
  notes: ListeningNote[];
  onClose: () => void;
  onOpenInEditor?: (chapterIndex: number, paragraphIndex: number) => void;
}

function labelForType(type: ListeningNote["noteType"]): string {
  return LISTENING_NOTE_OPTIONS.find((o) => o.type === type)?.label || type;
}

function iconForType(type: ListeningNote["noteType"]): string {
  const cat = LISTENING_NOTE_OPTIONS.find((o) => o.type === type)?.category;
  return cat === "positive" ? "★" : "⚠";
}

export function ReadingSessionInsights({ notes, onClose, onOpenInEditor }: Props) {
  const groups = groupNotesByChapter(notes);

  return (
    <div className="absolute inset-0 z-40 flex flex-col rounded-2xl border border-white/10 bg-slate-950/96 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Reading Session Insights</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Your listening observations</h3>
          <p className="mt-1 text-xs text-white/55">Author notes only — no AI analysis.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/15 p-2 text-white/70 hover:bg-white/10"
          aria-label="Close insights"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            No notes this session. In Editor Mode, tap a quick note while listening to capture what you hear.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <ChapterGroup
                key={group.chapterIndex}
                group={group}
                onOpenInEditor={onOpenInEditor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChapterGroup({
  group,
  onOpenInEditor,
}: {
  group: ChapterNoteGroup;
  onOpenInEditor?: (chapterIndex: number, paragraphIndex: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold text-white">
        {group.chapterTitle || `Chapter ${group.chapterIndex + 1}`}
      </p>
      <ul className="mt-3 space-y-3">
        {group.notes.map((note) => (
          <li key={note.id} className="rounded-xl border border-white/8 bg-slate-900/60 px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm text-white/90">
                <span className="mr-1.5">{iconForType(note.noteType)}</span>
                {labelForType(note.noteType)}
              </p>
              <span className="text-[11px] text-white/45">Paragraph {note.paragraphIndex}</span>
            </div>
            {note.excerpt && (
              <p className="mt-1.5 text-xs italic leading-5 text-white/50 line-clamp-2">{note.excerpt}</p>
            )}
            {onOpenInEditor && (
              <button
                type="button"
                onClick={() => onOpenInEditor(group.chapterIndex, note.paragraphIndex)}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-200 hover:text-cyan-100"
              >
                <ExternalLink className="h-3 w-3" />
                Open in Editor
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
