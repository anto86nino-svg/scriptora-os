import type { AuthorIdentity } from "@/types/book";
import { normalizeAuthorIdentity } from "@/lib/author-identity";
import { normalizeAuthorPresence, normalizeReaderEmotionalGoals } from "./voice-memory";
import type { PassiveAuthorTone } from "./passive-intelligence";

/** Internal floor — below this, passive personalization is fully suppressed */
export const PASSIVE_CONSISTENCY_FLOOR = 0.35;

/** Below this, only neutral tone / cliché strip — no axis personalization */
export const PASSIVE_CONSISTENCY_SOFT = 0.55;

/** Below this, at most one non-neutral axis may apply */
export const PASSIVE_CONSISTENCY_MODERATE = 0.75;

const WARM_PRESENCE = new Set(["emotional", "warm", "poetic", "spiritual", "inspirational"]);
const COOL_PRESENCE = new Set(["professional", "minimalist", "premium", "direct", "intellectual"]);
const DARK_PRESENCE = new Set(["dark", "intense", "provocative", "psychological"]);

const PRESENCE_CONFLICT_PAIRS: Array<[string, string]> = [
  ["minimalist", "poetic"],
  ["minimalist", "provocative"],
  ["dark", "inspirational"],
  ["dark", "warm"],
  ["provocative", "spiritual"],
  ["professional", "poetic"],
  ["direct", "poetic"],
  ["premium", "intense"],
];

const GOAL_CONFLICT_PAIRS: Array<[string, string]> = [
  ["comfort", "obsession"],
  ["comfort", "tension"],
  ["healing", "obsession"],
  ["empowerment", "mystery"],
  ["inspiration", "tension"],
];

const CORPORATE_MESSAGE_PATTERN =
  /\b(corporate|stakeholder|synergy|deliverable|roi|kpis?|enterprise|b2b|consulting|executive|boardroom)\b/i;

const OVERFIT_ADJECTIVE_PATTERN =
  /\b(deeply emotional|profoundly moving|utterly transformative|powerfully inspiring|heart[- ]wrenchingly)\b/gi;

function trim(value?: string): string {
  return String(value || "").trim();
}

function countInSet(items: string[], allowed: Set<string>): number {
  return items.filter((id) => allowed.has(id)).length;
}

function hasPairConflict(items: string[], pairs: Array<[string, string]>): number {
  let hits = 0;
  for (const [a, b] of pairs) {
    if (items.includes(a) && items.includes(b)) hits += 1;
  }
  return hits;
}

/**
 * Internal coherence score (0–1). Never shown to users.
 * Low score → softer / neutral passive personalization.
 */
export function signalConsistencyScore(identity: AuthorIdentity | null | undefined): number {
  const normalized = normalizeAuthorIdentity(identity);
  if (!normalized) return 1;

  const presence = normalizeAuthorPresence(normalized.authorPresence);
  const goals = normalizeReaderEmotionalGoals(normalized.readerEmotionalGoals);
  const message = trim(normalized.authorMessage);

  if (!presence.length && !goals.length && !message) return 1;

  let score = 1;

  if (presence.length > 7) score -= 0.14;
  else if (presence.length > 5) score -= 0.07;

  if (goals.length > 6) score -= 0.08;

  const warmCount = countInSet(presence, WARM_PRESENCE);
  const coolCount = countInSet(presence, COOL_PRESENCE);
  if (warmCount >= 1 && coolCount >= 1) {
    score -= 0.06 * Math.min(warmCount, coolCount);
  }

  const darkCount = countInSet(presence, DARK_PRESENCE);
  if (darkCount >= 2 && warmCount >= 2) score -= 0.12;

  score -= hasPairConflict(presence, PRESENCE_CONFLICT_PAIRS) * 0.09;
  score -= hasPairConflict(goals, GOAL_CONFLICT_PAIRS) * 0.08;

  if (message && CORPORATE_MESSAGE_PATTERN.test(message) && (warmCount >= 2 || presence.includes("poetic") || presence.includes("spiritual"))) {
    score -= 0.12;
  }

  return Math.max(0, Math.min(1, score));
}

function axisWeight(axis: PassiveAuthorTone["warmth"] | PassiveAuthorTone["clarity"] | PassiveAuthorTone["depth"] | PassiveAuthorTone["energy"]): number {
  return axis === "neutral" ? 0 : 1;
}

/** Collapse over-active axes when profile signals conflict */
export function dampPassiveToneByConsistency(tone: PassiveAuthorTone, consistencyScore: number): PassiveAuthorTone {
  if (!tone.hasSignal) return tone;

  if (consistencyScore < PASSIVE_CONSISTENCY_FLOOR) {
    return {
      hasSignal: false,
      warmth: "neutral",
      clarity: "neutral",
      depth: "neutral",
      energy: "neutral",
      directive: "",
    };
  }

  if (consistencyScore < PASSIVE_CONSISTENCY_SOFT) {
    return {
      ...tone,
      warmth: "neutral",
      clarity: "neutral",
      depth: "neutral",
      energy: "neutral",
      hasSignal: Boolean(tone.directive),
      directive: tone.directive
        ? `${tone.directive.split("Tone nudge:")[0]}Tone nudge: stay neutral and professional; under-influence only. No clichés, no exaggeration.`
        : "",
    };
  }

  if (consistencyScore < PASSIVE_CONSISTENCY_MODERATE) {
    const ranked = [
      { key: "warmth" as const, weight: axisWeight(tone.warmth) },
      { key: "clarity" as const, weight: axisWeight(tone.clarity) },
      { key: "depth" as const, weight: axisWeight(tone.depth) },
      { key: "energy" as const, weight: axisWeight(tone.energy) },
    ]
      .filter((item) => item.weight > 0)
      .sort((a, b) => b.weight - a.weight);

    if (ranked.length > 1) {
      const keep = ranked[0].key;
      return {
        ...tone,
        warmth: keep === "warmth" ? tone.warmth : "neutral",
        clarity: keep === "clarity" ? tone.clarity : "neutral",
        depth: keep === "depth" ? tone.depth : "neutral",
        energy: keep === "energy" ? tone.energy : "neutral",
      };
    }
  }

  return tone;
}

/** Strip over-fit emotional adjectives that leak into multiple surfaces */
export function stripOverfitBrandLanguage(text: string): string {
  return text
    .replace(OVERFIT_ADJECTIVE_PATTERN, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .trim();
}

/** Export-time sanity — no empty blocks, no duplicate headings, no bleed markers */
export function validateAuthorBrainExportBlock(text: string, penName?: string): string {
  const cleaned = stripOverfitBrandLanguage(trim(text));
  if (!cleaned) return "";

  const deduped: string[] = [];
  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (deduped.length && deduped[deduped.length - 1] !== "") deduped.push("");
      continue;
    }
    const prevNonEmpty = [...deduped].reverse().find((item) => item.trim())?.trim().toLowerCase();
    if (prevNonEmpty === trimmed.toLowerCase()) continue;
    deduped.push(trimmed);
  }

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
