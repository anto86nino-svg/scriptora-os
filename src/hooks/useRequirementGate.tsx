import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RequirementGateDialog } from "@/components/RequirementGateDialog";
import {
  buildRequirement,
  type BuildRequirementOptions,
  type RequirementAction,
  type RequirementGatePayload,
  type RequirementId,
} from "@/lib/scriptora-requirement-gate";
import { executeRequirementIntent } from "@/lib/scriptora-requirement-actions";

export interface ShowRequirementOptions extends BuildRequirementOptions {
  onPrimary?: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
}

export function useRequirementGate() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<RequirementGatePayload | null>(null);
  const [handlers, setHandlers] = useState<{
    onPrimary?: () => void;
    onSecondary?: () => void;
    onClose?: () => void;
  }>({});

  const close = useCallback(() => {
    setOpen(false);
    handlers.onClose?.();
  }, [handlers]);

  const showRequirement = useCallback(
    (id: RequirementId, options: ShowRequirementOptions = {}) => {
      const built = buildRequirement(id, options);
      setPayload(built);
      setHandlers({
        onPrimary: options.onPrimary,
        onSecondary: options.onSecondary,
        onClose: options.onClose,
      });
      setOpen(true);
    },
    [],
  );

  const runAction = useCallback(
    (action: RequirementAction & { label: string }, fallback?: () => void) => {
      if (fallback) {
        fallback();
        return;
      }
      if (action.intent) {
        executeRequirementIntent(action.intent, navigate, action.detail);
        return;
      }
      if (action.route) navigate(action.route);
    },
    [navigate],
  );

  const handlePrimary = useCallback(() => {
    close();
    if (handlers.onPrimary) {
      handlers.onPrimary();
      return;
    }
    if (payload?.primaryAction) runAction(payload.primaryAction);
  }, [close, handlers, payload, runAction]);

  const handleSecondary = useCallback(() => {
    close();
    if (handlers.onSecondary) {
      handlers.onSecondary();
      return;
    }
    if (payload?.secondaryAction) runAction(payload.secondaryAction);
  }, [close, handlers, payload, runAction]);

  const dialog = (
    <RequirementGateDialog
      open={open}
      payload={payload}
      onClose={close}
      onPrimary={handlePrimary}
      onSecondary={payload?.secondaryAction ? handleSecondary : undefined}
    />
  );

  return { showRequirement, closeRequirement: close, requirementDialog: dialog };
}
