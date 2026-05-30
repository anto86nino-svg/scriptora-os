import { Sparkles } from "lucide-react";
import { paymentsConfig } from "@/config/payments";
import { t } from "@/lib/i18n";

export function PaymentStatusBanner() {
  const isLive = paymentsConfig.enabled && paymentsConfig.mode !== "coming_soon";
  if (isLive) return null;

  return (
    <div className="mx-auto mb-10 flex max-w-3xl items-start gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent px-5 py-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("pricing_soft_launch_note")}</p>
    </div>
  );
}
