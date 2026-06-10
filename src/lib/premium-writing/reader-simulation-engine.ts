export interface ReaderSimulationScores {
  curiosity: number;
  engagement: number;
  abandonmentRisk: number;
  tension: number;
  continueDesire: number;
}

export function simulateReaderResponse(text: string, chapterIndex: number): ReaderSimulationScores {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const questions = (text.match(/\?/g) || []).length;
  const hooks = (text.match(/\b(ma|però|improvvisamente|quando|suddenly|but|when)\b/gi) || []).length;
  const cliffSignals = (text.match(/\b(domani|dopo|non sapeva|prima che|before|tomorrow|didn't know)\b/gi) || []).length;
  const passive = (text.match(/\b(pensò|sentì|era triste|felt|was sad|wondered)\b/gi) || []).length;
  const opening = text.slice(0, 500);
  const openingHook = /[.!?…]/.test(opening) && opening.split(/\s+/).length > 15 ? 15 : 0;

  const curiosity = Math.round(Math.max(30, Math.min(92, 42 + Math.min(questions, 5) * 6 + openingHook)));
  const engagement = Math.round(Math.max(28, Math.min(90, 40 + Math.min(hooks, 10) * 4 - passive * 3)));
  const tension = Math.round(Math.max(25, Math.min(88, 38 + cliffSignals * 5 + hooks * 2)));
  const abandonmentRisk = Math.round(Math.max(8, Math.min(85, 55 - engagement * 0.35 + passive * 2 + (chapterIndex > 2 ? 0 : 10))));
  const continueDesire = Math.round((curiosity + tension + engagement) / 3 - abandonmentRisk * 0.25);

  return { curiosity, engagement, abandonmentRisk, tension, continueDesire };
}

export function buildReaderSimulationBlock(chapterIndex: number): string {
  return `
READER SIMULATION ENGINE (MANDATORY):
Simulate a real reader after EACH scene. Optimize for:
- CURIOSITY: unanswered question or withheld information
- ENGAGEMENT: concrete action beats, not mood paragraphs
- CONTINUE DESIRE: end sections with micro-cliffhangers when appropriate
- LOW ABANDONMENT RISK: no three consecutive reflective paragraphs without new information

Chapter ${chapterIndex + 1} must make the reader want the NEXT page — not just feel something.
`.trim();
}

export function readerScoresPass(scores: ReaderSimulationScores): boolean {
  return scores.continueDesire >= 48 && scores.abandonmentRisk <= 62;
}
