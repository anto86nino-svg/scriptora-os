// =============================================================================
// PAYWALL GUARD — universal feature lock UI + handler.
// -----------------------------------------------------------------------------
// Usage 1 (wrap UI): blur + lock overlay over premium-only sections.
//   <PaywallGuard feature="dominate_mode"><MyPremiumPanel /></PaywallGuard>
//
// Usage 2 (guard handlers): wrap a callback so it never fires for users below
// the required tier — instead it opens the upgrade modal.
//   const onClick = useFeatureGuard("title_intelligence_advanced", realHandler)
//
// All copy is Italian, never mentions internal providers (Brave/DeepSeek/etc).
// =============================================================================

import { useCallback, useState, type ReactNode } from "react";
import { Lock, Crown, Zap } from "lucide-react";
import { usePlan } from "@/lib/plan";
import { canUseFeature, paywallCopyFor, type FeatureKey } from "@/lib/subscription";
import { UpgradeModal } from "@/components/UpgradeModal";

// ---------- Wrapper component -----------------------------------------------

interface PaywallGuardProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Optional label override on the lock chip. */
  label?: string;
  /** When true, the locked content is fully hidden instead of blurred. */
  hideWhenLocked?: boolean;
  /** Compact mode: smaller chip, less padding. */
  compact?: boolean;
}

export function PaywallGuard({ feature, children, label, hideWhenLocked, compact }: PaywallGuardProps) {
  const { plan } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const allowed = canUseFeature(plan, feature);

  if (allowed) return <>{children}</>;
  if (hideWhenLocked) return null;

  const { required } = paywallCopyFor(feature);
  const Icon = required === "premium" ? Crown : Zap;
  const chipLabel = label ?? (required === "premium" ? "Premium" : "Pro");

  return (
    <div className="relative group">
      {/* Contenuto pienamente leggibile: l'utente VEDE cosa sta sbloccando */}
      <div className="pointer-events-none select-none opacity-95">{children}</div>

      {/* Badge angolare discreto */}
      <span className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm pointer-events-none">
        <Icon className="h-2.5 w-2.5" />
        {chipLabel}
      </span>

      {/* Tap-friendly unlock — always visible on touch, hover-reveal on desktop */}
      <button
        type="button"
        onClick={() => setShowUpgrade(true)}
        aria-label={`Sblocca con piano ${chipLabel}`}
        className="absolute inset-0 flex items-end justify-center rounded-xl bg-transparent hover:bg-background/15 transition-colors cursor-pointer"
      >
        <span className={`mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full bg-foreground text-background shadow-lg opacity-100 sm:opacity-90 sm:group-hover:opacity-100 ${compact ? "text-[10px] px-2 py-1" : ""}`}>
          <Lock className="h-3 w-3" />
          Sblocca con {chipLabel}
        </span>
      </button>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason={required === "premium" ? "dominate" : "export"}
        currentPlan={plan}
      />
    </div>
  );
}

// ---------- Inline lock badge (for buttons/cards) ---------------------------

export function FeatureLockBadge({ feature }: { feature: FeatureKey }) {
  const { plan } = usePlan();
  if (canUseFeature(plan, feature)) return null;
  const { required } = paywallCopyFor(feature);
  const Icon = required === "premium" ? Crown : Zap;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
      <Icon className="h-2.5 w-2.5" />
      {required === "premium" ? "Premium" : "Pro"}
    </span>
  );
}

// ---------- Hook: guard a handler -------------------------------------------

export interface FeatureGuardState {
  allowed: boolean;
  required: "pro" | "premium";
  /** Render this somewhere (or call the helper) to show the modal. */
  modal: ReactNode;
  /** Wraps a handler so blocked users open the paywall instead. */
  guard: <A extends any[], R>(fn: (...args: A) => R | Promise<R>) => (...args: A) => void;
  /** Imperatively open the upgrade modal. */
  open: () => void;
}

export function useFeatureGate(feature: FeatureKey): FeatureGuardState {
  const { plan } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const allowed = canUseFeature(plan, feature);
  const { required } = paywallCopyFor(feature);

  const guard = useCallback(
    <A extends any[], R>(fn: (...args: A) => R | Promise<R>) =>
      (...args: A) => {
        if (!allowed) {
          setShowUpgrade(true);
          return;
        }
        void Promise.resolve(fn(...args));
      },
    [allowed],
  );

  const modal = (
    <UpgradeModal
      open={showUpgrade}
      onClose={() => setShowUpgrade(false)}
      reason={required === "premium" ? "dominate" : "export"}
      currentPlan={plan}
    />
  );

  return { allowed, required, modal, guard, open: () => setShowUpgrade(true) };
}