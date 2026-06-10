import type { CreditLedgerEntry } from "./types";

const LEDGER_KEY = "scriptora-credit-ledger-v1";
const MAX_ENTRIES = 200;

function nowIso(): string {
  return new Date().toISOString();
}

export function loadCreditLedger(): CreditLedgerEntry[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
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
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  window.dispatchEvent(new Event("scriptora-credits-change"));
  return full;
}
