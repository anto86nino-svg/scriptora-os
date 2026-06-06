export type RadarPublishingIntel = {
  positioning: string;
  opportunity: string;
  risk: string;
  recommendation: string;
  commercialScore: number;
};

type Input = {
  genre: string;
  keyword?: string;
  marketScore?: number | null;
  avgPotential?: number | null;
  authorIdentity?: {
    authorName?: string;
  } | null;
};

export function analyzeRadarPublishingIntel(
  input: Input
): RadarPublishingIntel {
  const score =
    typeof input.marketScore === "number"
      ? input.marketScore
      : typeof input.avgPotential === "number"
      ? input.avgPotential
      : 7.0;

  const genre = input.genre || "general";
  const keyword = input.keyword || genre;

  return {
    positioning: `Strong opportunity in ${genre} around "${keyword}".`,
    opportunity:
      score >= 8
        ? "High commercial momentum detected."
        : "Moderate opportunity with positioning space.",
    risk:
      score >= 8
        ? "Competition may be high."
        : "Requires stronger differentiation.",
    recommendation:
      "Focus on hook strength, emotional promise and market clarity.",
    commercialScore: Number(score.toFixed(1)),
  };
}
