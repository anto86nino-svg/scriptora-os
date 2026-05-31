import { X } from "lucide-react";
import type { RequirementGatePayload } from "@/lib/scriptora-requirement-gate";
import { MissingRequirementCard } from "@/components/MissingRequirementCard";
import { t } from "@/lib/i18n";
import { useScriptoraModalScrollLock } from "@/lib/viewport-safe";

interface RequirementGateDialogProps {
  open: boolean;
  payload: RequirementGatePayload | null;
  onClose: () => void;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function RequirementGateDialog({
  open,
  payload,
  onClose,
  onPrimary,
  onSecondary,
}: RequirementGateDialogProps) {
  useScriptoraModalScrollLock(open && Boolean(payload));
  if (!open || !payload) return null;

  return (
    <div className="scriptora-modal-overlay z-[120]" role="dialog" aria-modal="true" aria-labelledby="requirement-gate-title">
      <div className="scriptora-modal-panel mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <p id="requirement-gate-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("req_dialog_kicker")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            aria-label={t("close_label")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scriptora-modal-body overflow-y-auto p-4 sm:p-5">
          <MissingRequirementCard
            payload={payload}
            onPrimary={onPrimary}
            onSecondary={payload.secondaryAction ? onSecondary : undefined}
          />
        </div>
      </div>
    </div>
  );
}
