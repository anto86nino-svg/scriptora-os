import type { BookConfig, Chapter } from "@/types/book";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { inferLevel1FromConfig } from "@/lib/book-config-engine";

export const HUMAN_NARRATIVE_REALISM_V3_KEY = "scriptora-human-narrative-realism-v3-enabled";

export interface HumanNarrativeRealismV3Context {
  config?: Partial<BookConfig>;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  chapterIndex?: number;
  outlineSummary?: string;
}

export function isHumanNarrativeRealismV3Enabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_HUMAN_REALISM_V3 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(HUMAN_NARRATIVE_REALISM_V3_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function resolveRealismFamily(config?: Partial<BookConfig>): "narrative" | "nonfiction" | "educational" | "manual" | "poetry" {
  const def = resolveBookTypeDefinition(
    config?.genre || "self-help",
    config?.subcategory,
    config?.subgenre,
    config?.bookTypeId,
  );
  if (def.family === "poetry") return "poetry";
  if (def.family === "educational") return "educational";
  if (def.family === "manual" || def.family === "cookbook") return "manual";
  if (def.family === "narrative") return "narrative";
  const level1 = inferLevel1FromConfig({
    bookTypeId: def.id,
    genre: config?.genre,
    subcategory: config?.subcategory,
    subgenre: config?.subgenre,
  });
  if (level1 === "educazione") return "educational";
  if (level1 === "self-help" || level1 === "business" || level1 === "marketing" || level1 === "psicologia") return "nonfiction";
  return "narrative";
}
