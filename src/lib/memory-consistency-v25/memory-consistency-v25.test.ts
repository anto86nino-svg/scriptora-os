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

  it("tracks promise development and payoff across long-book chapters", () => {
    const payoffBlueprint = {
      ...blueprint,
      chapterOutlines: [
        { title: "La chiave", summary: "Nora trova una chiave nella cattedrale." },
        { title: "Il ritorno", summary: "La chiave riappare durante il confronto con Elia." },
        { title: "La verita", summary: "Nora scopre che la chiave apre la cripta e rivela la verita." },
      ],
    };
    const chapters = [
      chapter(1, "Nora trovò una chiave d'argento sotto l'altare e giurò di capire a cosa servisse."),
      chapter(2, "La chiave riapparve nella tasca di Elia, come se la cattedrale la stesse restituendo."),
      chapter(3, "Nora scoprì che la chiave apriva la cripta e rivelava la verità sul bambino scomparso."),
    ];

    const snapshot = buildMemoryConsistencyV25Snapshot({
      config: { ...baseConfig, numberOfChapters: 3 },
      blueprint: payoffBlueprint,
      chapters,
      chapterIndex: 2,
    });

    const keyPromise = snapshot.storyPromises.find((item) =>
      item.description.toLowerCase().includes("chiave") && item.chapterIntroduced === 1,
    );
    expect(keyPromise?.status).toBe("resolved");
    expect(keyPromise?.developedIn).toContain(2);
    expect(keyPromise?.payoffChapter).toBe(3);
    expect(keyPromise?.payoffEvidence).toContain("Nora scoprì");
  });

  it("injects payoff operating rules when a blueprint payoff is due", () => {
    const payoffBlueprint = {
      ...blueprint,
      chapterOutlines: [
        { title: "La chiave", summary: "Nora trova una chiave nella cattedrale." },
        { title: "Il ritorno", summary: "La chiave riappare durante il confronto con Elia." },
        { title: "La verita", summary: "Nora scopre che la chiave apre la cripta e rivela la verita." },
      ],
    };
    const block = buildMemoryConsistencyV25PromptBlock({
      config: { ...baseConfig, numberOfChapters: 3 },
      previousChapters: [
        chapter(1, "Nora trovò una chiave d'argento sotto l'altare e giurò di capire a cosa servisse."),
        chapter(2, "La chiave riapparve nella tasca di Elia, come se la cattedrale la stesse restituendo."),
      ],
      chapterIndex: 2,
      blueprint: payoffBlueprint,
    });

    expect(block).toContain("PROMISE/PAYOFF OPERATING RULES");
    expect(block).toContain("PAY OFF OR EXPLICITLY ADVANCE NOW");
    expect(block).toContain("chiave");
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
