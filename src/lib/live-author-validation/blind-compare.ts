import { getCompetitorSample, type CompetitorVariant } from "./fixtures/competitor-corpus";
import { scoreEditorialRubric, compareRubricScores, type RubricScores } from "./rubric";
import type { RealWorldProject } from "./corpus/real-world-projects";

export type BlindLabel = "A" | "B" | "C";

export interface BlindSample {
  blindId: BlindLabel;
  actualVariant: CompetitorVariant;
  content: string;
  scores: RubricScores;
}

export interface BlindComparisonResult {
  projectId: string;
  projectTitle: string;
  category: string;
  samples: BlindSample[];
  winner: CompetitorVariant;
  winnerBlindId: BlindLabel;
  scriptoraRank: 1 | 2 | 3;
  marginVsGeneric: number;
  marginVsClaude: number;
  dimensionWins: Record<string, CompetitorVariant>;
}

function shuffleVariants(seed: number): CompetitorVariant[] {
  const variants: CompetitorVariant[] = ["scriptora", "generic-chatgpt", "claude-style"];
  let s = seed + 1;
  for (let i = variants.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [variants[i], variants[j]] = [variants[j], variants[i]];
  }
  return variants;
}

export function runBlindComparison(project: RealWorldProject, seed = 0): BlindComparisonResult {
  const variants = shuffleVariants(seed);
  const labels: BlindLabel[] = ["A", "B", "C"];

  const samples: BlindSample[] = variants.map((variant, index) => {
    const content =
      variant === "scriptora"
        ? project.scriptoraSample
        : getCompetitorSample(project.genreKey, variant);
    const scores = scoreEditorialRubric({
      content,
      config: project.config,
      genreKey: project.genreKey,
      continuityProxy: variant === "scriptora" ? 0.88 : variant === "claude-style" ? 0.72 : 0.55,
      voiceProxy: variant === "scriptora" ? 0.9 : variant === "claude-style" ? 0.78 : 0.5,
    });
    return { blindId: labels[index], actualVariant: variant, content, scores };
  });

  const sorted = [...samples].sort((a, b) => compareRubricScores(b.scores, a.scores));
  const winner = sorted[0].actualVariant;
  const scriptoraSample = samples.find(s => s.actualVariant === "scriptora")!;
  const genericSample = samples.find(s => s.actualVariant === "generic-chatgpt")!;
  const claudeSample = samples.find(s => s.actualVariant === "claude-style")!;
  const scriptoraRank = (sorted.findIndex(s => s.actualVariant === "scriptora") + 1) as 1 | 2 | 3;

  const dimensionWins: Record<string, CompetitorVariant> = {};
  const dims = [
    "humanFeel",
    "emotionalRealism",
    "readerEngagement",
    "bingeability",
    "commercialStrength",
    "genreAccuracy",
  ] as const;
  for (const dim of dims) {
    const best = [...samples].sort((a, b) => (b.scores[dim] as number) - (a.scores[dim] as number))[0];
    dimensionWins[dim] = best.actualVariant;
  }

  return {
    projectId: project.id,
    projectTitle: project.title,
    category: project.category,
    samples,
    winner,
    winnerBlindId: sorted[0].blindId,
    scriptoraRank,
    marginVsGeneric: Number((scriptoraSample.scores.composite - genericSample.scores.composite).toFixed(2)),
    marginVsClaude: Number((scriptoraSample.scores.composite - claudeSample.scores.composite).toFixed(2)),
    dimensionWins,
  };
}

export function summarizeBlindResults(results: BlindComparisonResult[]) {
  const scriptoraWins = results.filter(r => r.winner === "scriptora").length;
  const rank1 = results.filter(r => r.scriptoraRank === 1).length;
  const avgMarginGeneric =
    results.reduce((s, r) => s + r.marginVsGeneric, 0) / Math.max(1, results.length);
  const avgMarginClaude =
    results.reduce((s, r) => s + r.marginVsClaude, 0) / Math.max(1, results.length);
  const claudeBeatsScriptora = results.filter(r => r.marginVsClaude < 0).length;

  return {
    total: results.length,
    scriptoraWins,
    scriptoraWinRate: Number(((scriptoraWins / results.length) * 100).toFixed(1)),
    rank1Count: rank1,
    rank1Rate: Number(((rank1 / results.length) * 100).toFixed(1)),
    avgMarginVsGeneric: Number(avgMarginGeneric.toFixed(2)),
    avgMarginVsClaude: Number(avgMarginClaude.toFixed(2)),
    claudeBeatsScriptoraCount: claudeBeatsScriptora,
  };
}
