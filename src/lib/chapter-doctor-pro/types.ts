export type SurgicalInterventionId =
  | "hook-strengthening"
  | "dialogue-roughening"
  | "emotional-compression"
  | "subtext-injection"
  | "tension-preservation"
  | "pacing-compression"
  | "cliffhanger-optimization"
  | "genre-specific";

export interface SurgicalInterventionPlan {
  id: SurgicalInterventionId;
  label: string;
  priority: "high" | "medium" | "low";
  directive: string;
  detectedReason: string;
}

export interface PatchRecord {
  idx: number;
  original: string;
  patched: string;
  type: string;
  reason: string;
}

export interface EditorialMetricRow {
  id: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  pctChange: number | null;
}

export interface AppliedIntervention {
  id: SurgicalInterventionId;
  label: string;
  summary: string;
  explanation: string;
  patchCount: number;
}

export type DeltaPresentationMode = "visible" | "refinement" | "minimal";

export interface DevelopmentalEditReport {
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
  deltaMode: DeltaPresentationMode;
  metrics: EditorialMetricRow[];
  heroHighlights: EditorialMetricRow[];
  interventions: AppliedIntervention[];
  explanations: string[];
  modificationSummary: string;
}

export interface DevelopmentalEditInput {
  originalText: string;
  patchedText: string;
  patches: PatchRecord[];
  modificationPercent: number;
  genre?: string;
  chapterIndex: number;
  totalChapters?: number;
  chapterTitle?: string;
  bookIntelligence?: {
    layers?: {
      writingBrainId?: string;
      domain?: string;
      bestsellerMode?: string;
    };
  };
}
