import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AudiobookChapter } from "@/lib/audiobook-export";
import {
  buildHumanReadingQueue,
  HUMAN_READING_MODES,
  queueEstimatedMinutes,
  type HumanReadingModeId,
  type HumanReadingQueueItem,
} from "@/lib/human-reading-engine";
import {
  loadHumanReaderProgress,
  saveHumanReaderProgress,
} from "@/lib/human-reader-progress";

export type HumanSpeechStatus =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "stopped"
  | "completed"
  | "unsupported";

const SPEED_OPTIONS = [0.75, 0.9, 1, 1.1, 1.25, 1.5] as const;
export type HumanSpeechSpeed = (typeof SPEED_OPTIONS)[number];

export interface UseHumanSpeechPlayerInput {
  projectId: string;
  language: string;
  chapters: AudiobookChapter[];
  initialChapterIndex?: number;
  readingMode?: HumanReadingModeId;
}

function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
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

function scoreVoice(voice: SpeechSynthesisVoice, langPrefix: string): number {
  let score = 0;
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  if (lang.startsWith(langPrefix)) score += 20;
  if (voice.localService) score += 4;
  if (voice.default) score += 2;
  if (/(premium|enhanced|neural|natural|siri|samantha|alice|luca|giorgio|paola)/i.test(name)) score += 5;
  if (/(compact|robot|wavenet|polly)/i.test(name)) score -= 4;
  return score;
}

function pickBestVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | null {
  const prefix = language === "Italian" ? "it"
    : language === "Spanish" ? "es"
    : language === "French" ? "fr"
    : language === "German" ? "de"
    : "en";
  const candidates = voices.length > 0 ? voices : [];
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => scoreVoice(b, prefix) - scoreVoice(a, prefix));
  const langMatch = sorted.find((v) => v.lang.toLowerCase().startsWith(prefix));
  return langMatch || sorted[0] || null;
}

export function useHumanSpeechPlayer({
  projectId,
  language,
  chapters,
  initialChapterIndex = 0,
  readingMode = "narrative",
}: UseHumanSpeechPlayerInput) {
  const [status, setStatus] = useState<HumanSpeechStatus>(
    speechSupported() ? "idle" : "unsupported",
  );
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [rate, setRate] = useState<HumanSpeechSpeed>(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [voiceKey, setVoiceKey] = useState("auto");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [modeId, setModeId] = useState<HumanReadingModeId>(readingMode);
  const [previewLimit, setPreviewLimit] = useState<number | null>(null);

  const sessionRef = useRef(0);
  const queueRef = useRef<HumanReadingQueueItem[]>([]);
  const pauseTimerRef = useRef<number | null>(null);

  const currentChapter = chapters[chapterIndex] ?? null;

  const queue = useMemo(() => {
    if (!currentChapter) return [];
    return buildHumanReadingQueue(currentChapter.text, {
      mode: modeId,
      chapterTitle: currentChapter.title,
    });
  }, [currentChapter, modeId]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (!speechSupported()) return;
    const load = () => setAvailableVoices(window.speechSynthesis.getVoices() || []);
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    const saved = loadHumanReaderProgress(projectId);
    if (saved && saved.chapterIndex < chapters.length) {
      setChapterIndex(saved.chapterIndex);
      setSegmentIndex(saved.segmentIndex);
      setProgressPercent(saved.progressPercent);
      if (saved.readingMode in HUMAN_READING_MODES) {
        setModeId(saved.readingMode as HumanReadingModeId);
      }
    }
  }, [projectId, chapters.length]);

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const cancelSpeech = useCallback(() => {
    sessionRef.current += 1;
    clearPauseTimer();
    if (speechSupported()) window.speechSynthesis.cancel();
  }, [clearPauseTimer]);

  useEffect(() => () => {
    cancelSpeech();
  }, [cancelSpeech]);

  const persistProgress = useCallback((
    segIdx: number,
    pct: number,
    chIdx = chapterIndex,
  ) => {
    saveHumanReaderProgress({
      projectId,
      chapterIndex: chIdx,
      segmentIndex: segIdx,
      progressPercent: pct,
      readingMode: modeId,
      updatedAt: new Date().toISOString(),
    });
  }, [chapterIndex, modeId, projectId]);

  const resolveVoice = useCallback(() => {
    if (voiceKey === "auto") return pickBestVoice(availableVoices, language);
    const idx = Number(voiceKey);
    return Number.isFinite(idx) ? availableVoices[idx] ?? null : pickBestVoice(availableVoices, language);
  }, [availableVoices, language, voiceKey]);

  const playFromSegment = useCallback((startIdx: number, limit: number | null = null) => {
    if (!speechSupported() || !currentChapter) {
      setStatus("unsupported");
      return;
    }

    cancelSpeech();
    const session = ++sessionRef.current;
    const items = queueRef.current;
    if (items.length === 0) {
      setStatus("idle");
      return;
    }

    setPreviewLimit(limit);
    setStatus("loading");

    const endIdx = limit != null
      ? Math.min(limit, items.length)
      : items.length;

    const playItem = (idx: number) => {
      if (session !== sessionRef.current) return;

      if (idx >= endIdx) {
        setStatus(limit != null ? "idle" : "completed");
        setProgressPercent(limit != null ? 0 : 100);
        if (limit == null) persistProgress(items.length - 1, 100);
        return;
      }

      const item = items[idx];
      const pct = Math.round((idx / Math.max(1, items.length)) * 100);
      setSegmentIndex(idx);
      setProgressPercent(pct);
      persistProgress(idx, pct);

      if (item.type === "scene_break" || item.type === "pause" || !item.utteranceText.trim()) {
        clearPauseTimer();
        pauseTimerRef.current = window.setTimeout(() => playItem(idx + 1), item.pauseAfterMs);
        setStatus("playing");
        return;
      }

      const utterance = new SpeechSynthesisUtterance(item.utteranceText);
      const voice = resolveVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = languageToLocale(language);
      }

      utterance.rate = Math.max(0.5, Math.min(1.6, item.suggestedRate * rate));
      utterance.pitch = Math.max(0.7, Math.min(1.35, item.suggestedPitch * pitch));
      utterance.volume = volume;

      utterance.onstart = () => setStatus("playing");
      utterance.onend = () => {
        clearPauseTimer();
        pauseTimerRef.current = window.setTimeout(() => playItem(idx + 1), item.pauseAfterMs);
      };
      utterance.onerror = () => {
        setStatus("idle");
      };

      window.speechSynthesis.speak(utterance);
    };

    playItem(startIdx);
  }, [
    cancelSpeech,
    clearPauseTimer,
    currentChapter,
    language,
    modeId,
    persistProgress,
    pitch,
    rate,
    resolveVoice,
    volume,
  ]);

  const play = useCallback((preview = false) => {
    const start = segmentIndex;
    const limit = preview ? Math.min(6, queueRef.current.length) : null;
    playFromSegment(start, limit);
  }, [playFromSegment, segmentIndex]);

  const pause = useCallback(() => {
    if (!speechSupported()) return;
    window.speechSynthesis.pause();
    setStatus("paused");
    persistProgress(segmentIndex, progressPercent);
  }, [persistProgress, progressPercent, segmentIndex]);

  const resume = useCallback(() => {
    if (!speechSupported()) return;
    try {
      window.speechSynthesis.resume();
      setStatus("playing");
    } catch {
      playFromSegment(segmentIndex, previewLimit);
    }
  }, [playFromSegment, previewLimit, segmentIndex]);

  const stop = useCallback(() => {
    cancelSpeech();
    setStatus("stopped");
    setProgressPercent(0);
    setSegmentIndex(0);
  }, [cancelSpeech]);

  const nextSegment = useCallback(() => {
    cancelSpeech();
    const next = Math.min(segmentIndex + 1, Math.max(0, queue.length - 1));
    setSegmentIndex(next);
    setProgressPercent(Math.round((next / Math.max(1, queue.length)) * 100));
    setStatus("idle");
  }, [cancelSpeech, queue.length, segmentIndex]);

  const previousSegment = useCallback(() => {
    cancelSpeech();
    const prev = Math.max(0, segmentIndex - 1);
    setSegmentIndex(prev);
    setProgressPercent(Math.round((prev / Math.max(1, queue.length)) * 100));
    setStatus("idle");
  }, [cancelSpeech, queue.length, segmentIndex]);

  const goChapter = useCallback((next: number) => {
    cancelSpeech();
    const clamped = Math.max(0, Math.min(next, chapters.length - 1));
    setChapterIndex(clamped);
    setSegmentIndex(0);
    setProgressPercent(0);
    setStatus("idle");
  }, [cancelSpeech, chapters.length]);

  const nextChapter = useCallback(() => goChapter(chapterIndex + 1), [chapterIndex, goChapter]);
  const previousChapter = useCallback(() => goChapter(chapterIndex - 1), [chapterIndex, goChapter]);

  const saveBookmark = useCallback(() => {
    persistProgress(segmentIndex, progressPercent);
  }, [persistProgress, progressPercent, segmentIndex]);

  const resumeFromBookmark = useCallback(() => {
    const saved = loadHumanReaderProgress(projectId);
    if (!saved) return;
    setChapterIndex(saved.chapterIndex);
    setSegmentIndex(saved.segmentIndex);
    setProgressPercent(saved.progressPercent);
    playFromSegment(saved.segmentIndex, null);
  }, [playFromSegment, projectId]);

  const estimatedMinutes = useMemo(
    () => queueEstimatedMinutes(queue),
    [queue],
  );

  const selectedVoice = resolveVoice();

  const hasBookmark = useMemo(() => {
    const saved = loadHumanReaderProgress(projectId);
    return Boolean(saved && (saved.segmentIndex > 0 || saved.progressPercent > 0));
  }, [projectId, segmentIndex, progressPercent]);

  return {
    status,
    chapterIndex,
    segmentIndex,
    progressPercent,
    currentChapter,
    queue,
    estimatedMinutes,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    voiceKey,
    setVoiceKey,
    availableVoices,
    selectedVoice,
    modeId,
    setModeId,
    speedOptions: SPEED_OPTIONS,
    play,
    pause,
    resume,
    stop,
    nextSegment,
    previousSegment,
    nextChapter,
    previousChapter,
    saveBookmark,
    resumeFromBookmark,
    playPreview: () => playFromSegment(0, Math.min(6, queueRef.current.length)),
    playFull: () => playFromSegment(segmentIndex, null),
    supported: speechSupported(),
    hasBookmark,
  };
}
