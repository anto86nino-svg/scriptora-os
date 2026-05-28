// Internal structural beats (HIDDEN from reader)
export type StructuralBeat =
  | "setup"
  | "inciting_incident"
  | "threshold"
  | "rising_action"
  | "first_reversal"
  | "midpoint"
  | "escalation"
  | "darkest_moment"
  | "climax"
  | "resolution"
  | "denouement";

// World context for generating authentic titles
export interface WorldContext {
  locations?: string[]; // "Montmartre", "The Glass Corridor", "Mykonos Ferry"
  objects?: string[]; // "red lanterns", "tea cup", "photograph"
  motifs?: string[]; // recurring symbols/themes
  emotions?: string[]; // "betrayal", "wonder", "tension"
  characters?: string[];
  environmentalDetails?: string[]; // sensory, atmospheric
  culturalReferences?: string[];
  mysteries?: string[]; // unresolved questions
}

export interface ChapterMeta {
  beatType: StructuralBeat;
  worldContext: WorldContext;
  emotionalTone?: string;
  paceIntensity?: number; // 0..1
}

export default { StructuralBeat, WorldContext, ChapterMeta };
