import { describe, expect, it, beforeEach } from "vitest";
import {
  consumeQueuedExportFix,
  queueExportFixNavigation,
  sectionForExportFix,
  shouldAutoRunExportFix,
} from "./export-fix-navigation";

describe("export-fix-navigation", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("maps chapter fixes to section ids", () => {
    expect(sectionForExportFix({ type: "generate_chapter", chapterIndex: 2 })).toBe("chapter-2");
    expect(sectionForExportFix({ type: "generate_subchapter", chapterIndex: 1, subIndex: 0 })).toBe("chapter-1-sub-0");
  });

  it("queues auto-run fixes for generation actions", () => {
    expect(shouldAutoRunExportFix({ type: "generate_chapter", chapterIndex: 0 })).toBe(true);
    expect(shouldAutoRunExportFix({ type: "open_cover" })).toBe(false);
  });

  it("stores and consumes queued fixes", () => {
    queueExportFixNavigation("book-1", { type: "generate_chapter", chapterIndex: 3 });
    expect(sessionStorage.getItem("nexora-open-project")).toBe("book-1");
    expect(sessionStorage.getItem("nexora-open-section")).toBe("chapter-3");
    expect(consumeQueuedExportFix()).toEqual({ type: "generate_chapter", chapterIndex: 3 });
    expect(consumeQueuedExportFix()).toBeNull();
  });
});
