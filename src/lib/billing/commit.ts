import type { BookLength } from "@/types/book";
import type { CreditCommitResult, CreditOperationId } from "./types";
import { getOperationCost } from "./creditPolicy";
import { loadCreditWallet, deductCreditsFromWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import { isDevUnlimitedCredits, isDevMode } from "@/lib/billing/devMode";
import {
  buildInsufficientCreditsDetail,
  dispatchInsufficientCredits,
  getOperationLabel,
  notifyCreditDebit,
} from "./creditUx";
import { getBillingExecutionMode, hasAuthenticatedServerUser } from "./billingMode";
import { commitServerCreditOperation } from "./serverWallet";
import { syncWalletBalanceFromServer } from "./syncWallet";

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

function commitCreditsLocal(
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
    metadata: { ...metadata, devMode: isDevMode(), local: true, wallet: "dev_local" },
    simulated: false,
  });

  notifyCreditDebit(cost, next.balance, getOperationLabel(operation));
  return { ok: true, committed: true, cost, balanceAfter: next.balance, simulated: false };
}

/** creditPolicy → server wallet (prod) or local wallet (dev simulation) */
export async function commitCreditsAsync(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
  idempotencyKey?: string,
): Promise<CreditCommitResult> {
  if (getBillingExecutionMode() === "local_dev") {
    return commitCreditsLocal(operation, metadata, bookLength);
  }

  const hasAuth = await hasAuthenticatedServerUser();
  if (!hasAuth) {
    if (import.meta.env.PROD) {
      const cost = getOperationCost(operation, bookLength);
      return {
        ok: false,
        committed: false,
        cost,
        balanceAfter: loadCreditWallet().balance,
        simulated: false,
        error: "Autenticazione richiesta per usare i crediti.",
      };
    }
    return commitCreditsLocal(operation, metadata, bookLength);
  }

  const server = await commitServerCreditOperation(operation, metadata, bookLength, idempotencyKey);
  if (!server.ok) {
    syncWalletBalanceFromServer(server.balanceAfter);
    return {
      ok: false,
      committed: false,
      cost: server.cost,
      balanceAfter: server.balanceAfter,
      simulated: false,
      error: server.error,
    };
  }

  if (!server.idempotent) {
    notifyCreditDebit(server.cost, server.balanceAfter, getOperationLabel(operation));
  }

  return {
    ok: true,
    committed: true,
    cost: server.cost,
    balanceAfter: server.balanceAfter,
    simulated: server.simulated,
  };
}

/** @deprecated Prefer commitCreditsAsync */
export function commitCredits(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
): CreditCommitResult {
  return commitCreditsLocal(operation, metadata, bookLength);
}

export async function requireCreditsAsync(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
  idempotencyKey?: string,
): Promise<void> {
  const result = await commitCreditsAsync(operation, metadata, bookLength, idempotencyKey);
  if (!result.ok) {
    dispatchInsufficientCredits(buildInsufficientCreditsDetail(operation, result.cost, result.balanceAfter));
    throw new InsufficientCreditsError(operation, result.cost, result.balanceAfter);
  }
}

export function requireCredits(
  operation: CreditOperationId,
  metadata?: Record<string, unknown>,
  bookLength?: BookLength,
): void {
  const result = commitCreditsLocal(operation, metadata, bookLength);
  if (!result.ok) {
    dispatchInsufficientCredits(buildInsufficientCreditsDetail(operation, result.cost, result.balanceAfter));
    throw new InsufficientCreditsError(operation, result.cost, result.balanceAfter);
  }
}
