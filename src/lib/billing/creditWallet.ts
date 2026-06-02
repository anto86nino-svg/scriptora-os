
import {
  getDevWalletOverride,
  buildCreditWalletFromDevOverride,
} from "@/lib/dev-wallet-override";
import {
  getMonthlyCreditsForPlan,
  calculateCreditCost,
  canRunCreditOperation,
  type CreditCostParams,
  type CreditOperation,
  type CreditRunCheckResult,
  type ScriptoraPlan,
} from "@/lib/billing/creditPolicy";
import { mapPlanTierToScriptoraPlan } from "@/lib/billing/planAdapter";
import { fetchRemoteCreditWallet } from "@/lib/billing/creditWalletServer";
import type { PlanTier } from "@/lib/plan";
import { getCurrentUserId } from "@/services/storageService";
import {
  buildSimulatedCreditWalletSnapshot,
  consumeDevSimulatedCredits,
  isDevSimulationCreditEnforcementActive,
  isDevUserSimulationActive,
} from "@/lib/dev/devUserSimulation";

const WALLET_STORAGE_KEY = "scriptora-credit-wallet-v1";
const USAGE_STORAGE_KEY = "scriptora-credit-usage-v1";

/** When false (default), UI shows credit hints but never hard-blocks operations. Dev simulation forces enforcement locally. */
export function isCreditEnforcementActive(): boolean {
  if (isDevSimulationCreditEnforcementActive()) return true;
  return import.meta.env.VITE_SCRIPTORA_CREDIT_ENFORCEMENT === "true";
}

export interface CreditWalletSnapshot {
  plan: ScriptoraPlan;
  monthlyAllowance: number;
  usedCredits: number;
  availableCredits: number;
  periodStart: string;
  source: "local-fallback" | "remote";
  updatedAt: string;
}

interface StoredWalletUsage {
  userId: string;
  periodStart: string;
  usedCredits: number;
}

function currentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function readLocalUsage(userId: string, periodStart: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as StoredWalletUsage;
    if (parsed.userId !== userId || parsed.periodStart !== periodStart) return 0;
    return Math.max(0, Number(parsed.usedCredits) || 0);
  } catch {
    return 0;
  }
}

function writeLocalUsage(userId: string, periodStart: string, usedCredits: number): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredWalletUsage = { userId, periodStart, usedCredits };
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota — ignore; wallet stays read-only safe */
  }
}

/** Local estimate when Supabase wallet edge function is unavailable. */
export function buildLocalCreditWalletSnapshot(planTier: PlanTier): CreditWalletSnapshot {
  const scriptoraPlan = mapPlanTierToScriptoraPlan(planTier);
  const monthlyAllowance = getMonthlyCreditsForPlan(scriptoraPlan);
  const periodStart = currentPeriodStart();
  const userId = getCurrentUserId();
  const usedCredits = readLocalUsage(userId, periodStart);
  const availableCredits = Math.max(0, monthlyAllowance - usedCredits);

  return {
    plan: scriptoraPlan,
    monthlyAllowance,
    usedCredits,
    availableCredits,
    periodStart,
    source: "local-fallback",
    updatedAt: new Date().toISOString(),
  };
}

/** Prefer remote wallet; fall back to local estimate without throwing. Dev simulation never hits remote. */
export async function loadCreditWallet(planTier: PlanTier): Promise<CreditWalletSnapshot> {
  if (isDevUserSimulationActive()) {
    return buildSimulatedCreditWalletSnapshot();
  }
  const remote = await fetchRemoteCreditWallet(planTier);
  if (remote) return remote;
  return buildLocalCreditWalletSnapshot(planTier);
}

/** Unified credit consumption — uses real calculateCreditCost / canRunCreditOperation. */
export function consumeCredits(params: CreditCostParams, planTier: PlanTier): CreditRunCheckResult {
  if (isDevUserSimulationActive()) {
    return consumeDevSimulatedCredits({
      ...params,
      plan: params.plan ?? mapPlanTierToScriptoraPlan(planTier),
    });
  }

  const scriptoraPlan = mapPlanTierToScriptoraPlan(planTier);
  const requiredCredits = calculateCreditCost({ ...params, plan: params.plan ?? scriptoraPlan });

  if (!isCreditEnforcementActive()) {
    return { allowed: true, requiredCredits, missingCredits: 0 };
  }

  const snapshot = buildLocalCreditWalletSnapshot(planTier);
  const check = canRunCreditOperation({
    ...params,
    plan: params.plan ?? scriptoraPlan,
    availableCredits: snapshot.availableCredits,
  });
  if (check.allowed) {
    recordLocalCreditUsage(params.operation, check.requiredCredits);
  }
  return check;
}

/** Dev / preview only — production debits must go through Edge Function. Skipped when dev simulation handles wallet. */
export function recordLocalCreditUsage(operation: CreditOperation, credits: number): void {
  if (isDevUserSimulationActive()) return;
  if (!isCreditEnforcementActive()) return;
  const userId = getCurrentUserId();
  const periodStart = currentPeriodStart();
  const prev = readLocalUsage(userId, periodStart);
  writeLocalUsage(userId, periodStart, prev + Math.max(0, credits));
  window.dispatchEvent(new Event("scriptora-credit-wallet-change"));
}

export function clearLocalCreditWalletCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY);
    localStorage.removeItem(USAGE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

