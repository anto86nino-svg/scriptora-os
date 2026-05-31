import { runBestsellerComparisonEngine } from "./bestseller-comparison";
import { runEditorialExpertValidation } from "./editorial-expert-validation";
import {
  runAllGenreStressTests,
  runFantasyStressTest,
  runRomanceStressTest,
  runSelfHelpStressTest,
  runThrillerStressTest,
} from "./genre-stress-test";
import { runHumanVsScriptoraBlindTest } from "./human-blind-test";
import { runReaderRetentionValidation } from "./reader-retention-validation";
import { runRealBookBenchmarkSuite } from "./real-book-benchmark";
import type { MeasurementSprintReport } from "./types";
import { buildWeaknessDiscoveryReport, renderWeaknessMarkdown } from "./weakness-discovery-report";

export function runMeasurementSprint(): MeasurementSprintReport {
  const realBookBenchmark = runRealBookBenchmarkSuite();
  const blindTest = runHumanVsScriptoraBlindTest();
  const bestsellerComparison = runBestsellerComparisonEngine();
  const readerRetention = runReaderRetentionValidation();
  const editorialExpert = runEditorialExpertValidation();
  const genreStress = runAllGenreStressTests();

  const { weaknesses, summary } = buildWeaknessDiscoveryReport({
    realBook: realBookBenchmark,
    blind: blindTest,
    bestseller: bestsellerComparison,
    retention: readerRetention,
    expert: editorialExpert,
    genreStress,
  });

  const base: Omit<MeasurementSprintReport, "markdown"> = {
    version: 1,
    sprintId: "scriptora-measurement-sprint-v1",
    generatedAt: new Date().toISOString(),
    mode: "measure-only",
    realBookBenchmark,
    blindTest,
    bestsellerComparison,
    readerRetention,
    editorialExpert,
    genreStress,
    weaknesses,
    weaknessSummary: summary,
  };

  return {
    ...base,
    markdown: renderWeaknessMarkdown(base),
  };
}

export {
  runRealBookBenchmarkSuite,
  runHumanVsScriptoraBlindTest,
  runBestsellerComparisonEngine,
  runReaderRetentionValidation,
  runEditorialExpertValidation,
  runRomanceStressTest,
  runThrillerStressTest,
  runSelfHelpStressTest,
  runFantasyStressTest,
  runAllGenreStressTests,
  buildWeaknessDiscoveryReport,
};
