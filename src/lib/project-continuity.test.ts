import { describe, expect, it } from "vitest";
import type { BookBlueprint, BookConfig, BookProject } from "@/types/book";
import {
  FREE_BLUEPRINT_PREVIEW_LIMIT,
  buildBlueprintPreviewProject,
  canGenerateBlueprintPreview,
  filterProjectsByLibraryTab,
  getProjectHumanStatus,
  summarizeProjectLibrary,
} from "./project-continuity";

function config(title: string): BookConfig {
  return {
    title,
    subtitle: "Sottotitolo",
    tone: "chiaro",
    authorStyle: "editoriale",
    language: "Italian",
    genre: "self-help",
    category: "Self Help",
    subcategory: "Mindset",
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 3,
    subchaptersEnabled: false,
  };
}

function blueprint(): BookBlueprint {
  return {
    overview: "Blueprint",
    themes: ["tema"],
    emotionalArc: "arco",
    chapterOutlines: [
      { title: "Uno", summary: "A" },
      { title: "Due", summary: "B" },
      { title: "Tre", summary: "C" },
    ],
  };
}

describe("project continuity", () => {
  it("allows three Free Blueprint Previews and blocks the fourth before AI", () => {
    const projects = Array.from({ length: FREE_BLUEPRINT_PREVIEW_LIMIT }, (_, index) =>
      buildBlueprintPreviewProject({ config: config(`Libro ${index}`), blueprint: blueprint(), planId: "free" }),
    );
    expect(canGenerateBlueprintPreview("free", projects.slice(0, 2)).allowed).toBe(true);
    const gate = canGenerateBlueprintPreview("free", projects);
    expect(gate.allowed).toBe(false);
    expect(gate.message).toMatch(/Blueprint Preview/);
  });

  it("summarizes and filters saved projects by human state", () => {
    const preview = buildBlueprintPreviewProject({ config: config("Preview"), blueprint: blueprint(), planId: "free" });
    const writing = {
      ...preview,
      id: "writing",
      chapters: [{ title: "Uno", content: "testo ".repeat(30), subchapters: [] }],
    } as BookProject;
    const summary = summarizeProjectLibrary([preview, writing]);
    expect(summary.total).toBe(2);
    expect(summary.writingLocked).toBe(1);
    expect(summary.writingInProgress).toBe(1);
    expect(getProjectHumanStatus(preview)).toBe("Scrittura da sbloccare");
    expect(filterProjectsByLibraryTab([preview, writing], "writing_locked")).toEqual([preview]);
  });
});
