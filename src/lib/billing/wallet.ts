import type { CreditPlanId, CreditWallet } from "./types";
import { PLAN_CREDIT_ALLOCATION } from "./creditPolicy";
import { mapSubscriptionPlanToCreditPlan } from "./creditPolicy";
import { getWalletScopeUserId } from "@/lib/auth/sessionContext";
import { getScopedWalletKey, migrateLegacyWalletStorage } from "./walletScope";

function nowIso(): string {
  return new Date().toISOString();
}

function walletStorageKey(): string {
  const userId = getWalletScopeUserId();
  if (userId !== "anonymous") migrateLegacyWalletStorage(userId);
  return getScopedWalletKey(userId);
}

export function loadCreditWallet(fallbackPlan: CreditPlanId = "free"): CreditWallet {
  try {
    const raw = localStorage.getItem(walletStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as CreditWallet;
      if (typeof parsed.balance === "number" && parsed.planId) return parsed;
    }
  } catch { /* noop */ }

  // No cached wallet — start at 0 until server sync populates the real balance.
  return {
    balance: 0,
    planId: fallbackPlan,
    updatedAt: nowIso(),
  };
}

export function saveCreditWallet(wallet: CreditWallet): void {
  localStorage.setItem(walletStorageKey(), JSON.stringify({ ...wallet, updatedAt: nowIso() }));
  window.dispatchEvent(new Event("scriptora-credits-change"));
}

export function syncWalletPlanFromSubscription(subscriptionPlan: string): CreditWallet {
  const planId = mapSubscriptionPlanToCreditPlan(subscriptionPlan);
  const wallet = loadCreditWallet(planId);
  if (wallet.planId !== planId) {
    const next = {
      balance: Math.max(wallet.balance, PLAN_CREDIT_ALLOCATION[planId]),
      planId,
      updatedAt: nowIso(),
    };
    saveCreditWallet(next);
    return next;
  }
  return wallet;
}

export function addCreditsToWallet(amount: number): CreditWallet {
  const wallet = loadCreditWallet();
  const next = { ...wallet, balance: wallet.balance + Math.max(0, amount) };
  saveCreditWallet(next);
  return next;
}

export function deductCreditsFromWallet(amount: number): CreditWallet {
  const wallet = loadCreditWallet();
  const next = { ...wallet, balance: Math.max(0, wallet.balance - Math.max(0, amount)) };
  saveCreditWallet(next);
  return next;
}
