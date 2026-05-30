import { HelpCircle } from "lucide-react";
import { useGuidedFlow } from "@/hooks/useGuidedFlow";
import { requestGuidedTour, type GuidedTourId } from "@/lib/guided-tour-events";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface GuidedTourTriggerButtonProps {
  tourId: GuidedTourId;
  compact?: boolean;
  className?: string;
}

export function GuidedTourTriggerButton({ tourId, compact = false, className }: GuidedTourTriggerButtonProps) {
  const { enabled } = useGuidedFlow();

  if (!enabled) return null;

  return (
    <button
      type="button"
      onClick={() => requestGuidedTour(tourId)}
      className={cn(
        "ios-toolbar-button shrink-0 gap-1.5 text-[11px] font-semibold text-cyan-200/90 hover:text-cyan-100",
        compact ? "h-8 w-8 px-0" : "h-8 px-3",
        className,
      )}
      title={t("guided_tour_start")}
      aria-label={t("guided_tour_start")}
    >
      <HelpCircle className="h-3.5 w-3.5 shrink-0" />
      {!compact && <span>{t("guided_tour_start")}</span>}
    </button>
  );
}
