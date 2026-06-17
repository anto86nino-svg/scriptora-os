import { cn } from "@/lib/utils";

type MobileInterviewProgressProps = {
  answeredCount: number;
  total: number;
  className?: string;
};

/** Discrete progress — no percentages or technical labels. */
export function MobileInterviewProgress({
  answeredCount,
  total,
  className,
}: MobileInterviewProgressProps) {
  const ratio = total > 0 ? Math.min(1, answeredCount / total) : 0;

  return (
    <div className={cn("px-4 pb-2 pt-0.5", className)} aria-hidden>
      <div className="h-0.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500/70 to-violet-300/50 transition-all duration-700 ease-out"
          style={{ width: `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
