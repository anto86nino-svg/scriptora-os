export function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function splitScenes(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(Boolean);
}

export function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/).filter(Boolean);
}

export function openingWords(text: string, max = 120): string {
  return text.split(/\s+/).slice(0, max).join(" ");
}

export function endingChars(text: string, max = 320): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(-max);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function hasQuotableSentence(sentences: string[]): boolean {
  const contrastMarkers = /\b(but|yet|however|instead|not .{1,30} but|non .{1,30} ma|ma|però|invece|eppure)\b/i;
  return sentences.some(s => {
    const wc = s.split(/\s+/).length;
    if (wc < 5 || wc > 28) return false;
    if (/\b(very|really|truly|davvero|veramente|proprio)\b/i.test(s)) return false;
    return contrastMarkers.test(s) || /[.!?…]$/.test(s.trim());
  });
}

export function levelFromComposite(composite: number): import("./types").GreatnessLevel {
  if (composite >= 88) return "iconic";
  if (composite >= 78) return "memorable";
  if (composite >= 68) return "strong";
  if (composite >= 52) return "good";
  return "weak";
}

const ELEVATION_SIGNATURES = [
  /\bhesitated on the threshold\b/i,
  /\blet the phone ring unanswered\b/i,
  /\bSome details stay\b/i,
  /\bnext move would not wait\b/i,
  /\bSomething still waited\b/i,
  /\blight on the counter was wrong\b/i,
];

export function countElevationSignatures(text: string): number {
  return ELEVATION_SIGNATURES.filter(p => {
    p.lastIndex = 0;
    return p.test(text);
  }).length;
}
