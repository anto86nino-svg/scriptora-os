export const NARRATIVE_MEMORY_CORE_VERSION = "scriptora-narrative-memory-core-v1";

export type MemoryItemStatus = "OPEN" | "ACTIVE" | "PARTIAL" | "RESOLVED" | "BROKEN";

export type MemoryItemKind =
  | "promise"
  | "mystery"
  | "setup"
  | "payoff"
  | "relationship"
  | "conflict"
  | "wound"
  | "goal"
  | "secret"
  | "object"
  | "place";

export type NarrativeMemoryItem = {
  id: string;
  kind: MemoryItemKind;
  label: string;
  status: MemoryItemStatus;
  introducedChapter: number;
  lastTouchedChapter: number;
  excerpt?: string;
  relatedCharacters?: string[];
};

export type RelationshipMemoryAxis = {
  trust: number;
  attraction: number;
  hostility: number;
  respect: number;
  dependency: number;
  jealousy: number;
  betrayal: number;
};

export type RelationshipMemoryLink = {
  id: string;
  characterA: string;
  characterB: string;
  status: MemoryItemStatus;
  axes: RelationshipMemoryAxis;
  lastUpdatedChapter: number;
  notes: string[];
};

export type NarrativeMemoryCoreSnapshot = {
  version: typeof NARRATIVE_MEMORY_CORE_VERSION;
  updatedAt: string;
  chaptersIndexed: number;
  items: NarrativeMemoryItem[];
  relationships: RelationshipMemoryLink[];
  openPromises: number;
  brokenItems: number;
  forgottenCharacterRisk: string[];
  forgottenObjectRisk: string[];
  incompleteArcs: string[];
};

export type CanonViolation = {
  code: string;
  severity: "critical" | "optional";
  message: string;
  source: "story-bible" | "blueprint" | "character-core" | "memory";
};

export type CanonProtectionReport = {
  version: 1;
  evaluatedAt: string;
  violations: CanonViolation[];
  passesGate: boolean;
};

export type SupremeMemoryReport = {
  version: 1;
  evaluatedAt: string;
  narrativeHealth: number;
  openPromises: number;
  brokenPromises: number;
  relationshipHealth: number;
  continuityRisk: number;
  payoffRisk: number;
  warnings: string[];
  summary: string;
};
