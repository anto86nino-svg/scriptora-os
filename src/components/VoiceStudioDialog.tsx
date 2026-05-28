import { useEffect, useMemo, useRef, useState } from "react";
import { BookProject, Language } from "@/types/book";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pause, Play, Waves, Sparkles, Volume2 } from "lucide-react";
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
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [currentSentence, setCurrentSentence] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [immersiveMode, setImmersiveMode] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<number | null>(null);
  const sentenceRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const sentenceStarts = useRef<number[]>([]);
  const playbackSessionRef = useRef(0);
  const autoPlayRequestedRef = useRef(false);
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [voicesCount, setVoicesCount] = useState(0);
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
    setIsPlaying(false);
    setStatus("Stopped");
    setProgress(0);
    setCurrentSentence(0);
    setSentences([]);
    sentenceStarts.current = [];
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

  const handlePlayPause = () => {
    if (typeof window === "undefined") return;

    // require explicit user gesture to start playback — prevents autoplay blocks
    userInteractedRef.current = true;

    if (!currentChapter || !(currentChapter.content || "").trim().length) {
      setStatus("Select a chapter with content.");
      return;
    }

    if (isPlaying) {
      stopPlayback();
      return;
    }

    clearTimer();
    window.speechSynthesis.cancel();

    // load voices (user gesture allows us to start async operations)
    ensureVoicesReady().then(() => {
      (async () => {
        const { text: directedText, telemetry } = applyNarrativeReadDirectives(currentChapter.content || "", style);

        // small safety: if no voices loaded, still proceed using locale fallback
        const voices = voicesRef.current || window.speechSynthesis.getVoices() || [];
        const targetLanguage = getTargetLanguage();
        const preferredVoice = chooseBestVoice(voices, targetLanguage);

        const utterance = new SpeechSynthesisUtterance(directedText);
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          utterance.lang = preferredVoice.lang;
          logDebug("selected-voice", preferredVoice.name, preferredVoice.lang);
        } else {
          utterance.lang = languageToLocale(targetLanguage);
          logDebug("fallback-locale", utterance.lang);
        }

        utterance.rate = getEffectiveRate();
        utterance.pitch = style.pitch;

        const sentenceList = splitIntoSentences(directedText);
        setSentences(sentenceList);
        setCurrentSentence(0);
        setProgress(0);

        const startIndexes: number[] = [];
        sentenceList.forEach((sentence, idx) => {
          const searchFrom = idx === 0 ? 0 : startIndexes[idx - 1] + sentenceList[idx - 1].length;
          const position = directedText.indexOf(sentence, searchFrom);
          startIndexes[idx] = position >= 0 ? position : searchFrom;
        });
        sentenceStarts.current = startIndexes;

        const words = directedText.split(/\s+/).filter(Boolean).length;
        const estimatedSec = Math.max(8, (words / (150 * utterance.rate)) * 60);

        const startedAt = Date.now();
        timerRef.current = window.setInterval(() => {
          const elapsed = (Date.now() - startedAt) / 1000;
          setProgress((prev) => {
            const elapsedProgress = Math.min(100, Math.round((elapsed / estimatedSec) * 100));
            return Math.max(prev, elapsedProgress);
          });
        }, 300);

        const session = ++playbackSessionRef.current;

        utterance.onboundary = (event) => {
          if (session !== playbackSessionRef.current) return;
          if (typeof (event as any).charIndex === "number" && sentenceStarts.current.length > 0) {
            const charIndex = (event as any).charIndex as number;
            const active = sentenceStarts.current.findIndex((start, idx) => {
              const next = sentenceStarts.current[idx + 1] ?? Infinity;
              return charIndex >= start && charIndex < next;
            });
            const sentenceIndex = active >= 0 ? active : 0;
            setCurrentSentence(sentenceIndex);
            setProgress(Math.min(100, Math.round(((sentenceIndex + 1) / sentenceList.length) * 100)));
          }
        };

        utterance.onstart = () => {
          if (session !== playbackSessionRef.current) return;
          setIsPlaying(true);
          setStatus("Narration live");
          emitVoiceStudioTelemetry({ ...telemetry, chapterTitle: currentChapter.title || "Untitled chapter" });
          logDebug("playback-start", { session, projectId: selectedProject?.id, chapterIndex });
        };
        utterance.onend = () => {
          if (session !== playbackSessionRef.current) return;
          setIsPlaying(false);
          setStatus("Playback complete");
          setProgress(100);
          setCurrentSentence(sentenceList.length > 0 ? sentenceList.length - 1 : 0);
          clearTimer();
          logDebug("playback-end", { session });
        };
        utterance.onerror = (err) => {
          if (session !== playbackSessionRef.current) return;
          setIsPlaying(false);
          setStatus("Audio playback unavailable in this browser.");
          clearTimer();
          logDebug("playback-error", err);
        };

        utteranceRef.current = utterance;
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          setStatus("Playback failed to start");
          logDebug("speak-exception", e);
        }
      })();
    });
  };

  useEffect(() => {
    sentenceRefs.current = sentenceRefs.current.slice(0, sentences.length);
  }, [sentences.length]);

  useEffect(() => {
    if (!open || sentences.length === 0) return;
    const node = sentenceRefs.current[currentSentence];
    node?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [currentSentence, open, sentences.length]);

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
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto border-white/15 bg-slate-950/94 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)] sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Waves className="h-5 w-5 text-sky-300" />
            Voice Studio
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Hear your story breathe. Turn chapters into immersive cinematic narration.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1f2937] p-3 sm:p-4">
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
            <span>{status}</span>
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={handlePlayPause}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100 sm:w-auto"
              disabled={!currentChapter}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pause / Stop" : "Play Narration"}
            </button>
            <button
              onClick={stopPlayback}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-medium text-white/80 hover:bg-white/[0.08] sm:w-auto"
            >
              Stop
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

          <div className={"mt-6 rounded-3xl border border-white/10 bg-slate-900/90 p-4 shadow-[inset_0_0_30px_rgba(15,23,42,0.35)] " + (immersiveMode ? "ring-1 ring-cyan-300/20" : "")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">Karaoke Reading</p>
                <p className="text-base font-semibold text-white">Follow the narration as your chapter speaks.</p>
              </div>
              <button
                type="button"
                onClick={() => setImmersiveMode(!immersiveMode)}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold transition ${immersiveMode ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/15 bg-slate-950/60 text-white/80 hover:border-cyan-300 hover:text-white"}`}
              >
                {immersiveMode ? "Immersive mode" : "Reading mode"}
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between gap-2 text-xs text-white/60">
              <span>Speaking sentence {currentSentence + 1} of {sentences.length || 1}</span>
              <span>{currentChapter ? currentChapter.title || `Chapter ${chapterIndex + 1}` : "No chapter selected"}</span>
            </div>

            <div className={`max-h-[24rem] overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/80 p-4 ${immersiveMode ? "backdrop-blur-sm" : ""}`}>
              {sentences.length > 0 ? (
                <div className="space-y-3">
                  {sentences.map((sentence, idx) => (
                    <p
                      key={`${idx}-${sentence.slice(0, 20)}`}
                      ref={(node) => { sentenceRefs.current[idx] = node; }}
                      className={`rounded-2xl px-4 py-3 transition-all duration-300 ${idx === currentSentence ? "bg-cyan-400/10 text-white shadow-[0_0_20px_rgba(56,189,248,0.18)] ring-1 ring-cyan-300/30" : immersiveMode ? "text-slate-400/80 opacity-80" : "text-slate-300"}`}
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

        <p className="text-xs text-white/55">
          Developer telemetry is optional. Enable with <code>localStorage.setItem("scriptora-debug-voice-studio","1")</code>.
        </p>
      </DialogContent>
    </Dialog>
  );
}

