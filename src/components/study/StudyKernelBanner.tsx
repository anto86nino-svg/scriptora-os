import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import type { GapAnalysisResult } from "@/lib/study-os/study-gap-analysis";
import {
  isPrimaryModeSection,
  STUDY_MODE_LABELS,
  studyModeToSection,
  type StudySessionSection,
} from "@/lib/study-os/study-session-wiring";
import { StudyGapPanel } from "@/components/study/StudyGapPanel";

interface StudyKernelBannerProps {
  plan: StudyKernelPlan;
  activeSection: StudySessionSection;
  onNavigate: (section: StudySessionSection) => void;
  gapAnalysis?: GapAnalysisResult | null;
}

export function StudyKernelBanner({ plan, activeSection, onNavigate, gapAnalysis }: StudyKernelBannerProps) {
  const primarySection = studyModeToSection(plan.primaryMode);
  const primaryLabel = STUDY_MODE_LABELS[plan.primaryMode];
  const onPrimary = activeSection === primarySection;

  return (
    <div className="rounded-2xl border border-sky-300/25 bg-sky-400/10 px-3 py-2.5 text-xs leading-5 text-sky-50/90">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-sky-100">Piano studio: </span>
          {plan.rationale.slice(0, 2).join(" ")}
        </p>
        {!onPrimary && (
          <button
            type="button"
            onClick={() => onNavigate(primarySection)}
            className="shrink-0 rounded-xl bg-sky-300 px-3 py-1.5 text-[11px] font-bold text-slate-950"
          >
            Vai a {primaryLabel}
          </button>
        )}
      </div>
      {plan.recommendedModes.length > 1 && (
        <p className="mt-1.5 text-[11px] text-sky-100/75">
          Percorso suggerito: {plan.recommendedModes.map((mode) => STUDY_MODE_LABELS[mode]).join(" → ")}
        </p>
      )}
      {gapAnalysis && (
        <div className="mt-2">
          <StudyGapPanel gaps={gapAnalysis} compact />
        </div>
      )}
    </div>
  );
}

export function studyTabHighlightClass(
  tabId: StudySessionSection,
  activeSection: StudySessionSection,
  plan: StudyKernelPlan | null,
): string {
  if (activeSection === tabId) {
    return "bg-emerald-300 text-slate-950";
  }
  if (plan && isPrimaryModeSection(tabId, plan)) {
    return "border border-sky-300/40 bg-sky-400/15 text-sky-100";
  }
  return "border border-white/10 bg-white/[0.04] text-muted-foreground";
}
