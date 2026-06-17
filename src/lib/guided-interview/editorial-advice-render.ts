export type EditorialAdviceItem = {
  id: string;
  source: string;
  message: string;
  severity?: "info" | "warn" | "note";
};

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(
    normalizeForDedup(a)
      .split(" ")
      .filter((word) => word.length > 3),
  );
  const tokensB = new Set(
    normalizeForDedup(b)
      .split(" ")
      .filter((word) => word.length > 3),
  );
  if (!tokensA.size || !tokensB.size) return 0;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

export function areSemanticallySimilarAdvice(a: string, b: string): boolean {
  const left = normalizeForDedup(a);
  const right = normalizeForDedup(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return tokenOverlap(left, right) >= 0.55;
}

export function deduplicateEditorialAdvice(
  items: EditorialAdviceItem[],
  max = 3,
): EditorialAdviceItem[] {
  const merged: EditorialAdviceItem[] = [];

  for (const item of items) {
    const message = String(item.message || "").trim();
    if (!message) continue;

    const existing = merged.find((entry) =>
      areSemanticallySimilarAdvice(entry.message, message),
    );

    if (existing) {
      if (message.length > existing.message.length) existing.message = message;
      if (item.severity === "warn") existing.severity = "warn";
      continue;
    }

    merged.push({ ...item, message });
  }

  return merged
    .sort((left, right) => {
      const leftWarn = left.severity === "warn" ? 1 : 0;
      const rightWarn = right.severity === "warn" ? 1 : 0;
      return rightWarn - leftWarn;
    })
    .slice(0, max);
}

export function renderEditorialAdviceBlock(
  items: EditorialAdviceItem[],
  max = 3,
): string {
  const deduped = deduplicateEditorialAdvice(items, max);
  return deduped.map((item) => item.message).join("\n");
}

export function mergeAdviceMessages(messages: string[], max = 3): string[] {
  const items = messages
    .map((message, index) => ({
      id: `msg-${index}`,
      source: "advice",
      message,
    }))
    .filter((item) => item.message.trim());
  return deduplicateEditorialAdvice(items, max).map((item) => item.message);
}
