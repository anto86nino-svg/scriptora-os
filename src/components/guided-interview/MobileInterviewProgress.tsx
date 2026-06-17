import { cn } from "@/lib/utils";

type MobileInterviewProgressProps = {
  answeredCount: number;
  total: number;
  label?: string;
  className?: string;
};

/** Discrete progress — cinematic, no percentages. */
export function MobileInterviewProgress({
  answeredCount,
  total,
  label,
  className,
}: MobileInterviewProgressProps) {
  const ratio = total > 0 ? Math.min(1, answeredCount / total) : 0;

  return (
    <div className={cn("scriptora-forge-progress px-4 pb-2.5 pt-1", className)} aria-hidden>
      {label ? (
        <p className="mb-1.5 text-[10px] font-medium tracking-wide text-white/40">{label}</p>
      ) : null}
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.06] shadow-inner">
        <div
          className="scriptora-forge-progress-fill h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(6, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
