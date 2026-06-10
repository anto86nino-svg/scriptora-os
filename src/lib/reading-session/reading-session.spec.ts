import { describe, expect, it } from "vitest";
import {
  appendListeningNote,
  groupNotesByChapter,
  loadListeningNotes,
  mapSentenceToParagraph,
  saveListeningNotes,
} from "@/lib/reading-session";

describe("Reading Session Pro V1", () => {
  it("maps sentences to paragraph indices", () => {
    const chapter = "First paragraph here.\n\nSecond paragraph with more detail.\n\nThird ends.";
    expect(mapSentenceToParagraph(chapter, 0, "First paragraph")).toBe(1);
    expect(mapSentenceToParagraph(chapter, 2, "Third ends")).toBe(3);
  });

  it("groups notes by chapter", () => {
    saveListeningNotes([]);
    appendListeningNote({
      id: "n1",
      projectId: "p1",
      chapterIndex: 1,
      chapterTitle: "Ch 2",
      paragraphIndex: 3,
      sentenceIndex: 5,
      noteType: "pacing-slow",
      excerpt: "test",
      sessionId: "s1",
      createdAt: new Date().toISOString(),
    });
    appendListeningNote({
      id: "n2",
      projectId: "p1",
      chapterIndex: 0,
      chapterTitle: "Ch 1",
      paragraphIndex: 1,
      sentenceIndex: 0,
      noteType: "strong-moment",
      excerpt: "beat",
      sessionId: "s1",
      createdAt: new Date().toISOString(),
    });

    const groups = groupNotesByChapter(loadListeningNotes().filter((n) => n.sessionId === "s1"));
    expect(groups.length).toBe(2);
    expect(groups[0].chapterIndex).toBe(0);
    expect(groups[1].chapterIndex).toBe(1);
  });
});
