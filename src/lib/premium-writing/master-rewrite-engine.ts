import type { BookConfig } from "@/types/book";
import { wrapRetryWithVoicePreserve } from "./author-voice-preserve";
import type { ManuscriptQualityScores } from "./manuscript-quality-gate";
import type { ReaderSimulationScores } from "./reader-simulation-engine";

export interface SurgicalRewritePlan {
  interventions: string[];
  preserve: string[];
}

export function buildSurgicalRewritePlan(
  quality: ManuscriptQualityScores,
  reader?: ReaderSimulationScores,
): SurgicalRewritePlan {
  const interventions: string[] = [];

  if (quality.issues.includes("emotional_repetition") || quality.issues.includes("beat_loop")) {
    interventions.push("Replace repeated emotional beats with a visible consequence or decision.");
  }
  if (quality.issues.includes("dialogue_perfection")) {
    interventions.push("Add subtext, interruption, wrong timing — remove therapeutic clarity.");
  }
  if (quality.issues.includes("scene_stall")) {
    interventions.push("Cut mood-only paragraphs; every block must advance plot, tension, or revelation.");
  }
  if (quality.issues.includes("ai_tells")) {
    interventions.push("Remove aphorism endings; add concrete sensory anchors.");
  }
  if (quality.issues.includes("inauthentic_voice")) {
    interventions.push("Add subtext, hesitation, body language — remove therapy dialogue and instant confessions.");
  }
  if (quality.issues.includes("low_engagement")) {
    interventions.push("Strengthen opening hook and end with unresolved tension.");
  }
  if (reader && reader.abandonmentRisk > 60) {
    interventions.push("Reduce passive reflection; add a question, threat, or discovery before chapter end.");
  }
  if (!interventions.length) {
    interventions.push("Tighten rhythm: shorten one reflective passage, sharpen one dialogue exchange.");
  }

  return {
    interventions,
    preserve: ["author voice", "POV", "tense", "genre tone", "character names", "plot facts"],
  };
}

export function buildMasterRewriteInstruction(
  config: BookConfig,
  quality: ManuscriptQualityScores,
  reader?: ReaderSimulationScores,
): string {
  const plan = buildSurgicalRewritePlan(quality, reader);
  const fixes = [
    "MASTER REWRITE — surgical only, do NOT restart the chapter:",
    ...plan.interventions.map((i) => `• ${i}`),
    `PRESERVE: ${plan.preserve.join(", ")}.`,
  ].join("\n");
  return wrapRetryWithVoicePreserve(config, fixes);
}
