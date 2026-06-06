import { describe, expect, it } from "vitest";
import { buildLongBookMemory, buildLongBookMemoryPromptBlock } from "@/lib/long-book-memory";
import type { BookConfig, Chapter } from "@/types/book";

const baseConfig = {
  title: "Test Book",
  subtitle: "",
  tone: "intense",
  authorStyle: "default",
  language: "English",
  genre: "dark-romance",
  category: "Romance",
  subcategory: "dark romance",
  chapterLength: "medium",
  bookLength: "medium",
  numberOfChapters: 20,
  subchaptersEnabled: false,
} as BookConfig;

function chapter(n: number, content: string, title = `Chapter ${n}`): Chapter {
  return { title, content, subchapters: [] };
}

describe("Long Book Memory Engine V2", () => {
  it("tracks unresolved arcs and emotional progression across chapters", () => {
    const memory = buildLongBookMemory({
      config: {
        ...baseConfig,
        characters: [
          {
            name: "Elena",
            role: "protagonist",
            traumaProfile: "abandonment wound",
            relationships: "distrusts Marco but wants him",
          },
        ],
      },
      blueprint: {
        overview: "A dark romance",
        themes: ["desire", "control"],
        emotionalArc: "resistance to surrender",
        chapterOutlines: Array.from({ length: 20 }, (_, i) => ({
          title: `Chapter ${i + 1}`,
          summary: i > 2 ? `Future arc for chapter ${i + 1}` : `Setup chapter ${i + 1}`,
        })),
      },
      chapters: [
        chapter(1, "Elena felt fear when Marco promised he would never leave. But she didn't know what secret he kept."),
        chapter(2, "The tension grew. Elena desired him, yet the mystery remained unresolved."),
      ],
    });

    expect(memory.chaptersIndexed).toBe(2);
    expect(memory.characterStates[0]?.name).toBe("Elena");
    expect(memory.emotionalProgression).toHaveLength(2);
    expect(memory.unresolvedArcs.length).toBeGreaterThan(0);
    expect(memory.continuityAnchors.length).toBeGreaterThan(0);
  });

  it("injects long-range memory block into chapter prompts", () => {
    const memory = buildLongBookMemory({
      config: baseConfig,
      blueprint: null,
      chapters: [chapter(1, "A secret was planted. She promised herself she would never forgive him.")],
    });

    const block = buildLongBookMemoryPromptBlock(memory, 1);
    expect(block).toContain("LONG BOOK MEMORY ENGINE V2");
    expect(block).toContain("UNRESOLVED ARCS");
    expect(block).toContain("WORLD RULES");
  });
});
