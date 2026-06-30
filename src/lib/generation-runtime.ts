/** Lazy-loaded generation engine — keeps ~150kB out of the initial writer bundle. */

type GenerationModule = typeof import("@/lib/generation");

let loadPromise: Promise<GenerationModule> | null = null;

export function loadGenerationModule(): Promise<GenerationModule> {
  if (!loadPromise) loadPromise = import("@/lib/generation");
  return loadPromise;
}

export async function runGenerateBlueprint(
  ...args: Parameters<GenerationModule["generateBlueprint"]>
): ReturnType<GenerationModule["generateBlueprint"]> {
  return (await loadGenerationModule()).generateBlueprint(...args);
}

export async function runGenerateFrontMatter(
  ...args: Parameters<GenerationModule["generateFrontMatter"]>
): ReturnType<GenerationModule["generateFrontMatter"]> {
  return (await loadGenerationModule()).generateFrontMatter(...args);
}

export async function runGenerateBackMatter(
  ...args: Parameters<GenerationModule["generateBackMatter"]>
): ReturnType<GenerationModule["generateBackMatter"]> {
  return (await loadGenerationModule()).generateBackMatter(...args);
}

export async function runGenerateChapter(
  ...args: Parameters<GenerationModule["generateChapter"]>
): ReturnType<GenerationModule["generateChapter"]> {
  return (await loadGenerationModule()).generateChapter(...args);
}

export async function runGenerateChapterChunked(
  ...args: Parameters<GenerationModule["generateChapterChunked"]>
): ReturnType<GenerationModule["generateChapterChunked"]> {
  return (await loadGenerationModule()).generateChapterChunked(...args);
}

export async function runGenerateChapterViaSubchapterPipeline(
  ...args: Parameters<GenerationModule["generateChapterViaSubchapterPipeline"]>
): ReturnType<GenerationModule["generateChapterViaSubchapterPipeline"]> {
  return (await loadGenerationModule()).generateChapterViaSubchapterPipeline(...args);
}

export async function runGenerateSubchapter(
  ...args: Parameters<GenerationModule["generateSubchapter"]>
): ReturnType<GenerationModule["generateSubchapter"]> {
  return (await loadGenerationModule()).generateSubchapter(...args);
}

export async function runRewriteChapter(
  ...args: Parameters<GenerationModule["rewriteChapter"]>
): ReturnType<GenerationModule["rewriteChapter"]> {
  return (await loadGenerationModule()).rewriteChapter(...args);
}

export async function runEvaluateChapterQuality(
  ...args: Parameters<GenerationModule["evaluateChapterQuality"]>
): ReturnType<GenerationModule["evaluateChapterQuality"]> {
  return (await loadGenerationModule()).evaluateChapterQuality(...args);
}
