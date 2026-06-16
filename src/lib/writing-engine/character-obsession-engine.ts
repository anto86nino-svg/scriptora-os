import type { BookConfig } from "@/types/book";
import {
  buildCharacterPsychology,
  characterDisplayName,
  type CharacterPsychology,
  type WritingEngineContext,
} from "./types";
import type { BookCharacter } from "@/types/book";

export type { CharacterPsychology };

export function buildCharacterPsychologyFromConfig(character: BookCharacter): CharacterPsychology {
  return buildCharacterPsychology(character);
}

function formatPsychologyBlock(name: string, psych: CharacterPsychology, strictRules?: string): string {
  return [
    `- ${name}`,
    `  wound: ${psych.wound}`,
    `  obsession: ${psych.obsession}`,
    `  contradiction: ${psych.contradiction}`,
    `  blindSpot: ${psych.blindSpot}`,
    `  hiddenNeed: ${psych.hiddenNeed}`,
    `  emotionalFear: ${psych.emotionalFear}`,
    `  behavioralSignature: ${psych.behavioralSignature.join(" | ")}`,
    `  stressReaction: ${psych.stressReaction.join(" | ")}`,
    `  intimacyPattern: ${psych.intimacyPattern}`,
    strictRules ? `  HARD RULE: ${strictRules}` : "",
    "  SHOW RULE: 70% behavior/gesture, 20% dialogue/subtext, 10% explicit emotion.",
    "  NO: «era triste/ferita/spaventata». SI: tazza tamburellata, «sto bene» detto troppo in fretta, sguardo evitato.",
  ].filter(Boolean).join("\n");
}

export function buildCharacterObsessionEngineBlock(
  config: BookConfig,
  _opts: WritingEngineContext = {},
): string {
  const characters = Array.isArray(config.characters) ? config.characters : [];
  const castLines = characters.length
    ? characters.slice(0, 8).map((character) =>
      formatPsychologyBlock(
        characterDisplayName(character),
        buildCharacterPsychology(character),
        character.strictRules,
      ),
    ).join("\n")
    : "- No full cast bible: infer from prior chapters. NEVER rename established characters.";

  return `
CHARACTER OBSESSION ENGINE (V12 — LIVE, NOT METADATA):
Each main character must act from wound + obsession + contradiction + blind spot.
Emotions appear as: 70% behavior, 20% dialogue/subtext, 10% explicit naming.

CANONICAL CAST PSYCHOLOGY:
${castLines}

BEHAVIOR LAW:
- Under stress: contradiction surfaces before clarity.
- Characters sabotage what they want, avoid, lie by omission, change tone mid-scene.
- Never make everyone emotionally available on cue.`;
}

export function scoreCharacterBehaviorRatio(text: string): number {
  const tellPatterns = /\b(sent(?:ì|i|iva|ire)|pens(?:ò|ava|are)|cap(?:ì|iva|ire)|realizz(?:ò|ava)|si rese conto|era (?:triste|nervos[ao]|spaventat[ao]|felice|arrabbiat[ao]))\b/gi;
  const showPatterns = /\b(tamburell|piega(?:ò|va)|strinse|abbass(?:ò|ava) lo sguardo|tacque|mentì|menti|evit(?:ò|ava)|scroll(?:ò|ava)|strapp(?:ò|ava)|morse|sospir(?:ò|ava))\w*/gi;
  const tells = (text.match(tellPatterns) || []).length;
  const shows = (text.match(showPatterns) || []).length;
  if (tells + shows === 0) return 72;
  return Math.round(Math.min(100, (shows / Math.max(1, tells + shows)) * 100 + shows * 4));
}
