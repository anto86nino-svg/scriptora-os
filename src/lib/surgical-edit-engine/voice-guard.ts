import { SURGICAL_MAX_MODIFICATION_RATIO } from "./constants";

interface VoiceSignature {
  averageSentenceLength: number;
  dialogueDensity: number;
}

function analyzeVoiceSignature(text: string): VoiceSignature {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const words = text.split(/\s+/).filter(Boolean);
  const dialogueMatches = text.match(/"[^"]*"/g) || [];

  return {
    averageSentenceLength: words.length / Math.max(sentences.length, 1),
    dialogueDensity: dialogueMatches.length / Math.max(sentences.length, 1),
  };
}

/** Character-level modification ratio (0–1) */
export function computeModificationRatio(original: string, edited: string): number {
  const a = original.trim();
  const b = edited.trim();
  if (!a) return 0;
  if (a === b) return 0;

  const maxLen = Math.max(a.length, b.length);
  let diff = Math.abs(a.length - b.length);

  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i += 1) {
    if (a[i] !== b[i]) diff += 1;
  }

  return Math.min(1, diff / Math.max(maxLen, 1));
}

/** Reject edits that drift too far from author voice */
export function enforceVoiceProtection(original: string, edited: string, maxRatio = SURGICAL_MAX_MODIFICATION_RATIO): string {
  const cleaned = edited.trim();
  if (!cleaned || cleaned === original.trim()) return original;

  const ratio = computeModificationRatio(original, cleaned);
  if (ratio > maxRatio) return original;

  const originalVoice = analyzeVoiceSignature(original);
  const editedVoice = analyzeVoiceSignature(cleaned);

  const sentenceDrift = Math.abs(originalVoice.averageSentenceLength - editedVoice.averageSentenceLength);
  const dialogueDrift = Math.abs(originalVoice.dialogueDensity - editedVoice.dialogueDensity);

  if (sentenceDrift > 10 || dialogueDrift > 0.35) return original;

  return cleaned;
}

export function capModificationPercent(percent: number): number {
  return Math.min(100, Math.round(percent));
}
