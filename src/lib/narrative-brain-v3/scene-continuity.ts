import type { Chapter } from "@/types/book";
import type { SceneContinuityReport } from "./types";

const CONFESSION_PATTERNS = [
  /\b(i love you|ti amo|i'm sorry|mi dispiace|forgive me|mi perdoni|i understand now|capisco tutto)\b/gi,
];

const FEAR_PATTERNS = [
  /\b(afraid|paura|terrified|spaventat|fear of losing|paura di perder|won't leave|non mi lasci)\b/gi,
];

const BEAT_PATTERNS = [
  { id: "confession", re: CONFESSION_PATTERNS },
  { id: "fear_expression", re: FEAR_PATTERNS },
  { id: "door_slam", re: /\b(slammed the door|sbatté la porta|porta sbatte)\b/gi },
  { id: "kiss", re: /\b(kiss|bacio|baciò|lips met)\b/gi },
  { id: "revelation", re: /\b(i know the truth|so la verità|now i know|adesso so)\b/gi },
];

function chapterCorpus(chapters: Chapter[]): string {
  return chapters
    .map((ch) => `${ch.content}\n${(ch.subchapters || []).map((s) => s.content).join("\n")}`)
    .join("\n\n");
}

function extractBeatHits(text: string): string[] {
  const hits: string[] = [];
  for (const beat of BEAT_PATTERNS) {
    if (beat.re.test(text)) hits.push(beat.id);
    beat.re.lastIndex = 0;
  }
  return hits;
}

export function analyzeSceneContinuity(
  previousChapters: Chapter[],
  plannedSummary: string,
): SceneContinuityReport {
  const corpus = chapterCorpus(previousChapters);
  const priorBeats = extractBeatHits(corpus);
  const plannedBeats = extractBeatHits(plannedSummary);

  const blockedBeats = plannedBeats.filter((b) => priorBeats.includes(b));
  const repeatedFears = FEAR_PATTERNS.test(corpus) && FEAR_PATTERNS.test(plannedSummary) ? ["fear_of_loss"] : [];
  const repeatedConfessions = CONFESSION_PATTERNS.test(corpus) && CONFESSION_PATTERNS.test(plannedSummary)
    ? ["emotional_confession"]
    : [];

  const warnings: string[] = [];
  if (blockedBeats.length) {
    warnings.push(`Scene beat already used: ${blockedBeats.join(", ")} — advance with NEW emotional move`);
  }
  if (repeatedFears.length) {
    warnings.push("Same fear already expressed — show different manifestation or escalate stakes");
  }
  if (repeatedConfessions.length) {
    warnings.push("Confession pattern repeated — use subtext, gesture, or partial truth instead");
  }

  return { blockedBeats, repeatedFears, repeatedConfessions, warnings };
}

export function buildSceneContinuityBlock(report: SceneContinuityReport): string {
  if (!report.warnings.length) {
    return `SCENE CONTINUITY ENGINE V2:
Before writing: this beat must be NEW. No repeat of prior chapter emotional beats in the same form.
Each dialogue exchange must advance information, relationship, or stakes.`;
  }

  return [
    "SCENE CONTINUITY ENGINE V2 — BLOCKED REPETITION:",
    ...report.warnings.map((w) => `• ${w}`),
    "Write a fresh scene beat — same emotion allowed only if the ACTION is different.",
  ].join("\n");
}
