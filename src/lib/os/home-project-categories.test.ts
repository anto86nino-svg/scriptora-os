import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import {
  categorizeHomeProjects,
  getActiveChapterLabel,
  HOME_PROJECT_CATEGORY_LABELS,
} from "@/lib/os/home-project-categories";

function project(partial: Partial<BookProject> & Pick<BookProject, "id">): BookProject {
  return {
    config: { title: "Test", genre: "fiction", language: "Italian", numberOfChapters: 3 },
    chapters: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...partial,
  } as BookProject;
}

describe("home project categories", () => {
  it("maps in-corso, pronti and pubblicati buckets", () => {
    const buckets = categorizeHomeProjects([
      project({
        id: "draft",
        chapters: [{ title: "Cap 1", content: "" }],
      }),
      project({
        id: "ready",
        chapters: [
          { title: "Cap 1", content: "x".repeat(90) },
          { title: "Cap 2", content: "x".repeat(90) },
          { title: "Cap 3", content: "x".repeat(90) },
        ],
      }),
      project({
        id: "published",
        phase: "complete",
        chapters: [
          { title: "Cap 1", content: "x".repeat(90) },
          { title: "Cap 2", content: "x".repeat(90) },
          { title: "Cap 3", content: "x".repeat(90) },
        ],
        frontMatter: { dedication: "d" } as any,
        backMatter: { epilogue: "e" } as any,
      }),
    ]);

    expect(HOME_PROJECT_CATEGORY_LABELS.in_corso).toBe("In corso");
    expect(buckets.in_corso.some((item) => item.id === "draft")).toBe(true);
    expect(buckets.pronti.some((item) => item.id === "ready")).toBe(true);
    expect(buckets.pubblicati.some((item) => item.id === "published")).toBe(true);
  });

  it("returns current chapter label from first incomplete chapter", () => {
    const label = getActiveChapterLabel(
      project({
        id: "writing",
        chapters: [
          { title: "Prologo", content: "x".repeat(90) },
          { title: "Il viaggio", content: "" },
        ],
      }),
    );
    expect(label).toBe("Il viaggio");
  });
});
