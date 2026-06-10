import type { BookLength } from "@/types/book";
import type { CreditCommitResult, CreditOperationId } from "./types";
import { getOperationCost } from "./creditPolicy";
import { loadCreditWallet, deductCreditsFromWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import { isDevUnlimitedCredits, isDevMode } from "@/lib/billing/devMode";
import {
  buildInsufficientCreditsDetail,
  dispatchInsufficientCredits,
  notifyCreditDebit,
} from "./creditUx";

export class InsufficientCreditsError extends Error {
  readonly operation: CreditOperationId;
  readonly cost: number;
  readonly balance: number;

  constructor(operation: CreditOperationId, cost: number, balance: number) {
    super(`Crediti insufficienti: servono ${cost}, disponibili ${balance}.`);
    this.name = "InsufficientCreditsError";
    this.operation = operation;
    this.cost = cost;
    this.balance = balance;
  }
}

/** creditPolicy → wallet → ledger → commit */
export function commitCredits(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
): CreditCommitResult {
  const cost = getOperationCost(operation, bookLength);
  const wallet = loadCreditWallet();
  const simulated = isDevUnlimitedCredits();

  if (simulated) {
    appendLedgerEntry({
      operation,
      amount: 0,
      balanceAfter: wallet.balance,
      metadata: { ...metadata, originalCost: cost, mode: "dev_unlimited" },
      simulated: true,
    });
    return { ok: true, committed: true, cost: 0, balanceAfter: wallet.balance, simulated: true };
  }

  if (wallet.balance < cost) {
    return {
      ok: false,
      committed: false,
      cost,
      balanceAfter: wallet.balance,
      simulated: false,
      error: `Crediti insufficienti: servono ${cost}, disponibili ${wallet.balance}.`,
    };
  }

  const next = deductCreditsFromWallet(cost);
  appendLedgerEntry({
    operation,
    amount: -cost,
    balanceAfter: next.balance,
    metadata: { ...metadata, devMode: isDevMode() },
    simulated: false,
  });

  notifyCreditDebit(cost, next.balance);

  return { ok: true, committed: true, cost, balanceAfter: next.balance, simulated: false };
}

export function requireCredits(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
): void {
  const result = commitCredits(operation, metadata, bookLength);
  if (!result.ok) {
    dispatchInsufficientCredits(buildInsufficientCreditsDetail(operation, result.cost, result.balanceAfter));
    throw new InsufficientCreditsError(operation, result.cost, result.balanceAfter);
  }
}
