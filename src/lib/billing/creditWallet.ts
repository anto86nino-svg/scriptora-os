import {
  getMonthlyCreditsForPlan,
  type CreditOperation,
  type ScriptoraPlan,
} from "@/lib/billing/creditPolicy";
import { mapPlanTierToScriptoraPlan } from "@/lib/billing/planAdapter";
import type { PlanTier } from "@/lib/plan";
import { getCurrentUserId } from "@/services/storageService";

const WALLET_STORAGE_KEY = "scriptora-credit-wallet-v1";
const USAGE_STORAGE_KEY = "scriptora-credit-usage-v1";

/**
 * When false (default), UI shows credit hints but never hard-blocks operations.
 * Set VITE_SCRIPTORA_CREDIT_ENFORCEMENT=true once Edge Function ledger is live.
 */
export function isCreditEnforcementActive(): boolean {
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

/**
 * Local fallback wallet until Supabase `credit_ledger` + Edge Function exist.
 *
 * TODO(backend): implement `GET /credit-wallet` and `POST /credit-debit` Edge Functions;
 * replace this loader with a remote fetch and keep localStorage only as offline cache.
 */
export async function loadCreditWallet(planTier: PlanTier): Promise<CreditWalletSnapshot> {
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

/** Dev / preview only — production debits must go through Edge Function. */
export function recordLocalCreditUsage(operation: CreditOperation, credits: number): void {
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
