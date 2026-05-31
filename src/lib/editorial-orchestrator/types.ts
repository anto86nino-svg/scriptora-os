import type { BehavioralConsistencyReport } from "@/lib/behavioral-consistency";
import type { CharacterIntentSheet } from "@/lib/character-supremacy";
import type { ClicheScanResult } from "@/lib/cliche-engine";
import type { DialogueHumanityReport } from "@/lib/dialogue-humanity";
import type { EmotionalRealismReport } from "@/lib/emotional-realism-gate";
import type { NarrativePromiseRegistry } from "@/lib/narrative-promise-engine";
import type { PayoffAnalysis } from "@/lib/payoff-engine";
import type { ReaderSimulationSnapshot } from "@/lib/reader-simulation";
import type { SubtextAnalysis } from "@/lib/subtext-engine";
import type { TensionEngineV2Snapshot } from "@/lib/tension-engine-v2";

export const EDITORIAL_ORCHESTRATOR_VERSION = "scriptora-editorial-orchestrator-v3";

export type ChapterArcPhase = "opening" | "middle" | "closing";

export type EditorialIntentSheet = {
  version: typeof EDITORIAL_ORCHESTRATOR_VERSION;
  chapterIndex: number;
  chapterTitle: string;
  genreBrainId: string;
  pacingStyle: string;
  chapterArc: ChapterArcPhase;
  genreRules: string[];
  genreDonts: string[];
  preventionDirectives: string[];
  characterDirectives: string[];
  tensionFloor: number;
  marketFloor: {
    hookMin: number;
    bingeMin: number;
  };
  genre?: string;
  characterIntentSheets?: CharacterIntentSheet[];
};

export type SupremeIssueSeverity = "critical" | "optional";

export type SupremeEditorialIssue = {
  code: string;
  severity: SupremeIssueSeverity;
  message: string;
  dimension: string;
};

export type SupremeEditorialScore = {
  composite: number;
  dimensions: {
    emotionalRealism: number;
    dialogueHumanity: number;
    subtextStrength: number;
    narrativeTension: number;
    commercialReadability: number;
    readerRetention: number;
    marketPotential: number;
    bookTokPotential: number;
    voiceAuthenticity: number;
    hookStrength: number;
    /** Phase B */
    readerCuriosity: number;
    readerRetentionSim: number;
    narrativePromiseIntegrity: number;
    payoffStrength: number;
    clicheDensity: number;
    /** Phase C — Supreme Score V3 */
    characterDepth: number;
    behavioralConsistency: number;
    relationshipTension: number;
  };
  criticalCount: number;
  optionalCount: number;
  issues: SupremeEditorialIssue[];
  passesPreDelivery: boolean;
};

export type PreDeliveryPhaseBIntel = {
  clicheScan: ClicheScanResult;
  clicheRewriteApplied: boolean;
  readerSimulation: ReaderSimulationSnapshot;
  readerRewriteApplied: boolean;
  narrativePromises: NarrativePromiseRegistry;
  payoffAnalysis: PayoffAnalysis;
  gatePasses: number;
};

export type PreDeliveryPhaseCIntel = {
  characterIntentSheets: CharacterIntentSheet[];
  behavioralConsistency: BehavioralConsistencyReport;
  subtextAnalysis: SubtextAnalysis;
  subtextRewriteApplied: boolean;
  tensionV2: TensionEngineV2Snapshot;
  dialogueHumanity: DialogueHumanityReport;
  dialogueRewriteApplied: boolean;
  emotionalRealism: EmotionalRealismReport;
  emotionalRewriteApplied: boolean;
};

export type SupremeEditorialSnapshot = {
  intent: EditorialIntentSheet;
  score: SupremeEditorialScore;
  autocorrectApplied: boolean;
  evaluatedAt: string;
  phaseB?: PreDeliveryPhaseBIntel;
  phaseC?: PreDeliveryPhaseCIntel;
};
