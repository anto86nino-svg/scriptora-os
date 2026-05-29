import type { BlindComparisonResult } from "./blind-compare";
import type { AuthorIdentityValidationResult, ChapterDoctorBlindResult, LongBookStressResult } from "./long-book-stress";

export interface LiveValidationReport {
  generatedAt: string;
  overallScore: number;
  ctoVerdict: string;
  wouldAuthorsPreferScriptora: boolean;
  measurablyBetterThanGenericAI: boolean;
  strongestSystems: Array<{ name: string; confidence: number; note: string }>;
  weakestSystems: Array<{ name: string; confidence: number; note: string }>;
  failurePoints: string[];
  dominatesGenres: string[];
  needsWorkGenres: string[];
  vsChatGPT: { winRate: number; avgMargin: number; verdict: string };
  vsClaude: { winRate: number; avgMargin: number; claudeWinsCount: number; verdict: string };
  longBook: LongBookStressResult;
  authorIdentity: AuthorIdentityValidationResult;
  chapterDoctor: ChapterDoctorBlindResult;
  markdown: string;
}

export function buildLiveValidationReport(input: {
  blindResults: BlindComparisonResult[];
  blindSummary: ReturnType<typeof import("./blind-compare").summarizeBlindResults>;
  longBook: LongBookStressResult;
  authorIdentity: AuthorIdentityValidationResult;
  chapterDoctor: ChapterDoctorBlindResult;
  categoryStats: Map<string, { wins: number; total: number; margins: number[] }>;
  corpusSize: number;
}): LiveValidationReport {
  const { blindSummary, longBook, authorIdentity, chapterDoctor, categoryStats } = input;

  const dominatesGenres: string[] = [];
  const needsWorkGenres: string[] = [];
  for (const [category, stat] of categoryStats.entries()) {
    const winRate = stat.wins / stat.total;
    if (winRate >= 0.8) dominatesGenres.push(category);
    else if (winRate < 0.6) needsWorkGenres.push(category);
  }

  const failurePoints: string[] = [];
  if (blindSummary.avgMarginVsClaude < 0.3) failurePoints.push("Claude-style samples competitive — Scriptora margin too thin");
  if (blindSummary.claudeBeatsScriptoraCount > 5) failurePoints.push(`Claude-style wins on ${blindSummary.claudeBeatsScriptoraCount} projects`);
  if (!longBook.passed) failurePoints.push(...longBook.issues);
  if (!authorIdentity.passed) failurePoints.push(...authorIdentity.issues);
  if (!chapterDoctor.passed) failurePoints.push("Chapter Doctor blind test did not pass editor preference bar");

  const horticultural = input.blindResults.filter(r => r.category.includes("Practical"));
  const hortDrift = horticultural.some(r => r.marginVsGeneric < 0.5);
  if (hortDrift) failurePoints.push("Practical guide category needs stronger separation from generic AI");

  const measurablyBetterThanGenericAI = blindSummary.avgMarginVsGeneric >= 0.8 && blindSummary.scriptoraWinRate >= 70;
  const wouldAuthorsPreferScriptora =
    measurablyBetterThanGenericAI &&
    longBook.passed &&
    authorIdentity.passed &&
    chapterDoctor.passed &&
    failurePoints.length <= 2;

  let overallScore = Math.round(
    blindSummary.scriptoraWinRate * 0.35 +
      Math.min(100, blindSummary.avgMarginVsGeneric * 25) * 0.2 +
      (longBook.passed ? 15 : 0) +
      (authorIdentity.passed ? 10 : 0) +
      (chapterDoctor.passed ? 10 : 0) +
      Math.max(0, 10 - failurePoints.length * 3),
  );

  overallScore = Math.max(0, Math.min(100, overallScore));

  const vsChatGPTVerdict =
    blindSummary.avgMarginVsGeneric >= 1.0
      ? "Scriptora clearly beats generic ChatGPT patterns on composite rubric"
      : blindSummary.avgMarginVsGeneric >= 0.5
        ? "Scriptora beats generic ChatGPT but margin is moderate — not a slam dunk"
        : "Generic ChatGPT too close — not proven superior";

  const vsClaudeVerdict =
    blindSummary.avgMarginVsClaude >= 0.5
      ? "Scriptora leads Claude-style polished prose on commercial/editorial composite"
      : blindSummary.avgMarginVsClaude >= 0
        ? "Rough parity with Claude-style — differentiation is architectural not prose-default"
        : "Claude-style samples beat Scriptora on several projects — honesty required";

  let ctoVerdict: string;
  if (wouldAuthorsPreferScriptora && overallScore >= 78) {
    ctoVerdict =
      "HONEST VERDICT: Offline real-world benchmark supports the claim that Scriptora is measurably better than generic AI for long-form editorial workflows. Not universal — Claude-style prose remains competitive on literary polish. Live API confirmation still required before marketing claims.";
  } else if (overallScore >= 65) {
    ctoVerdict =
      "HONEST VERDICT: Scriptora shows real advantages in genre accuracy, commercial scoring, and memory — but is NOT yet proven universally superior to all competitors. Professional authors would prefer it in dominated genres; skeptical in others.";
  } else {
    ctoVerdict =
      "HONEST VERDICT: Do NOT claim superiority yet. Failure points outweigh evidence. Fix weakest genres and long-book edge cases before author-facing positioning.";
  }

  const strongestSystems = [
    { name: "Genre Brain + drift prevention", confidence: hortDrift ? 72 : 92, note: hortDrift ? "Horticultural separation needs work" : "Strong nonfiction routing" },
    { name: "Blind rubric vs generic ChatGPT", confidence: Math.min(95, Math.round(60 + blindSummary.avgMarginVsGeneric * 20)), note: vsChatGPTVerdict },
    { name: "Long Book Memory (28 ch)", confidence: longBook.passed ? 88 : 52, note: longBook.passed ? "No collapse after ch.15" : longBook.issues.join("; ") },
    { name: "Author Identity Lock", confidence: authorIdentity.passed ? 90 : 55, note: authorIdentity.passed ? "Stable across reload simulation" : authorIdentity.issues.join("; ") },
  ];

  const weakestSystems = [
    { name: "vs Claude-style prose", confidence: Math.max(40, Math.round(55 + blindSummary.avgMarginVsClaude * 15)), note: vsClaudeVerdict },
    { name: "Chapter Doctor blind preference", confidence: chapterDoctor.passed ? 82 : 48, note: chapterDoctor.passed ? "Editor would choose improved version" : "Delta or voice preservation failed" },
    { name: "Categories needing work", confidence: needsWorkGenres.length ? 58 : 85, note: needsWorkGenres.length ? needsWorkGenres.join(", ") : "All categories above threshold" },
  ];

  const markdown = formatLiveValidationMarkdown({
    generatedAt: new Date().toISOString(),
    overallScore,
    ctoVerdict,
    wouldAuthorsPreferScriptora,
    measurablyBetterThanGenericAI,
    strongestSystems,
    weakestSystems,
    failurePoints,
    dominatesGenres,
    needsWorkGenres,
    vsChatGPT: { winRate: blindSummary.scriptoraWinRate, avgMargin: blindSummary.avgMarginVsGeneric, verdict: vsChatGPTVerdict },
    vsClaude: {
      winRate: blindSummary.rank1Rate,
      avgMargin: blindSummary.avgMarginVsClaude,
      claudeWinsCount: blindSummary.claudeBeatsScriptoraCount,
      verdict: vsClaudeVerdict,
    },
    longBook,
    authorIdentity,
    chapterDoctor,
    blindSummary,
    corpusSize: input.corpusSize,
  });

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    ctoVerdict,
    wouldAuthorsPreferScriptora,
    measurablyBetterThanGenericAI,
    strongestSystems,
    weakestSystems,
    failurePoints,
    dominatesGenres,
    needsWorkGenres,
    vsChatGPT: { winRate: blindSummary.scriptoraWinRate, avgMargin: blindSummary.avgMarginVsGeneric, verdict: vsChatGPTVerdict },
    vsClaude: {
      winRate: blindSummary.rank1Rate,
      avgMargin: blindSummary.avgMarginVsClaude,
      claudeWinsCount: blindSummary.claudeBeatsScriptoraCount,
      verdict: vsClaudeVerdict,
    },
    longBook,
    authorIdentity,
    chapterDoctor,
    markdown,
  };
}

function formatLiveValidationMarkdown(data: {
  generatedAt: string;
  overallScore: number;
  ctoVerdict: string;
  wouldAuthorsPreferScriptora: boolean;
  measurablyBetterThanGenericAI: boolean;
  strongestSystems: LiveValidationReport["strongestSystems"];
  weakestSystems: LiveValidationReport["weakestSystems"];
  failurePoints: string[];
  dominatesGenres: string[];
  needsWorkGenres: string[];
  vsChatGPT: LiveValidationReport["vsChatGPT"];
  vsClaude: LiveValidationReport["vsClaude"];
  longBook: LongBookStressResult;
  authorIdentity: AuthorIdentityValidationResult;
  chapterDoctor: ChapterDoctorBlindResult;
  blindSummary: ReturnType<typeof import("./blind-compare").summarizeBlindResults>;
  corpusSize: number;
}): string {
  const lines = [
    `# Scriptora Live Author Validation Report`,
    ``,
    `Generated: ${data.generatedAt}`,
    `Mode: **Offline real-world benchmark** (simulated ChatGPT / Claude-style competitors)`,
    `Corpus: **${data.corpusSize} projects** across 7 categories`,
    ``,
    `## Overall Validation Score: **${data.overallScore}/100**`,
    ``,
    `### CTO Verdict`,
    data.ctoVerdict,
    ``,
    `| Claim | Status |`,
    `|-------|--------|`,
    `| Measurably better than generic AI | ${data.measurablyBetterThanGenericAI ? "✅ Supported offline" : "❌ Not proven"} |`,
    `| Professional authors would prefer Scriptora | ${data.wouldAuthorsPreferScriptora ? "✅ Likely in dominated genres" : "❌ Not yet"} |`,
    ``,
    `## Phase 1 — Real Benchmark Corpus`,
    `- 35 projects: 5× Romance, Thriller, Fantasy, Memoir, Self-help, Business, Practical Guides`,
    `- Fantasy/long targets: 20–30 chapters, 70k–95k word simulation`,
    ``,
    `## Phase 2 — Blind Competitor Test`,
    `- Scriptora win rate: **${data.vsChatGPT.winRate}%** (${data.blindSummary.scriptoraWins}/${data.corpusSize})`,
    `- Rank #1 rate: **${data.blindSummary.rank1Rate}%**`,
    `- Avg margin vs generic ChatGPT: **+${data.vsChatGPT.avgMargin}** composite points`,
    `- Avg margin vs Claude-style: **${data.vsClaude.avgMargin >= 0 ? "+" : ""}${data.vsClaude.avgMargin}**`,
    `- Claude beats Scriptora on: **${data.vsClaude.claudeWinsCount}** projects`,
    ``,
    `**vs ChatGPT:** ${data.vsChatGPT.verdict}`,
    ``,
    `**vs Claude-style:** ${data.vsClaude.verdict}`,
    ``,
    `## Phase 3 — Long Book Stress (${data.longBook.totalChapters} chapters, ~${data.longBook.simulatedWords} words)`,
    `- Passed: **${data.longBook.passed ? "YES" : "NO"}**`,
    `- Collapsed after ch.15: **${data.longBook.collapsedAfterChapter15 ? "YES ⚠️" : "NO"}**`,
    `- Min drift score: **${data.longBook.maxDrift}**`,
    ...(data.longBook.checkpoints.map(
      c => `- Ch.${c.chapter}: arcs=${c.unresolvedArcs}, psychology=${c.characterPsychologyCount}, drift=${c.driftScore}`,
    )),
    ``,
    `## Phase 4 — Author Identity`,
    `- Identities tested: ${data.authorIdentity.identities.join(" / ")}`,
    `- Stable after reload: **${data.authorIdentity.stableAfterReload}**`,
    `- Distinct voices: **${data.authorIdentity.distinctVoices}**`,
    ``,
    `## Phase 5 — Chapter Doctor Blind`,
    `- Editor would choose improved: **${data.chapterDoctor.editorWouldChooseImproved}**`,
    `- Voice preserved: **${data.chapterDoctor.voicePreserved}**`,
    `- Delta believable (${data.chapterDoctor.delta}): **${data.chapterDoctor.deltaBelievable}**`,
    ``,
    `## Strongest Systems`,
    ...data.strongestSystems.map(s => `- **${s.name}** (${s.confidence}%): ${s.note}`),
    ``,
    `## Weakest Systems`,
    ...data.weakestSystems.map(s => `- **${s.name}** (${s.confidence}%): ${s.note}`),
    ``,
    `## Genres Where Scriptora Dominates`,
    ...(data.dominatesGenres.length ? data.dominatesGenres.map(g => `- ${g}`) : ["- None above 80% win threshold"]),
    ``,
    `## Genres Needing Work`,
    ...(data.needsWorkGenres.length ? data.needsWorkGenres.map(g => `- ${g}`) : ["- None below 60% threshold"]),
    ``,
  ];

  if (data.failurePoints.length) {
    lines.push(`## Failure Points`, ``);
    for (const f of data.failurePoints) lines.push(`- ${f}`);
    lines.push(``);
  }

  lines.push(
    `## Limitations (honest)`,
    `- This report uses **offline simulated competitors**, not live ChatGPT/Claude API outputs.`,
    `- CI pass ≠ author pass. Run \`npm test -- src/lib/live-author-validation\` then optional live API harness when keys available.`,
    `- Prose quality on literary polish may still lose to Claude-style defaults on some projects.`,
  );

  return lines.join("\n");
}
