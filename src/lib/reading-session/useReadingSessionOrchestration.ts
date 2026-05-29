import { useCallback, useEffect, useRef, useState } from "react";
import type { NarratorStyleId } from "@/lib/voice-studio-engine";
import {
  appendListeningNote,
  createSessionId,
  loadReadingSessionSnapshot,
  mapSentenceToParagraph,
  notesForSession,
  saveReadingSessionSnapshot,
  type ListeningNoteType,
  type ReadingFlowMode,
  type ReadingSessionMode,
  type ReadingSessionSnapshot,
  type SessionPresetId,
} from "@/lib/reading-session";

export type ChapterPlaybackCompleteResult =
  | { type: "done" }
  | { type: "continue"; nextChapterIndex: number };

interface UseReadingSessionInput {
  open: boolean;
  projectId: string;
  chapterIndex: number;
  chapterTitle: string;
  chapterContent: string;
  sentences: string[];
  currentSentence: number;
  progress: number;
  styleId: NarratorStyleId;
  speed: number;
  manualVoiceKey: string;
  immersiveMode: boolean;
  setImmersiveMode: (value: boolean) => void;
  chapterOptions: Array<{ index: number; title: string }>;
}

export function useReadingSessionOrchestration(input: UseReadingSessionInput) {
  const [sessionMode, setSessionMode] = useState<ReadingSessionMode>("reader");
  const [flowMode, setFlowMode] = useState<ReadingFlowMode>("single");
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [showInsights, setShowInsights] = useState(false);
  const [sessionNotes, setSessionNotes] = useState(() => notesForSession(sessionId));
  const [lastNoteType, setLastNoteType] = useState<ListeningNoteType | null>(null);
  const [resumeOffer, setResumeOffer] = useState<{
    label: string;
    snapshot: ReadingSessionSnapshot;
  } | null>(null);
  const [autoContinuePlay, setAutoContinuePlay] = useState(false);
  const sessionTimerRef = useRef<number | null>(null);
  const noteFlashRef = useRef<number | null>(null);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current != null) {
      window.clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  const persistSession = useCallback(() => {
    if (!input.projectId) return;
    saveReadingSessionSnapshot({
      projectId: input.projectId,
      chapterIndex: input.chapterIndex,
      sentenceIndex: input.currentSentence,
      progress: input.progress,
      styleId: input.styleId,
      speed: input.speed,
      manualVoiceKey: input.manualVoiceKey,
      mode: sessionMode,
      flowMode,
      sessionId,
      updatedAt: new Date().toISOString(),
    });
  }, [input, sessionMode, flowMode, sessionId]);

  useEffect(() => {
    if (!input.open || !input.projectId) return;
    const saved = loadReadingSessionSnapshot();
    if (saved && saved.projectId === input.projectId) {
      setSessionId(saved.sessionId || createSessionId());
      if (saved.chapterIndex !== input.chapterIndex || saved.sentenceIndex > 0) {
        setResumeOffer({
          label: `Continue listening from Chapter ${saved.chapterIndex + 1}?`,
          snapshot: saved,
        });
      }
    }
  }, [input.open, input.projectId]);

  useEffect(() => {
    if (!input.open || (!input.sentences.length && input.progress === 0)) return;
    persistSession();
  }, [input.open, input.chapterIndex, input.currentSentence, input.progress, persistSession]);

  useEffect(() => {
    if (!input.open) {
      clearSessionTimer();
      setShowInsights(false);
      setLastNoteType(null);
      setAutoContinuePlay(false);
      return undefined;
    }

    const onVisibility = () => {
      if (document.hidden) persistSession();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearSessionTimer();
    };
  }, [input.open, persistSession, clearSessionTimer]);

  useEffect(() => {
    if (sessionMode === "immersion") input.setImmersiveMode(true);
  }, [sessionMode, input]);

  const findNextPlayableChapter = useCallback(
    (fromIndex: number): number | null => {
      const next = input.chapterOptions.find((o) => o.index > fromIndex);
      return next?.index ?? null;
    },
    [input.chapterOptions],
  );

  const handleChapterPlaybackComplete = useCallback((): ChapterPlaybackCompleteResult => {
    persistSession();

    if (flowMode === "single") {
      setShowInsights(true);
      return { type: "done" };
    }

    const next = findNextPlayableChapter(input.chapterIndex);
    if (next == null) {
      setShowInsights(true);
      return { type: "done" };
    }

    setAutoContinuePlay(true);
    return { type: "continue", nextChapterIndex: next };
  }, [flowMode, findNextPlayableChapter, input.chapterIndex, persistSession]);

  const addQuickNote = useCallback(
    (noteType: ListeningNoteType) => {
      if (!input.projectId) return;
      const excerpt = input.sentences[input.currentSentence]?.slice(0, 140) || "";
      const paragraphIndex = mapSentenceToParagraph(
        input.chapterContent,
        input.currentSentence,
        excerpt,
      );

      appendListeningNote({
        id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        projectId: input.projectId,
        chapterIndex: input.chapterIndex,
        chapterTitle: input.chapterTitle,
        paragraphIndex,
        sentenceIndex: input.currentSentence,
        noteType,
        excerpt,
        sessionId,
        createdAt: new Date().toISOString(),
      });

      setSessionNotes(notesForSession(sessionId));
      setLastNoteType(noteType);
      if (noteFlashRef.current) window.clearTimeout(noteFlashRef.current);
      noteFlashRef.current = window.setTimeout(() => setLastNoteType(null), 1200);
    },
    [input, sessionId],
  );

  const applySessionPreset = useCallback(
    (preset: SessionPresetId, onStartListening: () => void) => {
      clearSessionTimer();

      if (preset === "15min" || preset === "30min") {
        const minutes = preset === "15min" ? 15 : 30;
        sessionTimerRef.current = window.setTimeout(() => {
          persistSession();
          setShowInsights(true);
        }, minutes * 60 * 1000);
        onStartListening();
        return;
      }

      if (preset === "continue-book") {
        setFlowMode("continue-book");
        onStartListening();
        return;
      }

      setFlowMode("single");
      onStartListening();
    },
    [clearSessionTimer, persistSession],
  );

  const acceptResumeOffer = useCallback(
    (
      applyChapter: (index: number) => void,
      applySettings: (snapshot: ReadingSessionSnapshot) => void,
    ) => {
      if (!resumeOffer) return;
      applySettings(resumeOffer.snapshot);
      applyChapter(resumeOffer.snapshot.chapterIndex);
      setResumeOffer(null);
    },
    [resumeOffer],
  );

  const dismissResumeOffer = useCallback(() => setResumeOffer(null), []);

  const endSessionAndReview = useCallback(() => {
    persistSession();
    setShowInsights(true);
    clearSessionTimer();
  }, [persistSession, clearSessionTimer]);

  const refreshSessionNotes = useCallback(() => {
    setSessionNotes(notesForSession(sessionId));
  }, [sessionId]);

  return {
    sessionMode,
    setSessionMode,
    flowMode,
    setFlowMode,
    sessionId,
    showInsights,
    setShowInsights,
    sessionNotes,
    lastNoteType,
    resumeOffer,
    autoContinuePlay,
    setAutoContinuePlay,
    addQuickNote,
    applySessionPreset,
    acceptResumeOffer,
    dismissResumeOffer,
    endSessionAndReview,
    handleChapterPlaybackComplete,
    findNextPlayableChapter,
    persistSession,
    refreshSessionNotes,
  };
}
