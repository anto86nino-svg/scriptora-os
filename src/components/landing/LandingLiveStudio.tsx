import { useEffect, useMemo, useState } from "react";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { ChapterGenerationExperience } from "@/components/ChapterGenerationExperience";
import { NavigationTree } from "@/components/NavigationTree";
import { ProgressTracker } from "@/components/ProgressTracker";
import type { ChunkPhase } from "@/lib/generation";
import type { ChunkProgress } from "@/lib/generation";
import { t, useUILanguage } from "@/lib/i18n";
import {
  buildLandingDemoProject,
  landingLiveChapterText,
  LANDING_DEMO_ACTIVE_CHAPTER,
} from "./landing-live-demo-data";

interface Props {
  variant?: "hero" | "section";
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function phaseForProgress(ratio: number): ChunkPhase {
  if (ratio < 0.18) return "OPENING";
  if (ratio < 0.42) return "DEVELOPMENT";
  if (ratio < 0.68) return "EXPANSION";
  if (ratio < 0.88) return "TRANSITION";
  return "CLOSURE";
}

export function LandingLiveStudio({ variant = "hero" }: Props) {
  const lang = useUILanguage();
  const project = useMemo(() => buildLandingDemoProject(lang), [lang]);
  const fullText = useMemo(() => landingLiveChapterText(lang), [lang]);
  const outline = project.blueprint?.chapterOutlines[LANDING_DEMO_ACTIVE_CHAPTER];

  const [visibleChars, setVisibleChars] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setVisibleChars(0);
    setPaused(false);
  }, [fullText]);

  useEffect(() => {
    if (paused) return undefined;

    const tickMs = 42;
    const charsPerTick = 3;

    const interval = window.setInterval(() => {
      setVisibleChars((current) => {
        const next = Math.min(fullText.length, current + charsPerTick);
        if (next >= fullText.length) {
          setPaused(true);
        }
        return next;
      });
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [fullText, paused]);

  useEffect(() => {
    if (!paused || visibleChars < fullText.length) return undefined;
    const reset = window.setTimeout(() => {
      setVisibleChars(0);
      setPaused(false);
    }, 2800);
    return () => window.clearTimeout(reset);
  }, [paused, visibleChars, fullText.length]);

  const liveContent = fullText.slice(0, visibleChars);
  const ratio = fullText.length > 0 ? visibleChars / fullText.length : 0;
  const targetWords = 2800;
  const currentWords = wordCount(liveContent);

  const chunkProgress: ChunkProgress = {
    chunkIndex: Math.min(4, Math.floor(ratio * 5)),
    totalChunks: 5,
    currentWords,
    targetWords,
    phase: phaseForProgress(ratio),
    content: liveContent,
  };

  const generatingSet = useMemo(
    () => new Set<string>([`chapter-${LANDING_DEMO_ACTIVE_CHAPTER}`]),
    [],
  );

  const isHero = variant === "hero";

  return (
    <div
      className={`scriptora-landing-live-studio ${isHero ? "is-hero" : "is-section"}`}
      aria-label="Scriptora Writer OS — live chapter generation preview"
    >
      <div className="scriptora-landing-live-chrome">
        <span className="scriptora-landing-live-dot" />
        <span className="scriptora-landing-live-dot" />
        <span className="scriptora-landing-live-dot" />
        <span className="scriptora-landing-live-title">Writer OS · {project.config.title}</span>
        <span className="scriptora-landing-live-badge">
          <span className="scriptora-landing-live-pulse" />
          LIVE
        </span>
      </div>

      <div className="scriptora-landing-live-shell scriptora-ios-screen">
        <aside className="scriptora-landing-live-sidebar ios-sidebar">
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <span className="ios-icon ios-icon-blue h-9 w-9 shrink-0">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Scriptora OS</p>
              <h3 className="truncate text-xs font-bold text-foreground">{project.config.title}</h3>
            </div>
          </div>

          <div className="px-2 py-2">
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/90 px-3 py-2 text-[11px] font-semibold text-slate-950 opacity-90"
            >
              <Sparkles className="h-3 w-3" />
              {t("generation_running")}…
            </button>
          </div>

          <NavigationTree
            project={project}
            activeSection={`chapter-${LANDING_DEMO_ACTIVE_CHAPTER}`}
            onSelectSection={() => undefined}
            generatingSet={generatingSet}
          />

          <div className="mt-auto border-t border-white/10 p-2">
            <ProgressTracker project={project} />
          </div>
        </aside>

        <div className="scriptora-landing-live-main">
          <div className="scriptora-landing-live-main-inner">
            {visibleChars === 0 && paused ? (
              <div className="flex h-full min-h-[220px] items-center justify-center gap-2 text-sm text-white/55">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                {t("landing_live_preparing")}
              </div>
            ) : (
              <ChapterGenerationExperience
                project={project}
                chapterIndex={LANDING_DEMO_ACTIVE_CHAPTER}
                outline={outline}
                chunkProgress={chunkProgress}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
