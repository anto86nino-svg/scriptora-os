import { forwardRef, useImperativeHandle } from "react";
import {
  Bookmark, BookmarkPlus, ChevronLeft, ChevronRight, Headphones, Pause, Play, Square, Volume2, AlertTriangle,
} from "lucide-react";
import type { AudiobookChapter } from "@/lib/audiobook-export";
import { formatAudiobookDuration } from "@/lib/audiobook-export";
import { audiobookListenModeLabel } from "@/lib/audiobook-capabilities";
import { HUMAN_READING_MODES, type HumanReadingModeId } from "@/lib/human-reading-engine";
import { useHumanSpeechPlayer } from "@/hooks/useHumanSpeechPlayer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface HumanReadingPlayerHandle {
  playPreview: () => void;
  playFull: () => void;
}

interface HumanReadingPlayerProps {
  projectId: string;
  bookTitle?: string;
  language: string;
  chapters: AudiobookChapter[];
  initialChapterIndex?: number;
  className?: string;
}

function statusLabel(status: string): string {
  switch (status) {
    case "idle": return "Pronto";
    case "loading": return "Caricamento…";
    case "playing": return "In ascolto";
    case "paused": return "In pausa";
    case "stopped": return "Fermato";
    case "completed": return "Completato";
    case "unsupported": return "Non supportato";
    default: return "Pronto";
  }
}

export const HumanReadingPlayer = forwardRef<HumanReadingPlayerHandle, HumanReadingPlayerProps>(
  function HumanReadingPlayer(
    {
      projectId,
      bookTitle,
      language,
      chapters,
      initialChapterIndex = 0,
      className,
    },
    ref,
  ) {
    const player = useHumanSpeechPlayer({
      projectId,
      language,
      chapters,
      initialChapterIndex,
    });

    useImperativeHandle(ref, () => ({
      playPreview: () => player.playPreview(),
      playFull: () => player.playFull(),
    }), [player]);

    if (chapters.length === 0) {
      return (
        <div className={cn("rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60", className)}>
          Nessun capitolo leggibile per l'audiolibro interno.
        </div>
      );
    }

    if (!player.supported) {
      return (
        <div className={cn("rounded-xl border border-amber-400/30 bg-amber-950/20 p-4", className)}>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Lettura vocale non disponibile
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-100/75">
            Questo browser non supporta la sintesi vocale. Puoi scaricare copione e manifest audiolibro.
          </p>
        </div>
      );
    }

    const elapsed = Math.round((player.progressPercent / 100) * player.estimatedMinutes);
    const isPlaying = player.status === "playing";
    const isPaused = player.status === "paused";

    const handlePlayPause = () => {
      if (isPlaying) {
        player.pause();
        return;
      }
      if (isPaused) {
        player.resume();
        return;
      }
      player.playFull();
    };

    return (
      <div
        className={cn(
          "max-w-full overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-slate-950/80 via-slate-900/50 to-sky-950/25 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)] safe-area-pb",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-200/80">
              <Headphones className="h-3.5 w-3.5 shrink-0" />
              Human Reading Player · {audiobookListenModeLabel()}
            </p>
            {bookTitle && (
              <p className="mt-1 truncate text-xs text-white/55">{bookTitle}</p>
            )}
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {player.currentChapter?.title || `Capitolo ${player.chapterIndex + 1}`}
            </p>
            <p className="text-[11px] text-white/55">
              {formatAudiobookDuration(elapsed)} / {formatAudiobookDuration(player.estimatedMinutes)}
              {" · "}Cap. {player.chapterIndex + 1}/{chapters.length}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            {statusLabel(player.status)}
          </span>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300 transition-all duration-300"
            style={{ width: `${Math.min(100, player.progressPercent)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={player.previousChapter}
            disabled={player.chapterIndex <= 0}
            className="inline-flex h-11 min-h-[44px] min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white disabled:opacity-40"
            aria-label="Capitolo precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handlePlayPause}
            className="inline-flex h-12 min-h-[44px] min-w-[132px] items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {isPlaying ? "Pausa" : isPaused ? "Riprendi" : "Play"}
          </button>
          <button
            type="button"
            onClick={player.stop}
            className="inline-flex h-11 min-h-[44px] min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={player.nextChapter}
            disabled={player.chapterIndex >= chapters.length - 1}
            className="inline-flex h-11 min-h-[44px] min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white disabled:opacity-40"
            aria-label="Capitolo successivo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex min-h-[44px] flex-col justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Velocità</span>
            <select
              value={player.rate}
              onChange={(e) => player.setRate(Number(e.target.value) as typeof player.rate)}
              className="h-9 w-full rounded-md border border-white/10 bg-transparent text-xs font-medium text-white outline-none"
            >
              {player.speedOptions.map((value) => (
                <option key={value} value={value}>{value}x</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[44px] flex-col justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Modalità</span>
            <select
              value={player.modeId}
              onChange={(e) => player.setModeId(e.target.value as HumanReadingModeId)}
              className="h-9 w-full rounded-md border border-white/10 bg-transparent text-xs font-medium text-white outline-none"
            >
              {Object.values(HUMAN_READING_MODES).map((mode) => (
                <option key={mode.id} value={mode.id}>{mode.label}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex min-h-[44px] flex-col justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 sm:col-span-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <Volume2 className="h-3 w-3" />
              Voce dispositivo
            </span>
            <select
              value={player.voiceKey}
              onChange={(e) => player.setVoiceKey(e.target.value)}
              className="h-9 w-full rounded-md border border-white/10 bg-transparent text-xs font-medium text-white outline-none"
            >
              <option value="auto">Migliore disponibile</option>
              {player.availableVoices.map((voice, index) => (
                <option key={`${voice.name}-${voice.lang}-${index}`} value={String(index)}>
                  {voice.name} · {voice.lang}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              player.resumeFromBookmark();
              toast.message("Ripresa dal segnalibro");
            }}
            disabled={!player.hasBookmark}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 text-xs font-semibold text-amber-100 disabled:opacity-40 sm:flex-none"
          >
            <Bookmark className="h-3.5 w-3.5" />
            Riprendi da segnalibro
          </button>
          <button
            type="button"
            onClick={() => {
              player.saveBookmark();
              toast.success("Segnalibro salvato");
            }}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] px-3 text-xs font-semibold text-white sm:flex-none"
          >
            <BookmarkPlus className="h-3.5 w-3.5" />
            Salva segnalibro
          </button>
        </div>

        <p className="mt-3 text-center text-[11px] leading-5 text-white/50">
          La qualità della voce dipende dalle voci installate sul dispositivo (iPhone, Android, Mac, Chrome).
          Nessuna API esterna · zero crediti · nessun file MP3 generato.
        </p>
      </div>
    );
  },
);
