import type { BookConfig } from "@/types/book";
import { applyPremiumOutputGuard } from "./output-sanitization-guard";
import { applyLightAiTellSoftening } from "./ai-detection-reduction";
import {
  evaluateManuscriptQuality,
  type ManuscriptQualityScores,
} from "./manuscript-quality-gate";
import { simulateReaderResponse } from "./reader-simulation-engine";
import { buildMasterRewriteInstruction } from "./master-rewrite-engine";

export interface UltraHumanPipelineResult {
  text: string;
  quality: ManuscriptQualityScores;
  retryInstruction: string;
}

export function runUltraHumanFinalPass(
  text: string,
  opts: { language?: string; priorText?: string; config?: BookConfig; chapterIndex?: number },
): UltraHumanPipelineResult {
  let processed = applyPremiumOutputGuard(text, { language: opts.language || "Italian" });
  processed = applyLightAiTellSoftening(processed);

  const quality = evaluateManuscriptQuality(processed, opts.priorText || "", opts.config);
  const reader = simulateReaderResponse(processed, opts.chapterIndex ?? 0);
  const retryInstruction = opts.config
    ? buildMasterRewriteInstruction(opts.config, quality, reader)
    : "";

  return { text: processed, quality, retryInstruction };
}
