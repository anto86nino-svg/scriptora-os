import { simulateReaderResponse } from "@/lib/premium-writing/reader-simulation-engine";
import type { ReaderMomentumScores, ConstitutionWarning } from "./types";

export function runReaderSimulationEngine(
  text: string,
  chapterIndex: number,
): ReaderMomentumScores & { warnings: ConstitutionWarning[] } {
  const base = simulateReaderResponse(text, chapterIndex);
  const warnings: ConstitutionWarning[] = [];

  const readerMomentumScore = Math.round(
    (base.continueDesire + base.engagement + base.tension) / 3,
  );
  const readerCuriosityScore = base.curiosity;
  const readerEmotionalScore = Math.round(
    Math.max(30, Math.min(90, base.engagement + (100 - base.abandonmentRisk) * 0.2)),
  );
  const readerRetentionScore = Math.round(
    Math.max(20, Math.min(92, 100 - base.abandonmentRisk)),
  );

  if (readerRetentionScore < 50) {
    warnings.push({
      ruleId: "reader_attention",
      severity: "warning",
      message: "Rischio abbandono lettore elevato.",
      suggestion: "Aumenta curiosità, tensione o coinvolgimento concreto.",
    });
  }

  if (readerCuriosityScore < 45) {
    warnings.push({
      ruleId: "page_turn_check",
      severity: "warning",
      message: "Curiosità lettore debole.",
    });
  }

  return {
    readerMomentumScore,
    readerCuriosityScore,
    readerEmotionalScore,
    readerRetentionScore,
    warnings,
  };
}

export function buildReaderSimulationGovernanceBlock(chapterIndex: number): string {
  return `READER SIMULATION ENGINE (governance):
Before finalizing, ask: "Why should the reader continue?"
Optimize: curiosity, tension, emotional investment, low abandonment risk.
Chapter ${chapterIndex + 1} must earn the next page.`;
}
