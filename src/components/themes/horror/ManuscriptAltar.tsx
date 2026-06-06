import React from "react";
import { BookOpen, Feather } from "lucide-react";

interface ManuscriptAltarProps {
  projectTitle: string;
  authorName: string;
  wordCount: number;
  targetWordCount: number;
  currentChapterName: string;
  textPreview: string;
  onContinue: () => void;
}

export function ManuscriptAltar({
  projectTitle,
  authorName,
  wordCount,
  targetWordCount,
  currentChapterName,
  textPreview,
  onContinue,
}: ManuscriptAltarProps) {
  const progress =
    targetWordCount > 0
      ? Math.min(
          100,
          Math.round((wordCount / targetWordCount) * 100)
        )
      : 0;

  return (
    <div className="relative w-full overflow-hidden rounded-[30px] border border-red-950/20 bg-gradient-to-b from-[#0E0E12] via-[#09090B] to-black p-6 md:p-8 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,0,0,0.12),transparent_50%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6">

        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#D4AF37] text-[11px] uppercase tracking-[0.22em] font-medium">
              <BookOpen className="h-4 w-4" />
              Manuscript Altar
            </div>

            <h1 className="text-3xl md:text-5xl font-serif text-zinc-100 leading-tight">
              {projectTitle}
            </h1>

            <p className="text-sm text-zinc-500 italic">
              by {authorName}
            </p>
          </div>

          <button
            onClick={onContinue}
            className="group inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-5 py-3 text-sm uppercase tracking-[0.18em] text-zinc-300 transition-all hover:border-red-900/40 hover:bg-zinc-900 hover:text-white"
          >
            <Feather className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            Continua Scrittura
          </button>
        </div>

        <div className="rounded-[26px] border border-zinc-900 bg-black/30 p-5 md:p-7">
          <div className="mb-4 flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-zinc-500">
            <span>{currentChapterName}</span>

            <span>
              {wordCount.toLocaleString()} /{" "}
              {targetWordCount.toLocaleString()} parole
            </span>
          </div>

          <div className="mb-5 h-[5px] overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-950 via-red-800 to-[#D4AF37]"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <div className="relative overflow-hidden rounded-[20px] border border-zinc-900 bg-[#070709] p-5 md:p-7">
            <div className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-transparent via-red-900/50 to-transparent" />

            <p className="line-clamp-6 text-sm leading-8 text-zinc-400 md:text-[15px] md:leading-8 font-serif">
              {textPreview}
            </p>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070709] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
