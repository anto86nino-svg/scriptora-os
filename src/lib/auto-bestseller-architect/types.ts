import type { BookBlueprint, BookConfig } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import type { BookIntelligenceReport } from "@/lib/book-intelligence";
import type { MarketPremiumScores } from "@/lib/market-intelligence-premium";

export type ArchitectPhaseId =
  | "idea-intelligence"
  | "market-positioning"
  | "title-positioning"
  | "blueprint-architect"
  | "handoff-ready";

export interface IdeaIntelligenceResult {
  genre: string;
  subgenre: string;
  emotionalCategory: string;
  commercialLane: string;
  readerExpectation: string;
  confidence: number;
  signals: string[];
  report: BookIntelligenceReport;
}

export interface MarketPositioningResult {
  audienceProfile: string;
  emotionalPromise: string;
  commercialPositioning: string;
  hookStrength: number;
  hookExplanation: string;
  readerRisks: Array<{ severity: "high" | "medium" | "low"; message: string }>;
  premium: MarketPremiumScores;
}

export interface TitleConcept {
  title: string;
  subtitle: string;
  rationale: string;
  confidence: number;
}

export interface ArchitectHandoffChecklist {
  marketAnalyzed: boolean;
  blueprintCreated: boolean;
  emotionalArchitecturePrepared: boolean;
  writingMemoryInitialized: boolean;
}

export interface AutoBestsellerArchitectResult {
  ideaIntelligence: IdeaIntelligenceResult;
  marketPositioning: MarketPositioningResult;
  titleConcepts: TitleConcept[];
  selectedTitleIndex: number;
  config: BookConfig;
  blueprint: BookBlueprint;
  memorySeed: LongBookMemorySnapshot;
  checklist: ArchitectHandoffChecklist;
}

export interface AutoBestsellerHandoffPack {
  version: 1;
  origin: "auto-bestseller";
  config: BookConfig;
  blueprint: BookBlueprint;
  memorySeed: LongBookMemorySnapshot;
  summary: {
    genre: string;
    subgenre: string;
    emotionalPromise: string;
    audienceProfile: string;
    commercialPositioning: string;
    selectedTitle: string;
    selectedSubtitle: string;
  };
  openSection: "blueprint";
}

export const AUTO_BESTSELLER_PACK_KEY = "scriptora-auto-bestseller-pack";
export const SETUP_ORIGIN_KEY = "scriptora-setup-origin";
