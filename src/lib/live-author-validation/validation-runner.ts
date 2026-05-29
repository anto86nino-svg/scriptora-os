import { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
import {
  FIXTURE_CHAPTER_DOCTOR_AFTER,
  FIXTURE_CHAPTER_DOCTOR_BEFORE,
} from "@/lib/intelligence-stabilization/fixtures/benchmark-corpus";
import { buildRealWorldBenchmarkCorpus } from "./corpus/real-world-projects";
import { runBlindComparison, summarizeBlindResults } from "./blind-compare";
import {
  runAuthorIdentityValidation,
  runChapterDoctorBlindValidation,
  runLongBookStressTest,
} from "./long-book-stress";
import { buildLiveValidationReport, type LiveValidationReport } from "./live-validation-report";

export interface LiveValidationRunResult {
  report: LiveValidationReport;
  markdown: string;
}

export function runLiveAuthorValidation(options?: { longBookChapters?: number }): LiveValidationRunResult {
  const corpus = buildRealWorldBenchmarkCorpus();
  const blindResults = corpus.map((project, i) => runBlindComparison(project, i));
  const blindSummary = summarizeBlindResults(blindResults);

  const longBook = runLongBookStressTest(options?.longBookChapters ?? 28);
  const authorIdentity = runAuthorIdentityValidation();

  const doctorReport = computeDevelopmentalEditReport({
    originalText: FIXTURE_CHAPTER_DOCTOR_BEFORE,
    patchedText: FIXTURE_CHAPTER_DOCTOR_AFTER,
    patches: [
      {
        idx: 0,
        original: FIXTURE_CHAPTER_DOCTOR_BEFORE,
        patched: FIXTURE_CHAPTER_DOCTOR_AFTER,
        type: "intensify",
        reason: "Reduced emotional exposition; preserved hesitation",
      },
    ],
    modificationPercent: 12,
    genre: "romance",
    chapterIndex: 4,
  });
  const chapterDoctor = runChapterDoctorBlindValidation(
    FIXTURE_CHAPTER_DOCTOR_BEFORE,
    FIXTURE_CHAPTER_DOCTOR_AFTER,
    doctorReport,
  );

  const categoryStats = new Map<string, { wins: number; total: number; margins: number[] }>();
  for (const result of blindResults) {
    const stat = categoryStats.get(result.category) || { wins: 0, total: 0, margins: [] };
    stat.total += 1;
    if (result.winner === "scriptora") stat.wins += 1;
    stat.margins.push(result.marginVsGeneric);
    categoryStats.set(result.category, stat);
  }

  const report = buildLiveValidationReport({
    blindResults,
    blindSummary,
    longBook,
    authorIdentity,
    chapterDoctor,
    categoryStats,
    corpusSize: corpus.length,
  });

  return { report, markdown: report.markdown };
}
