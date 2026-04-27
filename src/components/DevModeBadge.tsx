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
} from "lucide-react";
import { toast } from "sonner";
import { exitDevMode, isDevMode, useDevMode } from "@/lib/dev-mode";
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

const PLAN_META: Record<PlanTier, { label: string; icon: React.ReactNode; hint: string }> = {
  free:    { label: "Free",    icon: <Sparkles className="h-3 w-3" />,    hint: "1 libro · no export" },
  beta:    { label: "Beta",    icon: <FlaskConical className="h-3 w-3" />, hint: "3 libri · export" },
  pro:     { label: "Pro",     icon: <Zap className="h-3 w-3" />,         hint: "10 libri · export" },
  premium: { label: "Premium", icon: <Crown className="h-3 w-3" />,       hint: "Illimitato + Dominate" },
};

export function DevModeBadge() {
  const on = useDevMode();
  const overridePlan = useDevPlanOverride();
  const navigate = useNavigate();
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  if (!on) return null;

  const handlePickPlan = (plan: PlanTier) => {
    setDevPlanOverride(plan);
    setPlanMenuOpen(false);
    toast.success(`Dev: piano simulato → ${PLAN_META[plan].label}`);
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
        const lastId = localStorage.getItem("nexora-last-project");
        if (lastId && !kept.find((p) => p.id === lastId)) {
          localStorage.removeItem("nexora-last-project");
        }
      } catch { /* noop */ }
      try { sessionStorage.removeItem("nexora-open-project"); } catch { /* noop */ }

      window.dispatchEvent(new Event("nexora-projects-change"));
      window.dispatchEvent(new Event("nexora-usage-change"));
      toast.success(
        removedCount > 0
          ? `Cancellati ${removedCount} progetti di test · Premium intatto`
          : "Nessun progetto di test da cancellare · Premium intatto"
      );
      setWipeOpen(false);
      // Soft reload so in-memory caches (React Query, storage memCache) drop.
      setTimeout(() => window.location.reload(), 300);
    } catch {
      toast.error("Reset fallito");
    }
  };

  return (
    <>
      <div className="fixed top-20 right-4 z-50 flex items-center gap-1 rounded-full bg-foreground text-background shadow-lg pl-3 pr-1 py-1 text-[11px] font-mono">
        <Terminal className="h-3 w-3" />
        <span className="font-semibold tracking-wider">DEV</span>

        {/* Plan switcher */}
        <div className="relative ml-2">
          <button
            onClick={() => setPlanMenuOpen((o) => !o)}
            title="Simula piano (solo dev)"
            className="h-6 px-2 rounded-full hover:bg-background/15 inline-flex items-center gap-1"
          >
            {PLAN_META[overridePlan].icon}
            <span className="uppercase tracking-wider">{PLAN_META[overridePlan].label}</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
          {planMenuOpen && (
            <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden">
              <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground border-b border-border">
                Simula piano
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
                      <div className="font-semibold">{meta.label}</div>
                      <div className="text-[9px] text-muted-foreground">{meta.hint}</div>
                    </div>
                    {active && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/usage")}
          title="Usage dashboard"
          className="h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
        >
          <BarChart3 className="h-3 w-3" />
        </button>
        <button
          onClick={() => setWipeOpen(true)}
          title="Cancella progetti di test (Free/Beta/Pro) · Premium intatto"
          className="h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <button
          onClick={() => {
            exitDevMode();
            toast.message("Developer Mode disattivato");
          }}
          title="Esci da Dev Mode"
          className="h-6 w-6 rounded-full hover:bg-background/15 flex items-center justify-center"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <Dialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancella progetti di test</DialogTitle>
            <DialogDescription>
              Elimina <strong>solo</strong> i progetti creati nei piani simulati <strong>Free</strong>, <strong>Beta</strong> e <strong>Pro</strong> (sandbox di test).
              I progetti del piano <strong>Premium</strong> sono salvati sul tuo account Google e nel cloud — restano <strong>intatti</strong> anche dopo logout.
              L'app verrà ricaricata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setWipeOpen(false)}
              className="px-3 py-2 rounded-md text-xs border border-border hover:bg-muted/50"
            >
              Annulla
            </button>
            <button
              onClick={handleWipeTestProjects}
              className="px-3 py-2 rounded-md text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancella test (Premium intatto)
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Re-export so callers that read the override can stay typed.
export { getDevPlanOverride };
