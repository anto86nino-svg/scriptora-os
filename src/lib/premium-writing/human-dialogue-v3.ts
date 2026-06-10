export function buildHumanDialogueBlock(language?: string): string {
  const lang = String(language || "Italian");
  return `
HUMAN DIALOGUE LAYER V3 (MANDATORY):
Dialogue must feel spoken, not scripted. Reduce therapeutic tone and movie-perfect lines.

INCREASE:
- interruptions, hesitation, awkward pauses
- contradictions and unfinished thoughts
- imperfect timing and emotional resistance
- characters talking past each other
- subtext over explicit emotional exposition

REDUCE:
- perfect emotional wording
- mutual understanding too early
- therapy-session confessions
- characters naming feelings they would hide in real life

Characters must feel human: messy, inconsistent, sometimes wrong.
Write ALL dialogue in ${lang}.
`.trim();
}
