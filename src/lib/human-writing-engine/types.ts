import type { WritingBrainId } from "@/lib/book-intelligence/types";

export type HumanWritingDomain = "fiction" | "nonfiction";

export interface HumanWritingProfile {
  id: string;
  label: string;
  domain: HumanWritingDomain;
  /** 0–1 — how much dialogue should hide vs state */
  subtextLevel: number;
  /** 0–1 — tolerance for silence beats and unfinished lines */
  silenceWeight: number;
  /** 0–1 — dialogue friction / asymmetry target */
  dialogueFriction: number;
  /** max lyrical/metaphor sentences per ~400 words (lower = stricter) */
  metaphorCap: number;
  /** 0–1 — allowed emotional explanation density (lower = more show) */
  emotionalExplainTolerance: number;
  promptRules: string[];
  avoidPatterns: string[];
  sourceBrainId?: WritingBrainId;
}

export type HumanWritingContext = {
  config?: { language?: string; bookIntelligence?: { layers?: { writingBrainId?: WritingBrainId; domain?: string } } };
  chapterIndex?: number;
  previousText?: string;
};
