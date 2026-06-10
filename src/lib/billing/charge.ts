import type { BookLength } from "@/types/book";
import type { CreditOperationId } from "./types";
import { buildCreditIdempotencyKey } from "./idempotency";
import { requireCreditsAsync } from "./commit";
import { resolveChapterGenerationOperation } from "./creditPolicy";
import type { BookConfig } from "@/types/book";

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
