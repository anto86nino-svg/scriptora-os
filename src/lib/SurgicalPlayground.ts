import {
  benchmarkSurgicalEdit,
} from "./SurgicalBenchmark";

import {
  applySurgicalEditingFromWarnings,
} from "./SurgicalEditEngine";

export interface PlaygroundResult {
  originalText: string;
  editedText: string;
  benchmark: any;
}

export function runSurgicalPlayground(
  text: string
): PlaygroundResult {
  const edited =
    applySurgicalEditingFromWarnings(
      text
    );

  const benchmark =
    benchmarkSurgicalEdit(
      text
    );

  return {
    originalText: text,
    editedText:
      edited.text,
    benchmark,
  };
}
