/**
 * Book Forge V2 — genre mutation priority chain:
 * Manual Lock > Accepted Detection > Auto Detection > Cloud Suggestions
 */

export type GenreMutationContext = {
  genreManuallyLocked?: boolean;
  genreDetectionAccepted?: boolean;
  hasPendingAutoDetection?: boolean;
};

/** Cloud must never overwrite genre when manual lock, accepted detection, or pending auto-detection. */
export function shouldBlockCloudGenreMutation(ctx: GenreMutationContext): boolean {
  return Boolean(
    ctx.genreManuallyLocked
    || ctx.genreDetectionAccepted
    || ctx.hasPendingAutoDetection,
  );
}

/** Autofill / blueprint passes must not mutate locked or accepted genre stacks. */
export function shouldBlockAutofillGenreMutation(ctx: GenreMutationContext): boolean {
  return Boolean(ctx.genreManuallyLocked || ctx.genreDetectionAccepted);
}

export function stripGenreFieldsFromAutofillPatch<T extends Record<string, unknown>>(
  patch: T,
  ctx: GenreMutationContext,
): T {
  if (!shouldBlockAutofillGenreMutation(ctx)) return patch;
  const next = { ...patch };
  delete next.genre;
  delete next.category;
  delete next.subcategory;
  delete next.subgenre;
  delete next.bookTypeId;
  return next;
}
