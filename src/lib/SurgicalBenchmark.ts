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
  overeditingRisk: number;
  editorialVerdict: string;
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

  const overeditingRisk =
    calculateOvereditingRisk(
      text,
      editedResult.text
    );

  const editorialVerdict =
    getEditorialVerdict(
      improvements,
      voicePreserved
    );

  return {
    overeditingRisk,
    editorialVerdict,
    originalScores:
      original.scores,

    editedScores:
      edited.scores,

    improvements,

    voicePreserved,
  };
}

type EditorialVerdict =
  | "major_improvement"
  | "minor_improvement"
  | "neutral"
  | "overedited";

function getEditorialVerdict(
  improvements: Record<
    string,
    number
  >,
  voicePreserved: boolean
): EditorialVerdict {
  const totalImprovement =
    Object.values(
      improvements
    ).reduce(
      (sum, value) =>
        sum + value,
      0
    );

  if (!voicePreserved) {
    return "overedited";
  }

  if (totalImprovement >= 20) {
    return "major_improvement";
  }

  if (totalImprovement >= 8) {
    return "minor_improvement";
  }

  if (totalImprovement < 0) {
    return "overedited";
  }

  return "neutral";
}

function calculateOvereditingRisk(
  original: string,
  edited: string
): number {
  const ratio =
    edited.length /
    Math.max(
      original.length,
      1
    );

  const distance =
    Math.abs(1 - ratio);

  return Math.min(
    Math.round(distance * 100),
    100
  );
}
