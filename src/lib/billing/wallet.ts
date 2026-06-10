import type { CreditPlanId, CreditWallet } from "./types";
import { PLAN_CREDIT_ALLOCATION } from "./creditPolicy";
import { mapSubscriptionPlanToCreditPlan } from "./creditPolicy";
import { getWalletScopeUserId } from "@/lib/auth/sessionContext";
import { isDevLocalWalletActive } from "./billingMode";
import { getScopedWalletKey, migrateLegacyWalletStorage } from "./walletScope";
import { loadCreditLedger } from "./ledger";

const DEV_OWNER_STARTER_BALANCE = 1_000_000;

function nowIso(): string {
  return new Date().toISOString();
}

function walletStorageKey(): string {
  const userId = getWalletScopeUserId();
  if (userId !== "anonymous") migrateLegacyWalletStorage(userId);
  return getScopedWalletKey(userId);
}

/** One-time seed for owner dev wallet when server sync left balance at 0. */
export function seedDevWalletIfNeeded(): CreditWallet {
  const wallet = loadCreditWalletRaw();
  if (!isDevLocalWalletActive()) return wallet;
  if (wallet.balance > 0) return wallet;
  if (loadCreditLedger().length > 0) return wallet;

  const seeded: CreditWallet = {
    ...wallet,
    balance: DEV_OWNER_STARTER_BALANCE,
    updatedAt: nowIso(),
  };
  saveCreditWallet(seeded);
  return seeded;
}

function loadCreditWalletRaw(fallbackPlan: CreditPlanId = "free"): CreditWallet {
  const key = walletStorageKey();

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CreditWallet;
      if (typeof parsed.balance === "number" && parsed.planId) {
        return parsed;
      }
    }
  } catch { /* noop */ }

  const starterWallet: CreditWallet = {
    balance: isDevLocalWalletActive() ? DEV_OWNER_STARTER_BALANCE : 0,
    planId: fallbackPlan,
    updatedAt: nowIso(),
  };

  localStorage.setItem(key, JSON.stringify(starterWallet));
  return starterWallet;
}

export function loadCreditWallet(fallbackPlan: CreditPlanId = "free"): CreditWallet {
  const wallet = loadCreditWalletRaw(fallbackPlan);
  if (isDevLocalWalletActive()) {
    return seedDevWalletIfNeeded();
  }
  return wallet;
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
