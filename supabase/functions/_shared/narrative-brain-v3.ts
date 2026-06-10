/**
 * Deno-compatible Narrative Brain V3 prompt block for edge functions.
 * Mirrors src/lib/narrative-brain-v3 strategy — keep in sync on rule changes.
 */

export interface NarrativeBrainEdgeInput {
  genre: string;
  subcategory?: string;
  tone?: string;
  language?: string;
  targetAudience?: string;
  readerPromise?: string;
  charactersText?: string;
  authorName?: string;
  chapterIndex: number;
  chapterTitle: string;
  chapterSummary: string;
  totalChapters?: number;
  previousSummaries?: string[];
}

function genreSlug(genre: string): string {
  return String(genre || "fiction").toLowerCase();
}

function buildGenrePlan(input: NarrativeBrainEdgeInput): string {
  const g = genreSlug(input.genre);
  const sub = String(input.subcategory || "").toLowerCase();

  if (/dark-romance|dark.?romance/.test(g)) {
    return `Dark Romance plan: extreme tension, slow-burn trust, sharp dialogue, vulnerability earned late. FORBID instant love and instant healing.`;
  }
  if (/romance|romantasy/.test(g)) {
    return `Romance plan: friction before tenderness, desire without immediate safety, delayed payoff.`;
  }
  if (/thriller|crime|mystery|noir|suspense/.test(g)) {
    return `Thriller plan: graduated revelations, clear scene objective, cliffhanger-friendly endings, no info dumps.`;
  }
  if (/fantasy|sci-fi/.test(g)) {
    return `Fantasy/Sci-Fi plan: worldbuilding through conflict, consistent rules, moral texture.`;
  }
  if (/cozy/.test(sub)) {
    return `Cozy plan: moderate tension, high comfort, soft personal stakes.`;
  }
  return `Genre-native plan: clear mission per scene, tension + consequence, no generic AI voice.`;
}

function buildCharacterPsychologyBlock(charactersText?: string): string {
  const raw = String(charactersText || "").trim();
  if (!raw) {
    return `CHARACTER PSYCHOLOGY ENGINE:
No formal bible — once names/wounds appear, preserve them. Distinct dialogue voices mandatory. No therapist-speak.`;
  }
  return `CHARACTER PSYCHOLOGY ENGINE:
${raw}

DIALOGUE LAW:
- Each character sounds different (cadence, deflection, fear, desire).
- Under stress: hesitation, contradiction, partial truths — never perfect emotional clarity.
- FORBID: instant mutual understanding, therapist dialogue, named feelings resolved in one beat.`;
}

function buildHumanContradictionBlock(): string {
  return `HUMAN CONTRADICTION ENGINE:
Allow hesitation, contradictory actions, ambiguous motives. FORBID perfect confessions and emotional over-explanation.`;
}

function buildSceneContinuityBlock(previousSummaries: string[], summary: string): string {
  const prior = previousSummaries.join(" ").toLowerCase();
  const planned = summary.toLowerCase();
  const warnings: string[] = [];
  if (/ti amo|i love you/.test(prior) && /ti amo|i love you/.test(planned)) {
    warnings.push("Love confession already used — advance with subtext or new conflict");
  }
  if (/paura|afraid|fear/.test(prior) && /paura|afraid|fear/.test(planned)) {
    warnings.push("Same fear beat — show different manifestation");
  }
  if (!warnings.length) {
    return `SCENE CONTINUITY V2: This beat must be NEW. No repeat of prior emotional moves in same form.`;
  }
  return `SCENE CONTINUITY V2 — BLOCKED:\n${warnings.map((w) => `• ${w}`).join("\n")}`;
}

function buildSubtextBlock(): string {
  return `SUBTEXT ENGINE: Show emotion through gesture, silence, body language. Reduce direct emotional statements.`;
}

function buildRomanceTensionBlock(genre: string, chapterIndex: number): string {
  const g = genreSlug(genre);
  if (!/romance|dark-romance/.test(g)) return "";
  const early = chapterIndex < 4;
  return `ROMANCE TENSION V2: ${early ? "Early book — attraction ok, full vulnerability FORBIDDEN." : "Payoff may deepen with cost."} FORBID instant healing.`;
}

function buildAuthorDnaBlock(input: NarrativeBrainEdgeInput): string {
  return `AUTHOR DNA: Voice lock — ${input.tone || "genre-native"}. Pen: ${input.authorName || "author"}. Sound like ONE author, not generic AI.`;
}

function buildReaderAddictionBlock(title: string, summary: string, genre: string, language?: string): string {
  const blob = `${title} ${summary}`;
  const hook = /\b(sudden|shock|secret|mystery|found|dead|blood)\b/i.test(blob) ? "ok" : "weak";
  const curiosity = /\?|why|perché|but|ma|unless/.test(blob) ? "ok" : "weak";
  if (hook === "ok" && curiosity === "ok") {
    return `READER ADDICTION: Maintain hook + curiosity every scene.`;
  }
  const italian = String(language || "").toLowerCase().includes("ital");
  const hookFix = italian
    ? "Apri con gesto concreto o domanda non risolta."
    : "Open with concrete action or unanswered question.";
  return `READER ADDICTION — PLAN REMEDIATED LOCALLY:
Hook/curiosity below threshold. MANDATE: ${hookFix}
End beat must pull reader forward. Genre: ${genre}.`;
}

export function buildNarrativeBrainV3EdgeBlock(input: NarrativeBrainEdgeInput): string {
  const previous = input.previousSummaries || [];
  return [
    "NARRATIVE BRAIN V3 — EDGE PIPELINE (same quality as Writer):",
    buildGenrePlan(input),
    buildAuthorDnaBlock(input),
    buildCharacterPsychologyBlock(input.charactersText),
    buildHumanContradictionBlock(),
    buildSceneContinuityBlock(previous, input.chapterSummary),
    buildSubtextBlock(),
    buildRomanceTensionBlock(input.genre, input.chapterIndex),
    buildReaderAddictionBlock(input.chapterTitle, input.chapterSummary, input.genre, input.language),
    input.readerPromise ? `Reader promise: ${input.readerPromise}` : "",
    "MASTERPIECE MODE: Quality over speed. No filler. No prompt leakage in output.",
  ].filter(Boolean).join("\n\n");
}
