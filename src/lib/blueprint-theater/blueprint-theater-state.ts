import type { BookChapterOutline, BookProject } from "@/types/book";
import type { ChunkProgress } from "@/lib/generation-types";
import { computeProjectProgressPercent, countProjectWords } from "@/lib/project-progress";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";

export type ChapterPipelineStatus = "done" | "generating" | "waiting";

export type ChapterPipelineItem = {
  id: string;
  label: string;
  kind: "blueprint" | "front-matter" | "chapter" | "back-matter";
  chapterIndex?: number;
  status: ChapterPipelineStatus;
  subchapters?: Array<{ label: string; status: ChapterPipelineStatus }>;
};

export type BlueprintTheaterLiveStats = {
  bookPercent: number;
  chaptersDone: number;
  chaptersTotal: number;
  wordsGenerated: number;
};

const NARRATIVE_HINTS = [
  "Protagonista introdotto",
  "Conflitto stabilito",
  "Hook completato",
  "Tensione aumentata",
  "Arco narrativo avanzato",
  "Promessa editoriale rafforzata",
] as const;

export function buildWriterPipeline(
  project: BookProject,
  isGenerating: (key: string) => boolean,
): ChapterPipelineItem[] {
  const { blueprint, chapters, frontMatter, backMatter, config } = project;
  const items: ChapterPipelineItem[] = [];

  items.push({
    id: "blueprint",
    label: "Blueprint",
    kind: "blueprint",
    status: blueprint ? "done" : isGenerating("blueprint") ? "generating" : "waiting",
  });

  if (isFrontMatterEnabled(config)) {
    items.push({
      id: "front-matter",
      label: "Front Matter",
      kind: "front-matter",
      status: frontMatter ? "done" : isGenerating("front-matter") ? "generating" : blueprint ? "waiting" : "waiting",
    });
  }

  const outlines = blueprint?.chapterOutlines ?? [];
  outlines.forEach((outline, index) => {
    const key = `chapter-${index}`;
    const written = (chapters[index]?.content || "").trim().length > 50;
    const generating = isGenerating(key);
    const subchapters = Array.isArray((outline as BookChapterOutline & { subchapters?: { title: string }[] }).subchapters)
      ? (outline as BookChapterOutline & { subchapters?: { title: string }[] }).subchapters!.map((sub, subIndex) => {
          const subKey = `chapter-${index}-sub-${subIndex}`;
          const subWritten = (chapters[index]?.subchapters?.[subIndex]?.content || "").trim().length > 50;
          return {
            label: sub.title || `Sottocapitolo ${subIndex + 1}`,
            status: (subWritten ? "done" : isGenerating(subKey) ? "generating" : "waiting") as ChapterPipelineStatus,
          };
        })
      : undefined;

    items.push({
      id: key,
      label: outline.title || `Capitolo ${index + 1}`,
      kind: "chapter",
      chapterIndex: index,
      status: written ? "done" : generating ? "generating" : "waiting",
      subchapters,
    });
  });

  if (isBackMatterEnabled(config)) {
    const chaptersDone = outlines.length > 0 && outlines.every((_, i) => (chapters[i]?.content || "").trim().length > 50);
    items.push({
      id: "back-matter",
      label: "Back Matter",
      kind: "back-matter",
      status: backMatter ? "done" : isGenerating("back-matter") ? "generating" : chaptersDone ? "waiting" : "waiting",
    });
  }

  return items;
}

export function buildForgePipeline(
  generating: boolean,
  hasBlueprint: boolean,
  elapsedSeconds: number,
  chapterCount: number,
): ChapterPipelineItem[] {
  const forgeStep = Math.min(5, Math.floor(elapsedSeconds / 14));
  const items: ChapterPipelineItem[] = [
    {
      id: "blueprint",
      label: "Blueprint",
      kind: "blueprint",
      status: hasBlueprint ? "done" : generating ? "generating" : "waiting",
    },
    {
      id: "front-matter",
      label: "Front Matter",
      kind: "front-matter",
      status: hasBlueprint ? "waiting" : forgeStep >= 2 ? "waiting" : "waiting",
    },
  ];

  for (let i = 0; i < Math.max(chapterCount, 3); i++) {
    const active = generating && !hasBlueprint && i === Math.min(forgeStep - 2, chapterCount - 1);
    items.push({
      id: `chapter-${i}`,
      label: `Capitolo ${i + 1}`,
      kind: "chapter",
      chapterIndex: i,
      status: hasBlueprint ? "done" : active ? "generating" : "waiting",
    });
  }

  return items.slice(0, 2 + Math.max(chapterCount, 3));
}

export function computeTheaterLiveStats(project: BookProject | null, fallbackChapterTotal = 0): BlueprintTheaterLiveStats {
  if (!project) {
    return { bookPercent: 0, chaptersDone: 0, chaptersTotal: fallbackChapterTotal, wordsGenerated: 0 };
  }
  const outlines = project.blueprint?.chapterOutlines ?? [];
  const chaptersDone = (project.chapters || []).filter((c) => (c.content || "").trim().length > 50).length;
  return {
    bookPercent: computeProjectProgressPercent(project),
    chaptersDone,
    chaptersTotal: outlines.length || project.config.numberOfChapters || fallbackChapterTotal,
    wordsGenerated: countProjectWords(project),
  };
}

export function deriveNarrativeEvents(
  pipeline: ChapterPipelineItem[],
  opts?: { forgeCopy?: string; generatingBlueprint?: boolean },
): string[] {
  const events: string[] = [];
  if (opts?.generatingBlueprint && opts.forgeCopy) {
    events.push(opts.forgeCopy);
    return events;
  }

  const generating = pipeline.find((p) => p.status === "generating");
  if (generating) {
    if (generating.kind === "chapter") events.push(`Scrittura: ${generating.label}`);
    else events.push(`${generating.label} in corso`);
  }

  const doneCount = pipeline.filter((p) => p.status === "done" && p.kind === "chapter").length;
  NARRATIVE_HINTS.slice(0, Math.min(doneCount + 1, NARRATIVE_HINTS.length)).forEach((hint) => events.push(hint));

  if (!events.length) events.push("Scriptora prepara la struttura del libro");
  return events.slice(0, 4);
}

export function countWordsFromProgress(chunkProgress?: Record<string, ChunkProgress>): number {
  return Object.values(chunkProgress ?? {}).reduce((sum, p) => sum + (p.currentWords || 0), 0);
}
