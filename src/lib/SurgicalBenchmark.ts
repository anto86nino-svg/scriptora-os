import {
  analyzeNovel,
} from "./EditorialIntelligence";

import {
  applySurgicalEditingFromWarnings,
} from "./SurgicalEditEngine";

export interface SurgicalBenchmark {
  originalScores: Record<string, number>;
  editedScores: Record<string, number>;
  improvements: Record<string, number>;
  voicePreserved: boolean;
}

export function benchmarkSurgicalEdit(
  text: string
): SurgicalBenchmark {
  const original =
    analyzeNovel(text);

  const editedResult =
    applySurgicalEditingFromWarnings(
      text
    );

  const edited =
    analyzeNovel(
      editedResult.text
    );

  const improvements = {
    emotionalRealismScore:
      edited.scores
        .emotionalRealismScore -
      original.scores
        .emotionalRealismScore,

    dialogueHumanityScore:
      edited.scores
        .dialogueHumanityScore -
      original.scores
        .dialogueHumanityScore,

    subtextStrengthScore:
      edited.scores
        .subtextStrengthScore -
      original.scores
        .subtextStrengthScore,

    characterDepthScore:
      edited.scores
        .characterDepthScore -
      original.scores
        .characterDepthScore,
  };

  const voicePreserved =
    editedResult.text.length >
    text.length * 0.7;

  return {
    originalScores:
      original.scores,

    editedScores:
      edited.scores,

    improvements,

    voicePreserved,
  };
}
