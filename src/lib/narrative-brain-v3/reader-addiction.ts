import type { BookConfig } from "@/types/book";
import type { NarrativeGenerationPlan } from "./types";
import type { ReaderAddictionMetrics } from "./types";

const CURIOSITY_MARKERS = [
  /\b(secret|segreto|mystery|mistero|why|perché|who|chi|what if|e se)\b/gi,
  /\b(but|ma|however|però|until|finché|unless|a meno)\b/gi,
  /\?/g,
];

const HOOK_MARKERS = [
  /\b(sudden|improvvis|shock|terrible|terribile|dead|morto|blood|sangue|found|trovò|discovered|scoprì)\b/gi,
  /^["'«]/m,
];

export interface ReaderAddictionRemediation {
  title: string;
  summary: string;
  hookLine: string;
  curiosityLine: string;
  remediated: boolean;
}

function isItalian(config?: BookConfig): boolean {
  return String(config?.language || "").toLowerCase().includes("ital");
}

export function scoreReaderAddiction(
  outlineSummary: string,
  outlineTitle: string,
  plan: NarrativeGenerationPlan,
): ReaderAddictionMetrics {
  const blob = `${outlineTitle}. ${outlineSummary}`;
  let curiosity = 0;
  let hook = 0;

  for (const re of CURIOSITY_MARKERS) {
    const matches = blob.match(re);
    curiosity += (matches?.length || 0) * 8;
  }
  for (const re of HOOK_MARKERS) {
    const matches = blob.match(re);
    hook += (matches?.length || 0) * 10;
  }

  curiosity = Math.min(100, curiosity + (blob.length > 80 ? 20 : 10));
  hook = Math.min(100, hook + (outlineTitle.length > 8 ? 25 : 15));

  const compulsive = Math.round((curiosity * 0.45 + hook * 0.55));
  const belowThreshold = hook < plan.hookStrengthTarget || curiosity < plan.curiosityDensityTarget;
  const retentionRisk: ReaderAddictionMetrics["retentionRisk"] =
    belowThreshold ? (hook < 50 ? "high" : "medium") : "low";

  return {
    hookStrength: hook,
    curiosityDensity: curiosity,
    retentionRisk,
    compulsiveReadability: compulsive,
    belowThreshold,
  };
}

/** Local outline remediation — no AI, no full chapter regen */
export function remediateReaderAddictionOutline(
  title: string,
  summary: string,
  config: BookConfig,
  plan: NarrativeGenerationPlan,
): ReaderAddictionRemediation {
  const metrics = scoreReaderAddiction(summary, title, plan);
  if (!metrics.belowThreshold) {
    return { title, summary, hookLine: "", curiosityLine: "", remediated: false };
  }

  const italian = isItalian(config);
  const g = String(config.genre || "").toLowerCase();

  let hookLine = italian
    ? "Un gesto improvviso cambia tutto prima che il lettore capisca cosa sta perdendo."
    : "A sudden gesture changes everything before the reader understands what is at stake.";

  let curiosityLine = italian
    ? "Ma una domanda resta senza risposta — e il costo di ignorarla è più alto di quanto sembri."
    : "But one question remains unanswered — and the cost of ignoring it is higher than it seems.";

  if (/thriller|crime|mystery/.test(g)) {
    hookLine = italian ? "Qualcuno sa più di quanto dice." : "Someone knows more than they admit.";
    curiosityLine = italian ? "La verità è più vicina — e più pericolosa — di quanto sembri." : "The truth is closer — and more dangerous — than it appears.";
  } else if (/romance|dark-romance/.test(g)) {
    hookLine = italian ? "Uno sguardo di troppo. Una distanza che non regge." : "One look too long. A distance that won't hold.";
    curiosityLine = italian ? "Il desiderio è chiaro. La fiducia, no." : "Desire is clear. Trust is not.";
  } else if (/fantasy|sci-fi/.test(g)) {
    hookLine = italian ? "Il mondo osserva. Qualcosa si risveglia." : "The world is watching. Something stirs.";
    curiosityLine = italian ? "Ogni regola ha un prezzo nascosto." : "Every rule has a hidden price.";
  }

  const remediatedSummary = [
    summary.trim().replace(/\.$/, ""),
    hookLine,
    curiosityLine,
  ].filter(Boolean).join(". ") + ".";

  return {
    title,
    summary: remediatedSummary,
    hookLine,
    curiosityLine,
    remediated: true,
  };
}

export function buildReaderAddictionBlock(metrics: ReaderAddictionMetrics, plan: NarrativeGenerationPlan, remediation?: ReaderAddictionRemediation): string {
  const lines = [
    "READER ADDICTION ENGINE:",
    `Hook strength target: ${plan.hookStrengthTarget}/100 (current plan: ${metrics.hookStrength})`,
    `Curiosity density target: ${plan.curiosityDensityTarget}/100 (current plan: ${metrics.curiosityDensity})`,
    `Retention risk: ${metrics.retentionRisk}`,
  ];

  if (remediation?.remediated) {
    lines.push(
      "OUTLINE REMEDIATED LOCALLY (hook/curiosity injected — do NOT regenerate chapter plan from scratch):",
      `• Opening hook mandate: ${remediation.hookLine}`,
      `• Curiosity mandate: ${remediation.curiosityLine}`,
      `• Revised chapter direction: ${remediation.summary}`,
    );
  } else if (metrics.belowThreshold) {
    lines.push(
      "PLAN BELOW THRESHOLD — strengthen chapter opening:",
      "• Open with concrete action, image, or question",
      "• Plant one unanswered mystery in first 200 words",
      "• End scene/chunk with tension or curiosity pull",
    );
  } else {
    lines.push("Maintain compulsive readability — every paragraph earns the next.");
  }

  return lines.join("\n");
}
