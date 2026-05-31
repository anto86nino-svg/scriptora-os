import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RequirementGateDialog } from "@/components/RequirementGateDialog";
import {
  buildRequirement,
  type BuildRequirementOptions,
  type RequirementGatePayload,
  type RequirementId,
} from "@/lib/scriptora-requirement-gate";

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

  const runRouteAction = useCallback(
    (route: string | undefined, fallback?: () => void) => {
      if (fallback) {
        fallback();
        return;
      }
      if (route) navigate(route);
    },
    [navigate],
  );

  const handlePrimary = useCallback(() => {
    close();
    if (handlers.onPrimary) {
      handlers.onPrimary();
      return;
    }
    runRouteAction(payload?.primaryAction.route);
  }, [close, handlers, payload, runRouteAction]);

  const handleSecondary = useCallback(() => {
    close();
    if (handlers.onSecondary) {
      handlers.onSecondary();
      return;
    }
    runRouteAction(payload?.secondaryAction?.route);
  }, [close, handlers, payload, runRouteAction]);

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
