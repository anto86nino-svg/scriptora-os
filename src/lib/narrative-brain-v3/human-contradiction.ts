export function buildHumanContradictionBlock(): string {
  return `HUMAN CONTRADICTION ENGINE:
Real people are inconsistent. Allow and require:
• Hesitation mid-sentence, unfinished thoughts, subject changes
• Actions that contradict words (says "I'm fine" while leaving the room)
• Contrasting emotions in the same beat (relief and dread)
• Ambiguous motives — not every choice needs explanation
• At least one moment per scene where a character does the opposite of what they just said they would

FORBID:
• Perfect emotional explanations
• Clean confessions without cost
• Characters who always know what they feel
• Dialogue that sounds like therapy or coaching`;
}

export const THERAPIST_DIALOGUE_RE =
  /\b(i understand (?:now|you|everything)|capisco (?:tutto|perfettamente)|it's okay to feel|va tutto bene|we need to talk about your feelings|parliamo delle tue emozioni|healing journey|percorso di guarigione)\b/gi;
