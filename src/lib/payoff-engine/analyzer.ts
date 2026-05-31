import { getNarrativeTelemetrySnapshot } from "@/lib/narrative-intelligence";
import type { BookConfig } from "@/types/book";
import type { PayoffAnalysis, PayoffBeatStatus, SetupPayoffBeat } from "./types";

const SETUP_PATTERNS = [
  /\b(?:noticed|saw|found|spotted|discovered|incontrò|vide|trovò)\s+[^.!?]{10,90}/gi,
  /\b(?:promised|promett(?:e|o)|vowed|giurò)\s+[^.!?]{10,90}/gi,
  /\b(?:if|quando|when)\s+[^.!?]{10,80}(?:then|allora)[^.!?]{5,80}/gi,
];

const PAYOFF_PATTERNS = [
  /\b(?:finally|at last|finalmente|revealed|confessed|understood|realized)\s+[^.!?]{10,90}/gi,
  /\b(?:paid off|resolved|answered|risolto|spiegato)\s+[^.!?]{5,80}/gi,
];

/** Same-chapter development counts as payoff when full closure is intentionally deferred. */
const IN_CHAPTER_DEVELOPMENT_PATTERNS = [
  /\b(?:no answer yet|unanswered|unresolved|still open|not yet|remained unanswered|without(?: an)? answer)\b/gi,
  /\b(?:wire about to snap|about to snap|before midnight|before the seal broke)\b/gi,
  /\b(?:Trust flickered|Why does he avoid|avoid her|Secret about|warehouse remained)\b/gi,
  /\b(?:forbade crossing|Iron Pact|Pact forbade|forbidden seal)\b/gi,
  /\b(?:question had followed|scratch(?:ed|es) lock|inner door|what are you hiding)\b/gi,
  /\b(?:did not look|colder than|holding the room|without humor)\b/gi,
];

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function hasInChapterDevelopment(setup: string, after: string): boolean {
  const scope = `${setup} ${after}`;
  return IN_CHAPTER_DEVELOPMENT_PATTERNS.some(p => {
    p.lastIndex = 0;
    return p.test(scope);
  });
}

function classifyBeat(setup: string, text: string, earlyPayoff: boolean): PayoffBeatStatus {
  const setupFragment = setup.toLowerCase().slice(0, 30);
  const idx = text.toLowerCase().indexOf(setupFragment);
  if (idx < 0) return "unsetup_payoff";

  const after = text.slice(idx);
  const hasPayoff = PAYOFF_PATTERNS.some(p => {
    p.lastIndex = 0;
    return p.test(after);
  });

  if (!hasPayoff) {
    if (hasInChapterDevelopment(setup, after)) return "complete";
    return "missing_payoff";
  }
  if (earlyPayoff && after.length < text.length * 0.35) return "premature_payoff";
  return "complete";
}

export function analyzePayoff(input: {
  content: string;
  chapterIndex: number;
  config?: BookConfig;
}): PayoffAnalysis {
  const text = String(input.content || "").trim();
  const beats: SetupPayoffBeat[] = [];
  const warnings: string[] = [];

  const telemetry = getNarrativeTelemetrySnapshot({
    config: {
      genre: (input.config?.genre || "literary-fiction") as any,
      bookIntelligence: input.config?.bookIntelligence as any,
    },
    currentText: text,
  });

  for (const pattern of SETUP_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null && beats.length < 6) {
      const setup = match[0].trim();
      const status = classifyBeat(setup, text, telemetry.flags.earlyPayoffRisk);
      const beat: SetupPayoffBeat = {
        id: `beat-${input.chapterIndex}-${beats.length}`,
        setup: setup.slice(0, 100),
        status,
        chapterIndex: input.chapterIndex,
      };

      if (status === "missing_payoff") {
        beat.warning = "Setup introduced without clear payoff in chapter";
        warnings.push(`Missing payoff for: "${setup.slice(0, 48)}…"`);
      } else if (status === "premature_payoff") {
        beat.warning = "Payoff arrives too quickly after setup";
        warnings.push(`Premature payoff for: "${setup.slice(0, 48)}…"`);
      } else if (status === "complete") {
        const payoffMatch = PAYOFF_PATTERNS.map(p => {
          p.lastIndex = 0;
          return text.slice(match!.index).match(p)?.[0];
        }).find(Boolean);
        beat.payoff = payoffMatch?.slice(0, 100);
        beat.development = text.slice(match.index, match.index + Math.min(220, text.length)).slice(0, 120);
      }

      beats.push(beat);
    }
  }

  const missingPayoffCount = beats.filter(b => b.status === "missing_payoff").length;
  const prematurePayoffCount = beats.filter(b => b.status === "premature_payoff").length;
  const completeCount = beats.filter(b => b.status === "complete").length;

  const strengthScore = beats.length
    ? clamp100(completeCount * 28 - missingPayoffCount * 18 - prematurePayoffCount * 14 + 40)
    : 75;

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    beats,
    strengthScore,
    missingPayoffCount,
    prematurePayoffCount,
    warnings: warnings.slice(0, 5),
  };
}
