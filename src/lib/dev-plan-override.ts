// Dev-only plan override.
// When Developer Mode is ON, we let the owner simulate any tier (free / beta / pro / premium)
// without touching real Supabase data. The override lives in sessionStorage so it dies
// when dev mode exits or the tab closes — never leaks to public users.

import { useEffect, useState } from "react";
import type { PlanTier } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";

const KEY = "nexora_dev_plan_override";
const EVT = "nexora-dev-plan-override-change";

export function getDevPlanOverride(): PlanTier {
  if (!isDevMode()) return "free";
  try {
    const v = sessionStorage.getItem(KEY) as PlanTier | null;
    if (v === "free" || v === "beta" || v === "pro" || v === "premium") return v;
  } catch { /* noop */ }
  return "premium";
}

export function setDevPlanOverride(plan: PlanTier): void {
  if (!isDevMode()) {
    console.warn("[dev-plan] setDevPlanOverride ignored — dev mode not active");
    return;
  }
  try { sessionStorage.setItem(KEY, plan); } catch { /* noop */ }
  window.dispatchEvent(new Event(EVT));
  // Also fire generic plan-change so all hooks refresh.
  window.dispatchEvent(new Event("nexora-plan-change"));
}

export function clearDevPlanOverride(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
  window.dispatchEvent(new Event(EVT));
  window.dispatchEvent(new Event("nexora-plan-change"));
}

export function useDevPlanOverride(): PlanTier {
  const [plan, setPlan] = useState<PlanTier>(() => getDevPlanOverride());
  useEffect(() => {
    const sync = () => setPlan(getDevPlanOverride());
    window.addEventListener(EVT, sync);
    window.addEventListener("nexora-dev-mode-change", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("nexora-dev-mode-change", sync);
    };
  }, []);
  return plan;
}
