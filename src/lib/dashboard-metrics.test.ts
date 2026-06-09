import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { computeDashboardMetrics } from "./dashboard-metrics";

function makeProject(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "p1",
    config: { title: "Test", genre: "fiction", numberOfChapters: 3, language: "English" } as BookProject["config"],
    chapters: [{ id: "c1", title: "Ch1", content: "one two three four five" }],
    phase: "writing",
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  } as BookProject;
}

describe("computeDashboardMetrics", () => {
  it("aggregates counts in a single pass", () => {
    const projects = [
      makeProject({ id: "a", chapters: [{ id: "c1", title: "A", content: "hello world" }] }),
      makeProject({
        id: "b",
        phase: "complete",
        chapters: [{ id: "c2", title: "B", content: "foo bar baz" }],
      }),
    ];
    const m = computeDashboardMetrics(projects, projects[0]);
    expect(m.draftCount).toBe(1);
    expect(m.completedCount).toBe(1);
    expect(m.totalChapters).toBe(2);
    expect(m.totalWords).toBe(5);
  });
});
