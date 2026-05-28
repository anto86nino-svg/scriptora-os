import { useEffect, useMemo, useRef, useState } from "react";
import { BookProject, Language } from "@/types/book";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pause, Play, Waves, Sparkles, Volume2, ArrowDown } from "lucide-react";
import {
  VOICE_STUDIO_STYLES,
  applyNarrativeReadDirectives,
  emitVoiceStudioTelemetry,
  prepareVoiceStudioProfiles,
  type NarratorStyleId,
} from "@/lib/voice-studio-engine";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;


interface VoiceStudioDialogProps {
  open: boolean;
  onClose: () => void;
  projects: BookProject[];
  onOpenProject?: (projectId: string) => void;
  initialProjectId?: string;
  initialChapterIndex?: number;
  autoPlayOnOpen?: boolean;
}

export function VoiceStudioDialog({
  open,
  onClose,
  projects,
  onOpenProject,
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
  const prep = prepareVoiceStudioProfiles(selectedProject);

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
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const logDebug = (...args: any[]) => {
    if (debugEnabled) console.debug("[VoiceStudio]", ...args);
  };

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
      const timer = window.setInterval(tryResolve, 200);
      const timeoutTimer = window.setTimeout(() => {
        if (!resolved) {
          const v = window.speechSynthesis.getVoices() || [];
          voicesRef.current = v;
          setAvailableVoices(v);
          setVoicesLoaded(v.length > 0);
          setVoicesCount(v.length);
          logDebug("voices-timeout", v.length);
          cleanup();
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

  const stopPlayback = () => {
    if (typeof window === "undefined") return;
    playbackSessionRef.current += 1;
    autoPlayRequestedRef.current = false;
    window.speechSynthesis.cancel();
    // attempt to remove handlers from the last utterance
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
    setStatus("Stopped");
    setProgress(0);
    setCurrentSentence(0);
    setSentences([]);
    sentenceStarts.current = [];
    setReaderDetached(false);
    clearTimer();
    logDebug("playback-stopped", { session: playbackSessionRef.current });
  };

  useEffect(() => {
    if (!open) stopPlayback();
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
        synth.pause();
        pausedRef.current = true;
        setIsPaused(true);
        setIsPlaying(false);
        setStatus("Paused — tap Resume to continue");
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
        setStatus("Resuming narration...");
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
    const preferredVoice = chooseBestVoice(voices, targetLanguage);
    const session = ++playbackSessionRef.current;

    pausedRef.current = false;
    setIsPaused(false);
    currentChunkIndexRef.current = 0;
    setReaderDetached(false);
    setSentences(allSentences);
    setCurrentSentence(0);
    setProgress(0);
    setIsPlaying(true);
    setStatus(`Human narration ready · ${chunks.length} breathing parts`);

    emitVoiceStudioTelemetry({ ...telemetry, chapterTitle: currentChapter.title || "Untitled chapter" });

    const playChunk = (chunkIndex: number) => {
      if (session !== playbackSessionRef.current) return;

      if (chunkIndex >= chunks.length) {
        setIsPlaying(false);
        setStatus("Full chapter complete");
        setProgress(100);
        setCurrentSentence(allSentences.length > 0 ? allSentences.length - 1 : 0);
        clearTimer();
        logDebug("full-chapter-complete", { chunks: chunks.length });
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

      setStatus(`Human reading ${chunkIndex + 1}/${chunks.length} · ${tone.label} · ${activeVoiceLabel}`);
      setCurrentSentence(chunk.startSentence);
      setProgress(Math.round((chunkIndex / chunks.length) * 100));

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

      utterance.onstart = () => {
        if (session !== playbackSessionRef.current) return;
        setIsPlaying(true);

        const isTouchDevice =
          typeof window !== "undefined" &&
          (window.matchMedia?.("(pointer: coarse)")?.matches ||
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0);

        const isLikelyMobile =
          typeof navigator !== "undefined" &&
          /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "");

        const shouldUseManualKaraokeFallback = isTouchDevice || isLikelyMobile;

        clearTimer();

        if (shouldUseManualKaraokeFallback) {
          // Mobile fallback: many mobile browsers do not fire onboundary reliably.
          // Desktop keeps the native boundary events only, otherwise the karaoke follows two different rhythms.
          const chunkWords = chunk.text.split(/\s+/).filter(Boolean).length;
          const chunkEstimatedSec = Math.max(4, (chunkWords / (150 * utterance.rate)) * 60);
          const chunkStartedAt = Date.now();

          timerRef.current = window.setInterval(() => {
            if (session !== playbackSessionRef.current || pausedRef.current) return;

            const elapsed = (Date.now() - chunkStartedAt) / 1000;
            const localRatio = Math.min(0.98, elapsed / chunkEstimatedSec);
            const localSentence = Math.min(
              Math.max(0, chunkSentences.length - 1),
              Math.floor(localRatio * Math.max(1, chunkSentences.length)),
            );

            const globalSentence = Math.min(
              allSentences.length - 1,
              chunk.startSentence + localSentence,
            );

            setCurrentSentence(globalSentence);

            const fullProgress = allSentences.length > 0
              ? Math.round(((globalSentence + 1) / allSentences.length) * 100)
              : Math.round(((chunkIndex + localRatio) / chunks.length) * 100);

            setProgress(Math.min(99, fullProgress));
          }, 650);
        }

        logDebug("chunk-start", {
          chunk: chunkIndex + 1,
          total: chunks.length,
          tone: tone.label,
          rate: utterance.rate,
          pitch: utterance.pitch,
          manualFallback: shouldUseManualKaraokeFallback,
        });
      };

      utterance.onend = () => {
        if (session !== playbackSessionRef.current) return;
        if (pausedRef.current) {
          setStatus("Paused — tap Resume to continue");
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

    playChunk(0);
  };

  useEffect(() => {
    sentenceRefs.current = sentenceRefs.current.slice(0, sentences.length);
  }, [sentences.length]);

  useEffect(() => {
    if (!open || sentences.length === 0 || readerDetached) return;

    const node = sentenceRefs.current[currentSentence];
    if (!node) return;

    programmaticScrollRef.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);
  }, [currentSentence, open, sentences.length, readerDetached]);

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

    window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 450);
  };

  useEffect(() => {
    // Prevent autoplay — browsers often block audio unless started by user gesture.
    if (open && autoPlayOnOpen) {
      setStatus("Tap Play to start narration");
      logDebug("autoplay-requested-but-blocked");
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPlayOnOpen]);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className={`flex w-[calc(100vw-0.75rem)] flex-col overflow-hidden border-white/15 bg-slate-950/94 p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-5 ${
          immersiveMode
            ? "h-[96dvh] max-h-[96dvh] max-w-[96vw]"
            : "max-h-[88dvh] max-w-3xl sm:max-h-[90dvh]"
        }`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Waves className="h-5 w-5 text-sky-300" />
            Voice Studio
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Hear your story breathe. Turn chapters into immersive cinematic narration.
          </DialogDescription>
        </DialogHeader>

        <div className={`min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1f2937] p-3 sm:p-4 ${
          immersiveMode ? "flex flex-col" : ""
        }`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Immersive Player</p>
              <p className="line-clamp-2 text-base font-semibold text-white sm:text-lg">{currentChapter?.title || "Select a chapter"}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 px-2.5 py-1.5 text-[11px] text-sky-200 sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Narration
            </div>
          </div>

          <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mb-5 flex items-center justify-between text-xs text-white/60">
            <span>Immersive full view v18 · {status}</span>
            <span>{progress}%</span>
          </div>

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
          {selectedProject && chapterOptions.length > 0 && (
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

          <div className="sticky bottom-0 z-20 mt-4 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={testMobileVoice}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-4 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/20 sm:w-auto"
            >
              Test Voice
            </button>
            <button
              onClick={handlePlayPause}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100 sm:w-auto"
              disabled={!currentChapter}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPaused ? "Resume Narration" : isPlaying ? "Pause Narration" : "Play Narration"}
            </button>
            <button
              onClick={stopPlayback}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-white/80 hover:bg-white/[0.08] sm:w-auto"
            >
              Stop / Reset
            </button>
            {selectedProject && onOpenProject && (
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
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Karaoke Reading</p>
                <p className="text-base font-semibold text-white">
                  {immersiveMode ? "Immersive reading view" : "Follow the narration as your chapter speaks."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImmersiveMode(!immersiveMode)}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold transition ${immersiveMode ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 bg-slate-950/60 text-white/80 hover:border-cyan-300 hover:text-white"}`}
              >
                {immersiveMode ? "Exit immersive" : "Immersive full view"}
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between gap-2 text-xs text-white/60">
              <span>Speaking sentence {currentSentence + 1} of {sentences.length || 1}</span>
              <span>{currentChapter ? currentChapter.title || `Chapter ${chapterIndex + 1}` : "No chapter selected"}</span>
            </div>

            <div
              ref={karaokeScrollRef}
              onScroll={handleKaraokeScroll}
              className={`relative overflow-y-auto overscroll-contain scroll-smooth rounded-2xl border border-white/10 bg-slate-950/80 p-3 sm:p-4 ${
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
                  {sentences.map((sentence, idx) => (
                    <p
                      key={`${idx}-${sentence.slice(0, 20)}`}
                      ref={(node) => { sentenceRefs.current[idx] = node; }}
                      className={`rounded-xl px-3 py-2 text-[15px] leading-7 transition-all duration-300 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-base ${idx === currentSentence ? "bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(56,189,248,0.18)] ring-1 ring-cyan-300/30" : immersiveMode ? "text-slate-400/80 opacity-80" : "text-slate-300"}`}
                    >
                      {sentence}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/70">
                  {currentChapter ? "Press Play Narration to follow the live reading." : "Select a chapter to start narration."}
                </div>
              )}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

