import { useEffect, useMemo, useRef, useState } from "react";
import { BookProject } from "@/types/book";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pause, Play, Waves, Sparkles, Volume2 } from "lucide-react";
import {
  VOICE_STUDIO_STYLES,
  applyNarrativeReadDirectives,
  emitVoiceStudioTelemetry,
  prepareVoiceStudioProfiles,
  type NarratorStyleId,
} from "@/lib/voice-studio-engine";

interface VoiceStudioDialogProps {
  open: boolean;
  onClose: () => void;
  projects: BookProject[];
  onOpenProject?: (projectId: string) => void;
}

export function VoiceStudioDialog({ open, onClose, projects, onOpenProject }: VoiceStudioDialogProps) {
  const [projectId, setProjectId] = useState<string>("");
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [styleId, setStyleId] = useState<NarratorStyleId>("cinematic");
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [open, projectId, projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) || null,
    [projects, projectId],
  );
  const chapters = selectedProject?.chapters?.filter((ch) => (ch.content || "").trim().length > 50) || [];
  const currentChapter = chapters[chapterIndex] || null;
  const style = VOICE_STUDIO_STYLES.find((item) => item.id === styleId) || VOICE_STUDIO_STYLES[0];
  const prep = prepareVoiceStudioProfiles(selectedProject);

  useEffect(() => {
    if (chapterIndex >= chapters.length) setChapterIndex(0);
  }, [chapterIndex, chapters.length]);

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopPlayback = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setStatus("Stopped");
    setProgress(0);
    clearTimer();
  };

  useEffect(() => {
    if (!open) stopPlayback();
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePlayPause = () => {
    if (typeof window === "undefined") return;
    if (!currentChapter) {
      setStatus("Select a chapter with content.");
      return;
    }
    if (isPlaying) {
      stopPlayback();
      return;
    }

    window.speechSynthesis.cancel();
    clearTimer();

    const { text: directedText, telemetry } = applyNarrativeReadDirectives(currentChapter.content || "", style);
    const utterance = new SpeechSynthesisUtterance(directedText);
    const voices = window.speechSynthesis.getVoices();
    const english = String(selectedProject?.config.language || "").toLowerCase().includes("english");
    const preferred = voices.find((voice) => (english ? /^en/i.test(voice.lang) : /^it/i.test(voice.lang)));

    if (preferred) utterance.voice = preferred;
    utterance.lang = preferred?.lang || (english ? "en-US" : "it-IT");
    utterance.rate = Math.max(0.75, Math.min(1.35, speed * style.rate));
    utterance.pitch = style.pitch;

    const words = directedText.split(/\s+/).filter(Boolean).length;
    const estimatedSec = Math.max(8, (words / (150 * utterance.rate)) * 60);
    const startedAt = Date.now();

    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setProgress(Math.min(100, Math.round((elapsed / estimatedSec) * 100)));
    }, 400);

    utterance.onstart = () => {
      setIsPlaying(true);
      setStatus("Narration live");
      emitVoiceStudioTelemetry({ ...telemetry, chapterTitle: currentChapter.title || "Untitled chapter" });
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setStatus("Playback complete");
      setProgress(100);
      clearTimer();
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setStatus("Audio playback unavailable in this browser.");
      clearTimer();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setChapterIndex(0);
              }}
              className="h-10 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id} className="text-black">
                  {project.config.title || "Untitled"}
                </option>
              ))}
            </select>

            <select
              value={chapterIndex}
              onChange={(e) => setChapterIndex(Number(e.target.value))}
              className="h-10 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
              disabled={chapters.length === 0}
            >
              {chapters.length === 0 && <option className="text-black">No generated chapters</option>}
              {chapters.map((chapter, idx) => (
                <option key={`${chapter.title}-${idx}`} value={idx} className="text-black">
                  {chapter.title || `Chapter ${idx + 1}`}
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

            <label className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-xs text-white/80">
              <Volume2 className="h-3.5 w-3.5 text-sky-200" />
              <span>Speed</span>
              <input
                type="range"
                min={0.8}
                max={1.3}
                step={0.05}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-sky-300"
              />
            </label>
          </div>

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
        </div>

        <p className="text-xs text-white/55">
          Developer telemetry is optional. Enable with <code>localStorage.setItem("scriptora-debug-voice-studio","1")</code>.
        </p>
      </DialogContent>
    </Dialog>
  );
}

