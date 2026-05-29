import type { CoverReadinessFactor, CoverReadinessResult, CoverReadinessTier } from "./types";
import { READINESS_TIER_LABELS } from "./constants";
import { inferCoverArtDirection } from "./art-direction";

export interface CoverReadinessInput {
  genreBrief: string;
  title: string;
  subtitle: string;
  templateName: string;
  templateDark: boolean;
  titleColor: string;
  titleScale: number;
  hasUploadedImage: boolean;
  hasArtDirection: boolean;
  frontWidthPx: number;
  frontHeightPx: number;
}

function contrastScore(dark: boolean, titleColor: string): number {
  const hex = titleColor.replace("#", "");
  if (hex.length < 6) return 12;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const contrast = dark ? luminance : 1 - luminance;
  if (contrast > 0.72) return 18;
  if (contrast > 0.55) return 14;
  if (contrast > 0.4) return 9;
  return 4;
}

function tierFromScore(score: number): CoverReadinessTier {
  if (score >= 80) return "highly-competitive";
  if (score >= 62) return "strong";
  if (score >= 42) return "developing";
  return "weak";
}

export function evaluateCoverReadiness(input: CoverReadinessInput): CoverReadinessResult {
  const source = [input.genreBrief, input.title, input.subtitle].join(" ");
  const art = inferCoverArtDirection(source);
  const factors: CoverReadinessFactor[] = [];

  // 1. Genre clarity (0-20)
  const genreSignal = art.motif !== "literary" || input.genreBrief.trim().length > 12;
  const genreScore = genreSignal
    ? Math.min(20, 10 + Math.floor(input.genreBrief.trim().length / 8))
    : Math.max(4, Math.floor(input.genreBrief.trim().length / 4));
  factors.push({
    id: "genre-clarity",
    label: "Genre clarity",
    score: genreScore,
    maxScore: 20,
    explanation: genreScore >= 14
      ? "Genre and mood signals are explicit enough for shelf positioning."
      : "Romance or thriller signal is visually unclear — add genre cues in brief or template choice.",
  });

  // 2. Thumbnail readability (0-20)
  const titleLen = input.title.trim().length;
  let thumbScore = 12;
  let thumbNote = "Title length supports thumbnail legibility.";
  if (titleLen > 42) {
    thumbScore = 6;
    thumbNote = "Title loses readability at thumbnail size — consider shortening or stacking lines.";
  } else if (titleLen > 28) {
    thumbScore = 10;
    thumbNote = "Title may compress at 120px — verify contrast and line breaks.";
  } else if (titleLen < 4) {
    thumbScore = 8;
    thumbNote = "Very short title — ensure visual weight still anchors the cover.";
  }
  if (input.titleScale < 85) {
    thumbScore -= 4;
    thumbNote = "Title scale is low — may disappear in KDP grid view.";
  }
  factors.push({
    id: "thumbnail-readability",
    label: "Thumbnail readability",
    score: Math.max(0, thumbScore),
    maxScore: 20,
    explanation: thumbNote,
  });

  // 3. Title visibility (0-20)
  const contrastPts = contrastScore(input.templateDark, input.titleColor);
  let titleVis = contrastPts + (input.titleScale >= 95 ? 4 : input.titleScale >= 85 ? 2 : 0);
  if (titleLen > 36) titleVis -= 3;
  factors.push({
    id: "title-visibility",
    label: "Title visibility",
    score: Math.min(20, Math.max(0, titleVis)),
    maxScore: 20,
    explanation: contrastPts >= 14
      ? "Title contrast supports strong front-panel hierarchy."
      : "Title contrast may fail on mobile storefront previews — lighten or darken title color.",
  });

  // 4. Emotional signal (0-20)
  let emotionalScore = 8;
  let emotionalNote = "Emotional tone is neutral — strengthen mood via template or visual direction.";
  if (input.hasUploadedImage || input.hasArtDirection) {
    emotionalScore += 6;
    emotionalNote = input.hasArtDirection
      ? `Strong emotional contrast supports ${art.label} expectations.`
      : "Custom imagery adds emotional signal — verify it matches genre promise.";
  }
  if (/dark|romance|thriller|fantasy|obsessive|tension/i.test(input.genreBrief)) {
    emotionalScore += 4;
  }
  factors.push({
    id: "emotional-signal",
    label: "Emotional signal",
    score: Math.min(20, emotionalScore),
    maxScore: 20,
    explanation: emotionalNote,
  });

  // 5. Commercial positioning (0-20)
  let commercialScore = 10;
  let commercialNote = "Commercial positioning is developing — align template with target subgenre.";
  if (input.templateName && input.genreBrief.trim().length > 6) {
    commercialScore += 5;
    commercialNote = "Template and genre brief align toward a recognizable market lane.";
  }
  if (input.subtitle.trim().length > 8) {
    commercialScore += 3;
    commercialNote = "Subtitle supports commercial promise — keep it readable below title.";
  }
  factors.push({
    id: "commercial-positioning",
    label: "Commercial positioning",
    score: Math.min(20, commercialScore),
    maxScore: 20,
    explanation: commercialNote,
  });

  const rawScore = factors.reduce((sum, f) => sum + f.score, 0);
  const score = Math.min(92, rawScore);
  const tier = tierFromScore(score);

  const summaries: Record<CoverReadinessTier, string> = {
    weak: "Cover direction needs clearer genre signaling and title contrast before launch.",
    developing: "Foundation is forming — tighten thumbnail title stack and emotional contrast.",
    strong: "Commercial cover readiness is solid — minor thumbnail checks recommended.",
    "highly-competitive": "Highly competitive shelf signal — verify thumbnail at 120px before publishing.",
  };

  return {
    score,
    tier,
    tierLabel: READINESS_TIER_LABELS[tier],
    factors,
    summary: summaries[tier],
  };
}
