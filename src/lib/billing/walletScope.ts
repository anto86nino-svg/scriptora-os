import { getWalletScopeUserId } from "@/lib/auth/sessionContext";

const WALLET_PREFIX = "scriptora-credit-wallet-v1";
const LEDGER_PREFIX = "scriptora-credit-ledger-v1";
const LEGACY_WALLET_KEY = "scriptora-credit-wallet-v1";
const LEGACY_LEDGER_KEY = "scriptora-credit-ledger-v1";

export function getScopedWalletKey(userId?: string): string {
  const uid = userId ?? getWalletScopeUserId();
  return `${WALLET_PREFIX}:${uid}`;
}

export function getScopedLedgerKey(userId?: string): string {
  const uid = userId ?? getWalletScopeUserId();
  return `${LEDGER_PREFIX}:${uid}`;
}

/** One-time migration from global wallet/ledger to per-user keys. */
export function migrateLegacyWalletStorage(userId: string): void {
  if (!userId || userId === "anonymous") return;

  const scopedWallet = getScopedWalletKey(userId);
  if (!localStorage.getItem(scopedWallet)) {
    const legacyWallet = localStorage.getItem(LEGACY_WALLET_KEY);
    if (legacyWallet) {
      localStorage.setItem(scopedWallet, legacyWallet);
    }
  }

  const scopedLedger = getScopedLedgerKey(userId);
  if (!localStorage.getItem(scopedLedger)) {
    const legacyLedger = localStorage.getItem(LEGACY_LEDGER_KEY);
    if (legacyLedger) {
      localStorage.setItem(scopedLedger, legacyLedger);
    }
  }
}
