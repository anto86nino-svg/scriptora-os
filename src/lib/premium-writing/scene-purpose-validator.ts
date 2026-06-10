export function buildScenePurposeBlock(): string {
  return `
SCENE PURPOSE VALIDATOR (MANDATORY):
Every scene must satisfy AT LEAST ONE:
(A) plot advancement — new fact, stake, or turn
(B) character development — choice that reveals or changes them
(C) tension increase — obstacle, deadline, threat, desire blocked
(D) revelation — secret, clue, reversal
(E) conflict — friction between wants, not just mood

If a scene only re-states feeling without function → cut or replace with action.
No "emotional filler" paragraphs.
`.trim();
}

const PURPOSE_SIGNALS: RegExp[] = [
  /\b(improvvisamente|all'improvviso|quando|dopo|prima che|scoprì|realizzò|capì che)\b/i,
  /\b(ma|però|tuttavia|invece|nonostante)\b/i,
  /\b(disse|chiese|risposte|mentì|confessò|mentì|svanì|partì|arrivò)\b/i,
  /\b(suddenly|when|after|before|realized|discovered|but|however|said|asked|left|arrived)\b/i,
];

export function scoreSceneProgression(text: string): number {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 40);
  if (!paragraphs.length) return 50;
  let purposeful = 0;
  for (const para of paragraphs) {
    const signals = PURPOSE_SIGNALS.filter((p) => p.test(para)).length;
    if (signals >= 2) purposeful++;
  }
  const ratio = purposeful / paragraphs.length;
  return Math.round(Math.max(35, Math.min(92, 45 + ratio * 50)));
}
