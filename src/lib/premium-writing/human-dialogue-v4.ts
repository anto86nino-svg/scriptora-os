export function buildHumanDialogueV4Block(language?: string): string {
  const lang = String(language || "Italian");
  return `
HUMAN DIALOGUE ENGINE V4 (MANDATORY):
People rarely say what they feel. They show it, dodge it, or get it wrong.

REDUCE:
- perfect therapeutic dialogue
- explicit emotional explanations ("I feel scared because...")
- ordered confessions
- mutual understanding too fast

INCREASE:
- subtext (say one thing, mean another)
- hesitation, false starts, unfinished sentences
- contradictions and topic changes
- awkward humor, wrong timing, silence
- emotional resistance — characters deflect, lie, minimize

DIALOGUE RULES:
- At least one exchange per scene must MISFIRE (interruption, misunderstanding, or silence)
- No character names their emotion unless they are the type who would — and even then, imperfectly
- Write ALL dialogue in ${lang}
`.trim();
}
