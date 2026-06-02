/**
 * DEV MODE WALLET OVERRIDE — PLAN-AWARE CREDIT SIMULATION
 * 
 * When Dev Mode changes plan (FREE → PRO → PREMIUM), this layer
 * ensures the credit wallet simulates the correct tier with realistic credits.
 * 
 * For the owner developer account (natasha romanoff):
 * - ALL plans show unlimited credits (∞)
 * - NO credit consumption
 * - NO paywall blocking
 * 
 * Pure UI simulation — production billing untouched.
 */

import type { CreditWalletSnapshot } from "@/lib/billing/creditWallet";
import type { PlanTier } from "@/lib/plan";
import {
  getMonthlyCreditsForPlan,
} from "@/lib/billing/creditPolicy";
import { isDevMode } from "@/lib/dev-mode";




import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { isOwnerEmail } from "@/lib/dev-mode";





const WALLET_OVERRIDE_STORAGE_KEY = "scriptora-dev-wallet-override-v1";
const WALLET_OVERRIDE_EVENT = "scriptora-dev-wallet-override-change";

function mapPlanTierToScriptoraPlan(
  planTier: string
): "free" | "pro" | "premium" {
  if (planTier === "premium") return "premium";
  if (planTier === "pro") return "pro";
  return "free";
}

export interface DevWalletOverrideSnapshot {
  planTier: PlanTier;
  monthlyAllowance: number;
  usedCredits: number;
  availableCredits: number;
  isOwnerUnlimited: boolean;
  periodStart: string;
  updatedAt: string;
}

function currentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function readStoredOverride(): DevWalletOverrideSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WALLET_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevWalletOverrideSnapshot;
    // Reset if period changed
    if (parsed.periodStart !== currentPeriodStart()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredOverride(snapshot: DevWalletOverrideSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WALLET_OVERRIDE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* private mode / quota */
  }
}

/**
 * Check if the given email is the developer owner.
 */
export function isOwnerDeveloperAccount(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  return isOwnerEmail(userEmail);
}

/**
 * Build wallet override snapshot for a given plan tier.
 * Called when dev plan changes.
 */
export function buildDevWalletOverrideSnapshot(
  planTier: PlanTier,
  isOwnerAccount: boolean,
): DevWalletOverrideSnapshot {
  const scriptoraPlan = mapPlanTierToScriptoraPlan(planTier);
  const monthlyAllowance = getMonthlyCreditsForPlan(scriptoraPlan);

  // Owner account: unlimited credits
  if (isOwnerAccount) {
    return {
      planTier,
      monthlyAllowance: 999999999,
      usedCredits: 0,
      availableCredits: 999999999,
      isOwnerUnlimited: true,
      periodStart: currentPeriodStart(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Regular dev account: realistic credits for the plan
  const stored = readStoredOverride();
  const usedCredits =
    stored && stored.planTier === planTier
      ? Math.min(stored.usedCredits, monthlyAllowance) // Cap to new allowance
      : 0; // Reset when plan changes

  return {
    planTier,
    monthlyAllowance,
    usedCredits,
    availableCredits: Math.max(0, monthlyAllowance - usedCredits),
    isOwnerUnlimited: false,
    periodStart: currentPeriodStart(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Notify wallet system that dev plan has changed.
 * Call this whenever setDevPlanOverride() changes the plan.
 */
export function updateDevWalletForPlanChange(planTier: PlanTier, isOwnerAccount: boolean): void {
  if (!isDevMode()) return;

  const snapshot = buildDevWalletOverrideSnapshot(planTier, isOwnerAccount);
  writeStoredOverride(snapshot);

  // Dispatch events so components re-fetch wallet
  window.dispatchEvent(new Event(WALLET_OVERRIDE_EVENT));
  window.dispatchEvent(new Event("scriptora-credit-wallet-change"));
  window.dispatchEvent(new Event("nexora-plan-change"));
  window.dispatchEvent(new Event("nexora-usage-change"));
}

/**
 * Get current wallet override snapshot.
 * Returns null if no override active.
 */
export function getDevWalletOverride(): DevWalletOverrideSnapshot | null {
  if (!isDevMode()) return null;
  return readStoredOverride();
}

/**
 * Convert dev wallet override to CreditWalletSnapshot format.
 * For use by creditWallet.ts when building snapshots.
 */
export function buildCreditWalletFromDevOverride(
  override: DevWalletOverrideSnapshot,
): CreditWalletSnapshot {
  const scriptoraPlan = mapPlanTierToScriptoraPlan(override.planTier);
  return {
    plan: scriptoraPlan,
    monthlyAllowance: override.monthlyAllowance,
    usedCredits: override.usedCredits,
    availableCredits: override.availableCredits,
    periodStart: override.periodStart,
    source: "local-fallback",
    updatedAt: override.updatedAt,
  };
}

/**
 * Check if owner account has unlimited credits simulation active.
 * Used to skip credit consumption and paywall blocking.
 */
export function isOwnerDevAccountWithUnlimitedCredits(): boolean {
  if (!isDevMode()) return false;
  const override = readStoredOverride();
  return override?.isOwnerUnlimited ?? false;
}
