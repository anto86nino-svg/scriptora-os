import { describe, expect, it } from "vitest";
import {
  buildBookMemory,
  buildScriptoraIntelligenceSnapshot,
} from "@/lib/scriptora-os/ScriptoraIntelligenceCore";
import type { BookProject, Chapter } from "@/types/book";

function chapter(title: string, content: string): Chapter {
  return { title, content, subchapters: [] };
}

function project(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "project-editorial-os",
    config: {
      title: "The Cathedral of Forgotten Souls",
      subtitle: "Every secret has a price.",
      tone: "restrained and atmospheric",
      authorStyle: "commercial literary fantasy",
      language: "English",
      genre: "fantasy",
      category: "Fiction",
      subcategory: "Dark Fantasy",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 2,
      subchaptersEnabled: false,
      characters: [
        {
          name: "Mara",
          role: "restorer",
          wound: "She abandoned her brother at the portal.",
          personality: "avoidant, proud, observant",
          relationships: "Kael is the one person she refuses to trust.",
        },
      ],
    },
    blueprint: {
      overview: "Mara must restore a forbidden portal before it consumes the duchy.",
      chapterOutlines: [],
      themes: ["memory", "debt"],
      emotionalArc: "avoidance to partial trust",
    },
    frontMatter: null,
    chapters: [],
    backMatter: null,
    phase: "chapters",
    createdAt: "2026-06-02T10:00:00.000Z",
    updatedAt: "2026-06-02T10:00:00.000Z",
    ...overrides,
  };
}

const firstChapter = chapter(
  "The Portal",
  [
    "Mara stopped in front of the sealed portal and pressed her thumb against the split stone.",
    "Kael waited behind her. He asked whether she trusted the map. She did not answer.",
    "A bell sounded under the floor. Mara noticed the black key beside the altar and promised to return before dawn.",
    "When Kael reached for it, she closed her fist around his wrist. She let go first.",
  ].join("\n\n"),
);

const secondChapter = chapter(
  "The Debt",
  [
    "The black key warmed in Mara's pocket while the cathedral emptied around them.",
    "Kael asked what she had seen beneath the altar. Mara looked at the door instead of him.",
    "She promised she would explain after they crossed the river. The bell sounded again, closer this time.",
    "Outside, someone had carved Mara's name into the frost.",
  ].join("\n\n"),
);

describe("Scriptora Intelligence Core", () => {
  it("returns honest empty-state scores before manuscript pages exist", () => {
    const snapshot = buildScriptoraIntelligenceSnapshot({
      project: project(),
      coverStatus: false,
      plan: "free",
    });

    expect(snapshot.dataStatus).toBe("insufficient-manuscript");
    expect(snapshot.bookHealthScore).toBeNull();
    expect(snapshot.kdpReadiness.score).toBeNull();
    expect(snapshot.nextBestAction.labelKey).toBe("os_core_action_first_chapter");
  });

  it("builds real continuity memory from existing manuscript pages", () => {
    const memory = buildBookMemory(project({ chapters: [firstChapter, secondChapter] }));

    expect(memory.core.chaptersIndexed).toBe(2);
    expect(memory.characterStates.some((character) => character.name === "Mara")).toBe(true);
    expect(memory.nextNarrativePromises.length).toBeGreaterThan(0);
    expect(memory.styleGuide.genre).toBe("fantasy");
  });

  it("routes a completed manuscript without cover into Cover Studio", () => {
    const snapshot = buildScriptoraIntelligenceSnapshot({
      project: project({ chapters: [firstChapter, secondChapter], phase: "complete" }),
      coverStatus: false,
      plan: "pro",
    });

    expect(snapshot.bookHealthScore).not.toBeNull();
    expect(snapshot.nextBestAction.targetArea).toBe("cover");
    expect(snapshot.nextBestAction.route).toBe("/dashboard?open=cover-studio");
  });

  it("keeps an unfinished manuscript focused on its next writing step", () => {
    const snapshot = buildScriptoraIntelligenceSnapshot({
      project: project({ chapters: [firstChapter] }),
      coverStatus: false,
      plan: "pro",
    });

    expect(snapshot.nextBestAction.targetArea).toBe("editor");
    expect(snapshot.nextBestAction.labelKey).toBe("os_core_action_continue");
    expect(snapshot.nextBestAction.chapterIndex).toBe(1);
  });
});
