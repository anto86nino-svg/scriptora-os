import type { AudiobookAdaptationPrep } from "./types";

export interface AudiobookPrepInput {
  frontWidthPx: number;
  frontHeightPx: number;
  title: string;
  titleScale: number;
}

/** Foundation metadata for future audiobook cover adaptation — no export yet */
export function prepareAudiobookAdaptation(input: AudiobookPrepInput): AudiobookAdaptationPrep {
  const { frontWidthPx, frontHeightPx, title, titleScale } = input;
  const size = Math.min(frontWidthPx, frontHeightPx);
  const x = Math.round((frontWidthPx - size) / 2);
  const y = Math.round((frontHeightPx - size) / 2);

  const titleLen = title.trim().length;
  const titleHeavy = titleLen > 28 || titleScale > 105;

  return {
    squareSafeCrop: {
      x,
      y,
      size,
      note: "Center square crop preserves title stack for future audiobook square assets.",
    },
    titleSafeZone: {
      topPct: 18,
      bottomPct: titleHeavy ? 38 : 32,
      sidePct: 12,
      note: "Keep title and author inside this band for cross-format reuse.",
    },
    typographySpacingSafe: titleHeavy
      ? "Title is long or large — reserve extra lower margin for square crop."
      : "Current title stack fits standard audiobook safe zones.",
    ready: Boolean(title.trim()) && frontWidthPx > 0 && frontHeightPx > 0,
  };
}
