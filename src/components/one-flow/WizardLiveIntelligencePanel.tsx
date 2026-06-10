import { useMemo } from "react";
import { Sparkles, Zap, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { computeLiveIntelligence } from "@/lib/book-creation-os/live-intelligence";
import type { BookObjective, WritingStyleProfile } from "@/lib/book-creation-os/objectives";
import type { BookCharacter } from "@/types/book";

interface WizardLiveIntelligencePanelProps {
  step: number;
  idea: string;
  objective: BookObjective;
  styleProfile: WritingStyleProfile;
  characters: BookCharacter[];
  chapters: number;
  bookLength: string;
}

const TONE_ICON = {
  success: CheckCircle2,
  warn: AlertCircle,
  info: Info,
  premium: Sparkles,
} as const;

const TONE_CLASS = {
  success: "border-emerald-400/30 bg-emerald-400/8 text-emerald-100",
  warn: "border-amber-400/30 bg-amber-400/8 text-amber-100",
  info: "border-sky-400/25 bg-sky-400/8 text-sky-100",
  premium: "border-violet-400/30 bg-violet-400/10 text-violet-100",
} as const;

export function WizardLiveIntelligencePanel({
  step,
  idea,
  objective,
  styleProfile,
  characters,
  chapters,
  bookLength,
}: WizardLiveIntelligencePanelProps) {
  const snapshot = useMemo(
    () => computeLiveIntelligence({ step, idea, objective, styleProfile, characters, chapters, bookLength }),
    [step, idea, objective, styleProfile, characters, chapters, bookLength],
  );

  return (
    <aside className="hidden w-full shrink-0 border-t border-white/10 bg-black/25 p-4 lg:block lg:w-[280px] lg:border-l lg:border-t-0 lg:bg-black/20">
      <div className="mb-3 flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-300" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">AI Architect Live</p>
      </div>

      <div className="space-y-2">
        {snapshot.activatedEngines.slice(0, 6).map((item) => {
          const Icon = TONE_ICON[item.tone];
          return (
            <div
              key={item.id}
              className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] transition-all ${TONE_CLASS[item.tone]} ${
                item.active ? "animate-in fade-in duration-300" : ""
              }`}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90" />
              <span>
                <span className="block font-semibold">{item.label}</span>
                <span className="opacity-80">{item.value}</span>
              </span>
            </div>
          );
        })}
      </div>

      {snapshot.insights.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Analisi in tempo reale</p>
          {snapshot.insights.map((item) => {
            const Icon = TONE_ICON[item.tone];
            return (
              <div key={item.id} className={`rounded-lg border px-2.5 py-2 text-[11px] ${TONE_CLASS[item.tone]}`}>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="opacity-85">{item.value}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

/** Compact strip for mobile — shows top 2 signals */
export function WizardLiveIntelligenceStrip({
  step,
  idea,
  objective,
  styleProfile,
  characters,
  chapters,
  bookLength,
}: WizardLiveIntelligencePanelProps) {
  const snapshot = useMemo(
    () => computeLiveIntelligence({ step, idea, objective, styleProfile, characters, chapters, bookLength }),
    [step, idea, objective, styleProfile, characters, chapters, bookLength],
  );
  const top = [...snapshot.activatedEngines, ...snapshot.insights].slice(0, 2);
  if (!top.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 lg:hidden">
      {top.map((item) => (
        <span
          key={item.id}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${TONE_CLASS[item.tone]}`}
        >
          ✓ {item.label}
        </span>
      ))}
    </div>
  );
}
