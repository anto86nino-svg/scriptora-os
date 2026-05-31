import { buildRealWorldBenchmarkCorpus } from "@/lib/live-author-validation/corpus/real-world-projects";
import { runBlindComparison, summarizeBlindResults } from "@/lib/live-author-validation/blind-compare";
import type { BlindTestSummary } from "./types";

export function runHumanVsScriptoraBlindTest(): BlindTestSummary {
  const corpus = buildRealWorldBenchmarkCorpus();
  const results = corpus.map((project, i) => runBlindComparison(project, i));
  const summary = summarizeBlindResults(results);

  const lossesByCategory = results
    .filter(r => r.scriptoraRank !== 1)
    .map(r => ({
      category: r.category,
      scriptoraRank: r.scriptoraRank,
      marginVsClaude: r.marginVsClaude,
    }))
    .sort((a, b) => a.marginVsClaude - b.marginVsClaude);

  return {
    total: summary.total,
    scriptoraWins: summary.scriptoraWins,
    scriptoraWinRate: summary.scriptoraWinRate,
    rank1Rate: summary.rank1Rate,
    avgMarginVsGeneric: summary.avgMarginVsGeneric,
    avgMarginVsClaude: summary.avgMarginVsClaude,
    claudeBeatsScriptoraCount: summary.claudeBeatsScriptoraCount,
    lossesByCategory,
  };
}

export { runBlindComparison, summarizeBlindResults };
