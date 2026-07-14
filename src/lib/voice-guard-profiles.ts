/**
 * VOICE GUARD PROFILES — Publishing Brain™
 *
 * Genre-aware thresholds for the dominate-chapter Voice Guard.
 * Each profile defines minimum acceptable scores per dimension and a
 * narrative priority that biases the revert decision.
 *
 * Mirrored inline in supabase/functions/dominate-chapter/index.ts because
 * edge functions can't import from src/. Keep both in sync.
 */
import { resolveGenreKey, type GenreKey } from "./genre-intelligence";

export type VoicePriority = "voice" | "clarity" | "emotion";

export interface VoiceGuardProfile {
  minVoicePreserved: number;
  minEmotionalIntensity: number;
  minMetaphorPreservation: number;
  minAntiGeneric: number;
  /** What matters most for this genre — biases revert decision */
  priority: VoicePriority;
}

const PROFILES: Partial<Record<GenreKey, VoiceGuardProfile>> = {
  // FICTION — voice + emotion are sacred
  horror:         { minVoicePreserved: 7, minEmotionalIntensity: 8, minMetaphorPreservation: 6, minAntiGeneric: 7, priority: "emotion" },
  thriller:       { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 5, minAntiGeneric: 7, priority: "emotion" },
  romance:        { minVoicePreserved: 7, minEmotionalIntensity: 8, minMetaphorPreservation: 6, minAntiGeneric: 7, priority: "emotion" },
  "dark-romance": { minVoicePreserved: 7, minEmotionalIntensity: 9, minMetaphorPreservation: 6, minAntiGeneric: 8, priority: "emotion" },
  fantasy:        { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  "sci-fi":       { minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 6, minAntiGeneric: 7, priority: "voice" },
  historical:     { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  memoir:         { minVoicePreserved: 8, minEmotionalIntensity: 8, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },

  // CHILDREN — rhythm + clarity over metaphor density
  children:       { minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },

  // POETRY — voice + metaphor are everything
  poetry:         { minVoicePreserved: 8, minEmotionalIntensity: 8, minMetaphorPreservation: 9, minAntiGeneric: 8, priority: "voice" },

  // NON-FICTION — clarity wins, slight metaphor loss tolerated
  "self-help":    { minVoicePreserved: 6, minEmotionalIntensity: 6, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  business:       { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  philosophy:     { minVoicePreserved: 7, minEmotionalIntensity: 6, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "voice" },
  spirituality:   { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 7, priority: "emotion" },

  // PRACTICAL / NON-FICTION (Genre Engine) — clarity & precision win, voice still respected
  cookbook:           { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 7, priority: "clarity" },
  "technical-manual": { minVoicePreserved: 5, minEmotionalIntensity: 4, minMetaphorPreservation: 3, minAntiGeneric: 7, priority: "clarity" },
  "software-guide":   { minVoicePreserved: 5, minEmotionalIntensity: 4, minMetaphorPreservation: 3, minAntiGeneric: 7, priority: "clarity" },
  "ai-tools-guide":   { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 7, priority: "clarity" },
  gardening:          { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  beekeeping:         { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 7, priority: "clarity" },
  "health-medicine":  { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 7, priority: "clarity" },
  "diet-nutrition":   { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 7, priority: "clarity" },
  fitness:            { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 7, priority: "clarity" },
  productivity:       { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },
  education:          { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 5, minAntiGeneric: 6, priority: "clarity" },

  // Estensioni
  biography:          { minVoicePreserved: 7, minEmotionalIntensity: 6, minMetaphorPreservation: 5, minAntiGeneric: 7, priority: "voice" },
  "fairy-tale":       { minVoicePreserved: 7, minEmotionalIntensity: 7, minMetaphorPreservation: 7, minAntiGeneric: 6, priority: "voice" },
  jokes:              { minVoicePreserved: 6, minEmotionalIntensity: 5, minMetaphorPreservation: 4, minAntiGeneric: 8, priority: "clarity" },
  manual:             { minVoicePreserved: 4, minEmotionalIntensity: 3, minMetaphorPreservation: 3, minAntiGeneric: 7, priority: "clarity" },
};

const FALLBACK: VoiceGuardProfile = {
  minVoicePreserved: 6,
  minEmotionalIntensity: 6,
  minMetaphorPreservation: 6,
  minAntiGeneric: 6,
  priority: "voice",
};

export function getVoiceGuardProfile(genre: string, subcategory?: string): { key: GenreKey; profile: VoiceGuardProfile } {
  const key = resolveGenreKey(genre, subcategory);
  return { key, profile: PROFILES[key] ?? FALLBACK };
}

/** UI helper — map confidence (0-1) to a semantic color tier. */
export function confidenceTier(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}
