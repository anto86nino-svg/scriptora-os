import type { Chapter } from "@/types/book";
import { evaluateBaselineChapter, type ChapterEvaluationResult } from "./baseline-pipeline";
import { buildComparativeReport, buildValidationSuiteReport } from "./comparative-report";
import { generateValidationCorpus } from "./corpus-generator";
import { evaluateOrchestratorChapter } from "./orchestrator-pipeline";
import type { ChapterValidationMetrics, ComparativeValidationReport, ValidationGenre } from "./types";

function runPipelineForGenre(
  genre: ValidationGenre,
  evaluate: (input: {
    genre: ValidationGenre;
    chapterIndex: number;
    title: string;
    rawContent: string;
    previousChapters: Chapter[];
  }) => ChapterEvaluationResult,
): ChapterValidationMetrics[] {
  const corpus = generateValidationCorpus().filter(c => c.genre === genre);
  const previousChapters: Chapter[] = [];
  const results: ChapterValidationMetrics[] = [];

  for (const item of corpus) {
    const { metrics, deliveredChapter } = evaluate({
      genre: item.genre,
      chapterIndex: item.chapterIndex,
      title: item.title,
      rawContent: item.content,
      previousChapters: [...previousChapters],
    });
    results.push(metrics);
    previousChapters.push(deliveredChapter);
  }

  return results;
}

export function runScriptoraValidationSuite(): ComparativeValidationReport {
  const genres: ValidationGenre[] = ["romance", "thriller", "fantasy", "self-help"];

  const baselineChapters = genres.flatMap(g => runPipelineForGenre(g, evaluateBaselineChapter));
  const currentChapters = genres.flatMap(g => runPipelineForGenre(g, evaluateOrchestratorChapter));

  const baseline = buildValidationSuiteReport("baseline-pre-abcd", baselineChapters);
  const current = buildValidationSuiteReport("current-orchestrator", currentChapters);
  return buildComparativeReport(baseline, current);
}
