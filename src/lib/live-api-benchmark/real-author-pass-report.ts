import type { BlindComparisonResult } from "@/lib/live-author-validation/blind-compare";
import type { summarizeLiveBlindResults } from "./live-blind-compare";
import type {
  LiveAuthorIdentityResult,
  LiveBenchmarkEnvStatus,
  LiveChapterDoctorResult,
  LiveLongBookVariantResult,
  LiveProjectRun,
  RealAuthorPassReport,
} from "./types";

function winLossByGenre(blindResults: BlindComparisonResult[]) {
  const map = new Map<string, { wins: number; total: number; margins: number[] }>();
  for (const r of blindResults) {
    const stat = map.get(r.category) || { wins: 0, total: 0, margins: [] };
    stat.total += 1;
    if (r.winner === "scriptora") stat.wins += 1;
    stat.margins.push(r.marginVsGeneric);
    map.set(r.category, stat);
  }
  return [...map.entries()].map(([category, stat]) => ({
    category,
    scriptoraWins: stat.wins,
    total: stat.total,
    avgMarginVsChatGPT: Number((stat.margins.reduce((a, b) => a + b, 0) / stat.margins.length).toFixed(2)),
  }));
}

function computeOverallScore(input: {
  blindSummary: ReturnType<typeof summarizeLiveBlindResults>;
  longBook: LiveLongBookVariantResult[];
  authorIdentity: LiveAuthorIdentityResult;
  chapterDoctor: LiveChapterDoctorResult;
  failurePoints: string[];
}): number {
  const scriptoraLongBook = input.longBook.find(l => l.variant === "scriptora");
  const longBookScore = scriptoraLongBook?.survived ? 15 : 5;
  const identityScore = input.authorIdentity.passed ? 10 : 3;
  const doctorScore = input.chapterDoctor.passed ? 10 : 4;

  let score = Math.round(
    input.blindSummary.scriptoraWinRate * 0.3 +
      Math.min(25, Math.max(0, input.blindSummary.avgMarginVsGeneric * 12)) +
      longBookScore +
      identityScore +
      doctorScore +
      Math.max(0, 10 - input.failurePoints.length * 2.5),
  );

  return Math.max(0, Math.min(100, score));
}

export function buildRealAuthorPassReport(input: {
  env: LiveBenchmarkEnvStatus;
  smoke: boolean;
  projectsTested: number;
  chaptersPerProject: number;
  longBookChapters: number;
  blindResults: BlindComparisonResult[];
  blindSummary: ReturnType<typeof summarizeLiveBlindResults>;
  longBook: LiveLongBookVariantResult[];
  authorIdentity: LiveAuthorIdentityResult;
  chapterDoctor: LiveChapterDoctorResult;
  projectRuns: LiveProjectRun[];
}): RealAuthorPassReport {
  const { blindSummary, longBook, authorIdentity, chapterDoctor, blindResults } = input;
  const genreStats = winLossByGenre(blindResults);
  const failurePoints: string[] = [];

  const scriptoraLong = longBook.find(l => l.variant === "scriptora");
  const chatgptLong = longBook.find(l => l.variant === "chatgpt");
  const claudeLong = longBook.find(l => l.variant === "claude");

  if (blindSummary.avgMarginVsClaude < 0) failurePoints.push("Claude beats Scriptora on average composite — not proven superior");
  if (blindSummary.chatgptBeatsScriptoraCount > blindResults.length * 0.3) {
    failurePoints.push(`ChatGPT wins ${blindSummary.chatgptBeatsScriptoraCount}/${blindResults.length} projects`);
  }
  if (scriptoraLong && !scriptoraLong.survived) failurePoints.push("Scriptora failed long-book survival test");
  if (chatgptLong?.survived && scriptoraLong && !scriptoraLong.survived) {
    failurePoints.push("ChatGPT survived long-form better than Scriptora");
  }
  if (claudeLong?.survived && scriptoraLong && scriptoraLong.survived === false) {
    failurePoints.push("Claude survived long-form better than Scriptora");
  }
  if (!authorIdentity.passed) failurePoints.push(...authorIdentity.issues);
  if (!chapterDoctor.passed) failurePoints.push("Chapter Doctor did not win blind editor preference");

  const horticultural = genreStats.find(g => g.category.includes("Practical"));
  if (horticultural && horticultural.avgMarginVsChatGPT < 0.3) {
    failurePoints.push("Practical guides: insufficient separation from ChatGPT");
  }

  const overallScore = computeOverallScore({ blindSummary, longBook, authorIdentity, chapterDoctor, failurePoints });

  const vsChatGPTWins = blindResults.filter(r => r.marginVsGeneric > 0.05).length;
  const vsChatGPTLosses = blindResults.filter(r => r.marginVsGeneric < -0.05).length;
  const vsChatGPTTies = blindResults.length - vsChatGPTWins - vsChatGPTLosses;

  const vsClaudeWins = blindResults.filter(r => r.marginVsClaude > 0.05).length;
  const vsClaudeLosses = blindResults.filter(r => r.marginVsClaude < -0.05).length;
  const vsClaudeTies = blindResults.length - vsClaudeWins - vsClaudeLosses;

  const vsChatGPTVerdict =
    blindSummary.avgMarginVsGeneric >= 0.8
      ? "Scriptora measurably beats live ChatGPT on editorial composite"
      : blindSummary.avgMarginVsGeneric >= 0.2
        ? "Scriptora leads ChatGPT but margin is modest — not decisive"
        : "Live ChatGPT too close or ahead — superiority NOT proven";

  const vsClaudeVerdict =
    blindSummary.avgMarginVsClaude >= 0.4
      ? "Scriptora leads live Claude on long-form editorial composite"
      : blindSummary.avgMarginVsClaude >= 0
        ? "Rough parity with live Claude — differentiation is workflow/memory not default prose"
        : "Live Claude beats Scriptora on several projects — brutal honesty required";

  const scriptoraLongSurvived = scriptoraLong?.survived ?? false;
  const measurablySuperiorLongForm =
    blindSummary.avgMarginVsGeneric >= 0.5 &&
    blindSummary.scriptoraWinRate >= 60 &&
    scriptoraLongSurvived &&
    authorIdentity.passed;

  const wouldAuthorsPreferScriptora =
    measurablySuperiorLongForm && chapterDoctor.passed && failurePoints.length <= 2 && overallScore >= 72;

  const strongestMoat: string[] = [];
  if (blindSummary.avgMarginVsGeneric >= 0.5) strongestMoat.push("Editorial rubric vs live ChatGPT");
  if (scriptoraLongSurvived) strongestMoat.push("Long-book memory survival");
  if (authorIdentity.passed) strongestMoat.push("Author identity preservation");
  if (chapterDoctor.passed) strongestMoat.push("Chapter Doctor surgical revision");
  if (horticultural && horticultural.avgMarginVsChatGPT >= 0.6) strongestMoat.push("Practical guide genre lock");

  const weakestAreas: string[] = [];
  if (blindSummary.avgMarginVsClaude < 0.3) weakestAreas.push("Live Claude prose polish");
  if (!chapterDoctor.passed) weakestAreas.push("Chapter Doctor blind preference");
  for (const g of genreStats.filter(g => g.scriptoraWins / g.total < 0.5)) {
    weakestAreas.push(g.category);
  }
  if (scriptoraLong?.collapsedAfterChapter15) weakestAreas.push("Long-form drift after chapter 15");

  let ctoVerdict: string;
  if (wouldAuthorsPreferScriptora) {
    ctoVerdict =
      "BRUTAL VERDICT (LIVE): Evidence supports that serious authors would choose Scriptora over generic ChatGPT/Claude for long-form book creation and editorial workflow. Not universal — Claude remains competitive on literary polish.";
  } else if (overallScore >= 58) {
    ctoVerdict =
      "BRUTAL VERDICT (LIVE): Scriptora shows real advantages but is NOT yet proven universally superior in live API comparison. Use dominated genres; fix failure points before marketing claims.";
  } else {
    ctoVerdict =
      "BRUTAL VERDICT (LIVE): Do NOT claim superiority. Live API comparison falsifies or weakens key assumptions. Fix weakest areas before author-facing positioning.";
  }

  const markdown = formatMarkdown({
    generatedAt: new Date().toISOString(),
    mode: "live" as const,
    env: input.env,
    smoke: input.smoke,
    projectsTested: input.projectsTested,
    chaptersPerProject: input.chaptersPerProject,
    longBookChapters: input.longBookChapters,
    overallScore,
    ctoVerdict,
    wouldAuthorsPreferScriptora,
    measurablySuperiorLongForm,
    vsChatGPT: {
      wins: vsChatGPTWins,
      losses: vsChatGPTLosses,
      ties: vsChatGPTTies,
      winRate: blindSummary.scriptoraWinRate,
      avgMargin: blindSummary.avgMarginVsGeneric,
      verdict: vsChatGPTVerdict,
    },
    vsClaude: {
      wins: vsClaudeWins,
      losses: vsClaudeLosses,
      ties: vsClaudeTies,
      winRate: Number(((vsClaudeWins / Math.max(1, blindResults.length)) * 100).toFixed(1)),
      avgMargin: blindSummary.avgMarginVsClaude,
      verdict: vsClaudeVerdict,
    },
    winLossByGenre: genreStats,
    longBook,
    authorIdentity,
    chapterDoctor,
    strongestMoat,
    weakestAreas,
    failurePoints,
    blindSummary,
  });

  return {
    generatedAt: new Date().toISOString(),
    mode: "live",
    env: input.env,
    smoke: input.smoke,
    projectsTested: input.projectsTested,
    chaptersPerProject: input.chaptersPerProject,
    longBookChapters: input.longBookChapters,
    overallScore,
    ctoVerdict,
    wouldAuthorsPreferScriptora,
    measurablySuperiorLongForm,
    vsChatGPT: {
      wins: vsChatGPTWins,
      losses: vsChatGPTLosses,
      ties: vsChatGPTTies,
      winRate: blindSummary.scriptoraWinRate,
      avgMargin: blindSummary.avgMarginVsGeneric,
      verdict: vsChatGPTVerdict,
    },
    vsClaude: {
      wins: vsClaudeWins,
      losses: vsClaudeLosses,
      ties: vsClaudeTies,
      winRate: Number(((vsClaudeWins / Math.max(1, blindResults.length)) * 100).toFixed(1)),
      avgMargin: blindSummary.avgMarginVsClaude,
      verdict: vsClaudeVerdict,
    },
    winLossByGenre: genreStats,
    longBook,
    authorIdentity,
    chapterDoctor,
    strongestMoat,
    weakestAreas,
    failurePoints,
    blindResults,
    markdown,
  };
}

export function buildBlockedReport(env: LiveBenchmarkEnvStatus, smoke: boolean, reason: string): RealAuthorPassReport {
  const markdown = [
    `# Scriptora Real Author Pass Report`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Mode: **OFFLINE BLOCKED** — live API keys not configured`,
    ``,
    `## Status`,
    reason,
    ``,
    `| Key | Present |`,
    `|-----|---------|`,
    `| DEEPSEEK_API_KEY | ${env.deepseek ? "✅" : "❌"} |`,
    `| OPENAI_API_KEY | ${env.openai ? "✅" : "❌"} |`,
    `| ANTHROPIC_API_KEY | ${env.anthropic ? "✅" : "❌"} |`,
    ``,
    `## How to run the real pass`,
    `\`\`\`bash`,
    `export DEEPSEEK_API_KEY=...`,
    `export OPENAI_API_KEY=...`,
    `export ANTHROPIC_API_KEY=...`,
    `npm run benchmark:live`,
    `\`\`\``,
    ``,
    `For full matrix (21 projects, 25-chapter long book):`,
    `\`\`\`bash`,
    `LIVE_BENCHMARK_FULL=1 npm run benchmark:live`,
    `\`\`\``,
    ``,
    `## Brutal verdict (pre-live)`,
    `Cannot prove or falsify superiority without live API outputs. Offline simulated validation exists in \`benchmark-logs/scriptora-live-validation-report.md\` — that is NOT this report.`,
  ].join("\n");

  return {
    generatedAt: new Date().toISOString(),
    mode: "offline-blocked",
    env,
    smoke,
    projectsTested: 0,
    chaptersPerProject: 0,
    longBookChapters: 0,
    overallScore: 0,
    ctoVerdict: "BLOCKED: Live API benchmark not executed. Simulation ≠ reality.",
    wouldAuthorsPreferScriptora: false,
    measurablySuperiorLongForm: false,
    vsChatGPT: { wins: 0, losses: 0, ties: 0, winRate: 0, avgMargin: 0, verdict: "Not run" },
    vsClaude: { wins: 0, losses: 0, ties: 0, winRate: 0, avgMargin: 0, verdict: "Not run" },
    winLossByGenre: [],
    longBook: [],
    authorIdentity: {
      scriptoraAntoninoVoice: 0,
      scriptoraLiviaVoice: 0,
      chatgptGenericVoice: 0,
      claudeGenericVoice: 0,
      scriptoraPreservesIdentity: false,
      competitorsGeneric: false,
      passed: false,
      issues: ["Live run required"],
    },
    chapterDoctor: {
      editorWouldChooseImproved: false,
      voicePreserved: false,
      deltaBelievable: false,
      hookImproved: false,
      passed: false,
      beforeComposite: 0,
      afterComposite: 0,
      delta: 0,
      scriptoraDoctorChosen: false,
      claudeRevisionChosen: false,
      competitorBaseline: "chatgpt",
    },
    strongestMoat: [],
    weakestAreas: ["Live validation not executed"],
    failurePoints: [reason],
    blindResults: [],
    markdown,
  };
}

function formatMarkdown(data: {
  generatedAt: string;
  mode: "live";
  env: LiveBenchmarkEnvStatus;
  smoke: boolean;
  projectsTested: number;
  chaptersPerProject: number;
  longBookChapters: number;
  overallScore: number;
  ctoVerdict: string;
  wouldAuthorsPreferScriptora: boolean;
  measurablySuperiorLongForm: boolean;
  vsChatGPT: RealAuthorPassReport["vsChatGPT"];
  vsClaude: RealAuthorPassReport["vsClaude"];
  winLossByGenre: RealAuthorPassReport["winLossByGenre"];
  longBook: LiveLongBookVariantResult[];
  authorIdentity: LiveAuthorIdentityResult;
  chapterDoctor: LiveChapterDoctorResult;
  strongestMoat: string[];
  weakestAreas: string[];
  failurePoints: string[];
  blindSummary: ReturnType<typeof summarizeLiveBlindResults>;
}): string {
  const lines = [
    `# Scriptora Real Author Pass Report`,
    ``,
    `Generated: ${data.generatedAt}`,
    `Mode: **LIVE API** (Scriptora vs ChatGPT vs Claude — same prompts, blind rubric)`,
    `Scope: ${data.smoke ? "SMOKE" : "FULL"} — ${data.projectsTested} projects, ${data.chaptersPerProject} ch/project, ${data.longBookChapters} ch long-book`,
    ``,
    `## Overall Score: **${data.overallScore}/100**`,
    ``,
    `### Brutal Verdict`,
    data.ctoVerdict,
    ``,
    `| Claim | Status |`,
    `|-------|--------|`,
    `| Measurably superior long-form vs live AI | ${data.measurablySuperiorLongForm ? "✅ Supported" : "❌ Not proven"} |`,
    `| Serious authors would choose Scriptora | ${data.wouldAuthorsPreferScriptora ? "✅ Likely" : "❌ Not yet"} |`,
    ``,
    `## Win/Loss vs ChatGPT (live)`,
    `- Wins: **${data.vsChatGPT.wins}** | Losses: **${data.vsChatGPT.losses}** | Ties: **${data.vsChatGPT.ties}**`,
    `- Blind winner rate: **${data.vsChatGPT.winRate}%**`,
    `- Avg composite margin: **${data.vsChatGPT.avgMargin >= 0 ? "+" : ""}${data.vsChatGPT.avgMargin}**`,
    `- ${data.vsChatGPT.verdict}`,
    ``,
    `## Win/Loss vs Claude (live)`,
    `- Wins: **${data.vsClaude.wins}** | Losses: **${data.vsClaude.losses}** | Ties: **${data.vsClaude.ties}**`,
    `- Avg composite margin: **${data.vsClaude.avgMargin >= 0 ? "+" : ""}${data.vsClaude.avgMargin}**`,
    `- Claude beats Scriptora on: **${data.blindSummary.claudeBeatsScriptoraCount}** projects`,
    `- ${data.vsClaude.verdict}`,
    ``,
    `## Win/Loss by Genre`,
    ...data.winLossByGenre.map(
      g => `- **${g.category}**: ${g.scriptoraWins}/${g.total} wins, avg margin vs ChatGPT ${g.avgMarginVsChatGPT >= 0 ? "+" : ""}${g.avgMarginVsChatGPT}`,
    ),
    ``,
    `## Long-Book Survival (${data.longBookChapters} chapters)`,
    ...data.longBook.map(
      l =>
        `- **${l.variant}**: survived=${l.survived}, collapsed after ch15=${l.collapsedAfterChapter15}, checkpoints=${l.checkpoints.map(c => `ch${c.chapter}:${c.driftScore}`).join(", ")}`,
    ),
    ``,
    `## Author Identity (Antonino / Livia)`,
    `- Scriptora Antonino voice: **${data.authorIdentity.scriptoraAntoninoVoice}**`,
    `- Scriptora Livia voice: **${data.authorIdentity.scriptoraLiviaVoice}**`,
    `- ChatGPT generic: **${data.authorIdentity.chatgptGenericVoice}**`,
    `- Claude generic: **${data.authorIdentity.claudeGenericVoice}**`,
    `- Passed: **${data.authorIdentity.passed}**`,
    ``,
    `## Chapter Doctor Blind`,
    `- Editor would choose Scriptora revision: **${data.chapterDoctor.editorWouldChooseImproved}**`,
    `- Voice preserved: **${data.chapterDoctor.voicePreserved}**`,
    `- vs Claude revision: Scriptora chosen **${data.chapterDoctor.scriptoraDoctorChosen}**, Claude chosen **${data.chapterDoctor.claudeRevisionChosen}**`,
    ``,
    `## Strongest Moat`,
    ...(data.strongestMoat.length ? data.strongestMoat.map(m => `- ${m}`) : ["- None identified"]),
    ``,
    `## Weakest Areas`,
    ...(data.weakestAreas.length ? data.weakestAreas.map(w => `- ${w}`) : ["- None flagged"]),
    ``,
  ];

  if (data.failurePoints.length) {
    lines.push(`## Failure Points`, ``);
    for (const f of data.failurePoints) lines.push(`- ${f}`);
    lines.push(``);
  }

  lines.push(
    `## Methodology (fair comparison)`,
    `- Same user prompt for all three models`,
    `- Scriptora = DeepSeek + full editorial/intelligence stack`,
    `- ChatGPT / Claude = neutral author system prompt only`,
    `- No per-model prompt optimization`,
    `- Blind rubric: human feel, emotional realism, engagement, continuity, genre, commercial strength, voice`,
    `- Cached outputs: \`benchmark-logs/live-api-cache/\``,
  );

  return lines.join("\n");
}
