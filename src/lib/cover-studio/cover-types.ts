export type CoverGenreFamily =
  | "dark-romance"
  | "luxury-romance"
  | "psychological-thriller"
  | "cozy-fantasy"
  | "fantasy-cinematic"
  | "self-help"
  | "study-manual"
  | "business-ai"
  | "kdp-nonfiction"
  | "mystery-crime"
  | "general";

export type CoverDataMode = "template" | "ai-assisted" | "upload";

export interface CoverBriefInput {
  title: string;
  author: string;
  subtitle?: string;
  genre?: string;
  language?: string;
  marketplace?: string;
  targetReader?: string;
  mood?: string;
}

export interface CoverBrief {
  title: string;
  author: string;
  subtitle: string;
  genre: string;
  language: string;
  marketplace: string;
  targetReader: string;
  visualPromise: string;
  emotionalTone: string;
  avoidList: string[];
  genreFamily: CoverGenreFamily;
}

export interface CoverTemplateMeta {
  id: string;
  name: string;
  genreFamily: CoverGenreFamily;
  bestFor: string;
  layout: string;
  typographyStyle: string;
  palette: string[];
  mood: string;
  thumbnailStrength: number;
  kdpFit: number;
  booktokFit: number;
  /** Index into CoverGenerator TEMPLATES array */
  templateIndex: number;
}

export interface CoverScore {
  genreFit: number;
  titleReadability: number;
  authorReadability: number;
  thumbnailReadability: number;
  contrast: number;
  typography: number;
  marketFit: number;
  emotionalPull: number;
  professionalPolish: number;
  kdpReadiness: number;
  booktokPotential: number;
  finalScore: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface CoverReadiness {
  hasTitle: boolean;
  hasAuthor: boolean;
  hasSubtitle: boolean;
  hasGenre: boolean;
  hasSavedCover: boolean;
  exportCompatible: boolean;
  thumbnailReadable: boolean;
  kdpReady: boolean;
  warnings: string[];
  nextActions: string[];
}

export interface CoverVariant {
  templateId: string;
  label: string;
  description: string;
  recommendedFor: string;
  score: number;
  rationale: string;
  templateIndex: number;
}

export interface CoverStudioPackage {
  dataMode: CoverDataMode;
  honestyLabel: string;
  honestyDetail: string;
  brief: CoverBrief;
  recommendedTemplateId: string;
  variants: CoverVariant[];
  score: CoverScore;
  readiness: CoverReadiness;
}
