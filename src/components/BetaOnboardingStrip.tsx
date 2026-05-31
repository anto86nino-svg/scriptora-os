import { ArrowRight, BookOpen, Sparkles, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { dismissOnboarding } from "@/lib/first-visit-onboarding";

interface BetaOnboardingStripProps {
  onStartBook: () => void;
  onDismiss?: () => void;
}

export function BetaOnboardingStrip({ onStartBook, onDismiss }: BetaOnboardingStripProps) {
  const handleDismiss = () => {
    dismissOnboarding();
    onDismiss?.();
  };

  const steps = [
    { icon: BookOpen, label: t("beta_onboarding_step1") },
    { icon: Sparkles, label: t("beta_onboarding_step2") },
    { icon: ArrowRight, label: t("beta_onboarding_step3") },
  ];

  return (
    <section
      className="scriptora-beta-onboarding mb-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5"
      aria-label={t("beta_onboarding_title")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{t("beta_onboarding_kicker")}</p>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{t("beta_onboarding_title")}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{t("beta_onboarding_subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label={t("close_label")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-foreground/90"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
              {index + 1}
            </span>
            <span className="leading-snug">{step.label}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={onStartBook}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] sm:w-auto"
      >
        {t("beta_onboarding_cta")}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}
