import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import { buildGenreLock, generateBlueprint } from "@/lib/generation";
import { buildLongBookMemory } from "@/lib/long-book-memory";
import { inferIdeaIntelligence } from "./idea-intelligence";
import { buildMarketPositioning } from "./market-positioning";
import { buildTitleConcepts } from "./titles";
import { buildArchitectBookConfig } from "./config-builder";
import type {
  ArchitectPhaseId,
  AutoBestsellerArchitectResult,
  AutoBestsellerHandoffPack,
} from "./types";
import { ARCHITECT_PHASE_LABELS } from "./types";

export type ArchitectProgressCallback = (phase: ArchitectPhaseId, message: string) => void;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAutoBestsellerArchitect(
  input: AutoBestsellerInput,
  onProgress?: ArchitectProgressCallback,
): Promise<AutoBestsellerArchitectResult> {
  const tick = async (phase: ArchitectPhaseId) => {
    onProgress?.(phase, ARCHITECT_PHASE_LABELS[phase]);
    await delay(phase === "blueprint-architect" ? 0 : 280);
  };

  await tick("idea-intelligence");
  const ideaIntelligence = inferIdeaIntelligence(input);

  await tick("market-positioning");
  const marketPositioning = buildMarketPositioning(input, ideaIntelligence);

  await tick("title-positioning");
  const titleConcepts = buildTitleConcepts(input, ideaIntelligence, marketPositioning);
  const selectedTitleIndex = 0;
  const selectedTitle = titleConcepts[selectedTitleIndex] || titleConcepts[0];

  if (!selectedTitle) {
    throw new Error("Could not derive commercial title concepts from this idea.");
  }

  const config = buildArchitectBookConfig(input, ideaIntelligence, marketPositioning, selectedTitle);
  const genreLock = buildGenreLock(config);

  await tick("blueprint-architect");
  const blueprint = await generateBlueprint(config, genreLock);

  await tick("handoff-ready");
  const memorySeed = buildLongBookMemory({
    config,
    blueprint,
    chapters: [],
  });

  const checklist = {
    marketAnalyzed: true,
    blueprintCreated: Boolean(blueprint.chapterOutlines.length),
    emotionalArchitecturePrepared: Boolean(blueprint.emotionalArc || blueprint.themes.length),
    writingMemoryInitialized: true,
  };

  return {
    ideaIntelligence,
    marketPositioning,
    titleConcepts,
    selectedTitleIndex,
    config,
    blueprint,
    memorySeed,
    checklist,
  };
}

export function buildHandoffPack(result: AutoBestsellerArchitectResult): AutoBestsellerHandoffPack {
  const selected = result.titleConcepts[result.selectedTitleIndex] || result.titleConcepts[0];
  return {
    version: 1,
    origin: "auto-bestseller",
    config: result.config,
    blueprint: result.blueprint,
    memorySeed: result.memorySeed,
    summary: {
      genre: result.ideaIntelligence.genre,
      subgenre: result.ideaIntelligence.subgenre,
      emotionalPromise: result.marketPositioning.emotionalPromise,
      audienceProfile: result.marketPositioning.audienceProfile,
      commercialPositioning: result.marketPositioning.commercialPositioning,
      selectedTitle: selected?.title || result.config.title,
      selectedSubtitle: selected?.subtitle || result.config.subtitle,
    },
    openSection: "blueprint",
  };
}

export { ARCHITECT_PHASE_LABELS } from "./types";
