import { scoreEditorialRubric, RUBRIC_DIMENSION_LABELS, type RubricDimension } from "@/lib/live-author-validation/rubric";
import { generateValidationCorpus } from "@/lib/editorial-validation-suite/corpus-generator";
import { evaluateOrchestratorChapter } from "@/lib/editorial-validation-suite/orchestrator-pipeline";
import { genreConfig } from "@/lib/editorial-validation-suite/helpers";
import { buildRealWorldBenchmarkCorpus } from "@/lib/live-author-validation/corpus/real-world-projects";
import type { CorpusGenreKey } from "@/lib/live-author-validation/fixtures/competitor-corpus";
import type { Chapter } from "@/types/book";
import { runScriptoraPipeline, mapGenreKey } from "./helpers";
import type { EditorialExpertRow } from "./types";

function mapValidationGenre(genre: string): CorpusGenreKey {
  if (genre === "self-help") return "selfHelp";
  return mapGenreKey(genre);
}

function weakestRubricDimension(scores: Record<string, number>): { dim: string; score: number } {
  const dims = Object.entries(RUBRIC_DIMENSION_LABELS) as Array<[RubricDimension, string]>;
  let weakest = { dim: dims[0][1], score: 10 };
  for (const [key, label] of dims) {
    const val = scores[key] as number;
    if (val < weakest.score) weakest = { dim: label, score: val };
  }
  return weakest;
}

export function runEditorialExpertValidation(): EditorialExpertRow[] {
  const rows: EditorialExpertRow[] = [];

  for (const project of buildRealWorldBenchmarkCorpus()) {
    const { metrics } = runScriptoraPipeline({
      content: project.scriptoraSample,
      config: project.config,
      chapterIndex: 2,
    });
    const weakest = weakestRubricDimension(metrics.rubric as unknown as Record<string, number>);
    rows.push({
      source: project.id,
      genre: project.category,
      rubricComposite: metrics.rubric.composite,
      weakestDimension: weakest.dim,
      weakestScore: weakest.score,
      tier: metrics.rubric.tier,
    });
  }

  const genres = ["romance", "thriller", "fantasy", "self-help"] as const;
  for (const genre of genres) {
    const corpus = generateValidationCorpus().filter(c => c.genre === genre);
    const previous: Chapter[] = [];
    for (const item of corpus) {
      const { metrics, deliveredChapter } = evaluateOrchestratorChapter({
        genre: item.genre,
        chapterIndex: item.chapterIndex,
        title: item.title,
        rawContent: item.content,
        previousChapters: [...previous],
      });
      previous.push(deliveredChapter);
      const config = genreConfig(genre);
      const rubric = scoreEditorialRubric({
        content: deliveredChapter.content,
        config,
        genreKey: mapValidationGenre(genre),
        chapterIndex: item.chapterIndex,
        continuityProxy: metrics.narrativeMemoryHealth / 100,
      });
      const weakest = weakestRubricDimension(rubric as unknown as Record<string, number>);
      rows.push({
        source: `${genre}-ch${item.chapterIndex + 1}`,
        genre,
        rubricComposite: rubric.composite,
        weakestDimension: weakest.dim,
        weakestScore: weakest.score,
        tier: metrics.passesPreDelivery ? "strong" : "developing",
      });
    }
  }

  return rows;
}
