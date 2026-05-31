export type EmotionalOpennessLevel = "closed" | "guarded" | "selective" | "open";

export type CharacterRelationshipLink = {
  withCharacter: string;
  trust: number;
  attraction: number;
  conflict: number;
  label?: string;
};

export type CharacterSupremacyProfile = {
  name: string;
  role?: string;
  traumas: string[];
  fears: string[];
  desires: string[];
  needs: string[];
  emotionalWounds: string[];
  values: string[];
  contradictions: string[];
  speechPattern: string[];
  emotionalOpenness: EmotionalOpennessLevel;
  secrets: string[];
  promises: string[];
  relationships: CharacterRelationshipLink[];
  behavioralRules: string[];
  forbiddenBehaviors: string[];
};

export type CharacterIntentSheet = {
  version: 1;
  chapterIndex: number;
  character: CharacterSupremacyProfile;
  sceneDirectives: string[];
};

export type CharacterSupremacyRegistry = {
  version: 1;
  updatedAt: string;
  profiles: CharacterSupremacyProfile[];
};
