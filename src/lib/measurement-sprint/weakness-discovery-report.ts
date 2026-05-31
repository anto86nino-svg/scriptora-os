import type {
  BestsellerComparisonRow,
  BlindTestSummary,
  EditorialExpertRow,
  GenreStressResult,
  MeasurementSprintReport,
  ReaderRetentionRow,
  RealBookBenchmarkRow,
  WeaknessEntry,
  WeaknessSeverity,
} from "./types";
import { MEASUREMENT_THRESHOLDS } from "./types";

function sev(gap: number, critical = false): WeaknessSeverity {
  if (critical || gap >= 15) return "critical";
  if (gap >= 8) return "high";
  return "medium";
}

function pushWeakness(
  list: WeaknessEntry[],
  input: Omit<WeaknessEntry, "id" | "gap"> & { gap?: number },
): void {
  const gap = input.gap ?? Math.max(0, input.threshold - input.value);
  if (gap <= 0 && input.severity !== "critical") return;
  list.push({
    ...input,
    id: `w-${list.length + 1}`,
    gap: Number(gap.toFixed(1)),
  });
}

export function buildWeaknessDiscoveryReport(input: {
  realBook: RealBookBenchmarkRow[];
  blind: BlindTestSummary;
  bestseller: BestsellerComparisonRow[];
  retention: ReaderRetentionRow[];
  expert: EditorialExpertRow[];
  genreStress: GenreStressResult[];
}): { weaknesses: WeaknessEntry[]; summary: MeasurementSprintReport["weaknessSummary"] } {
  const weaknesses: WeaknessEntry[] = [];

  for (const row of input.realBook) {
    if (row.supremeComposite < MEASUREMENT_THRESHOLDS.supreme) {
      pushWeakness(weaknesses, {
        pillar: "real-book-benchmark",
        genre: row.category,
        severity: sev(MEASUREMENT_THRESHOLDS.supreme - row.supremeComposite),
        metric: "supremeComposite",
        value: row.supremeComposite,
        threshold: MEASUREMENT_THRESHOLDS.supreme,
        message: `${row.title}: Supreme ${row.supremeComposite} below target ${MEASUREMENT_THRESHOLDS.supreme}`,
        fixHint: "Review pre-delivery gate failures and critical issue codes for this category.",
      });
    }
    if (row.criticalIssues > 0) {
      pushWeakness(weaknesses, {
        pillar: "real-book-benchmark",
        genre: row.category,
        severity: "critical",
        metric: "criticalIssues",
        value: row.criticalIssues,
        threshold: 0,
        gap: row.criticalIssues,
        message: `${row.title}: ${row.criticalIssues} critical issue(s) remain at delivery`,
        fixHint: "Run Chapter Doctor delta on failing dimension; check behavioral/subtext/payoff gates.",
      });
    }
    if (row.rubricComposite < MEASUREMENT_THRESHOLDS.rubricComposite) {
      pushWeakness(weaknesses, {
        pillar: "real-book-benchmark",
        genre: row.category,
        severity: sev(MEASUREMENT_THRESHOLDS.rubricComposite - row.rubricComposite),
        metric: "rubricComposite",
        value: row.rubricComposite,
        threshold: MEASUREMENT_THRESHOLDS.rubricComposite,
        message: `${row.title}: Editorial rubric ${row.rubricComposite}/10 below expert bar`,
        fixHint: "Focus on weakest rubric dimension — human feel, engagement, or commercial strength.",
      });
    }
  }

  if (input.blind.claudeBeatsScriptoraCount > 0) {
    pushWeakness(weaknesses, {
      pillar: "human-blind-test",
      severity: input.blind.claudeBeatsScriptoraCount >= 5 ? "critical" : "high",
      metric: "blindLossVsClaude",
      value: input.blind.claudeBeatsScriptoraCount,
      threshold: 0,
      gap: input.blind.claudeBeatsScriptoraCount,
      message: `Scriptora loses blind comparison to Claude-style in ${input.blind.claudeBeatsScriptoraCount}/${input.blind.total} projects`,
      fixHint: "Inspect categories in lossesByCategory; tighten voice and subtext on those genres.",
    });
  }

  for (const loss of input.blind.lossesByCategory.slice(0, 5)) {
    if (loss.marginVsClaude < 0) {
      pushWeakness(weaknesses, {
        pillar: "human-blind-test",
        genre: loss.category,
        severity: "high",
        metric: "marginVsClaude",
        value: loss.marginVsClaude,
        threshold: 0,
        gap: Math.abs(loss.marginVsClaude),
        message: `${loss.category}: blind rank #${loss.scriptoraRank}, Claude margin ${loss.marginVsClaude}`,
        fixHint: "Compare rubric dimensions where Claude wins in this category.",
      });
    }
  }

  for (const row of input.bestseller) {
    if (row.hookGapVsBest < 0) {
      pushWeakness(weaknesses, {
        pillar: "bestseller-comparison",
        genre: row.genreKey,
        severity: sev(Math.abs(row.hookGapVsBest)),
        metric: "hookStrength",
        value: row.scriptoraHook,
        threshold: Math.max(row.genericHook, row.claudeHook),
        message: `${row.genreKey}: hook ${row.scriptoraHook} trails best competitor`,
        fixHint: "Strengthen opening hook in Greatness/Masterpiece pass for this genre.",
      });
    }
    if (row.bingeGapVsBest < 0) {
      pushWeakness(weaknesses, {
        pillar: "bestseller-comparison",
        genre: row.genreKey,
        severity: sev(Math.abs(row.bingeGapVsBest)),
        metric: "bingeability",
        value: row.scriptoraBinge,
        threshold: Math.max(row.genericBinge, row.claudeBinge),
        message: `${row.genreKey}: binge pull ${row.scriptoraBinge} trails best competitor`,
        fixHint: "Improve chapter closing forward-pull; avoid tidy resolution.",
      });
    }
  }

  for (const row of input.retention.filter(r => !r.passesGate)) {
    pushWeakness(weaknesses, {
      pillar: "reader-retention",
      genre: row.genre,
      severity: row.abandonmentRisk === "high" ? "critical" : "high",
      metric: "readerRetention",
      value: row.retention,
      threshold: MEASUREMENT_THRESHOLDS.readerRetention,
      message: `${row.source}: retention ${row.retention}, curiosity ${row.curiosity}`,
      fixHint: "Reader simulation gate failed — inject curiosity hook or reduce early payoff.",
    });
  }

  for (const row of input.expert.filter(r => r.weakestScore < MEASUREMENT_THRESHOLDS.rubricDimension)) {
    pushWeakness(weaknesses, {
      pillar: "editorial-expert",
      genre: row.genre,
      severity: sev(MEASUREMENT_THRESHOLDS.rubricDimension - row.weakestScore),
      metric: row.weakestDimension,
      value: row.weakestScore,
      threshold: MEASUREMENT_THRESHOLDS.rubricDimension,
      message: `${row.source}: weakest expert dimension "${row.weakestDimension}" at ${row.weakestScore}/10`,
      fixHint: "Target micro-rewrites in the pipeline stage that maps to this rubric dimension.",
    });
  }

  for (const stress of input.genreStress) {
    if (stress.preDeliveryPassRate < 100) {
      pushWeakness(weaknesses, {
        pillar: `${stress.genre}-stress-test`,
        genre: stress.genre,
        severity: stress.preDeliveryPassRate < 50 ? "critical" : "high",
        metric: "preDeliveryPassRate",
        value: stress.preDeliveryPassRate,
        threshold: 100,
        message: `${stress.genre}: only ${stress.preDeliveryPassRate}% chapters pass pre-delivery gate`,
        fixHint: `Top stress patterns: ${stress.topWeaknesses.join("; ")}`,
      });
    }
    if (stress.chaptersFailingRetention > 0) {
      pushWeakness(weaknesses, {
        pillar: `${stress.genre}-stress-test`,
        genre: stress.genre,
        severity: "high",
        metric: "chaptersFailingRetention",
        value: stress.chaptersFailingRetention,
        threshold: 0,
        gap: stress.chaptersFailingRetention,
        message: `${stress.genre}: ${stress.chaptersFailingRetention}/${stress.chapterCount} chapters fail retention bar`,
        fixHint: "Run reader simulation rewrite loop; check boredom + curiosity pairing.",
      });
    }
  }

  weaknesses.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    return rank[a.severity] - rank[b.severity] || b.gap - a.gap;
  });

  const areaCounts = new Map<string, number>();
  for (const w of weaknesses) {
    areaCounts.set(w.metric, (areaCounts.get(w.metric) || 0) + 1);
  }
  const topAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `${k} (${v})`);

  return {
    weaknesses,
    summary: {
      critical: weaknesses.filter(w => w.severity === "critical").length,
      high: weaknesses.filter(w => w.severity === "high").length,
      medium: weaknesses.filter(w => w.severity === "medium").length,
      topAreas,
    },
  };
}

export function renderWeaknessMarkdown(
  report: Omit<MeasurementSprintReport, "markdown">,
): string {
  const lines: string[] = [
    "# Scriptora Measurement Sprint — Weakness Discovery Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "> Mode: measure only — no new features, no new scores. Fix → re-run → repeat.",
    "",
    "## Sprint pillars",
    "1. Real Book Benchmark Suite",
    "2. Human vs Scriptora Blind Test",
    "3. Bestseller Comparison Engine",
    "4. Reader Retention Validation",
    "5. Editorial Expert Validation",
    "6. Romance Stress Test",
    "7. Thriller Stress Test",
    "8. Self Help Stress Test",
    "9. Fantasy Stress Test",
    "10. Weakness Discovery Report",
    "",
    "## Weakness summary",
    "",
    `| Severity | Count |`,
    `|---|---:|`,
    `| Critical | ${report.weaknessSummary.critical} |`,
    `| High | ${report.weaknessSummary.high} |`,
    `| Medium | ${report.weaknessSummary.medium} |`,
    "",
    "**Top problem areas:** " + (report.weaknessSummary.topAreas.join(", ") || "none"),
    "",
    "## Blind test",
    "",
    `- Win rate: **${report.blindTest.scriptoraWinRate}%** (${report.blindTest.scriptoraWins}/${report.blindTest.total})`,
    `- Rank #1 rate: **${report.blindTest.rank1Rate}%**`,
    `- Claude beats Scriptora: **${report.blindTest.claudeBeatsScriptoraCount}** projects`,
    `- Avg margin vs generic: **+${report.blindTest.avgMarginVsGeneric}**`,
    `- Avg margin vs Claude: **${report.blindTest.avgMarginVsClaude >= 0 ? "+" : ""}${report.blindTest.avgMarginVsClaude}**`,
    "",
    "## Genre stress tests",
    "",
    "| Genre | Supreme avg | Greatness avg | Magic avg | Critical | Pass rate | Retention fails |",
    "|---|---:|---:|---:|---:|---:|---:|",
  ];

  for (const g of report.genreStress) {
    lines.push(
      `| ${g.genre} | ${g.avgSupreme} | ${g.avgGreatness} | ${g.avgNarrativeMagic} | ${g.totalCriticalIssues} | ${g.preDeliveryPassRate}% | ${g.chaptersFailingRetention} |`,
    );
  }

  lines.push("", "## Top weaknesses (fix first)", "");
  for (const w of report.weaknesses.slice(0, 20)) {
    lines.push(`### [${w.severity.toUpperCase()}] ${w.metric} — ${w.pillar}`);
    lines.push(`- ${w.message}`);
    lines.push(`- **Fix:** ${w.fixHint}`);
    lines.push("");
  }

  lines.push("## Real book benchmark (sample)");
  lines.push("");
  lines.push("| Project | Category | Supreme | Greatness | Magic | Critical |");
  lines.push("|---|---|---:|---:|---:|---:|");
  for (const r of report.realBookBenchmark.slice(0, 12)) {
    lines.push(
      `| ${r.title.slice(0, 30)} | ${r.category} | ${r.supremeComposite} | ${r.greatnessComposite} | ${r.narrativeMagicComposite} | ${r.criticalIssues} |`,
    );
  }

  return lines.join("\n");
}
