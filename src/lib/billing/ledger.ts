import type { CreditLedgerEntry } from "./types";
import { getWalletScopeUserId } from "@/lib/auth/sessionContext";
import { getScopedLedgerKey, migrateLegacyWalletStorage } from "./walletScope";

const MAX_ENTRIES = 200;

function ledgerStorageKey(): string {
  const userId = getWalletScopeUserId();
  if (userId !== "anonymous") migrateLegacyWalletStorage(userId);
  return getScopedLedgerKey(userId);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function loadCreditLedger(): CreditLedgerEntry[] {
  try {
    const raw = localStorage.getItem(ledgerStorageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendLedgerEntry(
  entry: Omit<CreditLedgerEntry, "id" | "createdAt">,
): CreditLedgerEntry {
  const full: CreditLedgerEntry = {
    ...entry,
    id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso(),
  };
  const ledger = [full, ...loadCreditLedger()].slice(0, MAX_ENTRIES);
  localStorage.setItem(ledgerStorageKey(), JSON.stringify(ledger));
  window.dispatchEvent(new Event("scriptora-credits-change"));
  return full;
}
