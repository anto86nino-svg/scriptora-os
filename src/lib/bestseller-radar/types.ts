export type BestsellerRadarScore = {
  overall: number;
  hookStrength: number;
  titlePower: number;
  marketFit: number;
  genreClarity: number;
  readerPromise: number;
  bingeability: number;
  emotionalPull: number;
  kdpPositioning: number;
  booktokPotential: number;
  competitionRisk: number;
  publishReadiness: number;
};

export type RadarConfidence = "low" | "medium" | "high";
export type RadarDataMode = "project-based" | "analysis-based" | "estimated" | "demo" | "unavailable";
export type RadarStatus = "idle" | "scanning" | "done" | "error";

export type BestsellerActionTarget =
  | "title-domination"
  | "kdp-launch"
  | "blueprint"
  | "cover-studio"
  | "editor"
  | "export";

export type BestsellerAction = {
  priority: "high" | "medium" | "low";
  title: string;
  reason: string;
  targetModule: BestsellerActionTarget;
  ctaLabel: string;
};

export type BestsellerRadarSnapshot = {
  id: string;
  projectId: string;
  createdAt: string;
  score: BestsellerRadarScore;
  confidence: RadarConfidence;
  mode: RadarDataMode;
  verdict: string;
  strengths: string[];
  risks: string[];
  growthLevers: string[];
  actions: BestsellerAction[];
  missingData: string[];
  scanLog: string[];
};

export type RadarMapRow = {
  key: keyof BestsellerRadarScore | "overall";
  label: string;
  score: number;
};

export type BestsellerRadarResult = BestsellerRadarSnapshot & {
  map: RadarMapRow[];
  delta?: number | null;
  previousOverall?: number | null;
};
