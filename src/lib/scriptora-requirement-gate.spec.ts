import { describe, expect, it } from "vitest";
import {
  buildRequirement,
  detectExportBlock,
  summarizeEpubValidationErrors,
  getExportAuthorGap,
} from "./scriptora-requirement-gate";
import type { BookProject } from "@/types/book";

describe("scriptora-requirement-gate", () => {
  it("builds human requirement payloads", () => {
    const payload = buildRequirement("missing_chapters");
    expect(payload.title.length).toBeGreaterThan(5);
    expect(payload.why.length).toBeGreaterThan(10);
    expect(payload.actionHint.length).toBeGreaterThan(5);
    expect(payload.primaryAction.label.length).toBeGreaterThan(2);
    expect(payload.why).not.toMatch(/undefined|null/i);
  });

  it("detects missing project for export", () => {
    expect(detectExportBlock(null)).toBe("missing_project");
  });

  it("summarizes epub validation without raw technical strings", () => {
    const summary = summarizeEpubValidationErrors([
      "Chapter 1 has no content.",
      "Chapter 2 has no content.",
      "Front matter not generated.",
    ]);
    expect(summary).toBeTruthy();
    expect(summary).not.toContain("Chapter 1 has no content");
  });

  it("flags empty chapter projects", () => {
    const project = {
      config: { title: "Salt Bridge" },
      chapters: [{ title: "One", content: "", subchapters: [] }],
    } as BookProject;
    expect(detectExportBlock(project)).toBe("missing_chapters");
  });

  it("detects missing author identity for export", () => {
    const project = {
      config: { title: "Salt Bridge", authorName: "Unknown Author" },
      chapters: [{ title: "One", content: "Body", subchapters: [] }],
    } as BookProject;
    expect(getExportAuthorGap(project).needsIdentityPrompt).toBe(true);
  });
});
