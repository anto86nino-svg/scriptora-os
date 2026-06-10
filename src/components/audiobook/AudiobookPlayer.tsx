import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bookmark, ChevronLeft, ChevronRight, Headphones, Pause, Play, Square, Volume2, AlertTriangle,
} from "lucide-react";
import type { Language } from "@/types/book";
import type { AudiobookChapter } from "@/lib/audiobook-export";
import { estimateAudiobookDuration, formatAudiobookDuration } from "@/lib/audiobook-export";
import { audiobookListenModeLabel } from "@/lib/audiobook-capabilities";
import {
  loadAudiobookProgress,
  saveAudiobookProgress,
} from "@/lib/audiobook-progress";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;
const BASE_RATE = 0.92;
const PREVIEW_SENTENCE_LIMIT = 4;

type PlaybackState = "ready" | "playing" | "paused" | "completed";

export interface AudiobookPlayerHandle {
  playPreview: () => void;
  playFull: () => void;
}

interface AudiobookPlayerProps {
  projectId: string;
  language: Language | string;
  chapters: AudiobookChapter[];
  initialChapterIndex?: number;
  className?: string;
}

function languageToLocale(language: string): string {
  switch (language) {
    case "Italian": return "it-IT";
    case "Spanish": return "es-ES";
    case "French": return "fr-FR";
    case "German": return "de-DE";
    default: return "en-US";
  }
}

function splitSentences(text: string): string[] {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .filter((chunk) => chunk.trim().length > 0);
}

function pickVoice(language: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const prefix = language === "Italian" ? "it"
    : language === "Spanish" ? "es"
    : language === "French" ? "fr"
    : language === "German" ? "de"
    : "en";
  const voices = window.speechSynthesis.getVoices() || [];
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  return candidates[0] || voices[0] || null;
}

function statusLabel(state: PlaybackState): string {
  switch (state) {
    case "ready": return "Pronto";
    case "playing": return "In ascolto";
    case "paused": return "In pausa";
    case "completed": return "Completato";
  }
}

function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export const AudiobookPlayer = forwardRef<AudiobookPlayerHandle, AudiobookPlayerProps>(
  function AudiobookPlayer(
    {
      projectId,
      language,
      chapters,
      initialChapterIndex = 0,
      className,
    },
    ref,
  ) {
    const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
    const [playback, setPlayback] = useState<PlaybackState>("ready");
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
    const [voiceKey, setVoiceKey] = useState("auto");
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [sentenceIndex, setSentenceIndex] = useState(0);
    const [hasBookmark, setHasBookmark] = useState(false);

    const sessionRef = useRef(0);
    const previewModeRef = useRef(false);
    const sentencesRef = useRef<string[]>([]);
    const sentenceIndexRef = useRef(0);

    const currentChapter = chapters[chapterIndex] || null;
    const sentences = useMemo(
      () => (currentChapter ? splitSentences(currentChapter.text) : []),
      [currentChapter],
    );

    useEffect(() => {
      sentencesRef.current = sentences;
    }, [sentences]);

    useEffect(() => {
      const saved = loadAudiobookProgress(projectId);
      if (saved) {
        const idx = Math.min(saved.chapterIndex, Math.max(0, chapters.length - 1));
        setChapterIndex(idx);
        setSentenceIndex(saved.sentenceIndex);
        sentenceIndexRef.current = saved.sentenceIndex;
        setProgress(saved.progress);
        setHasBookmark(saved.sentenceIndex > 0 || saved.progress > 0);
      }
    }, [projectId, chapters.length]);

    useEffect(() => {
      if (!speechSupported()) return;
      const load = () => setVoices(window.speechSynthesis.getVoices() || []);
      load();
      window.speechSynthesis.onvoiceschanged = load;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }, []);

    useEffect(() => () => {
      if (speechSupported()) window.speechSynthesis.cancel();
    }, []);

    const estimatedChapterMinutes = currentChapter?.estimatedMinutes
      ?? estimateAudiobookDuration(currentChapter?.text || "");
    const elapsedMinutes = Math.round((progress / 100) * estimatedChapterMinutes);

    const persistPosition = useCallback((idx: number, pct: number, chapter = chapterIndex) => {
      if (!currentChapter) return;
      const payload = {
        projectId,
        chapterIndex: chapter,
        sentenceIndex: idx,
        progress: pct,
        updatedAt: new Date().toISOString(),
      };
      saveAudiobookProgress(payload);
      setHasBookmark(idx > 0 || pct > 0);
    }, [chapterIndex, currentChapter, projectId]);

    const speakFromSentence = useCallback((startIdx: number, previewOnly = false) => {
      if (!speechSupported() || !currentChapter) return;

      const synth = window.speechSynthesis;
      synth.cancel();

      const session = ++sessionRef.current;
      previewModeRef.current = previewOnly;
      const allSentences = sentencesRef.current;
      if (allSentences.length === 0) {
        setPlayback("ready");
        return;
      }

      const endIdx = previewOnly
        ? Math.min(PREVIEW_SENTENCE_LIMIT, allSentences.length)
        : allSentences.length;

      const voice = voiceKey === "auto"
        ? pickVoice(String(language))
        : voices[Number(voiceKey)] || pickVoice(String(language));

      const playSentence = (idx: number) => {
        if (session !== sessionRef.current) return;
        if (idx >= endIdx) {
          setPlayback(previewOnly ? "ready" : "completed");
          setProgress(previewOnly ? 0 : 100);
          if (!previewOnly) {
            persistPosition(allSentences.length - 1, 100);
          }
          return;
        }

        const utterance = new SpeechSynthesisUtterance(allSentences[idx]);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = languageToLocale(String(language));
        }
        utterance.rate = Math.max(0.5, Math.min(1.6, BASE_RATE * speed));
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => {
          sentenceIndexRef.current = idx;
          setSentenceIndex(idx);
          const pct = Math.round((idx / Math.max(1, allSentences.length)) * 100);
          setProgress(pct);
          setPlayback("playing");
          if (!previewOnly) persistPosition(idx, pct);
        };

        utterance.onend = () => playSentence(idx + 1);
        utterance.onerror = () => setPlayback("ready");

        synth.speak(utterance);
      };

      playSentence(startIdx);
    }, [chapterIndex, currentChapter, language, persistPosition, projectId, speed, voiceKey, voices]);

    const handlePlayPause = useCallback(() => {
      if (!speechSupported()) return;
      const synth = window.speechSynthesis;

      if (playback === "playing") {
        synth.pause();
        setPlayback("paused");
        persistPosition(sentenceIndexRef.current, progress);
        return;
      }

      if (playback === "paused") {
        synth.resume();
        setPlayback("playing");
        return;
      }

      speakFromSentence(sentenceIndexRef.current, false);
    }, [playback, persistPosition, progress, speakFromSentence]);

    const handleStop = useCallback(() => {
      sessionRef.current += 1;
      if (speechSupported()) window.speechSynthesis.cancel();
      setPlayback("ready");
      setProgress(0);
    }, []);

    const goChapter = useCallback((next: number) => {
      sessionRef.current += 1;
      if (speechSupported()) window.speechSynthesis.cancel();
      setPlayback("ready");
      setChapterIndex(next);
      setSentenceIndex(0);
      sentenceIndexRef.current = 0;
      setProgress(0);
    }, []);

    useImperativeHandle(ref, () => ({
      playPreview: () => speakFromSentence(0, true),
      playFull: () => speakFromSentence(sentenceIndexRef.current, false),
    }), [speakFromSentence]);

    if (chapters.length === 0) {
      return (
        <div className={cn("rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60", className)}>
          Nessun capitolo con testo leggibile per l'audiolibro.
        </div>
      );
    }

    if (!speechSupported()) {
      return (
        <div className={cn("rounded-xl border border-amber-400/30 bg-amber-950/20 p-4", className)}>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Ascolto non disponibile
          </p>
          <p className="mt-2 text-xs leading-5 text-amber-100/75">
            Questo browser non supporta la sintesi vocale. Puoi comunque scaricare copione e manifest audiolibro.
          </p>
        </div>
      );
    }

    return (
      <div className={cn("max-w-full overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-4", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="inline-flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-200/80">
              <Headphones className="h-3.5 w-3.5 shrink-0" />
              {audiobookListenModeLabel()}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {currentChapter?.title || `Capitolo ${chapterIndex + 1}`}
            </p>
            <p className="text-[11px] text-white/55">
              {formatAudiobookDuration(elapsedMinutes)} / {formatAudiobookDuration(estimatedChapterMinutes)}
              {" · "}Cap. {chapterIndex + 1}/{chapters.length}
            </p>
          </div>
          {hasBookmark && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              <Bookmark className="h-3 w-3" />
              Segnalibro
            </span>
          )}
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400 transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => chapterIndex > 0 && goChapter(chapterIndex - 1)}
            disabled={chapterIndex <= 0}
            className="inline-flex h-11 min-h-[44px] min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white disabled:opacity-40"
            title="Capitolo precedente"
            aria-label="Capitolo precedente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handlePlayPause}
            className="inline-flex h-12 min-h-[44px] min-w-[120px] items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950"
            aria-label={playback === "playing" ? "Pausa" : "Play"}
          >
            {playback === "playing" ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {playback === "playing" ? "Pausa" : playback === "paused" ? "Riprendi" : "Play"}
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="inline-flex h-11 min-h-[44px] min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white"
            title="Stop"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => chapterIndex < chapters.length - 1 && goChapter(chapterIndex + 1)}
            disabled={chapterIndex >= chapters.length - 1}
            className="inline-flex h-11 min-h-[44px] min-w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-white disabled:opacity-40"
            title="Capitolo successivo"
            aria-label="Capitolo successivo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="flex min-h-[44px] flex-col justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Velocità</span>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEED_OPTIONS)[number])}
              className="h-9 min-h-[36px] w-full rounded-md border border-white/10 bg-transparent text-xs font-medium text-white outline-none"
            >
              {SPEED_OPTIONS.map((value) => (
                <option key={value} value={value}>{value}x</option>
              ))}
            </select>
          </label>
          <label className="col-span-1 flex min-h-[44px] flex-col justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 sm:col-span-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/45">
              <Volume2 className="h-3 w-3" />
              Voce
            </span>
            <select
              value={voiceKey}
              onChange={(e) => setVoiceKey(e.target.value)}
              className="h-9 min-h-[36px] w-full rounded-md border border-white/10 bg-transparent text-xs font-medium text-white outline-none"
            >
              <option value="auto">Automatica (sistema)</option>
              {voices.map((voice, index) => (
                <option key={`${voice.name}-${voice.lang}`} value={String(index)}>
                  {voice.name} · {voice.lang}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-center text-[11px] text-white/50">
          Stato: {statusLabel(playback)}
          {playback === "playing" && currentChapter ? ` · ${currentChapter.title}` : ""}
        </p>
      </div>
    );
  },
);
