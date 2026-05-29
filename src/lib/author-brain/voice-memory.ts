/** Author Brain V4 — voice & brand memory (data only, no generation wiring yet) */

export const AUTHOR_PRESENCE_OPTIONS = [
  "elegant",
  "emotional",
  "poetic",
  "direct",
  "professional",
  "warm",
  "psychological",
  "inspirational",
  "premium",
  "dark",
  "minimalist",
  "provocative",
  "spiritual",
  "intellectual",
  "intense",
] as const;

export const READER_EMOTIONAL_GOAL_OPTIONS = [
  "hope",
  "emotional-impact",
  "tension",
  "comfort",
  "reflection",
  "healing",
  "obsession",
  "curiosity",
  "empowerment",
  "mystery",
  "inspiration",
  "transformation",
] as const;

export type AuthorPresenceId = (typeof AUTHOR_PRESENCE_OPTIONS)[number];
export type ReaderEmotionalGoalId = (typeof READER_EMOTIONAL_GOAL_OPTIONS)[number];

const PRESENCE_SET = new Set<string>(AUTHOR_PRESENCE_OPTIONS);
const GOAL_SET = new Set<string>(READER_EMOTIONAL_GOAL_OPTIONS);

function trim(value?: string): string {
  return String(value || "").trim();
}

function normalizeChipList(raw: unknown, allowed: Set<string>, max = 12): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const id = trim(String(item)).toLowerCase();
    if (!id || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeAuthorPresence(raw?: string[] | null): string[] {
  return normalizeChipList(raw, PRESENCE_SET);
}

export function normalizeReaderEmotionalGoals(raw?: string[] | null): string[] {
  return normalizeChipList(raw, GOAL_SET);
}

export function toggleChipSelection(current: string[], id: string): string[] {
  const normalized = trim(id).toLowerCase();
  if (!normalized) return current;
  return current.includes(normalized)
    ? current.filter((item) => item !== normalized)
    : [...current, normalized];
}

export function hasAuthorVoiceMemory(input: {
  authorPresence?: string[];
  readerEmotionalGoals?: string[];
  authorMessage?: string;
}): boolean {
  return (
    normalizeAuthorPresence(input.authorPresence).length > 0 ||
    normalizeReaderEmotionalGoals(input.readerEmotionalGoals).length > 0 ||
    trim(input.authorMessage).length > 0
  );
}
