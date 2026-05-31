import type { BookConfig, Chapter } from "@/types/book";
import type { EditorialIntentSheet } from "@/lib/editorial-orchestrator/types";
import { applyMasterpieceMicroElevations, reviewMasterpiece } from "./masterpiece-reviewer";
import { buildMasterpieceAnalysis, computeNarrativeMagicScore } from "./narrative-magic-score";
import { runMultiDraftSelection } from "./multi-draft-engine";
import { runSceneCompetition } from "./scene-competition";
import type { MasterpiecePassResult } from "./types";
import { MASTERPIECE_MAGIC_FLOOR } from "./types";

export function runMasterpiecePass(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
  totalChapters: number;
  intent?: EditorialIntentSheet;
  previousChapters?: Chapter[];
}): MasterpiecePassResult {
  const beforeMagic = computeNarrativeMagicScore({
    content: input.content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
  }).composite;

  const multiDraft = runMultiDraftSelection({
    content: input.content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
  });

  const sceneCompetition = runSceneCompetition({
    content: multiDraft.content,
    config: input.config,
    chapterIndex: input.chapterIndex,
  });

  let content = sceneCompetition.content;
  let reviewer = reviewMasterpiece({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
  });

  let microElevationsApplied = 0;
  if (!reviewer.passesGate || beforeMagic < MASTERPIECE_MAGIC_FLOOR) {
    const micro = applyMasterpieceMicroElevations(content, reviewer);
    if (micro.applied > 0) {
      content = micro.content;
      microElevationsApplied = micro.applied;
      reviewer = reviewMasterpiece({
        content,
        config: input.config,
        chapterIndex: input.chapterIndex,
      });
    }
  }

  const analysis = buildMasterpieceAnalysis({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    multiDraft: multiDraft.report,
    sceneCompetition: sceneCompetition.report,
    reviewer,
  });

  const afterMagic = analysis.narrativeMagic.composite;
  const improved = afterMagic >= beforeMagic;

  return {
    content: improved ? content : input.content,
    rewritten: improved && (multiDraft.report.selected !== "A" || microElevationsApplied > 0 || sceneCompetition.report.winners.length > 0),
    selectedDraft: multiDraft.report.selected,
    microElevationsApplied,
    beforeMagic,
    afterMagic: improved ? afterMagic : beforeMagic,
    analysis: improved
      ? analysis
      : buildMasterpieceAnalysis({
          content: input.content,
          config: input.config,
          chapterIndex: input.chapterIndex,
          totalChapters: input.totalChapters,
          multiDraft: runMultiDraftSelection({ ...input, content: input.content }).report,
          sceneCompetition: runSceneCompetition({ content: input.content, config: input.config, chapterIndex: input.chapterIndex }).report,
          reviewer: reviewMasterpiece({ content: input.content, config: input.config, chapterIndex: input.chapterIndex }),
        }),
  };
}

export { runMultiDraftSelection } from "./multi-draft-engine";
export { runSceneCompetition } from "./scene-competition";
export { analyzeEmotionalImpact } from "./emotional-impact-search";
export { analyzeBookTokMoments } from "./booktok-moment-engine";
export { analyzeQuotePotential } from "./quote-detector";
export { reviewMasterpiece, applyMasterpieceMicroElevations } from "./masterpiece-reviewer";
export { computeNarrativeMagicScore, buildMasterpieceAnalysis } from "./narrative-magic-score";
