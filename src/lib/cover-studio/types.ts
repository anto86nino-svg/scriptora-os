export type CoverProviderCapability = "generate" | "edit" | "upscale";

export type CoverProviderKind = "builtin" | "external";

export type CoverReadinessTier = "weak" | "developing" | "strong" | "highly-competitive";

export type CoverMotif =
  | "thriller"
  | "romance"
  | "business"
  | "fantasy"
  | "memoir"
  | "historical"
  | "scifi"
  | "literary"
  | "dark-romance"
  | "romantasy";

export interface CoverArtDirection {
  motif: CoverMotif;
  label: string;
  templateIndex: number;
  seed: number;
}

export interface CoverGenerateInput {
  prompt?: string;
  genreBrief?: string;
  title?: string;
  subtitle?: string;
  width: number;
  height: number;
  seed?: number;
}

export interface CoverEditInput {
  sourceImageDataUrl: string;
  instruction?: string;
  width: number;
  height: number;
}

export interface CoverUpscaleInput {
  sourceImageDataUrl: string;
  targetWidth: number;
  targetHeight: number;
}

export interface CoverProviderResult {
  ok: boolean;
  imageDataUrl?: string;
  artDirection?: CoverArtDirection;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface CoverProvider {
  id: string;
  label: string;
  kind: CoverProviderKind;
  available: boolean;
  capabilities: CoverProviderCapability[];
  generate(input: CoverGenerateInput): Promise<CoverProviderResult>;
  edit?(input: CoverEditInput): Promise<CoverProviderResult>;
  upscale?(input: CoverUpscaleInput): Promise<CoverProviderResult>;
}

export interface CoverDirectionSuggestions {
  genreLabel: string;
  subgenreHint?: string;
  mood: string[];
  typography: string;
  composition: string;
  palette: string[];
  positioning: string;
  bookTokIntensity?: "low" | "moderate" | "high";
  bookTokNote?: string;
}

export interface CoverReadinessFactor {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  explanation: string;
}

export interface CoverReadinessResult {
  score: number;
  tier: CoverReadinessTier;
  tierLabel: string;
  factors: CoverReadinessFactor[];
  summary: string;
}

export interface CoverTemplateFamily {
  id: string;
  label: string;
  tagline: string;
  templateIndices: number[];
  typographyGuidance: string;
  layoutDirection: string;
  emotionalPositioning: string;
  visualHierarchy: string;
  genreKeywords: string[];
}

export interface AudiobookAdaptationPrep {
  squareSafeCrop: { x: number; y: number; size: number; note: string };
  titleSafeZone: { topPct: number; bottomPct: number; sidePct: number; note: string };
  typographySpacingSafe: string;
  ready: boolean;
}

export interface CoverIntelligenceInput {
  genreBrief: string;
  title: string;
  subtitle: string;
  description: string;
  templateName: string;
  templateMood: string;
  templateDark: boolean;
  titleColor: string;
  titleScale: number;
  hasUploadedImage: boolean;
  hasArtDirection: boolean;
  artDirectionLabel?: string;
  projectGenre?: string;
}
