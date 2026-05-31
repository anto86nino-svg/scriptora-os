import { getNarrativeTelemetrySnapshot } from "@/lib/narrative-intelligence";
import type { BookConfig } from "@/types/book";
import type { CharacterSupremacyProfile } from "@/lib/character-supremacy";
import type { TensionArcViolation, TensionEngineV2Snapshot } from "./types";

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function isRomanceGenre(config?: BookConfig): boolean {
  const g = String(config?.genre || "").toLowerCase();
  return /romance|dark-romance/.test(g);
}

export function analyzeTensionV2(input: {
  content: string;
  chapterIndex: number;
  config?: BookConfig;
  profiles?: CharacterSupremacyProfile[];
}): TensionEngineV2Snapshot {
  const text = String(input.content || "");
  const violations: TensionArcViolation[] = [];
  const warnings: string[] = [];

  const telemetry = getNarrativeTelemetrySnapshot({
    config: {
      genre: (input.config?.genre || "literary-fiction") as any,
      bookIntelligence: input.config?.bookIntelligence as any,
    },
    currentText: text,
  });

  const openQuestions = (text.match(/\?/g) || []).length;
  const mysterySignals = (text.match(/\b(secret|segreto|mystery|mistero|who|chi|why|perché|unknown)\b/gi) || []).length;
  const conflictSignals = (text.match(/\b(but|however|però|tuttavia|argued|litig|refused|rifiut)\b/gi) || []).length;
  const attractionSignals = (text.match(/\b(?:desire|desider|want(?:ed|s)?|kiss(?:ed|es)?|attraction|attrazione|tension|proximity|vicin)\b/gi) || []).length;
  const payoffSignals = (text.match(/\b(?:i love you|ti amo|forgave|perdon|together|insieme|understood|capito tutto|confessed|confess|kissed|baci|everything is fine|tutto va bene)\b/gi) || []).length;
  const reconciliationSignals = (text.match(/\b(hugged|abbracc|made up|riconcili|we're okay|siamo a posto|everything is fine)\b/gi) || []).length;

  const narrativeTension = clamp100(conflictSignals * 8 + openQuestions * 6 + (100 - telemetry.scores.readerDropRiskEstimate) * 0.35);
  const emotionalTension = clamp100(attractionSignals * 6 + conflictSignals * 7 + (telemetry.flags.earlyPayoffRisk ? 35 : 55));
  const relationshipTension = clamp100(
    (input.profiles || []).reduce((sum, p) => sum + p.relationships.reduce((r, rel) => r + rel.conflict * 0.3 + (100 - rel.trust) * 0.2, 0), 0) /
      Math.max(1, input.profiles?.length || 1) +
      conflictSignals * 5,
  );
  const mysteryTension = clamp100(mysterySignals * 10 + openQuestions * 5 - payoffSignals * 8);

  if (telemetry.flags.earlyPayoffRisk) {
    violations.push("premature_payoff");
    warnings.push("Emotional payoff may arrive before sufficient buildup");
  }

  if (payoffSignals >= 2 && input.chapterIndex < 2) {
    violations.push("premature_confession");
    warnings.push("Confession or emotional clarity too early in the arc");
  }

  if (reconciliationSignals >= 1 && conflictSignals < 2) {
    violations.push("premature_reconciliation");
    warnings.push("Reconciliation without on-page conflict cost");
  }

  if (isRomanceGenre(input.config) && attractionSignals >= 2 && payoffSignals >= 1 && conflictSignals < 2) {
    violations.push("attraction_to_payoff_skip");
    warnings.push("Romance arc skipped: Attraction → Payoff without Conflict/Frustration");
  }

  if (mysterySignals >= 2 && payoffSignals >= 2 && openQuestions === 0) {
    violations.push("mystery_resolved_early");
    warnings.push("Mystery tension collapsed — all questions answered in one chapter");
  }

  const criticalViolations = violations.filter(v =>
    v === "premature_payoff" || v === "attraction_to_payoff_skip" || v === "premature_confession",
  );

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    narrativeTension,
    emotionalTension,
    relationshipTension,
    mysteryTension,
    violations,
    warnings,
    passesGate: criticalViolations.length === 0,
  };
}

export function buildTensionPreventionBlock(config?: BookConfig): string {
  const romance = isRomanceGenre(config);
  const lines = [
    "TENSION ENGINE V2 — delay all gratification:",
    "• No premature confessions, reconciliations, or emotional closure.",
    "• Attraction may rise — payoff must wait for conflict and frustration.",
  ];
  if (romance) {
    lines.push("ROMANCE ARC (mandatory): Attraction → Conflict → Desire → Frustration → Payoff");
    lines.push("NEVER: Attraction → Payoff in the same beat.");
  }
  return lines.join("\n");
}
