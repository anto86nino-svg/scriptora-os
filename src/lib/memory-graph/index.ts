export * from "./types";
export * from "./memory-graph";
export * from "./graph-builder";
export * from "./graph-updater";
export * from "./graph-validator";
export * from "./graph-recovery";
export * from "./graph-snapshots";
export { computeStoryDebt } from "./selectors/story-debt";
export { buildWriterMemoryContextBlock, selectOpenPromises, selectActiveCharacters } from "./selectors/writer-context";
export { adaptProjectToMemoryGraph, adaptForgeToMemoryGraph, adaptUnifiedToMemoryGraph } from "./adapters/from-project";

import { runPreChapterMemoryCheck } from "./graph-recovery";
import { updateMemoryGraphAfterChapter, refreshProjectMemoryGraph } from "./graph-updater";
import { CanonDriftAnalyzer } from "./graph-validator";

export const MemoryGraphEngine = {
  preChapterCheck: runPreChapterMemoryCheck,
  postChapterUpdate: updateMemoryGraphAfterChapter,
  refreshProject: refreshProjectMemoryGraph,
  canonDrift: CanonDriftAnalyzer,
};
