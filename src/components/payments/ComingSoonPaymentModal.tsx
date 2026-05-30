import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t, tt } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  planName?: string;
  showPricingLink?: boolean;
}

export function ComingSoonPaymentModal({ open, onClose, planName, showPricingLink = true }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/30 to-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            {planName
              ? tt("pricing_coming_soon_title", { plan: planName })
              : t("pricing_coming_soon_title_generic")}
          </DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {planName
            ? tt("pricing_coming_soon_body", { plan: planName })
            : t("pricing_coming_soon_body_generic")}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {showPricingLink && (
            <Link
              to="/pricing"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("pricing_see_plans")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("pricing_coming_soon_continue")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
