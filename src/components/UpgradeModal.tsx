// Reusable upgrade modal triggered when free users hit a paywall (export, dominate, word limit).
// Uses commercial plan copy — legacy PlanTier gates unchanged (pro / premium).

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, Check, Crown, Zap } from "lucide-react";
import { PlanTier } from "@/lib/plan";
import { COMMERCIAL_PLANS } from "@/lib/billing/commercialPlans";
import { showPremiumActivationNotice } from "@/lib/billing/premiumActivation";
import { t } from "@/lib/i18n";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: "export" | "dominate" | "token-limit" | "books-limit";
  currentPlan?: PlanTier;
}

const REASON_COPY: Record<NonNullable<UpgradeModalProps["reason"]>, { title: string; subtitle: string }> = {
  export: {
    title: "Il tuo libro è pronto. Ora sbloccalo.",
    subtitle: "Esporta in EPUB, PDF e DOCX e porta il tuo manoscritto ovunque.",
  },
  dominate: {
    title: "Editing chirurgico in profondità.",
    subtitle: "Revisione mirata — voce, canon e continuità preservati.",
  },
  "token-limit": {
    title: "Sei vicino al limite del tuo libro.",
    subtitle: "Passa a un piano superiore per più crediti editoriali e spazio di scrittura.",
  },
  "books-limit": {
    title: "Sei pronto per il tuo prossimo libro.",
    subtitle: "Il piano Free copre 1 libro — passa a Pro Author per continuare.",
  },
};

const PRO_OFFER = COMMERCIAL_PLANS.find((p) => p.id === "pro")!;
const STUDIO_OFFER = COMMERCIAL_PLANS.find((p) => p.id === "studio")!;

function formatCommercialPrice(priceEur: number | null): string {
  if (priceEur == null || priceEur === 0) return "€0";
  return `€${priceEur.toFixed(2).replace(".", ",")}`;
}

export function UpgradeModal({ open, onClose, reason = "export", currentPlan = "free" }: UpgradeModalProps) {
  const copy = REASON_COPY[reason];
  const recommendStudio = reason === "dominate";

  const handlePick = () => {
    showPremiumActivationNotice("plan");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border">
        <div className="bg-gradient-to-br from-primary/15 via-background to-background p-6 border-b border-border">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">{copy.title}</DialogTitle>
            <DialogDescription className="text-center max-w-md mx-auto">{copy.subtitle}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PlanCard
              name={t(PRO_OFFER.nameKey)}
              price={formatCommercialPrice(PRO_OFFER.priceEur)}
              period={t(PRO_OFFER.periodKey)}
              creditsLine={t("commercial_plan_credits_included", { count: PRO_OFFER.monthlyCredits })}
              features={PRO_OFFER.featureKeys.slice(0, 4).map((key) => t(key))}
              cta={t("commercial_plan_cta_upgrade")}
              badge={!recommendStudio ? t("commercial_plan_recommended") : undefined}
              highlight={!recommendStudio}
              icon={<Zap className="h-3.5 w-3.5" />}
              onPick={handlePick}
            />
            <PlanCard
              name={t(STUDIO_OFFER.nameKey)}
              price={formatCommercialPrice(STUDIO_OFFER.priceEur)}
              period={t(STUDIO_OFFER.periodKey)}
              creditsLine={t("commercial_plan_credits_included", { count: STUDIO_OFFER.monthlyCredits })}
              features={STUDIO_OFFER.featureKeys.slice(0, 4).map((key) => t(key))}
              cta={t("commercial_plan_cta_upgrade")}
              badge={recommendStudio ? t("upgrade_studio_badge") : undefined}
              highlight={recommendStudio}
              icon={<Crown className="h-3.5 w-3.5" />}
              onPick={handlePick}
            />
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            {t("upgrade_footer_note")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlanCardProps {
  name: string;
  price: string;
  period: string;
  creditsLine: string;
  features: string[];
  cta: string;
  badge?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
  onPick: () => void;
}

function PlanCard({
  name,
  price,
  period,
  creditsLine,
  features,
  cta,
  badge,
  highlight,
  icon,
  onPick,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl border p-5 flex flex-col transition-all ${
        highlight
          ? "border-primary bg-gradient-to-b from-primary/10 to-primary/5 shadow-[0_0_32px_-8px_hsl(var(--primary)/0.4)]"
          : "border-border bg-surface"
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
            highlight ? "bg-primary text-primary-foreground" : "bg-amber-500 text-amber-950"
          }`}
        >
          {badge}
        </span>
      )}
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h4 className="text-sm font-bold text-foreground">{name}</h4>
      </div>
      <div className="mb-1">
        <span className="text-3xl font-black text-foreground">{price}</span>
        <span className="text-xs text-muted-foreground">{period}</span>
      </div>
      <p className="mb-3 text-[11px] font-semibold text-primary">{creditsLine}</p>
      <ul className="space-y-2 mb-5 flex-1">
        {features.map((f, i) => (
          <li key={`stable-${i}`} className="flex items-start gap-1.5 text-xs text-foreground/85">
            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onPick}
        className={`text-center px-3 py-2.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.02] ${
          highlight
            ? "bg-primary text-primary-foreground shadow-lg"
            : "bg-foreground/90 text-background hover:bg-foreground"
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

export function LockedBadge({ label = "PRO" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
      <Lock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}
