import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import {
  PREMIUM_ACTIVATION_EVENT,
  type PremiumActivationDetail,
  type PremiumActivationVariant,
} from "@/lib/billing/premiumActivation";

interface PremiumActivationNoticeDialogProps {
  open: boolean;
  onClose: () => void;
  variant?: PremiumActivationVariant;
}

function titleKey(variant: PremiumActivationVariant): string {
  switch (variant) {
    case "credits":
      return "premium_activation_credits_title";
    case "plan":
      return "premium_activation_plan_title";
    default:
      return "premium_activation_wallet_title";
  }
}

function bodyKey(variant: PremiumActivationVariant): string {
  switch (variant) {
    case "credits":
      return "premium_activation_credits_body";
    case "plan":
      return "premium_activation_plan_body";
    default:
      return "premium_activation_wallet_body";
  }
}

export function PremiumActivationNoticeDialog({
  open,
  onClose,
  variant = "wallet",
}: PremiumActivationNoticeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md border-white/15 bg-slate-950/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/30 to-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">{t(titleKey(variant))}</DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm leading-relaxed text-muted-foreground">{t(bodyKey(variant))}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("premium_activation_ack")}
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Global host — mount once in App to respond to showPremiumActivationNotice(). */
export function PremiumActivationNoticeHost() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<PremiumActivationVariant>("wallet");

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ variant?: PremiumActivationVariant }>;
      setVariant(custom.detail?.variant ?? "wallet");
      setOpen(true);
    };
    window.addEventListener(PREMIUM_ACTIVATION_EVENT, handler);
    return () => window.removeEventListener(PREMIUM_ACTIVATION_EVENT, handler);
  }, []);

  return (
    <PremiumActivationNoticeDialog open={open} onClose={() => setOpen(false)} variant={variant} />
  );
}
