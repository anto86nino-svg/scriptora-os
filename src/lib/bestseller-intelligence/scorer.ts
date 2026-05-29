import { getNarrativeTelemetrySnapshot } from "@/lib/narrative-intelligence";
import type {
  BestsellerChapterSnapshot,
  BestsellerConfidence,
  BestsellerEvaluationInput,
  BestsellerGrade,
  BestsellerScoreBreakdown,
} from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromOverall(overall: number): BestsellerGrade {
  if (overall >= 82) return "bestseller";
  if (overall >= 68) return "strong";
  if (overall >= 48) return "developing";
  return "weak";
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function openingText(text: string, maxWords = 120): string {
  return text.split(/\s+/).slice(0, maxWords).join(" ");
}

function endingText(text: string, maxChars = 320): string {
  const trimmed = text.trim();
  return trimmed.length <= maxChars ? trimmed : trimmed.slice(-maxChars);
}

function isFictionBrain(brainId?: string, domain?: string): boolean {
  if (domain === "nonfiction") return false;
  if (domain === "fiction") return true;
  return Boolean(brainId && !/manual|horticultural|self-help|productivity|business|education|cookbook|technical|study|finance|health|fitness|parenting|biography/.test(brainId));
}

function scoreHookStrength(text: string, fiction: boolean): { score: number; risks: string[]; strengths: string[] } {
  const open = openingText(text).toLowerCase();
  const risks: string[] = [];
  const strengths: string[] = [];
  let score = fiction ? 52 : 58;

  if (/^(it was a|era un|once upon|in this chapter|this chapter|il giorno in cui tutto)/i.test(open)) {
    score -= 22;
    risks.push("Weak opening — generic or meta start");
  }
  if (/\b(normal day|giornata normale|woke up|si svegliò)\b/i.test(open)) {
    score -= 12;
    risks.push("Slow hook — ordinary morning opening");
  }
  if (/\b(suddenly|without warning|improvvisamente|non sapeva|didn't know|wrong|sbagliato|blood|sangue|door|porta)\b/i.test(open)) {
    score += 14;
    strengths.push("Opening creates immediate intrigue");
  }
  if (open.length > 40 && /[.!?]/.test(open.slice(0, 180))) {
    score += 8;
    strengths.push("Opening moves quickly into scene");
  }
  if (!fiction && /\b(step|passo|tool|strumento|season|stagione|measure|misur)\b/i.test(open)) {
    score += 10;
    strengths.push("Instructional hook promises utility fast");
  }

  return { score: clampScore(score), risks, strengths };
}

function scoreBingeability(text: string, ending: string): { score: number; risks: string[]; strengths: string[] } {
  const risks: string[] = [];
  const strengths: string[] = [];
  let score = 50;

  const questionsAtEnd = (ending.match(/\?/g) || []).length;
  if (questionsAtEnd >= 1) {
    score += 12;
    strengths.push("Ending leaves an open question");
  }
  if (/\b(but|ma|però|however|yet|still|only|solo)\b/i.test(ending)) {
    score += 8;
  }
  if (/(everything was fine|all was well|in conclusione|in summary|the end|fine del capitolo)/i.test(ending)) {
    score -= 24;
    risks.push("Ending resolves too cleanly — low binge pull");
  }
  if (/\b(tomorrow|domani|next|poi|later|waiting|aspett|before (he|she|they)|prima che)\b/i.test(ending)) {
    score += 10;
    strengths.push("Forward pull into next chapter");
  }
  if (/\b(secret|segreto|truth|verità|danger|pericolo|knock|busso|message|messaggio)\b/i.test(ending)) {
    score += 12;
    strengths.push("Cliffhanger element at chapter close");
  }

  return { score: clampScore(score), risks, strengths };
}

function scoreReaderRetention(
  telemetry: ReturnType<typeof getNarrativeTelemetrySnapshot>,
): { score: number; risks: string[]; strengths: string[] } {
  const risks: string[] = [];
  const strengths: string[] = [];
  let score = 100 - telemetry.scores.readerDropRiskEstimate;

  if (telemetry.flags.pacingCollapseRisk) {
    score -= 14;
    risks.push("Pacing collapse — too much introspection vs action");
  }
  if (telemetry.flags.weakHookRisk) {
    score -= 10;
    risks.push("Hook weakness detected");
  }
  if (telemetry.flags.earlyPayoffRisk) {
    score -= 8;
    risks.push("Early emotional payoff reduces long-form pull");
  }
  if (telemetry.scores.commercialMomentumScore >= 72) {
    strengths.push("Strong commercial momentum");
  }
  if (telemetry.scores.aiRiskScore <= 35) {
    strengths.push("Low AI-pattern detectability");
  }

  return { score: clampScore(score), risks, strengths };
}

function scoreEmotionalMomentum(text: string): { score: number; risks: string[]; strengths: string[] } {
  const words = wordCount(text);
  if (words < 80) return { score: 45, risks: ["Chapter too short for momentum analysis"], strengths: [] };

  const midpoint = Math.floor(text.length / 2);
  const first = text.slice(0, midpoint).toLowerCase();
  const second = text.slice(midpoint).toLowerCase();
  const emotionWords = /\b(fear|desire|anger|grief|love|tension|paura|desiderio|rabbia|dolore|amore|tensione|heart|cuore|breath|respiro)\b/gi;

  const firstHits = (first.match(emotionWords) || []).length;
  const secondHits = (second.match(emotionWords) || []).length;
  const risks: string[] = [];
  const strengths: string[] = [];
  let score = 55;

  if (secondHits >= firstHits + 2) {
    score += 18;
    strengths.push("Emotional intensity escalates through chapter");
  } else if (firstHits > secondHits + 3) {
    score -= 12;
    risks.push("Emotional energy fades in second half");
  }
  if (/(but|yet|però|however|ma|then|poi)/i.test(second)) {
    score += 8;
  }
  if (/(i feel|mi sento|she felt|lui sentì|he felt)/i.test(text) && !/(said|disse|looked|guardò|step|passo)/i.test(text)) {
    score -= 10;
    risks.push("Emotional telling without scene movement");
  }

  return { score: clampScore(score), risks, strengths };
}

function scoreBookTokIntensity(text: string, brainId?: string, fiction?: boolean): { score: number; risks: string[]; strengths: string[] } {
  if (!fiction) {
    return {
      score: clampScore(/\b(checklist|step|tip|error|mistake|season)\b/i.test(text) ? 62 : 48),
      risks: [],
      strengths: ["Utility-forward content suits nonfiction discovery"],
    };
  }

  const risks: string[] = [];
  const strengths: string[] = [];
  let score = 45;

  const quotableCandidates = text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 18 && s.length <= 110);
  const punchy = quotableCandidates.filter((s) =>
    /\b(never|always|mine|yours|touch|stay|leave|forever|mai|tuo|mia|resta|vai|desider|paura|control|power)\b/i.test(s),
  );
  if (punchy.length >= 2) {
    score += 18;
    strengths.push("Quotable / shareable lines present");
  } else if (punchy.length === 1) {
    score += 10;
  }

  const darkBoost = /dark-romance|mafia|slow-burn|enemies-to-lovers/.test(brainId || "");
  if (darkBoost) {
    if (/\b(forbidden|dangerous|obsession|possess|control|mine|proibit|ossession|pericol)\b/i.test(text)) {
      score += 14;
      strengths.push("BookTok-native tension tropes active");
    } else {
      risks.push("Dark romance brain expects higher forbidden-intensity");
    }
  }

  return { score: clampScore(score), risks, strengths };
}

function scoreCompulsiveReadability(text: string, telemetry: ReturnType<typeof getNarrativeTelemetrySnapshot>): { score: number; risks: string[]; strengths: string[] } {
  const risks: string[] = [];
  const strengths: string[] = [];
  let score = 58;

  const words = wordCount(text);
  const quotes = (text.match(/[“”"«»]/g) || []).length;
  const dialogueRatio = quotes / Math.max(1, words);
  if (dialogueRatio > 0.015) {
    score += 10;
    strengths.push("Healthy dialogue density");
  }
  if (telemetry.scores.subtextDensity >= 8) {
    score += 8;
  }
  if (telemetry.scores.aiRiskScore >= 55) {
    score -= 16;
    risks.push("AI-safe phrasing or rhythm detected");
  } else {
    score += 6;
  }
  if (telemetry.scores.emotionalRealismScore >= 70) {
    score += 10;
    strengths.push("Emotional realism reads human");
  }

  return { score: clampScore(score), risks, strengths };
}

function scoreCommercialPacing(
  input: BestsellerEvaluationInput,
  telemetry: ReturnType<typeof getNarrativeTelemetrySnapshot>,
): { score: number; risks: string[]; strengths: string[] } {
  const risks: string[] = [];
  const strengths: string[] = [];
  let score = telemetry.scores.pacingPressure;
  const total = input.totalChapters || 12;
  const position = (input.chapterIndex + 1) / total;

  if (position <= 0.2 && telemetry.flags.weakHookRisk) {
    score -= 15;
    risks.push("Opening chapters need stronger commercial hook");
  }
  if (position >= 0.75 && score < 55) {
    risks.push("Late-book pacing should accelerate toward climax");
  }
  if (position > 0.4 && position < 0.8 && score >= 65) {
    strengths.push("Mid-book pacing holds reader investment");
  }
  if (telemetry.scores.tensionScore >= 65) {
    score += 6;
  }

  return { score: clampScore(score), risks, strengths };
}

function buildOptimizations(scores: BestsellerScoreBreakdown, risks: string[]): string[] {
  const optimizations: string[] = [];
  if (scores.hookStrength < 60) optimizations.push("Rewrite opening 120 words with anomaly, tension, or concrete scene — no generic setup.");
  if (scores.bingeability < 60) optimizations.push("End chapter on unresolved consequence, reveal, or question — avoid tidy closure.");
  if (scores.emotionalMomentum < 58) optimizations.push("Escalate emotional stakes in second half; add turn, conflict, or decision.");
  if (scores.bookTokIntensity < 55) optimizations.push("Add 1–2 quotable lines with subtext — desire, danger, control, or forbidden pull.");
  if (scores.compulsiveReadability < 58) optimizations.push("Vary sentence rhythm; add dialogue friction and reduce AI-safe phrasing.");
  if (scores.commercialPacing < 58) optimizations.push("Increase scene goals and forward motion; cut reflective stalls.");
  if (scores.readerRetention < 58) optimizations.push("Reduce exposition loops; maintain curiosity pressure every 400–600 words.");
  if (!optimizations.length && risks.length) optimizations.push(risks[0]);
  return optimizations.slice(0, 5);
}

function weightScores(
  raw: Omit<BestsellerScoreBreakdown, "overall">,
  fiction: boolean,
  brainId?: string,
): BestsellerScoreBreakdown {
  const weights = fiction
    ? {
        hook: brainId?.includes("thriller") ? 0.16 : 0.14,
        binge: 0.18,
        retention: 0.16,
        emotion: 0.14,
        booktok: /dark-romance|mafia|slow-burn/.test(brainId || "") ? 0.14 : 0.08,
        compulsive: 0.12,
        pacing: 0.14,
      }
    : {
        hook: 0.12,
        binge: 0.08,
        retention: 0.18,
        emotion: 0.06,
        booktok: 0.04,
        compulsive: 0.22,
        pacing: 0.18,
      };

  const overall = clampScore(
    raw.hookStrength * weights.hook +
      raw.bingeability * weights.binge +
      raw.readerRetention * weights.retention +
      raw.emotionalMomentum * weights.emotion +
      raw.bookTokIntensity * weights.booktok +
      raw.compulsiveReadability * weights.compulsive +
      raw.commercialPacing * weights.pacing,
  );

  return { ...raw, overall };
}

export function evaluateBestsellerChapter(input: BestsellerEvaluationInput): BestsellerChapterSnapshot {
  const text = String(input.content || "").trim();
  const words = wordCount(text);
  const brainId = input.bookIntelligence?.layers?.writingBrainId;
  const domain = input.bookIntelligence?.layers?.domain;
  const fiction = isFictionBrain(brainId, domain);

  if (words < 60) {
    return {
      version: 2,
      chapterIndex: input.chapterIndex,
      evaluatedAt: new Date().toISOString(),
      scores: {
        hookStrength: 0,
        bingeability: 0,
        readerRetention: 0,
        emotionalMomentum: 0,
        bookTokIntensity: 0,
        compulsiveReadability: 0,
        commercialPacing: 0,
        overall: 0,
      },
      grade: "weak",
      confidence: "low",
      risks: ["Insufficient text for bestseller evaluation"],
      strengths: [],
      optimizations: ["Generate more chapter content before commercial scoring."],
    };
  }

  const telemetry = getNarrativeTelemetrySnapshot({
    config: {
      genre: (input.genre || "literary-fiction") as any,
      bookIntelligence: input.bookIntelligence as any,
    },
    currentText: text,
  });

  const ending = endingText(text);
  const hook = scoreHookStrength(text, fiction);
  const binge = scoreBingeability(text, ending);
  const retention = scoreReaderRetention(telemetry);
  const emotion = scoreEmotionalMomentum(text);
  const booktok = scoreBookTokIntensity(text, brainId, fiction);
  const compulsive = scoreCompulsiveReadability(text, telemetry);
  const pacing = scoreCommercialPacing(input, telemetry);

  const allRisks = [...hook.risks, ...binge.risks, ...retention.risks, ...emotion.risks, ...booktok.risks, ...compulsive.risks, ...pacing.risks];
  const allStrengths = [...hook.strengths, ...binge.strengths, ...retention.strengths, ...emotion.strengths, ...booktok.strengths, ...compulsive.strengths, ...pacing.strengths];

  const scores = weightScores(
    {
      hookStrength: hook.score,
      bingeability: binge.score,
      readerRetention: retention.score,
      emotionalMomentum: emotion.score,
      bookTokIntensity: booktok.score,
      compulsiveReadability: compulsive.score,
      commercialPacing: pacing.score,
    },
    fiction,
    brainId,
  );

  const confidence: BestsellerConfidence = words > 500 ? "high" : words > 220 ? "medium" : "low";

  return {
    version: 2,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    scores,
    grade: gradeFromOverall(scores.overall),
    confidence,
    risks: [...new Set(allRisks)].slice(0, 6),
    strengths: [...new Set(allStrengths)].slice(0, 5),
    optimizations: buildOptimizations(scores, allRisks),
  };
}
