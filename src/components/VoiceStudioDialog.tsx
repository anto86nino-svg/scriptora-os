import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BookProject, Language } from "@/types/book";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pause, Play, Sparkles, ArrowDown, BookOpen, ClipboardList, Bookmark, Square } from "lucide-react";
import { t } from "@/lib/i18n";
import {
  VOICE_STUDIO_STYLES,
  applyNarrativeReadDirectives,
  emitVoiceStudioTelemetry,
  prepareVoiceStudioProfiles,
  type NarratorStyleId,
} from "@/lib/voice-studio-engine";
import {
  FLOW_MODE_LABELS,
  SESSION_MODE_LABELS,
  SESSION_PRESET_LABELS,
  useReadingSessionOrchestration,
  type ReadingFlowMode,
  type ReadingSessionMode,
  type SessionPresetId,
} from "@/lib/reading-session";
import { ReadingSessionQuickNotes } from "@/components/ReadingSessionQuickNotes";
import { ReadingSessionInsights } from "@/components/ReadingSessionInsights";
import { isKaraokeReadingEnabled, isMobileViewport } from "@/lib/mobile-viewport";
import {
  buildReadingPosition,
  clearReadingPosition,
  flushReadingPosition,
  loadReadingPosition,
  scheduleSaveReadingPosition,
  cancelScheduledReadingPositionSave,
  type ReadingPosition,
} from "@/lib/reading-position";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;


interface VoiceStudioDialogProps {
  open: boolean;
  onClose: () => void;
  projects: BookProject[];
  onOpenProject?: (projectId: string) => void;
  onOpenChapterInEditor?: (projectId: string, chapterIndex: number, paragraphIndex: number) => void;
  initialProjectId?: string;
  initialChapterIndex?: number;
  autoPlayOnOpen?: boolean;
}

export function VoiceStudioDialog({
  open,
  onClose,
  projects,
  onOpenProject,
  onOpenChapterInEditor,
  initialProjectId,
  initialChapterIndex,
  autoPlayOnOpen = false,
}: VoiceStudioDialogProps) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [styleId, setStyleId] = useState<NarratorStyleId>("cinematic");
  const [speed, setSpeed] = useState<typeof SPEED_OPTIONS[number]>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [immersiveMode, setImmersiveMode] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<number | null>(null);
  const karaokeScrollRef = useRef<HTMLDivElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const sentenceRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const sentenceStarts = useRef<number[]>([]);
  const [readerDetached, setReaderDetached] = useState(false);
  const playbackSessionRef = useRef(0);
  const pausedRef = useRef(false);
  const currentChunkIndexRef = useRef(0);
  const autoPlayRequestedRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [voicesCount, setVoicesCount] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [manualVoiceKey, setManualVoiceKey] = useState<string>("auto");
  const [activeVoiceLabel, setActiveVoiceLabel] = useState<string>("Auto voice");
  const userInteractedRef = useRef(false);
  const debugEnabled = typeof window !== "undefined" && !!window.localStorage.getItem("scriptora-debug-voice-studio");
  const resumeSentenceAtStartRef = useRef<number | null>(null);
  const karaokeEnabled = isKaraokeReadingEnabled();
  const mobileStableMode = isMobileViewport();
  const [chapterResumeOffer, setChapterResumeOffer] = useState<ReadingPosition | null>(null);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);

  const recentProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return recentProjects;
    return recentProjects.filter((project) => {
      return project.config.title?.toLowerCase().includes(lower)
        || project.id.toLowerCase().includes(lower)
        || (project.config.subtitle || "").toLowerCase().includes(lower);
    });
  }, [recentProjects, query]);

  useEffect(() => {
    if (!open) return;
    if (filteredProjects.length === 0) {
      setProjectId("");
      return;
    }

    const targetProjectId = filteredProjects.some((project) => project.id === initialProjectId)
      ? initialProjectId
      : filteredProjects[0].id;

    if (!projectId || !filteredProjects.some((project) => project.id === projectId)) {
      setProjectId(targetProjectId || filteredProjects[0].id);
    }
  }, [open, filteredProjects, projectId, initialProjectId]);

  const selectedProject = useMemo(
    () => filteredProjects.find((project) => project.id === projectId) || null,
    [filteredProjects, projectId],
  );
  const chapters = selectedProject?.chapters || [];
  const chapterOptions = useMemo(
    () => chapters
      .map((chapter, idx) => ({
        index: idx,
        title: chapter.title || `Chapter ${idx + 1}`,
        playable: (chapter.content || "").trim().length > 25,
      }))
      .filter((item) => item.playable),
    [chapters],
  );
  const firstPlayableChapter = chapterOptions[0]?.index ?? 0;
  const currentChapter = selectedProject?.chapters[chapterIndex] || null;
  const style = VOICE_STUDIO_STYLES.find((item) => item.id === styleId) || VOICE_STUDIO_STYLES[0];
  const prep = useMemo(() => prepareVoiceStudioProfiles(selectedProject), [selectedProject]);

  const reading = useReadingSessionOrchestration({
    open,
    projectId,
    chapterIndex,
    chapterTitle: currentChapter?.title || `Chapter ${chapterIndex + 1}`,
    chapterContent: currentChapter?.content || "",
    sentences,
    currentSentence,
    progress,
    styleId,
    speed,
    manualVoiceKey,
    immersiveMode,
    setImmersiveMode,
    chapterOptions,
  });

  const isMinimalImmersion = reading.sessionMode === "immersion";
  const showEditorNotes = reading.sessionMode === "editor";
  const sessionActive = isPlaying || isPaused;

  useEffect(() => {
    if (!open || !selectedProject) return;

    if (initialProjectId === selectedProject.id && typeof initialChapterIndex === "number") {
      const destination = selectedProject.chapters[initialChapterIndex]?.content?.trim().length > 0
        ? initialChapterIndex
        : firstPlayableChapter;
      setChapterIndex(destination);
    } else if (!selectedProject.chapters[chapterIndex] || !(selectedProject.chapters[chapterIndex]?.content || "").trim().length > 25) {
      setChapterIndex(firstPlayableChapter);
    }

    setProgress(0);
    setCurrentSentence(0);
    // If chapters exist but have no content yet, show a loading state instead of 'No generated chapters'
    const hasPlayable = selectedProject.chapters?.some((ch) => (ch.content || "").trim().length > 25);
    if (selectedProject.chapters && selectedProject.chapters.length === 0) {
      setStatus("Loading chapters...");
    } else {
      setStatus(hasPlayable ? "Ready to play" : "Generate your first chapter to hear narration.");
    }
  }, [open, selectedProject, initialProjectId, initialChapterIndex, chapterIndex, firstPlayableChapter]);

  useEffect(() => {
    if (!open) return;
    // warm voices early so production delays are less visible
    ensureVoicesReady().then((v) => {
      if (!v || v.length === 0) {
        setStatus((s) => (s === "Ready to play" ? s : "Voices unavailable — using fallback"));
      } else {
        setStatus((s) => (s === "Ready to play" ? s : "Voices ready — tap Play"));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clearTimer = () => {
    if (timerRef.current != null) {
      try {
        window.clearInterval(timerRef.current);
      } catch (e) {}
      timerRef.current = null;
    }
  };

  const logDebug = (...args: any[]) => {
    if (debugEnabled) console.debug("[VoiceStudio]", ...args);
  };

  const persistReadingPositionNow = useCallback(() => {
    if (!projectId || !currentChapter) return;
    flushReadingPosition(
      buildReadingPosition({
        projectId,
        chapterIndex,
        sentenceIndex: currentSentence,
        progress,
        chapterContent: currentChapter.content || "",
        sentences,
        mode: "audio",
      }),
    );
  }, [projectId, chapterIndex, currentChapter, currentSentence, progress, sentences]);

  const handleSaveBookmark = useCallback(() => {
    persistReadingPositionNow();
    setBookmarkFlash(true);
    setStatus(t("voice_bookmark_saved"));
    window.setTimeout(() => setBookmarkFlash(false), 1400);
  }, [persistReadingPositionNow]);

  const scrollToSentence = useCallback((sentenceIndex: number) => {
    const node = sentenceRefs.current[sentenceIndex];
    if (!node) return;
    programmaticScrollRef.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);
  }, []);

  const acceptChapterResume = useCallback(() => {
    if (!chapterResumeOffer) return;
    setCurrentSentence(chapterResumeOffer.sentenceIndex);
    setProgress(chapterResumeOffer.progress);
    resumeSentenceAtStartRef.current = chapterResumeOffer.sentenceIndex;
    setChapterResumeOffer(null);
    window.requestAnimationFrame(() => scrollToSentence(chapterResumeOffer.sentenceIndex));
  }, [chapterResumeOffer, scrollToSentence]);

  const dismissChapterResume = useCallback(() => {
    if (projectId) clearReadingPosition(projectId, chapterIndex);
    resumeSentenceAtStartRef.current = null;
    setCurrentSentence(0);
    setProgress(0);
    setChapterResumeOffer(null);
  }, [projectId, chapterIndex]);

  const loadVoicesAsync = (timeout = 3000): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return resolve([]);

      let resolved = false;
      const tryResolve = () => {
        const v = window.speechSynthesis.getVoices() || [];
        if (v.length > 0) {
          resolved = true;
          voicesRef.current = v;
          setAvailableVoices(v);
          setVoicesLoaded(true);
          setVoicesCount(v.length);
          logDebug("voices-loaded", v.length, v.map((x) => x.name).slice(0, 6));
          cleanup();
          resolve(v);
        }
      };

      const onVoicesChanged = () => {
        tryResolve();
      };

      const cleanup = () => {
        try {
          window.speechSynthesis.onvoiceschanged = null;
        } catch {}
        if (timer) clearInterval(timer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
      };

      window.speechSynthesis.onvoiceschanged = onVoicesChanged;

      // aggressive polling as some browsers are flaky in production
      let timer: number | null = window.setInterval(tryResolve, 400);
      let timeoutTimer: number | null = window.setTimeout(() => {
        if (!resolved) {
          const v = window.speechSynthesis.getVoices() || [];
          voicesRef.current = v;
          setAvailableVoices(v);
          setVoicesLoaded(v.length > 0);
          setVoicesCount(v.length);
          logDebug("voices-timeout", v.length);
          cleanup();
          resolved = true;
          resolve(v);
        }
      }, timeout);

      // try immediately
      tryResolve();
    });
  };

  const ensureVoicesReady = async () => {
    if (voicesRef.current && voicesRef.current.length > 0) return voicesRef.current;
    const voices = await loadVoicesAsync(3500);
    return voices;
  };

  const haltPlayback = useCallback(
    (options?: { resetManuscript?: boolean; statusMessage?: string }) => {
      if (typeof window === "undefined") return;
      playbackSessionRef.current += 1;
      autoPlayRequestedRef.current = false;
      window.speechSynthesis.cancel();
      try {
        if (utteranceRef.current) {
          (utteranceRef.current as any).onboundary = null;
          (utteranceRef.current as any).onstart = null;
          (utteranceRef.current as any).onend = null;
          (utteranceRef.current as any).onerror = null;
        }
      } catch {}

      utteranceRef.current = null;
      pausedRef.current = false;
      setIsPaused(false);
      currentChunkIndexRef.current = 0;
      setIsPlaying(false);
      setStatus(options?.statusMessage ?? "Stopped");
      setReaderDetached(false);
      clearTimer();

      if (options?.resetManuscript) {
        setProgress(0);
        setCurrentSentence(0);
        setSentences([]);
        sentenceStarts.current = [];
      }

      logDebug("playback-halted", { session: playbackSessionRef.current, reset: options?.resetManuscript });
    },
    [],
  );

  const stopPlayback = useCallback(() => {
    persistReadingPositionNow();
    reading.persistSession();
    haltPlayback({ statusMessage: t("voice_reading_stopped") });
  }, [haltPlayback, persistReadingPositionNow, reading]);

  const handleStop = () => {
    stopPlayback();
  };

  useEffect(() => {
    if (!open) {
      persistReadingPositionNow();
      haltPlayback({ resetManuscript: true });
    }
    return () => {
      cancelScheduledReadingPositionSave();
      haltPlayback({ resetManuscript: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !projectId || sessionActive) return;
    const saved = loadReadingPosition(projectId, chapterIndex);
    if (saved && saved.sentenceIndex > 0) {
      setChapterResumeOffer(saved);
    } else {
      setChapterResumeOffer(null);
    }
  }, [open, projectId, chapterIndex, sessionActive]);

  useEffect(() => {
    if (!open || !projectId || !sessionActive) return;
    scheduleSaveReadingPosition(
      buildReadingPosition({
        projectId,
        chapterIndex,
        sentenceIndex: currentSentence,
        progress,
        chapterContent: currentChapter?.content || "",
        sentences,
        mode: "audio",
      }),
    );
  }, [
    open,
    projectId,
    chapterIndex,
    currentSentence,
    progress,
    sessionActive,
    currentChapter,
    sentences,
  ]);

  useEffect(() => {
    if (!open) return;
    const onBeforeUnload = () => persistReadingPositionNow();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, persistReadingPositionNow]);

  useEffect(() => {
    if (!open || !isPlaying || isPaused) return;
    const id = window.setInterval(() => {
      const synth = window.speechSynthesis;
      if (pausedRef.current) return;
      if (isPlaying && !synth.speaking && !synth.pending) {
        setIsPlaying(false);
        setStatus("Playback ended unexpectedly — tap Play to retry.");
      }
    }, 700);
    return () => window.clearInterval(id);
  }, [open, isPlaying, isPaused]);

  useEffect(() => {
    if (!open || (!isPlaying && !isPaused)) return;
    persistReadingPositionNow();
    haltPlayback({ statusMessage: "Selection changed — tap Start listening to restart" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, styleId, speed, manualVoiceKey]);

  useEffect(() => {
    if (!open || (!isPlaying && !isPaused)) return;
    if (reading.autoContinuePlay) return;
    persistReadingPositionNow();
    haltPlayback({ statusMessage: "Chapter changed — tap Start listening to restart" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex]);

  useEffect(() => {
    if (!reading.autoContinuePlay || !open || !currentChapter) return;
    reading.setAutoContinuePlay(false);
    const timer = window.setTimeout(() => {
      handlePlayPause();
    }, 450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading.autoContinuePlay, chapterIndex, open, currentChapter]);

  useEffect(() => {
    if (!open) return;
    const onVisibility = () => {
      if (!document.hidden) return;
      reading.persistSession();
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      if (!isPlaying || isPaused) return;
      try {
        persistReadingPositionNow();
        window.speechSynthesis.pause();
        pausedRef.current = true;
        setIsPaused(true);
        setIsPlaying(false);
        setStatus(t("voice_reading_paused"));
      } catch {
        // Mobile browsers may block pause — session state is still persisted.
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [open, isPlaying, isPaused, reading]);

  useEffect(() => {
    if (open && autoPlayOnOpen) {
      autoPlayRequestedRef.current = true;
    }
    if (!open) {
      autoPlayRequestedRef.current = false;
    }
  }, [open, autoPlayOnOpen]);

  const getEffectiveRate = (): number => {
    return Math.max(0.5, Math.min(2, speed * style.rate));
  };

  const testMobileVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setStatus("Speech synthesis is not available in this browser.");
      return;
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const targetLanguage = getTargetLanguage();
      const voices = voicesRef.current || synth.getVoices() || [];
      const preferredVoice = chooseManualOrBestVoice(voices, targetLanguage);

      const test = new SpeechSynthesisUtterance("Scriptora voice test... I am ready to read your chapter.");
      test.lang = preferredVoice?.lang || languageToLocale(targetLanguage);
      if (preferredVoice) test.voice = preferredVoice;
      test.rate = 1;
      test.pitch = 1;
      test.volume = 1;

      test.onstart = () => {
        setIsPlaying(true);
        setStatus("Test voice live");
        logDebug("test-voice-start");
      };

      test.onend = () => {
        setIsPlaying(false);
        setStatus("Test voice complete — now try Play Narration.");
        logDebug("test-voice-end");
      };

      test.onerror = (err) => {
        setIsPlaying(false);
        setStatus("Test voice blocked by this browser/device.");
        logDebug("test-voice-error", err);
      };

      setStatus("Starting test voice...");
      synth.speak(test);
      if (synth.paused) synth.resume();

      window.setTimeout(() => {
        if (!synth.speaking && !synth.pending) {
          setIsPlaying(false);
          setStatus("No voice started. Browser/device blocked speech synthesis.");
          logDebug("test-voice-no-start");
        }
      }, 900);
    } catch (err) {
      setIsPlaying(false);
      setStatus("Test voice failed.");
      logDebug("test-voice-exception", err);
    }
  };

  const splitIntoSentences = (text: string): string[] => {
    return String(text || "")
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((chunk) => chunk.trim().length > 0);
  };

  const detectVoiceLanguage = (text: string): Language => {
    const lower = String(text || "").toLowerCase();
    const scores: Record<Language, number> = {
      English: (lower.match(/\b(the|and|that|with|this|you|your|have|from|for|not|was|are|will|would)\b/g) || []).length,
      Italian: (lower.match(/\b(che|per|con|della|delle|questo|quella|una|non|tra|dei|gli|le|del)\b/g) || []).length,
      Spanish: (lower.match(/\b(que|para|con|esta|este|los|las|una|por|como|del|más|muy)\b/g) || []).length,
      French: (lower.match(/\b(que|pour|avec|cet|cette|les|des|une|pas|dans|est|qui)\b/g) || []).length,
      German: (lower.match(/\b(der|die|das|und|nicht|ist|mit|für|ein|eine|zu|im|auf)\b/g) || []).length,
    };

    const charSignals: Record<Language, RegExp> = {
      English: /[aeiouy]/,
      Italian: /[àèéìòù]/,
      Spanish: /[áéíóúñ¿¡]/,
      French: /[àâçéèêëîïôûùüÿœæ]/,
      German: /[äöüß]/,
    };

    Object.entries(charSignals).forEach(([lang, pattern]) => {
      if (pattern.test(lower)) scores[lang as Language] += 2;
    });

    const best = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] as Language) || "English";
    return best;
  };

  const languageToLocale = (language: Language) => {
    switch (language) {
      case "English": return "en-US";
      case "Italian": return "it-IT";
      case "Spanish": return "es-ES";
      case "French": return "fr-FR";
      case "German": return "de-DE";
      default: return "en-US";
    }
  };

  const getTargetLanguage = (): Language => {
    const explicit = selectedProject?.config.language as Language | undefined;
    if (explicit && ["English", "Italian", "Spanish", "French", "German"].includes(explicit)) {
      return explicit;
    }
    return detectVoiceLanguage(currentChapter?.content || selectedProject?.chapters?.[0]?.content || "");
  };

  const scoreVoice = (voice: SpeechSynthesisVoice, targetPrefix: string) => {
    const name = voice.name || "";
    const lang = voice.lang.toLowerCase();
    let score = 0;

    if (lang.startsWith(targetPrefix)) score += 20;
    if (voice.localService) score += 5;
    if (voice.default) score += 3;
    if (name.match(/(premium|enhanced|neural|expressive|alloy|siri|apple|microsoft|google|amazon|voice|natural|human|aria|serena|samantha|luci|olivia|emily|noah|liam|amelia|isabella|oliver|michael|sophie|jacob)/i)) score += 4;
    if (name.match(/(compact|robot|synth|wavenet|google\s*uk|microsoft\s*spark|df_|polly|voicefont)/i)) score -= 5;
    if (voice.lang.toLowerCase().includes("x-")) score += 1;

    return score;
  };

  const getFreshVoices = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return [];
    const fresh = window.speechSynthesis.getVoices() || [];
    if (fresh.length > 0) {
      voicesRef.current = fresh;
      setAvailableVoices(fresh);
      setVoicesLoaded(true);
      setVoicesCount(fresh.length);
    }
    return fresh;
  };

  const getVoiceKey = (voice: SpeechSynthesisVoice, index: number) => {
    return `${index}::${voice.name}::${voice.lang}::${voice.voiceURI}`;
  };

  const chooseManualOrBestVoice = (voices: SpeechSynthesisVoice[], language: Language) => {
    const freshVoices = getFreshVoices();
    const usableVoices = freshVoices.length > 0 ? freshVoices : voices;

    if (manualVoiceKey !== "auto") {
      const manualIndex = Number(manualVoiceKey.split("::")[0]);
      const manual = Number.isFinite(manualIndex) ? usableVoices[manualIndex] : null;

      if (manual) {
        setActiveVoiceLabel(`Selected → ${manual.name} · ${manual.lang}`);
        logDebug("manual-voice-selected", {
          index: manualIndex,
          name: manual.name,
          lang: manual.lang,
          uri: manual.voiceURI,
          localService: manual.localService,
          default: manual.default,
        });
        return manual;
      }

      setActiveVoiceLabel("Selected voice unavailable — using system fallback");
      logDebug("manual-voice-missing", { manualVoiceKey, voices: usableVoices.map((v, i) => getVoiceKey(v, i)) });
      return null;
    }

    const chosen = chooseBestVoice(usableVoices, language);
    if (chosen) {
      setActiveVoiceLabel(`Auto → ${chosen.name} · ${chosen.lang}`);
    } else {
      setActiveVoiceLabel("System fallback voice");
    }
    return chosen;
  };

  const chooseBestVoice = (voices: SpeechSynthesisVoice[], language: Language) => {
    const targetPrefix = language === "English" ? "en" : language === "Italian" ? "it" : language === "Spanish" ? "es" : language === "French" ? "fr" : "de";

    // 1) exact prefix matches
    let candidates = voices.filter((voice) => voice.lang.toLowerCase().startsWith(targetPrefix));
    if (candidates.length === 0) {
      // 2) partial match (region variants)
      candidates = voices.filter((voice) => voice.lang.toLowerCase().includes(targetPrefix));
    }
    if (candidates.length === 0) {
      // 3) pick non-robotic voices as fallback
      candidates = voices.filter((v) => !/robot|synth|compact|wavenet|polly|voicefont/i.test(v.name));
    }
    if (candidates.length === 0) candidates = voices;

    candidates.sort((a, b) => scoreVoice(b, targetPrefix) - scoreVoice(a, targetPrefix));

    return candidates[0] || null;
  };

  const cleanNarrationText = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_{1,2}(.*?)_{1,2}/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };

  const addHumanNarrationPauses = (text: string) => {
    let human = text;

    // Paragraphs need breath. Mobile speech engines respond better to punctuation than raw line breaks.
    human = human.replace(/\n\s*\n/g, ". ... ");

    // Dialogue needs a small dramatic landing before and after quoted speech.
    human = human.replace(/([.!?])\s*(["”»])/g, "$1$2 ... ");
    human = human.replace(/(["“«])\s*/g, "$1");
    human = human.replace(/\s*(["”»])/g, "$1");

    // Em dashes are often read too flat; turn them into a small breath.
    human = human.replace(/\s+[—–]\s+/g, "... ");

    // Suspense and emotional punctuation should breathe, but not become ridiculous.
    human = human.replace(/([!?])\s+/g, "$1 ... ");
    human = human.replace(/;\s+/g, "; ... ");
    human = human.replace(/:\s+/g, ": ... ");

    // Very long comma chains sound robotic; add a few controlled breath points.
    human = human.replace(/,\s+(ma|però|eppure|tuttavia|because|but|however|yet)\s+/gi, ", ... $1 ");

    // Avoid endless ellipses.
    human = human.replace(/(\.\s*){4,}/g, "... ");
    human = human.replace(/(\.\.\.\s*){2,}/g, "... ");

    return human.trim();
  };

  const softenLongSentencesForSpeech = (text: string) => {
    return text
      .split(/(?<=[.!?…])\s+/)
      .map((sentence) => {
        if (sentence.length < 220) return sentence;

        return sentence
          .replace(/,\s+(che|quando|mentre|perché|anche se|come se|which|when|while|because|although|as if)\s+/gi, ", ... $1 ")
          .replace(/\s+(e|and)\s+/gi, " $1 ");
      })
      .join(" ");
  };

  const prepareHumanNarrationText = (text: string) => {
    const cleaned = cleanNarrationText(text);
    const breathed = addHumanNarrationPauses(cleaned);
    return softenLongSentencesForSpeech(breathed);
  };

  const detectNarrativeTone = (text: string) => {
    const lower = text.toLowerCase();

    const hasAction = /(corse|scapp|grid|spar|colp|sangue|knife|gun|ran|fight|attack|blood|scream|shout|war|battle|explosion)/i.test(lower);
    const hasSuspense = /(silenzio|ombra|buio|paura|trem|sussurr|nascost|dark|shadow|fear|whisper|trembl|hidden|danger)/i.test(lower);
    const hasIntimacy = /(mano|pelle|respiro|cuore|bacio|lacrim|amore|touch|skin|breath|heart|kiss|tear|love)/i.test(lower);
    const hasSadness = /(perd|morte|dolore|pianto|vuoto|addio|grief|death|lost|pain|cry|empty|goodbye)/i.test(lower);
    const hasDialogue = /[«“"].{2,}?[»”"]/.test(text) || (text.match(/^\s*[—-]\s+/gm) || []).length >= 2;

    if (hasAction) return { label: "Action pulse", rate: 1.08, pitch: 1.02 };
    if (hasSuspense) return { label: "Suspense hush", rate: 0.9, pitch: 0.92 };
    if (hasSadness) return { label: "Emotional low tone", rate: 0.86, pitch: 0.94 };
    if (hasIntimacy) return { label: "Intimate soft tone", rate: 0.88, pitch: 0.98 };
    if (hasDialogue) return { label: "Dialogue natural tone", rate: 0.98, pitch: 1 };
    return { label: "Narrative cinematic tone", rate: 0.96, pitch: 1 };
  };

  const buildNarrationChunks = (text: string, maxChars = 950) => {
    const sourceSentences = splitIntoSentences(text);
    const chunks: Array<{ text: string; startSentence: number; sentenceCount: number; tone: ReturnType<typeof detectNarrativeTone> }> = [];

    let buffer = "";
    let startSentence = 0;
    let sentenceCount = 0;

    sourceSentences.forEach((sentence, idx) => {
      const candidate = buffer ? `${buffer} ${sentence}` : sentence;

      if (candidate.length > maxChars && buffer) {
        chunks.push({
          text: buffer,
          startSentence,
          sentenceCount,
          tone: detectNarrativeTone(buffer),
        });

        buffer = sentence;
        startSentence = idx;
        sentenceCount = 1;
      } else {
        buffer = candidate;
        sentenceCount += 1;
      }
    });

    if (buffer.trim()) {
      chunks.push({
        text: buffer,
        startSentence,
        sentenceCount,
        tone: detectNarrativeTone(buffer),
      });
    }

    return {
      allSentences: sourceSentences,
      chunks,
    };
  };

  useEffect(() => {
    if (!open || !currentChapter?.content?.trim() || isPlaying || isPaused) return;
    const { text: rawDirectedText } = applyNarrativeReadDirectives(currentChapter.content || "", style);
    const directedText = prepareHumanNarrationText(rawDirectedText);
    const { allSentences } = buildNarrationChunks(directedText, 820);
    setSentences(allSentences);
  }, [open, currentChapter, chapterIndex, style, isPlaying, isPaused]);

  const handlePlayPause = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setStatus("Speech synthesis is not available in this browser.");
      return;
    }

    userInteractedRef.current = true;

    const synth = window.speechSynthesis;

    // Real pause: do not cancel the utterance, otherwise resume starts from the beginning.
    if (isPlaying && !isPaused) {
      try {
        reading.persistSession();
        persistReadingPositionNow();
        synth.pause();
        pausedRef.current = true;
        setIsPaused(true);
        setIsPlaying(false);
        setStatus(t("voice_reading_paused"));
        logDebug("playback-paused", { chunk: currentChunkIndexRef.current });
      } catch (err) {
        setStatus("Pause failed. Use Stop if needed.");
        logDebug("pause-exception", err);
      }
      return;
    }

    // Real resume: continue the current utterance when browser supports it.
    if (isPaused) {
      try {
        pausedRef.current = false;
        setIsPaused(false);
        setIsPlaying(true);
        synth.resume();
        setStatus(t("voice_reading_resuming"));
        logDebug("playback-resumed", { chunk: currentChunkIndexRef.current });

        window.setTimeout(() => {
          if (!pausedRef.current && !synth.speaking && synth.pending) {
            synth.resume();
          }
        }, 350);
      } catch (err) {
        setStatus("Resume failed. Tap Play again.");
        setIsPaused(false);
        pausedRef.current = false;
        logDebug("resume-exception", err);
      }
      return;
    }

    if (!currentChapter || !(currentChapter.content || "").trim().length) {
      setStatus("Tap works, but no readable chapter was found. Select/generate a chapter first.");
      return;
    }

    clearTimer();

    synth.cancel();

    const { text: rawDirectedText, telemetry } = applyNarrativeReadDirectives(currentChapter.content || "", style);
    const directedText = prepareHumanNarrationText(rawDirectedText);
    const { allSentences, chunks } = buildNarrationChunks(directedText, 820);

    if (chunks.length === 0) {
      setStatus("No readable text found in this chapter.");
      return;
    }

    const voices = voicesRef.current || synth.getVoices() || [];
    const targetLanguage = getTargetLanguage();
    const preferredVoice = chooseManualOrBestVoice(voices, targetLanguage);
    const session = ++playbackSessionRef.current;

    pausedRef.current = false;
    setIsPaused(false);
    currentChunkIndexRef.current = 0;
    setReaderDetached(false);
    setSentences(allSentences);

    const resumeAt = resumeSentenceAtStartRef.current;
    let startChunkIndex = 0;
    if (resumeAt != null && resumeAt > 0) {
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        const chunkEnd = chunk.startSentence + chunk.sentenceCount;
        if (resumeAt < chunkEnd || i === chunks.length - 1) {
          startChunkIndex = i;
          break;
        }
      }
      setCurrentSentence(resumeAt);
      setProgress(
        allSentences.length > 0
          ? Math.min(99, Math.round((resumeAt / allSentences.length) * 100))
          : 0,
      );
      resumeSentenceAtStartRef.current = null;
    } else {
      setCurrentSentence(0);
      setProgress(0);
    }

    setIsPlaying(true);
    setStatus(`Reading session in progress · ${chunks.length} parts`);

    emitVoiceStudioTelemetry({ ...telemetry, chapterTitle: currentChapter.title || "Untitled chapter" });

    const playChunk = (chunkIndex: number) => {
      if (session !== playbackSessionRef.current) return;

      if (chunkIndex >= chunks.length) {
        setIsPlaying(false);
        setProgress(100);
        if (karaokeEnabled) {
          setCurrentSentence(allSentences.length > 0 ? allSentences.length - 1 : 0);
        }
        clearTimer();
        persistReadingPositionNow();
        const result = reading.handleChapterPlaybackComplete();
        if (result.type === "continue") {
          setChapterIndex(result.nextChapterIndex);
          setStatus(`Continuing manuscript review — Chapter ${result.nextChapterIndex + 1}`);
        } else {
          setStatus("Reading session complete — review your listening notes");
        }
        logDebug("full-chapter-complete", { chunks: chunks.length, result });
        return;
      }

      currentChunkIndexRef.current = chunkIndex;
      const chunk = chunks[chunkIndex];
      const chunkSentences = splitIntoSentences(chunk.text);
      const tone = chunk.tone;

      const utterance = new SpeechSynthesisUtterance(chunk.text);

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = languageToLocale(targetLanguage);
      }

      utterance.rate = Math.max(0.5, Math.min(1.55, getEffectiveRate() * tone.rate));
      utterance.pitch = Math.max(0.7, Math.min(1.35, style.pitch * tone.pitch));
      utterance.volume = 1;

      utteranceRef.current = utterance;

      const localStarts: number[] = [];
      chunkSentences.forEach((sentence, idx) => {
        const searchFrom = idx === 0 ? 0 : localStarts[idx - 1] + chunkSentences[idx - 1].length;
        const position = chunk.text.indexOf(sentence, searchFrom);
        localStarts[idx] = position >= 0 ? position : searchFrom;
      });

      setStatus(`Reading session · part ${chunkIndex + 1}/${chunks.length} · ${tone.label} · ${activeVoiceLabel}`);
      setProgress(Math.round((chunkIndex / chunks.length) * 100));
      if (karaokeEnabled) {
        setCurrentSentence(chunk.startSentence);
      }

      if (karaokeEnabled) {
        utterance.onboundary = (event) => {
          if (session !== playbackSessionRef.current) return;

          if (typeof (event as any).charIndex === "number" && localStarts.length > 0) {
            const charIndex = (event as any).charIndex as number;
            const active = localStarts.findIndex((start, idx) => {
              const next = localStarts[idx + 1] ?? Infinity;
              return charIndex >= start && charIndex < next;
            });

            const localSentenceIndex = active >= 0 ? active : 0;
            const globalSentenceIndex = Math.min(
              allSentences.length - 1,
              chunk.startSentence + localSentenceIndex,
            );

            setCurrentSentence(globalSentenceIndex);

            const sentenceProgress = allSentences.length > 0
              ? Math.round(((globalSentenceIndex + 1) / allSentences.length) * 100)
              : Math.round(((chunkIndex + 1) / chunks.length) * 100);

            setProgress(Math.min(99, sentenceProgress));
          }
        };
      } else {
        utterance.onboundary = null;
      }

      utterance.onstart = () => {
        if (session !== playbackSessionRef.current) return;
        setIsPlaying(true);
        clearTimer();

        if (!karaokeEnabled) {
          setProgress(Math.round(((chunkIndex + 0.15) / chunks.length) * 100));
          scheduleSaveReadingPosition(
            buildReadingPosition({
              projectId,
              chapterIndex,
              sentenceIndex: chunk.startSentence,
              progress: Math.round(((chunkIndex + 0.15) / chunks.length) * 100),
              chapterContent: currentChapter.content || "",
              sentences: allSentences,
              mode: "audio",
            }),
          );
        }

        logDebug("chunk-start", {
          chunk: chunkIndex + 1,
          total: chunks.length,
          tone: tone.label,
          rate: utterance.rate,
          pitch: utterance.pitch,
          karaokeEnabled,
        });
      };

      utterance.onend = () => {
        if (session !== playbackSessionRef.current) return;
        if (pausedRef.current) {
          setStatus(t("voice_reading_paused"));
          return;
        }
        clearTimer();
        setProgress(Math.min(99, Math.round(((chunkIndex + 1) / chunks.length) * 100)));
        window.setTimeout(() => playChunk(chunkIndex + 1), 120);
      };

      utterance.onerror = (err) => {
        if (session !== playbackSessionRef.current) return;
        setIsPlaying(false);
        setIsPaused(false);
        pausedRef.current = false;
        setStatus(`Audio stopped on part ${chunkIndex + 1}. Tap Play to retry.`);
        clearTimer();
        logDebug("chunk-error", err);
      };

      try {
        synth.speak(utterance);
        if (synth.paused) synth.resume();

        window.setTimeout(() => {
          if (session !== playbackSessionRef.current) return;
          if (!synth.speaking && !synth.pending) {
            setIsPlaying(false);
            setStatus("Audio did not start. Tap Test Voice, then Play again.");
            clearTimer();
            logDebug("chunk-start-check-failed", { chunkIndex });
          }
        }, 900);
      } catch (err) {
        setIsPlaying(false);
        setStatus("Playback failed to start.");
        clearTimer();
        logDebug("chunk-speak-exception", err);
      }
    };

    playChunk(startChunkIndex);
  };

  useEffect(() => {
    sentenceRefs.current = sentenceRefs.current.slice(0, sentences.length);
  }, [sentences.length]);

  useEffect(() => {
    if (!open || sentences.length === 0 || readerDetached || !karaokeEnabled || !isPlaying) return;

    const node = sentenceRefs.current[currentSentence];
    if (!node) return;

    programmaticScrollRef.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const scrollTimeout = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);

    return () => {
      window.clearTimeout(scrollTimeout);
    };
  }, [currentSentence, open, sentences.length, readerDetached, karaokeEnabled, isPlaying]);

  const handleKaraokeScroll = () => {
    if (!isPlaying && !isPaused) return;
    if (programmaticScrollRef.current) return;

    // L’utente sta esplorando il testo mentre la narrazione continua.
    setReaderDetached(true);
  };

  const jumpToCurrentSentence = () => {
    const node = sentenceRefs.current[currentSentence];
    if (!node) return;

    setReaderDetached(false);
    programmaticScrollRef.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const timeout = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);

    // Return function to cleanup timeout if component unmounts
    return () => window.clearTimeout(timeout);
  };

  useEffect(() => {
    // Prevent autoplay — browsers often block audio unless started by user gesture.
    if (open && autoPlayOnOpen) {
      setStatus("Tap Play to start narration");
      logDebug("autoplay-requested-but-blocked");
    }
    return () => {
      // Cleanup: ensure speech synthesis is stopped on unmount
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          // Ignore errors in cleanup
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPlayOnOpen]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className={`flex w-[calc(100vw-0.75rem)] flex-col overflow-hidden border-white/15 bg-slate-950/94 p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-5 ${
          immersiveMode
            ? "h-[96dvh] max-h-[96dvh] max-w-[96vw]"
            : "max-h-[88dvh] max-w-3xl sm:max-h-[90dvh]"
        }`}>
        <DialogHeader className={isMinimalImmersion && sessionActive ? "sr-only" : ""}>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-sky-300" />
            Reading Session Pro
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Professional manuscript listening — hear pacing, dialogue, and emotional beats like a reader.
          </DialogDescription>
        </DialogHeader>

        <div className={`relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1f2937] p-3 sm:p-4 ${
          immersiveMode ? "flex flex-col" : ""
        }`}>
          {reading.showInsights && (
            <ReadingSessionInsights
              notes={reading.sessionNotes}
              onClose={() => reading.setShowInsights(false)}
              onOpenInEditor={
                onOpenChapterInEditor && selectedProject
                  ? (chapterIdx, paragraphIdx) => {
                      onOpenChapterInEditor(selectedProject.id, chapterIdx, paragraphIdx);
                      onClose();
                    }
                  : undefined
              }
            />
          )}

          {chapterResumeOffer && !sessionActive && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-3">
              <p className="text-sm font-medium text-emerald-50">{t("voice_continue_from_bookmark")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={dismissChapterResume}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                >
                  {t("voice_restart_from_beginning")}
                </button>
                <button
                  type="button"
                  onClick={acceptChapterResume}
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-100"
                >
                  {t("voice_continue_from_bookmark")}
                </button>
              </div>
            </div>
          )}

          {mobileStableMode && (
            <p className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-white/60">
              {t("voice_mobile_stable_hint")}
            </p>
          )}

          {reading.resumeOffer && !sessionActive && !chapterResumeOffer && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-3">
              <p className="text-sm font-medium text-cyan-50">{reading.resumeOffer.label}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => reading.dismissResumeOffer()}
                  className="rounded-xl border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                >
                  Start fresh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reading.acceptResumeOffer(
                      (idx) => setChapterIndex(idx),
                      (snap) => {
                        setStyleId(snap.styleId as NarratorStyleId);
                        setSpeed(snap.speed as typeof SPEED_OPTIONS[number]);
                        setManualVoiceKey(snap.manualVoiceKey);
                        reading.setSessionMode(snap.mode);
                        reading.setFlowMode(snap.flowMode);
                      },
                    );
                  }}
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-slate-100"
                >
                  Continue listening
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Manuscript listening</p>
              <p className="line-clamp-2 text-base font-semibold text-white sm:text-lg">{currentChapter?.title || "Select a chapter"}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 px-2.5 py-1.5 text-[11px] text-sky-200 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Revision workflow
            </div>
          </div>

          {!isMinimalImmersion && (
            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.keys(SESSION_MODE_LABELS) as ReadingSessionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    reading.setSessionMode(mode);
                    if (mode === "immersion") setImmersiveMode(true);
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition ${
                    reading.sessionMode === mode
                      ? "border-cyan-300/50 bg-cyan-300/15 text-white"
                      : "border-white/15 text-white/70 hover:border-cyan-300/40 hover:text-white"
                  }`}
                >
                  {SESSION_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          )}

          {isMinimalImmersion && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => reading.setSessionMode("reader")}
                className="rounded-xl border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10"
              >
                Exit immersion mode
              </button>
            </div>
          )}

          {!isMinimalImmersion && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">Chapter flow</span>
              {(Object.keys(FLOW_MODE_LABELS) as ReadingFlowMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => reading.setFlowMode(mode)}
                  className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-medium ${
                    reading.flowMode === mode
                      ? "border-violet-300/40 bg-violet-300/10 text-violet-100"
                      : "border-white/12 text-white/60 hover:text-white"
                  }`}
                >
                  {FLOW_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          )}

          {!isMinimalImmersion && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.14em] text-white/40">Session preset</span>
              {(Object.keys(SESSION_PRESET_LABELS) as SessionPresetId[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => reading.applySessionPreset(preset, handlePlayPause)}
                  className="rounded-xl border border-white/12 px-2.5 py-1.5 text-[11px] font-medium text-white/65 hover:border-white/25 hover:text-white"
                >
                  {SESSION_PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
          )}

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mb-5 flex items-center justify-between text-xs text-white/60">
            <span>{sessionActive ? "Reading session in progress" : "Manuscript review"} · {status}</span>
            <span>{progress}%</span>
          </div>

          {!isMinimalImmersion && (
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-[0.16em] text-white/45">Project search</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project title, subtitle, or ID"
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-sky-300/70"
            />
          </div>
          )}

          {!isMinimalImmersion && (
          <div className={`grid gap-2 sm:grid-cols-2 ${immersiveMode ? "lg:grid-cols-5" : "lg:grid-cols-5"}`}>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setChapterIndex(0);
              }}
              className="h-10 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
              disabled={filteredProjects.length === 0}
            >
              {filteredProjects.length === 0 ? (
                <option value="">No projects found</option>
              ) : filteredProjects.map((project) => (
                <option key={project.id} value={project.id} className="text-black">
                  {project.config.title || "Untitled"}
                </option>
              ))}
            </select>

            <select
              value={chapterIndex}
              onChange={(e) => setChapterIndex(Number(e.target.value))}
              className="h-10 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
              disabled={chapterOptions.length === 0}
            >
              {chapterOptions.length === 0 && <option className="text-black">No generated chapters</option>}
              {chapterOptions.map((option) => (
                <option key={`${option.title}-${option.index}`} value={option.index} className="text-black">
                  {option.title}
                </option>
              ))}
            </select>

            <select
              value={styleId}
              onChange={(e) => setStyleId(e.target.value as NarratorStyleId)}
              className="h-10 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
            >
              {prep.narratorPresets.map((item) => (
                <option key={item.id} value={item.id} className="text-black">
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={manualVoiceKey}
              onChange={(e) => {
                setManualVoiceKey(e.target.value);
                const fresh = getFreshVoices();
                if (e.target.value === "auto") {
                  setActiveVoiceLabel("Auto voice");
                } else {
                  const selectedIndex = Number(e.target.value.split("::")[0]);
                  const selected = fresh[selectedIndex] || availableVoices[selectedIndex];
                  setActiveVoiceLabel(selected ? `Selected → ${selected.name} · ${selected.lang}` : "Selected voice");
                }
              }}
              onFocus={() => getFreshVoices()}
              className="h-10 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
            >
              <option value="auto" className="text-black">Auto voice based on language</option>
              {availableVoices.map((voice, index) => (
                <option key={getVoiceKey(voice, index)} value={getVoiceKey(voice, index)} className="text-black">
                  {index + 1}. {voice.name} · {voice.lang}
                </option>
              ))}
            </select>

            <div className="space-y-2">


              <div className="flex items-center justify-between text-[11px] text-white/70">
                <span>Speed</span>
                <span className="font-semibold text-white">{speed.toFixed(2)}x</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {SPEED_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSpeed(option)}
                    className={`rounded-xl border px-2 py-2 text-xs transition ${speed === option ? "border-sky-300 bg-sky-300/20 text-white" : "border-white/15 text-white/80 hover:border-sky-300 hover:text-white"}`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}
          {!isMinimalImmersion && selectedProject && chapterOptions.length > 0 && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80">
              Effective playback rate: <span className="font-semibold text-white">{getEffectiveRate().toFixed(2)}x</span>
              <span className="mx-2 text-white/30">·</span>
              <span className="font-semibold text-emerald-100">{activeVoiceLabel}</span>
              <span className="block pt-1 text-xs text-white/45">Available voices on this device/browser: {voicesCount}</span>
              <span className="mt-2 block rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
                Le voci disponibili dipendono dal dispositivo e dal browser in uso. Scriptora usa la voce reale selezionata nel menu; ritmo, tono e stile narrativo vengono ottimizzati durante la lettura.
              </span>
            </div>
          )}

          {showEditorNotes && sessionActive && (
            <div className="mb-4">
              <ReadingSessionQuickNotes
                onNote={reading.addQuickNote}
                lastSavedType={reading.lastNoteType}
                compact={isMinimalImmersion}
              />
            </div>
          )}

          <div className="sticky bottom-0 z-20 mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
            {!isMinimalImmersion && (
            <button
              onClick={testMobileVoice}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-4 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/20 sm:w-auto"
            >
              Test Voice
            </button>
            )}
            <button
              onClick={handlePlayPause}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100 sm:w-auto"
              disabled={!currentChapter}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPaused ? "Resume listening" : isPlaying ? "Pause listening" : "Start listening"}
            </button>
            <button
              onClick={handleStop}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-4 text-sm font-medium text-white/80 hover:bg-white/[0.08] sm:w-auto"
            >
              <Square className="h-3.5 w-3.5" />
              Stop session
            </button>
            <button
              type="button"
              onClick={handleSaveBookmark}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium sm:w-auto ${
                bookmarkFlash
                  ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
                  : "border-white/20 text-white/80 hover:bg-white/[0.08]"
              }`}
            >
              <Bookmark className="h-4 w-4" />
              {t("voice_save_bookmark")}
            </button>
            {(reading.sessionNotes.length > 0 || sessionActive) && (
              <button
                type="button"
                onClick={reading.endSessionAndReview}
                className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 text-sm font-medium text-amber-100 hover:bg-amber-300/15 sm:w-auto"
              >
                <ClipboardList className="h-4 w-4" />
                Session insights
              </button>
            )}
            {selectedProject && onOpenProject && !isMinimalImmersion && (
              <button
                onClick={() => onOpenProject(selectedProject.id)}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-100 hover:bg-cyan-300/15 sm:w-auto"
              >
                Open In Writing Room
              </button>
            )}
          </div>

          <div className={"mt-4 rounded-2xl border border-white/10 bg-slate-900/90 p-3 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)] sm:p-4 " + (immersiveMode ? "flex min-h-0 flex-1 flex-col ring-1 ring-cyan-300/20" : "")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Manuscript reader</p>
                <p className="text-base font-semibold text-white">
                  {immersiveMode ? "Immersion — focus on the manuscript" : "Follow the text as you listen."}
                </p>
              </div>
              {!isMinimalImmersion && (
              <button
                type="button"
                onClick={() => setImmersiveMode(!immersiveMode)}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold transition ${immersiveMode ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 bg-slate-950/60 text-white/80 hover:border-cyan-300 hover:text-white"}`}
              >
                {immersiveMode ? "Exit immersion" : "Immersion view"}
              </button>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between gap-2 text-xs text-white/60">
              <span>Speaking sentence {currentSentence + 1} of {sentences.length || 1}</span>
              <span>{currentChapter ? currentChapter.title || `Chapter ${chapterIndex + 1}` : "No chapter selected"}</span>
            </div>

            <div
              ref={karaokeScrollRef}
              onScroll={handleKaraokeScroll}
              className={`relative overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth rounded-2xl border border-white/10 bg-slate-950/80 p-3 sm:p-4 ${
                immersiveMode
                  ? "min-h-[58dvh] flex-1 max-h-[68dvh] backdrop-blur-sm"
                  : "max-h-[42dvh] sm:max-h-[24rem]"
              }`}
            >
              {readerDetached && sentences.length > 0 && (isPlaying || isPaused) && (
                <button
                  type="button"
                  onClick={jumpToCurrentSentence}
                  className="sticky top-2 z-30 ml-auto mb-2 flex w-fit items-center justify-center gap-1.5 rounded-full border border-cyan-300/40 bg-slate-950/85 px-3 py-1.5 text-[11px] font-semibold text-cyan-50 shadow-[0_10px_24px_rgba(8,145,178,0.22)] backdrop-blur transition hover:bg-cyan-300/20"
                  aria-label="Torna alla frase in lettura"
                  title="Torna alla frase in lettura"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Riga attuale
                </button>
              )}

              {sentences.length > 0 ? (
                <div className="space-y-3">
                  {sentences.map((sentence, idx) => {
                    const highlightActive =
                      idx === currentSentence && (!isPlaying || karaokeEnabled);
                    return (
                    <p
                      key={`${idx}-${sentence.slice(0, 20)}`}
                      ref={(node) => { sentenceRefs.current[idx] = node; }}
                      className={`rounded-xl px-3 py-2 text-[15px] leading-7 transition-all duration-300 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base ${highlightActive ? "bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(56,189,248,0.18)] ring-1 ring-cyan-300/30" : immersiveMode ? "text-slate-400/80 opacity-80" : "text-slate-300"}`}
                    >
                      {sentence}
                    </p>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/70">
                  {currentChapter ? "Press Start listening to begin your reading session." : "Select a chapter to begin manuscript review."}
                </div>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

