export const GENRE_BRAIN_SUPREME_VERSION = "scriptora-genre-brain-supreme-v1";

export type SupremeGenreId =
  | "romance"
  | "dark-romance"
  | "thriller"
  | "fantasy"
  | "crime"
  | "mystery"
  | "self-help"
  | "business"
  | "horror"
  | "sci-fi"
  | "cozy"
  | "young-adult"
  | "default";

export type SupremeGenreRuleSet = {
  narrative: string[];
  emotional: string[];
  dialogue: string[];
  subtext: string[];
  tension: string[];
  market: string[];
  reader: string[];
};

export type SupremeGenreProfile = {
  id: SupremeGenreId;
  label: string;
  rules: SupremeGenreRuleSet;
  /** Weights consumed by Humanizer / GenreBrain legacy path */
  weights: {
    tensionSensitivity: number;
    emotionalPacing: number;
    dialogueRealism: number;
    poeticDensityTolerance: number;
    introspectionAmount: number;
    subtextLevel: number;
  };
  pacingStyle: "longing" | "suspense" | "immersive" | "danger" | "clarity" | "neutral";
  preventionNotes: string[];
};
