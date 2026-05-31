import type { BookBlueprint, BookConfig } from "@/types/book";
import type { ValidationGenre } from "./types";

export function genreConfig(genre: ValidationGenre): BookConfig {
  const base = {
    numberOfChapters: 10,
    language: "English" as const,
    title: "Validation Manuscript",
  };
  switch (genre) {
    case "romance":
      return {
        ...base,
        genre: "romance",
        characters: [
          {
            name: "Elena",
            externalDesire: "essere amata",
            secret: "truth about her father",
            relationships: "Con Marco: trust 40%, attraction 80%",
            strictRules: "Never lie without visible guilt",
          },
          { name: "Marco", strictRules: "I never lie" },
        ],
      } as BookConfig;
    case "thriller":
      return { ...base, genre: "thriller", characters: [{ name: "Sofia" }, { name: "Russo" }] } as BookConfig;
    case "fantasy":
      return {
        ...base,
        genre: "fantasy",
        characters: [{ name: "Lyra" }, { name: "Kael" }],
      } as BookConfig;
    case "self-help":
      return { ...base, genre: "self-help" } as BookConfig;
  }
}

export function emptyBlueprint(): BookBlueprint {
  return {
    chapterOutlines: Array.from({ length: 10 }, (_, i) => ({
      title: `Chapter ${i + 1}`,
      summary: "Validation chapter outline.",
    })),
    blueprintIntegrity: {
      bookCoreDNA: {},
      worldLoreFoundation: {},
      characterMemoryEngine: [],
      structuralStoryArchitecture: {},
      relationshipTensionEngine: {},
      canonProtectionLayer: {
        immutableCanonRules: ["The Iron Pact forbade crossing the Salt Bridge"],
        forbiddenMutations: ["Magic has no cost"],
        priorityOrder: [],
      },
      narrativeImmersionRules: { prioritize: [], avoid: [], sceneLaws: [] },
    },
  } as BookBlueprint;
}
