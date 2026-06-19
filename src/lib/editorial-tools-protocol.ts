export const PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS =
  "Non sono stati rilevati miglioramenti editoriali significativi. Il capitolo e' gia' in fascia professionale premium.";

export const MINIMUM_REWRITE_GAIN_PERCENT = 5;
export const MINIMUM_REWRITE_GAIN_SCORE_DELTA = 0.5;

export type EditorialToolMode =
  | "analysis"
  | "evaluate"
  | "patch"
  | "rewrite"
  | "regenerate"
  | "editorial-diagnostic";

export type ProfessionalScoreBand =
  | "publish-ready"
  | "light-edit"
  | "medium-edit"
  | "major-revision"
  | "structural-rebuild";

export interface EditorialTruthGateInput {
  scoreOutOf10: number;
  evidence: string[];
  criticalIssues?: string[];
  highIssues?: string[];
  moderateIssues?: string[];
  estimatedRewriteGainPercent?: number;
}

export interface EditorialTruthGateResult {
  normalizedScore: number;
  band: ProfessionalScoreBand;
  rewriteNecessary: boolean;
  canClaimPremium: boolean;
  verdict: string;
  requiredAction: "none" | "patch" | "rewrite" | "regenerate";
  warnings: string[];
}

export function buildEditorialToolsMaxLevelProtocol(language = "Italian"): string {
  return `
SCRIPTORA OS — EDITORIAL TOOLS MAX LEVEL PROTOCOL
Act as a professional editorial board: Developmental Editor, Line Editor, Copy Editor, Bestseller Analyst, Continuity Editor, Market Editor, Narrative Psychologist and Literary Critic.
Output language: ${language}.

ABSOLUTE RULES:
- Never flatter automatically. Never invent scores or issues.
- If the chapter is mediocre, say so and prove it.
- If the chapter is excellent, prove it with concrete textual evidence.
- If no substantial editorial improvement exists, state exactly: "${PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS}"
- Use the real blueprint, canon and narrative memory when provided. If they are missing, explicitly limit the finding to text evidence.
- Never change text without motivation. Never rewrite for the sake of rewriting.
- If expected improvement is below ${MINIMUM_REWRITE_GAIN_PERCENT}%, do not rewrite.

ANALYSIS CHECKLIST:
- narrative continuity, character consistency, dialogue, subtext, rhythm, tension, repetition, show-don't-tell, bestseller quality, blueprint fit, previous-chapter fit, genre fit, hook, cliffhanger, readability.

SEVERITY:
- CRITICAL: breaks canon/blueprint, wrong characters, duplicate scene, timeline/POV contamination, unusable chapter.
- HIGH: major pacing, repetition, dialogue, emotional logic, genre or market problem.
- MEDIUM: local craft weakness with visible impact.
- LOW: polish-level improvement.

PATCH LAW:
- Patch is surgical. It may remove repetition, fix continuity/timeline/POV/name/logical errors.
- It must not reinvent scenes, change plot, change characters or import a different narrative line.

REWRITE LAW:
- Run analysis first. Rewrite only if the gain is material.
- Preserve strong passages. Improve only emotion, rhythm, immersion, naturalness and tension when it truly raises quality.
`.trim();
}

export function getProfessionalScoreBand(scoreOutOf10: number): ProfessionalScoreBand {
  const score = Math.max(0, Math.min(10, Number.isFinite(scoreOutOf10) ? scoreOutOf10 : 0));
  if (score >= 9.5) return "publish-ready";
  if (score >= 9) return "light-edit";
  if (score >= 8) return "medium-edit";
  if (score >= 7) return "major-revision";
  return "structural-rebuild";
}

export function explainProfessionalScoreBand(band: ProfessionalScoreBand): string {
  switch (band) {
    case "publish-ready":
      return "10 = livello bestseller pubblicabile senza interventi sostanziali.";
    case "light-edit":
      return "9 = editing leggero: testo forte, ma ancora verificabile con prove.";
    case "medium-edit":
      return "8 = editing medio: base buona, interventi visibili consigliati.";
    case "major-revision":
      return "7 = revisione importante: problemi strutturali o di resa narrativa.";
    case "structural-rebuild":
      return "6 o meno = revisione sostanziale: il testo non regge professionalmente.";
  }
}

export function runEditorialTruthGate(input: EditorialTruthGateInput): EditorialTruthGateResult {
  const normalizedScore = Math.max(0, Math.min(10, Number.isFinite(input.scoreOutOf10) ? Math.round(input.scoreOutOf10 * 10) / 10 : 0));
  const criticalIssues = input.criticalIssues || [];
  const highIssues = input.highIssues || [];
  const moderateIssues = input.moderateIssues || [];
  const evidence = (input.evidence || []).map((item) => item.trim()).filter(Boolean);
  const warnings: string[] = [];

  if (normalizedScore >= 9 && evidence.length < 2) {
    warnings.push("Score 9+ non difendibile: servono almeno due prove testuali concrete.");
  }
  if (normalizedScore >= 9 && (criticalIssues.length || highIssues.length)) {
    warnings.push("Score 9+ incompatibile con problemi CRITICAL/HIGH aperti.");
  }
  if (normalizedScore >= 8 && criticalIssues.length) {
    warnings.push("Score alto incompatibile con problemi CRITICAL aperti.");
  }

  const band = getProfessionalScoreBand(
    warnings.length && normalizedScore >= 9 ? 8.8 : normalizedScore,
  );
  const canClaimPremium = band === "publish-ready" && warnings.length === 0;
  const rewriteGain = Number.isFinite(input.estimatedRewriteGainPercent)
    ? Number(input.estimatedRewriteGainPercent)
    : undefined;
  const rewriteNecessary = criticalIssues.length > 0
    || highIssues.length >= 2
    || normalizedScore < 8
    || (typeof rewriteGain === "number" && rewriteGain >= MINIMUM_REWRITE_GAIN_PERCENT && normalizedScore < 9);
  const requiredAction: EditorialTruthGateResult["requiredAction"] = criticalIssues.length
    ? "regenerate"
    : rewriteNecessary
      ? "rewrite"
      : highIssues.length || moderateIssues.length
        ? "patch"
        : "none";

  const verdict = canClaimPremium
    ? PROFESSIONAL_PREMIUM_NO_SIGNIFICANT_IMPROVEMENTS
    : `${explainProfessionalScoreBand(band)} Azione consigliata: ${requiredAction.toUpperCase()}.`;

  return {
    normalizedScore: warnings.length && normalizedScore >= 9 ? 8.8 : normalizedScore,
    band,
    rewriteNecessary,
    canClaimPremium,
    verdict,
    requiredAction,
    warnings,
  };
}

export function shouldSkipRewriteForInsufficientGain(beforeScore: number, afterScore: number): boolean {
  return Number.isFinite(beforeScore)
    && Number.isFinite(afterScore)
    && afterScore - beforeScore < MINIMUM_REWRITE_GAIN_SCORE_DELTA;
}
