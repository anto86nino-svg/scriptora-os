import type { Chapter } from "@/types/book";
import { generateValidationCorpus } from "@/lib/editorial-validation-suite/corpus-generator";
import { evaluateOrchestratorChapter } from "@/lib/editorial-validation-suite/orchestrator-pipeline";
import { buildRealWorldBenchmarkCorpus } from "@/lib/live-author-validation/corpus/real-world-projects";
import { simulateReaderInLoop } from "@/lib/reader-simulation";
import { runScriptoraPipeline } from "./helpers";
import type { ReaderRetentionRow } from "./types";

export function runReaderRetentionValidation(): ReaderRetentionRow[] {
  const rows: ReaderRetentionRow[] = [];

  for (const project of buildRealWorldBenchmarkCorpus()) {
    const { content } = runScriptoraPipeline({
      content: project.scriptoraSample,
      config: project.config,
      chapterIndex: 2,
    });
    const reader = simulateReaderInLoop({
      content,
      chapterIndex: 2,
      config: project.config as any,
      totalChapters: project.chapterCount,
    });
    rows.push({
      source: project.id,
      genre: project.category,
      curiosity: reader.curiosity,
      retention: reader.retention,
      wouldContinue: reader.wouldContinue,
      abandonmentRisk: reader.abandonmentRisk,
      passesGate: reader.passesGate,
    });
  }

  const genres = ["romance", "thriller", "fantasy", "self-help"] as const;
  for (const genre of genres) {
    const corpus = generateValidationCorpus().filter(c => c.genre === genre);
    const previous: Chapter[] = [];
    for (const item of corpus.slice(0, 5)) {
      const { deliveredChapter, metrics } = evaluateOrchestratorChapter({
        genre: item.genre,
        chapterIndex: item.chapterIndex,
        title: item.title,
        rawContent: item.content,
        previousChapters: [...previous],
      });
      previous.push(deliveredChapter);
      rows.push({
        source: `stress-${genre}-ch${item.chapterIndex + 1}`,
        genre,
        curiosity: metrics.readerCuriosity,
        retention: metrics.readerRetention,
        wouldContinue: metrics.readerRetention >= 50,
        abandonmentRisk: metrics.readerRetention < 45 ? "high" : metrics.readerRetention < 55 ? "medium" : "low",
        passesGate: metrics.readerRetention >= 50 && metrics.readerCuriosity >= 42,
      });
    }
  }

  return rows;
}
