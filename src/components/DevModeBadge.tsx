// DevModeBadge — owner-only floating console.
// In Dev Mode you can:
//  • simulate any plan tier (free / beta / pro / premium) without touching real data
//  • open the usage dashboard
//  • reset the LOCAL dev profile (clears local projects, drafts, caches) for clean re-testing
//  • exit dev mode
// All actions are gated by isDevMode() — they NEVER appear or run for normal users.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Terminal,
  X,
  BarChart3,
  RotateCcw,
  ChevronDown,
  Check,
  Sparkles,
  FlaskConical,
  Zap,
  Crown,
  Trash2,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { exitDevMode, isDevMode, useDevMode } from "@/lib/dev-mode";
import { isDevUnlimitedCredits, setDevUnlimitedCredits } from "@/lib/billing/devMode";
import {
  getDevPlanOverride,
  setDevPlanOverride,
  useDevPlanOverride,
} from "@/lib/dev-plan-override";
import type { PlanTier } from "@/lib/plan";
import { RESETTABLE_DEV_USER_IDS } from "@/services/storageService";
import { loadProjects, deleteProject } from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { t, tt, useUILanguage } from "@/lib/i18n";
import { DevCreditQuickBuy } from "@/components/billing/DevCreditQuickBuy";

const PLAN_META: Record<PlanTier, { icon: React.ReactNode; hintKey: string }> = {
  free:    { icon: <Sparkles className="h-3 w-3" />,    hintKey: "dev_free_hint" },
  beta:    { icon: <FlaskConical className="h-3 w-3" />, hintKey: "dev_beta_hint" },
  pro:     { icon: <Zap className="h-3 w-3" />,         hintKey: "dev_pro_hint" },
  premium: { icon: <Crown className="h-3 w-3" />,       hintKey: "dev_premium_hint" },
};

export function DevModeBadge({ docked = false }: { docked?: boolean }) {
  useUILanguage();
  const on = useDevMode();
  const overridePlan = useDevPlanOverride();
  const navigate = useNavigate();
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [simulationOn, setSimulationOn] = useState(() => isDevUnlimitedCredits());
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (docked) return true;
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 639px)").matches;
  });

  if (!on) return null;

  const planLabel = (plan: PlanTier) => plan === "free" ? t("free") : plan.charAt(0).toUpperCase() + plan.slice(1);

  const handlePickPlan = (plan: PlanTier) => {
    setDevPlanOverride(plan);
    setPlanMenuOpen(false);
    toast.success(tt("dev_plan_toast", { plan: planLabel(plan) }));
  };

  // Wipes ONLY non-Premium dev projects (free / beta / pro test sandboxes).
  // Premium projects = owner's real work → ALWAYS preserved.
  const handleWipeTestProjects = async () => {
    if (!isDevMode()) return;
    try {
      const all = loadProjects();
      const resettable = new Set<string>(RESETTABLE_DEV_USER_IDS);
      // Premium + legacy (no userId) + unknown scopes are ALWAYS preserved.
      const toRemove = all.filter((p) => {
        const uid = (p as any).userId;
        return uid && resettable.has(uid);
      });
      const kept = all.filter((p) => !toRemove.includes(p));
      for (const p of toRemove) deleteProject(p.id);
      const removedCount = toRemove.length;

      // Clear last-project pointer if it referenced a wiped project.
      try {
        const lastId = localStorage.getItem("scriptora-last-project");
        if (lastId && !kept.find((p) => p.id === lastId)) {
          localStorage.removeItem("scriptora-last-project");
        }
      } catch { /* noop */ }
      try { sessionStorage.removeItem("scriptora-open-project"); } catch { /* noop */ }

      window.dispatchEvent(new Event("scriptora-projects-change"));
      window.dispatchEvent(new Event("scriptora-usage-change"));
      toast.success(
        removedCount > 0
          ? tt("dev_projects_deleted", { count: removedCount })
          : t("dev_no_projects_deleted")
      );
      setWipeOpen(false);
      // Soft reload so in-memory caches (React Query, storage memCache) drop.
      setTimeout(() => window.location.reload(), 300);
    } catch {
      toast.error(t("dev_reset_failed"));
    }
  };

  const toolbar = (
    <>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        title={t("close")}
        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-background/15 sm:hidden"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
      <Terminal className="h-3 w-3" />
      <span className="font-semibold tracking-wider">DEV</span>

        <button
          onClick={() => {
            const next = !simulationOn;
            setDevUnlimitedCredits(next);
            setSimulationOn(next);
            toast.message(next ? "Crediti illimitati ON — nessun addebito" : "Crediti illimitati OFF — consumo reale sul wallet dev");
          }}
          title="DEV SIMULATION ON/OFF"
          className={`h-6 px-2 rounded-full hover:bg-background/15 inline-flex items-center gap-1 ${
            simulationOn ? "bg-amber-400/20 text-amber-100" : ""
          }`}
        >
          <span className="uppercase tracking-wider text-[10px]">{simulationOn ? "SIM ON" : "SIM OFF"}</span>
        </button>

        {/* Plan switcher */}
        <div className="relative ml-2">
          <button
            onClick={() => setPlanMenuOpen((o) => !o)}
            title={t("dev_simulate_plan_title")}
            className="h-6 px-2 rounded-full hover:bg-background/15 inline-flex items-center gap-1"
          >
            {PLAN_META[overridePlan].icon}
            <span className="uppercase tracking-wider">{planLabel(overridePlan)}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
          {planMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 min-w-[200px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border">
                {t("dev_simulate_plan")}
              </div>
              {(Object.keys(PLAN_META) as PlanTier[]).map((tier) => {
                const meta = PLAN_META[tier];
                const active = overridePlan === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => handlePickPlan(tier)}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-left text-[11px] hover:bg-muted/50 transition-colors ${
                      active ? "bg-muted/30" : ""
                    }`}
                  >
                    <span className="opacity-80">{meta.icon}</span>
                    <div className="flex-1 leading-tight">
                      <div className="font-semibold">{planLabel(tier)}</div>
                      <div className="text-[9px] text-muted-foreground">{t(meta.hintKey)}</div>
                    </div>
                    {active && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setCreditsOpen((open) => !open)}
            title="Acquista crediti dev (simulato)"
            className={`h-6 px-2 rounded-full hover:bg-background/15 inline-flex items-center gap-1 ${
              creditsOpen ? "bg-amber-400/25 text-amber-100" : ""
            }`}
          >
            <Coins className="h-3 w-3" />
            <span className="hidden sm:inline text-[10px] font-semibold">+CR</span>
          </button>
          {creditsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCreditsOpen(false)} aria-hidden />
              <div className="absolute bottom-full right-0 z-50 mb-2 w-[min(300px,calc(100vw-2rem))]">
                <DevCreditQuickBuy onPurchased={() => setCreditsOpen(false)} />
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => navigate("/usage")}
          title={t("usage_dashboard")}
          className="h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
        >
          <BarChart3 className="h-3 w-3" />
        </button>
        <button
          onClick={() => setWipeOpen(true)}
          title={t("wipe_test_projects_title")}
          className="h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          onClick={() => {
            exitDevMode();
            toast.message(t("dev_mode_disabled"));
          }}
          title={t("exit_dev_mode")}
          className="h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
        >
          <X className="h-3 w-3" />
        </button>
    </>
  );

  const wipeDialog = (
    <Dialog open={wipeOpen} onOpenChange={setWipeOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("wipe_dialog_title")}</DialogTitle>
          <DialogDescription>{t("wipe_dialog_desc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <button onClick={() => setWipeOpen(false)} className="px-3 py-2 rounded-md text-xs border border-border hover:bg-muted/50">
            {t("cancel")}
          </button>
          <button onClick={handleWipeTestProjects} className="px-3 py-2 rounded-md text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t("wipe_confirm")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (docked) {
    if (collapsed) {
      return (
        <>
          <button type="button" onClick={() => setCollapsed(false)} className="scriptora-dock-inline-btn w-full justify-center" title="Dev Mode">
            <Terminal className="h-3.5 w-3.5 text-sky-300" />
            <span>DEV</span>
          </button>
          {wipeDialog}
        </>
      );
    }
    return (
      <>
        <div className="scriptora-dock-dev-bar flex max-w-full flex-wrap items-center gap-1 rounded-xl py-1 pl-2 pr-1 text-[11px] font-mono text-background">
          {toolbar}
        </div>
        {wipeDialog}
      </>
    );
  }

  return (
    <>
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Dev Mode"
          className="bottom-safe fixed right-3 z-40 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-background/75 px-3 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-lg backdrop-blur-xl sm:hidden"
        >
          <Terminal className="h-3 w-3 text-sky-300" />
          DEV
        </button>
      )}

      <div className={`bottom-safe fixed right-3 z-40 max-w-[calc(100dvw-1rem)] items-center gap-1 rounded-2xl bg-foreground/95 py-1 pl-2 pr-1 text-[11px] font-mono text-background shadow-lg backdrop-blur-xl sm:bottom-4 sm:right-4 sm:z-50 sm:flex sm:max-w-[calc(100dvw-2rem)] sm:rounded-full sm:bg-foreground ${
        collapsed ? "hidden" : "flex"
      }`}>
        {toolbar}
      </div>
      {wipeDialog}
    </>
  );
}

// Re-export so callers that read the override can stay typed.
export { getDevPlanOverride };
