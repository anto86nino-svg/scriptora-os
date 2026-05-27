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
    emotionalRealism:
      edited.scores
        .emotionalRealism -
      original.scores
        .emotionalRealism,

    dialogueHumanity:
      edited.scores
        .dialogueHumanity -
      original.scores
        .dialogueHumanity,

    subtextStrength:
      edited.scores
        .subtextStrength -
      original.scores
        .subtextStrength,

    characterDepth:
      edited.scores
        .characterDepth -
      original.scores
        .characterDepth,
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
