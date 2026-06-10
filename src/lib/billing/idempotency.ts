export function buildCreditIdempotencyKey(...parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((p) => p !== null && p !== undefined && String(p).trim().length > 0)
    .map((p) => String(p).trim())
    .join(":");
}
