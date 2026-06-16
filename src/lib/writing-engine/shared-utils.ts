export function normalizeManuscriptSpacing(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export function splitParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

export function lower(value: unknown): string {
  return String(value || "").toLowerCase();
}

export function hashSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < Math.min(text.length, 600); i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
