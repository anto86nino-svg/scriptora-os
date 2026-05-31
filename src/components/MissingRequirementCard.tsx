import type { RequirementGatePayload } from "@/lib/scriptora-requirement-gate";
import { ScriptoraPremiumState } from "@/components/ScriptoraPremiumState";

interface MissingRequirementCardProps {
  payload: RequirementGatePayload;
  onPrimary?: () => void;
  onSecondary?: () => void;
  compact?: boolean;
  className?: string;
}

export function MissingRequirementCard({
  payload,
  onPrimary,
  onSecondary,
  compact = false,
  className = "",
}: MissingRequirementCardProps) {
  return (
    <ScriptoraPremiumState
      payload={payload}
      onPrimary={onPrimary}
      onSecondary={onSecondary}
      compact={compact}
      className={className}
    />
  );
}
