import type { BookProject } from "@/types/book";
import { buildBookIntelligencePromptBlock, detectBookIntelligence } from "@/lib/book-intelligence";
import { buildLongBookMemoryWithPsychology } from "@/lib/narrative-intelligence-v2";
import { buildNarrativeGenerationPlan, formatNarrativePlanBlock } from "./narrative-plan";
import { buildCharacterDialogueDirectives } from "./character-psychology-engine";
import { buildHumanContradictionBlock } from "./human-contradiction";
import { analyzeSceneContinuity, buildSceneContinuityBlock } from "./scene-continuity";
import { buildSubtextEngineBlock } from "./subtext-engine";
import { buildRomanceTensionV2Block } from "./romance-tension-v2";
import { buildReaderAddictionBlock, remediateReaderAddictionOutline, scoreReaderAddiction } from "./reader-addiction";
import { buildAuthorDnaBlock } from "./author-dna";
import { buildLongMemoryV3Block } from "./long-memory-v3";
import type { NarrativeBrainV3Context } from "./types";

export const NARRATIVE_BRAIN_V3_KEY = "scriptora-narrative-brain-v3";

export function isNarrativeBrainV3Enabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_NARRATIVE_BRAIN_V3 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(NARRATIVE_BRAIN_V3_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function isMasterpieceModeEnabled(): boolean {
  try {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("scriptora-masterpiece-mode");
    return saved !== "off";
  } catch {
    return true;
  }
}

/** Build invisible narrative strategy block injected into chapter prompts */
export function buildNarrativeBrainV3PromptBlock(context: NarrativeBrainV3Context): string {
  if (!isNarrativeBrainV3Enabled()) return "";

  const { config, chapterIndex, outlineSummary, outlineTitle, previousChapters, longBookMemory, masterpieceMode } = context;
  const plan = buildNarrativeGenerationPlan(config);
  const remediation = remediateReaderAddictionOutline(outlineTitle, outlineSummary, config, plan);
  const effectiveSummary = remediation.remediated ? remediation.summary : outlineSummary;
  const continuity = analyzeSceneContinuity(previousChapters, effectiveSummary);
  const addiction = scoreReaderAddiction(effectiveSummary, outlineTitle, plan);

  const memory = longBookMemory || buildLongBookMemoryWithPsychology({
    config,
    blueprint: null,
    chapters: previousChapters,
  });

  const intel = detectBookIntelligence({
    idea: config.subtitle || config.title,
    genre: config.genre,
    subcategory: config.subcategory,
    tone: config.tone,
    language: config.language,
  });

  const blocks = [
    formatNarrativePlanBlock(plan),
    buildAuthorDnaBlock(config),
    buildBookIntelligencePromptBlock({
      version: 2,
      layers: intel.report.layers,
      resolvedGenre: intel.resolvedGenre,
      subcategory: intel.subcategory,
      tone: intel.report.tone,
      confidence: intel.confidence,
      lockedAt: new Date().toISOString(),
    }),
    buildLongMemoryV3Block(memory, chapterIndex),
    memory.characterPsychology?.length
      ? buildCharacterDialogueDirectives(memory.characterPsychology)
      : "",
    buildHumanContradictionBlock(),
    buildSceneContinuityBlock(continuity),
    buildSubtextEngineBlock(plan.subtextLevel),
    buildRomanceTensionV2Block(config, chapterIndex),
    buildReaderAddictionBlock(addiction, plan, remediation),
    masterpieceMode !== false && isMasterpieceModeEnabled()
      ? "MASTERPIECE MODE: Quality over speed. Every line must earn its place. No filler, no generic AI voice."
      : "",
  ].filter(Boolean);

  return blocks.join("\n\n");
}

export function ensureProjectMemoryForChapter(project: BookProject): BookProject {
  if (project.longBookMemory?.chaptersIndexed === project.chapters.filter((c) => c.content?.trim()).length) {
    return project;
  }
  return {
    ...project,
    longBookMemory: buildLongBookMemoryWithPsychology({
      config: project.config,
      blueprint: project.blueprint,
      chapters: project.chapters,
      existingMemory: project.longBookMemory,
    }),
  };
}

export * from "./types";
export { buildNarrativeGenerationPlan, formatNarrativePlanBlock } from "./narrative-plan";
export { buildCharacterPsychologyEngine, buildCharacterDialogueDirectives, generateCharacterResponseGuard } from "./character-psychology-engine";
export { buildHumanContradictionBlock, THERAPIST_DIALOGUE_RE } from "./human-contradiction";
export { analyzeSceneContinuity, buildSceneContinuityBlock } from "./scene-continuity";
export { buildSubtextEngineBlock } from "./subtext-engine";
export { buildRomanceTensionV2Block, isRomanceGenre } from "./romance-tension-v2";
export { scoreReaderAddiction, buildReaderAddictionBlock, remediateReaderAddictionOutline } from "./reader-addiction";
export { buildNarrativeBrainV3InjectionBlock } from "./injection";
export { buildAuthorDnaBlock } from "./author-dna";
export { buildLongMemoryV3Block, refreshLongMemoryV3 } from "./long-memory-v3";
export { runDevelopmentalEditorPass, buildDevelopmentalEditorPromptFixes } from "./developmental-editor";
export { sanitizeNarrativeOutput } from "./sanitization-guard";
export { applyMasterpiecePostPass } from "./masterpiece-mode";
