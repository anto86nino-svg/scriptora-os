import type { BookCharacter, BookConfig } from "@/types/book";

function characterMemoryLine(c: BookCharacter): string {
  const parts = [
    c.name && c.surname ? `${c.name} ${c.surname}` : c.name,
    c.role && `Role: ${c.role}`,
    c.wound && `Wound: ${c.wound}`,
    c.personality && `Personality: ${c.personality}`,
    c.externalDesire && `Desire: ${c.externalDesire}`,
    c.internalNeed && `Need: ${c.internalNeed}`,
    c.secret && `Secret: ${c.secret}`,
    c.emotionalTriggers && `Triggers: ${c.emotionalTriggers}`,
    c.dominantFlaw && `Flaw: ${c.dominantFlaw}`,
    c.personalLanguage && `Voice: ${c.personalLanguage}`,
    c.recurringBehavior && `Behavior: ${c.recurringBehavior}`,
    c.relationships && `Relationships: ${c.relationships}`,
    c.strictRules && `Continuity: ${c.strictRules}`,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function buildCharacterMemoryDeepLock(config: BookConfig): string {
  const characters = Array.isArray(config.characters) ? config.characters : [];
  if (!characters.length) return "";

  const lines = characters
    .map((c) => characterMemoryLine(c))
    .filter(Boolean)
    .slice(0, 12);

  return `
CHARACTER MEMORY DEEP LOCK (MANDATORY):
These characters have established wounds, speech patterns, trauma, and relationship history.
Never flatten them into generic emotional availability.

${lines.map((l) => `- ${l}`).join("\n")}

RULES:
- Preserve each character's speech rhythm and emotional defenses
- Use personalLanguage / Voice tags as dialogue fingerprint — same cadence every scene
- emotionalTriggers must visibly activate under stress — never flatten reactions
- recurringBehavior must reappear under pressure — habits are canon
- Trauma responses must recur believably, not disappear after one scene
- Relationship history constrains what they can say or admit today
- Do NOT rename, merge, or soften established wounds without narrative cause
`.trim();
}
