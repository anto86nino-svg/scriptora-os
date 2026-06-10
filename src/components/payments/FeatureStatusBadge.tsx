import { featureStatusLabel, getFeatureStatus, type FeatureStatus } from "@/lib/feature-status";
import { cn } from "@/lib/utils";

export function FeatureStatusBadge({
  featureId,
  status: explicitStatus,
  className,
}: {
  featureId?: string;
  status?: FeatureStatus;
  className?: string;
}) {
  const status = explicitStatus || (featureId ? getFeatureStatus(featureId) : "live");
  const label = featureStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        status === "live" && "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
        status === "beta" && "border-sky-400/30 bg-sky-400/10 text-sky-200",
        status === "coming_soon" && "border-amber-400/30 bg-amber-400/10 text-amber-200",
        className,
      )}
    >
      {label}
    </span>
  );
}
