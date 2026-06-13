import { describe, expect, it } from "vitest";
import type { BookConfig, BookProject, Chapter } from "@/types/book";
import {
  buildMemoryConsistencyV25PromptBlock,
  buildMemoryConsistencyV25Snapshot,
  refreshProjectMemoryConsistencyV25,
  runDevelopmentalMemoryCheck,
} from "@/lib/memory-consistency-v25";

const baseConfig = {
  title: "Gothic Test",
  subtitle: "",
  tone: "dark",
  authorStyle: "default",
  language: "English",
  genre: "gothic-thriller",
  category: "Fiction",
  subcategory: "gothic thriller",
  chapterLength: "medium",
  bookLength: "medium",
  numberOfChapters: 10,
  subchaptersEnabled: false,
  characters: [
    {
      name: "Nora",
      role: "protagonist",
      traumaProfile: "abandonment wound",
      relationships: "with Elia, distrust but attraction",
      personality: "avoids eye contact, short answers",
    },
    {
      name: "Elia",
      role: "love interest",
      traumaProfile: "betrayal",
      relationships: "with Nora, guarded desire",
      personality: "controlled speech",
    },
  ],
} as BookConfig;

function chapter(n: number, content: string, title = `Chapter ${n}`): Chapter {
  return { title, content, subchapters: [] };
}

const blueprint = {
  overview: "A gothic thriller romance",
  themes: ["mystery", "desire"],
  emotionalArc: "resistance to surrender",
  chapterOutlines: Array.from({ length: 10 }, (_, i) => ({
    title: `Chapter ${i + 1}`,
    summary: i === 1 ? "A mysterious key appears in the cathedral." : `Arc beat ${i + 1}`,
  })),
};

describe("Memory & Consistency Engine V2.5", () => {
  it("builds living character memory with fear, tic, and love resistance", () => {
    const snapshot = buildMemoryConsistencyV25Snapshot({
      config: baseConfig,
      blueprint,
      chapters: [
        chapter(1, "Nora avoided eye contact when Elia asked about the key. She lied and touched her wrist."),
        chapter(2, "They fought after the betrayal resurfaced. Nora desired him but pulled away."),
      ],
      chapterIndex: 2,
    });

    const nora = snapshot.characterMemories.find((entry) => entry.name === "Nora");
    expect(nora).toBeTruthy();
    expect(nora?.dominantFear.length).toBeGreaterThan(3);
    expect(nora?.loveResistance).not.toBe("low");
    expect(snapshot.relationships.length).toBeGreaterThan(0);
    expect(snapshot.storyPromises.some((item) => item.type === "object" || item.type === "mystery")).toBe(true);
    expect(snapshot.callbacks.length).toBeGreaterThan(0);
    expect(snapshot.compressedPromptSnapshot).toContain("MEMORY SNAPSHOT V2.5");
  });

  it("tracks relationship friction and injects compressed prompt block", () => {
    const previous = [
      chapter(1, "Nora and Elia argued bitterly after the betrayal. Trust was broken and the cathedral felt colder."),
      chapter(2, "Sexual tension remained between Nora and Elia, but they kept their distance and watched each other."),
    ];
    const block = buildMemoryConsistencyV25PromptBlock({
      config: baseConfig,
      previousChapters: previous,
      chapterIndex: 2,
      blueprint,
    });

    expect(block).toContain("MEMORY & CONSISTENCY ENGINE V2.5");
    expect(block).toContain("RELATIONSHIP MEMORY");
    expect(block).toContain("no emotional amnesia");
  });

  it("flags relationship reset and emotional amnesia in developmental check", () => {
    const project: BookProject = {
      id: "test",
      config: baseConfig,
      blueprint,
      chapters: [
        chapter(1, "Nora and Elia fought bitterly. Betrayal hung between them."),
        chapter(2, "They were best friends again as if nothing happened. Nora said I love you without fear."),
      ],
      frontMatter: null,
      backMatter: null,
      phase: "chapters",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const report = runDevelopmentalMemoryCheck({
      project,
      chapterIndex: 1,
      chapterText: project.chapters[1].content,
    });

    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.score).toBeLessThan(90);
    expect(report.issues.some((issue) => issue.category === "relationship" || issue.category === "character")).toBe(true);
  });

  it("refreshes project longBookMemory with V2.5 snapshot", () => {
    const project: BookProject = {
      id: "test",
      config: baseConfig,
      blueprint,
      chapters: [chapter(1, "Nora touched her wrist when she lied about the key.")],
      frontMatter: null,
      backMatter: null,
      phase: "chapters",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const refreshed = refreshProjectMemoryConsistencyV25(project);
    expect(refreshed.longBookMemory?.memoryConsistencyV25?.version).toBe(25);
    expect(refreshed.longBookMemory?.characterPsychology?.length).toBeGreaterThan(0);
    expect(refreshed.longBookMemory?.memoryConsistencyV25?.compressedPromptSnapshot).toContain("CALLBACK ENGINE");
  });
});
