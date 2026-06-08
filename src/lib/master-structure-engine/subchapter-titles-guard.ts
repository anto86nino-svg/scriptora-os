const FORBIDDEN_PATTERNS = [
  /^subchapter\s*\d/i,
  /^section\s*[a-z]?\s*\d/i,
  /^part\s*\d/i,
  /^untitled/i,
  /^1\.\d+\s+section/i,
  /^chapter\s+\d+\s*[-–—]\s*section/i,
  /^beat\s*\d/i,
  /^placeholder/i,
];

export function isForbiddenSubchapterTitle(title: string): boolean {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  if (!clean) return true;
  if (clean.length < 3) return true;
  return FORBIDDEN_PATTERNS.some((re) => re.test(clean));
}

export function sanitizeSubchapterTitle(
  title: string,
  fallback: string,
): string {
  const clean = String(title || "").replace(/\s+/g, " ").trim();
  if (!clean || isForbiddenSubchapterTitle(clean)) return fallback;
  return clean.slice(0, 72);
}
