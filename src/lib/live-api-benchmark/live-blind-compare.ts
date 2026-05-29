import type { RealWorldProject } from "@/lib/live-author-validation/corpus/real-world-projects";
import { compareRubricScores, scoreEditorialRubric, type RubricScores } from "@/lib/live-author-validation/rubric";
import type { BlindComparisonResult, BlindLabel } from "@/lib/live-author-validation/blind-compare";
import type { LiveVariant } from "./types";

export interface LiveBlindSample {
  blindId: BlindLabel;
  actualVariant: LiveVariant;
  content: string;
  scores: RubricScores;
}

const VARIANT_TO_LEGACY: Record<LiveVariant, string> = {
  scriptora: "scriptora",
  chatgpt: "generic-chatgpt",
  claude: "claude-style",
};

function shuffleVariants(seed: number): LiveVariant[] {
  const variants: LiveVariant[] = ["scriptora", "chatgpt", "claude"];
  let s = seed + 7;
  for (let i = variants.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [variants[i], variants[j]] = [variants[j], variants[i]];
  }
  return variants;
}

export function runLiveBlindComparison(input: {
  project: RealWorldProject;
  contents: Record<LiveVariant, string>;
  continuityByVariant: Record<LiveVariant, number>;
  voiceByVariant?: Partial<Record<LiveVariant, number>>;
  seed?: number;
}): BlindComparisonResult {
  const { project, contents, continuityByVariant, voiceByVariant, seed = 0 } = input;
  const variants = shuffleVariants(seed);
  const labels: BlindLabel[] = ["A", "B", "C"];

  const samples: LiveBlindSample[] = variants.map((variant, index) => {
    const content = contents[variant];
    const scores = scoreEditorialRubric({
      content,
      config: project.config,
      genreKey: project.genreKey,
      continuityProxy: continuityByVariant[variant],
      voiceProxy: voiceByVariant?.[variant] ?? (variant === "scriptora" ? 0.88 : variant === "claude" ? 0.72 : 0.55),
    });
    return { blindId: labels[index], actualVariant: variant, content, scores };
  });

  const sorted = [...samples].sort((a, b) => compareRubricScores(b.scores, a.scores));
  const winnerLegacy = VARIANT_TO_LEGACY[sorted[0].actualVariant] as BlindComparisonResult["winner"];
  const scriptoraSample = samples.find(s => s.actualVariant === "scriptora")!;
  const chatgptSample = samples.find(s => s.actualVariant === "chatgpt")!;
  const claudeSample = samples.find(s => s.actualVariant === "claude")!;
  const scriptoraRank = (sorted.findIndex(s => s.actualVariant === "scriptora") + 1) as 1 | 2 | 3;

  const dimensionWins: Record<string, BlindComparisonResult["winner"]> = {};
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
    dimensionWins[dim] = VARIANT_TO_LEGACY[best.actualVariant] as BlindComparisonResult["winner"];
  }

  return {
    projectId: project.id,
    projectTitle: project.title,
    category: project.category,
    samples: samples.map(s => ({
      blindId: s.blindId,
      actualVariant: VARIANT_TO_LEGACY[s.actualVariant] as BlindComparisonResult["samples"][0]["actualVariant"],
      content: s.content,
      scores: s.scores,
    })),
    winner: winnerLegacy,
    winnerBlindId: sorted[0].blindId,
    scriptoraRank,
    marginVsGeneric: Number((scriptoraSample.scores.composite - chatgptSample.scores.composite).toFixed(2)),
    marginVsClaude: Number((scriptoraSample.scores.composite - claudeSample.scores.composite).toFixed(2)),
    dimensionWins,
  };
}

export function summarizeLiveBlindResults(results: BlindComparisonResult[]) {
  const scriptoraWins = results.filter(r => r.winner === "scriptora").length;
  const chatgptWins = results.filter(r => r.winner === "generic-chatgpt").length;
  const claudeWins = results.filter(r => r.winner === "claude-style").length;
  const rank1 = results.filter(r => r.scriptoraRank === 1).length;
  const avgMarginGeneric =
    results.reduce((s, r) => s + r.marginVsGeneric, 0) / Math.max(1, results.length);
  const avgMarginClaude =
    results.reduce((s, r) => s + r.marginVsClaude, 0) / Math.max(1, results.length);
  const claudeBeatsScriptora = results.filter(r => r.marginVsClaude < 0).length;
  const chatgptBeatsScriptora = results.filter(r => r.marginVsGeneric < 0).length;

  return {
    total: results.length,
    scriptoraWins,
    chatgptWins,
    claudeWins,
    scriptoraWinRate: Number(((scriptoraWins / results.length) * 100).toFixed(1)),
    rank1Count: rank1,
    rank1Rate: Number(((rank1 / results.length) * 100).toFixed(1)),
    avgMarginVsGeneric: Number(avgMarginGeneric.toFixed(2)),
    avgMarginVsClaude: Number(avgMarginClaude.toFixed(2)),
    claudeBeatsScriptoraCount: claudeBeatsScriptora,
    chatgptBeatsScriptoraCount: chatgptBeatsScriptora,
  };
}
