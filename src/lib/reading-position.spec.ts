import { describe, expect, it, beforeEach } from "vitest";
import {
  buildReadingPosition,
  chapterIdFromIndex,
  clearReadingPosition,
  hasReadingBookmark,
  loadLatestReadingPosition,
  loadReadingPosition,
  readingPositionStorageKey,
  saveReadingPosition,
} from "./reading-position";

describe("reading-position", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses stable storage keys per project and chapter", () => {
    expect(readingPositionStorageKey("proj-1", "2")).toBe("scriptora-reading-position:proj-1:2");
    expect(chapterIdFromIndex(3)).toBe("3");
  });

  it("saves and loads position for a chapter", () => {
    const position = buildReadingPosition({
      projectId: "proj-1",
      chapterIndex: 1,
      sentenceIndex: 4,
      progress: 42,
      chapterContent: "First paragraph.\n\nSecond paragraph with more text.",
      sentences: ["First paragraph.", "Second paragraph with more text."],
      mode: "audio",
    });

    saveReadingPosition(position);
    const loaded = loadReadingPosition("proj-1", 1);

    expect(loaded?.sentenceIndex).toBe(4);
    expect(loaded?.progress).toBe(42);
    expect(loaded?.mode).toBe("audio");
  });

  it("clears saved position", () => {
    saveReadingPosition(
      buildReadingPosition({
        projectId: "proj-1",
        chapterIndex: 0,
        sentenceIndex: 2,
        progress: 10,
        chapterContent: "Hello world.",
        sentences: ["Hello world."],
      }),
    );

    clearReadingPosition("proj-1", 0);
    expect(loadReadingPosition("proj-1", 0)).toBeNull();
  });

  it("detects meaningful bookmarks", () => {
    expect(hasReadingBookmark(null)).toBe(false);
    expect(
      hasReadingBookmark(
        buildReadingPosition({
          projectId: "proj-1",
          chapterIndex: 0,
          sentenceIndex: 0,
          progress: 12,
          chapterContent: "Hello world.",
          sentences: ["Hello world."],
        }),
      ),
    ).toBe(true);
  });

  it("loads the latest bookmark across chapters", () => {
    saveReadingPosition(
      buildReadingPosition({
        projectId: "proj-1",
        chapterIndex: 0,
        sentenceIndex: 1,
        progress: 20,
        chapterContent: "First chapter.",
        sentences: ["First chapter."],
      }),
    );

    const newer = buildReadingPosition({
      projectId: "proj-1",
      chapterIndex: 2,
      sentenceIndex: 5,
      progress: 55,
      chapterContent: "Third chapter with more text.",
      sentences: ["Third chapter with more text."],
    });
    saveReadingPosition({ ...newer, updatedAt: new Date(Date.now() + 1000).toISOString() });

    const latest = loadLatestReadingPosition("proj-1");
    expect(latest?.chapterIndex).toBe(2);
    expect(latest?.sentenceIndex).toBe(5);
  });
});
