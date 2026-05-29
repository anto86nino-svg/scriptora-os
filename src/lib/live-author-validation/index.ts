export { buildRealWorldBenchmarkCorpus, REAL_WORLD_BENCHMARK_STATS } from "./corpus/real-world-projects";
export type { RealWorldProject } from "./corpus/real-world-projects";

export { scoreEditorialRubric, RUBRIC_DIMENSION_LABELS, compareRubricScores } from "./rubric";
export type { RubricScores, RubricDimension } from "./rubric";

export { runBlindComparison, summarizeBlindResults } from "./blind-compare";
export type { BlindComparisonResult, BlindSample } from "./blind-compare";

export {
  runLongBookStressTest,
  runAuthorIdentityValidation,
  runChapterDoctorBlindValidation,
} from "./long-book-stress";
export type {
  LongBookStressResult,
  AuthorIdentityValidationResult,
  ChapterDoctorBlindResult,
} from "./long-book-stress";

export { runLiveAuthorValidation } from "./validation-runner";
export type { LiveValidationRunResult } from "./validation-runner";

export { buildLiveValidationReport } from "./live-validation-report";
export type { LiveValidationReport } from "./live-validation-report";

export const LIVE_AUTHOR_VALIDATION_V1 = "scriptora-live-author-validation-v1";
