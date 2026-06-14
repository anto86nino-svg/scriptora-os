import type { BookLength, BookConfig } from "@/types/book";
import type { CreditOperationId } from "./types";
import { buildCreditIdempotencyKey } from "./idempotency";
import { requireCreditsAsync } from "./commit";
import { resolveChapterGenerationOperation, getOperationCost } from "./creditPolicy";
import { addCreditsToWallet, loadCreditWallet } from "./wallet";
import { appendLedgerEntry } from "./ledger";
import { isDevUnlimitedCredits } from "./devMode";

export async function chargeChapterGeneration(
  config: BookConfig,
  metadata: Record<string, unknown>,
  chapterIndex: number,
  idempotencyKey?: string,
): Promise<string> {
  const operation = resolveChapterGenerationOperation(config);
  const key = idempotencyKey || buildCreditIdempotencyKey("chapter", metadata.projectId, chapterIndex + 1);
  await requireCreditsAsync(operation, metadata, config.bookLength, key);
  return key;
}

export async function chargeRewriteChapter(
  metadata: Record<string, unknown>,
  chapterIndex: number,
  idempotencyKey?: string,
): Promise<string> {
  const key = idempotencyKey || buildCreditIdempotencyKey("rewrite", metadata.projectId, chapterIndex + 1);
  await requireCreditsAsync("rewrite_chapter", metadata, undefined, key);
  return key;
}

export async function chargePremiumOperation(
  operation: CreditOperationId,
  metadata: Record<string, unknown>,
  bookLength?: BookLength,
  idempotencyParts?: Array<string | number | null | undefined>,
): Promise<void> {
  const key = idempotencyParts
    ? buildCreditIdempotencyKey(operation, ...idempotencyParts)
    : buildCreditIdempotencyKey(operation, metadata.projectId, Date.now());
  await requireCreditsAsync(operation, metadata, bookLength, key);
}

/** Refund credits when a charged operation did not deliver value (e.g. failed export). */
export async function refundPremiumOperation(
  operation: CreditOperationId,
  metadata: Record<string, unknown>,
  bookLength?: BookLength,
): Promise<void> {
  const wallet = loadCreditWallet();
  const cost = getOperationCost(operation, { bookLength, planId: wallet.planId });
  if (cost <= 0 || isDevUnlimitedCredits()) return;
  const next = addCreditsToWallet(cost);
  appendLedgerEntry({
    operation: "refund",
    amount: cost,
    balanceAfter: next.balance,
    metadata: { ...metadata, refundedOperation: operation },
    simulated: false,
  });
}
