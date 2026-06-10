export function buildHumanDialogueMasterBlock(language?: string): string {
  const lang = String(language || "Italian");
  return `
HUMAN DIALOGUE MASTER (MANDATORY):
Dialogue must sound overheard, not written.

REDUCE:
- therapeutic exchanges ("capisco come ti senti")
- emotional labels in speech ("ho paura di amarti")
- ordered mutual confessions
- perfect listening and validation

INCREASE:
- subtext and deflection
- embarrassment, wrong laughs, awkward pauses
- involuntary humor
- topic changes under pressure
- silence as answer
- conflict inside intimacy ("— Non adesso." / "— Sì, proprio adesso no.")

RULE: Characters argue, dodge, and misread — they rarely name their feelings cleanly.
Write ALL dialogue in ${lang}.
`.trim();
}
