import type { BookCharacter, BookConfig } from "@/types/book";

function depthProfile(c: BookCharacter): string {
  const name = [c.name, c.surname].filter(Boolean).join(" ") || c.name || "Character";
  const fear = c.wound || c.secret || "unspecified wound";
  const desire = c.externalDesire || "unspecified desire";
  const contradiction = c.personality?.includes(",")
    ? c.personality
    : [c.personality, c.internalNeed].filter(Boolean).join(" — need: ");
  const voice = c.personalLanguage || "preserve established speech rhythm";
  const triggers = c.emotionalTriggers || "preserve stress responses";
  const behavior = c.recurringBehavior || c.strictRules || c.relationships || "preserve established mannerisms";

  return `${name} | wound/fear: ${fear} | desire: ${desire} | contradiction: ${contradiction} | voice: ${voice} | triggers: ${triggers} | behavior: ${behavior}`;
}

export function buildCharacterDepthLockBlock(config: BookConfig): string {
  const characters = Array.isArray(config.characters) ? config.characters : [];
  if (!characters.length) return "";

  const profiles = characters.map(depthProfile).slice(0, 10);

  return `
CHARACTER DEPTH LOCK (MANDATORY):
Each character carries wound, desire, fear, contradiction, recurring behavior.
Every scene must reflect these — never flatten into generic emotional availability.

${profiles.map((p) => `- ${p}`).join("\n")}

CORRECTION RULE:
If a character acts out of character without narrative cause → fix the action, not the character bible.
Do NOT rename characters. Do NOT erase wounds for convenience.
`.trim();
}
