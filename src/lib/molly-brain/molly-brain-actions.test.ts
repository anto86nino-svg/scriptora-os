import { describe, expect, it } from "vitest";
import { executeMollyQuickAction } from "./molly-brain-actions";
import type { BookProject } from "@/types/book";

function mockProject(overrides: Partial<BookProject["config"]> = {}): BookProject {
  return {
    id: "p1",
    config: {
      title: "Test",
      genre: "romance",
      subcategory: "Romance",
      language: "Italian",
      category: "Fiction",
      tone: "emotional",
      numberOfChapters: 3,
      chapterLength: "medium",
      bookLength: "medium",
      ...overrides,
    } as BookProject["config"],
    blueprint: {
      overview: "",
      emotionalArc: "",
      chapterOutlines: [{ title: "Cap 1", summary: "Due personaggi si incontrano." }],
    },
    chapters: [
      {
        title: "Cap 1",
        content:
          'Luca disse: "Ti amo da morire e non posso più farne a meno."\n\nElena rispose: "Anch\'io ti amo. È tutto così chiaro tra noi."',
        status: "done",
        subchapters: [],
      },
    ],
    frontMatter: null,
    backMatter: null,
    phase: "writing",
    messages: [],
  } as BookProject;
}

describe("executeMollyQuickAction", () => {
  it("slow_burn softens early confessions", () => {
    const project = mockProject();
    const text = project.chapters[0].content;
    const result = executeMollyQuickAction("slow_burn", {
      project,
      chapterIndex: 0,
      text,
    });
    expect(result.changed).toBe(true);
    expect(result.text.toLowerCase()).not.toContain("ti amo da morire");
  });

  it("more_human changes overly perfect dialogue", () => {
    const project = mockProject({ genre: "thriller", subcategory: "Thriller" });
    const text =
      '"I understand perfectly how you feel," she said.\n\n"I know exactly what you mean," he replied.';
    const result = executeMollyQuickAction("more_human", {
      project,
      chapterIndex: 0,
      text,
    });
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("strengthen_hook modifies opening", () => {
    const project = mockProject();
    const text = "Era una giornata normale. Tutto sembrava semplice.";
    const result = executeMollyQuickAction("strengthen_hook", {
      project,
      chapterIndex: 0,
      text,
    });
    expect(result.changed).toBe(true);
    expect(result.text).toMatch(/qualcosa|something/i);
  });
});
