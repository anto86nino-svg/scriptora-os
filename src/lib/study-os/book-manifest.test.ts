import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAndSaveStudyBookManifest,
  getCurrentStudyBookManifestId,
  getStudyBookManifest,
  readStudyBookChunkResult,
  readStudyBookChunkText,
  saveStudyBookChunkResult,
} from "@/lib/study-os/book-manifest";
import type { StudySessionResult } from "@/lib/study-session";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function longChapterBook(): string {
  return Array.from({ length: 5 }, (_, chapterIndex) => {
    const chapter = chapterIndex + 1;
    const body = Array.from(
      { length: 2600 },
      (_, wordIndex) => `chapter${chapter}_studyword_${wordIndex}`,
    ).join(" ");
    return `Chapter ${chapter}\n\n${body}`;
  }).join("\n\n");
}

function mockStudyResult(title: string): StudySessionResult {
  return {
    title,
    sourceName: `${title}.txt`,
    words: 2600,
    contentType: "textbook",
    subjectLabel: "Materiale generale",
    detectedSubject: "Materiale generale",
    difficulty: "medium",
    classification: undefined,
    summaries: undefined,
    lightSummary: "Riassunto breve",
    mediumSummary: "Riassunto completo",
    proSummary: "Scheda pro",
    studyNotesPro: "Scheda Studio Pro",
    keyConcepts: [],
    difficultWords: [],
    flashcards: [],
    openQuestions: [],
    quiz: [],
    trueFalse: [],
    exercises: [],
    conceptMap: undefined,
  };
}

describe("Study OS book manifest", () => {
  it("splits a long book into persistent study sessions without storing the full book in the manifest", () => {
    const text = longChapterBook();
    const manifest = createAndSaveStudyBookManifest(text, "Let Them Be.epub", "file");

    expect(manifest).toBeTruthy();
    expect(manifest?.chunks).toHaveLength(5);
    expect(manifest?.chunks.every((chunk) => chunk.status === "not_started")).toBe(true);
    expect(getCurrentStudyBookManifestId()).toBe(manifest?.id);

    const stored = getStudyBookManifest(manifest!.id);
    expect(stored?.chunks).toHaveLength(5);
    expect(JSON.stringify(stored).length).toBeLessThan(text.length / 4);
    expect(readStudyBookChunkText(stored!, "chunk-4")).toContain("chapter4_studyword_1200");
  });

  it("persists only the selected chunk result and leaves previous chunks not started", () => {
    const manifest = createAndSaveStudyBookManifest(longChapterBook(), "manuale.epub", "file")!;
    const ready = saveStudyBookChunkResult(manifest.id, "chunk-4", mockStudyResult("Chapter 4"));

    expect(ready?.chunks.find((chunk) => chunk.id === "chunk-4")?.status).toBe("ready");
    expect(ready?.chunks.find((chunk) => chunk.id === "chunk-1")?.status).toBe("not_started");
    expect(ready?.chunks.find((chunk) => chunk.id === "chunk-2")?.status).toBe("not_started");

    const reloaded = getStudyBookManifest(manifest.id)!;
    expect(reloaded.chunks.find((chunk) => chunk.id === "chunk-4")?.status).toBe("ready");
    expect(readStudyBookChunkResult(reloaded, "chunk-4")?.title).toBe("Chapter 4");
  });

  it("does not leave a current ghost manifest when chunk storage fails", () => {
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function setItem(key: string, value: string) {
      if (key.startsWith("scriptora-study-book-chunk-")) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    });

    expect(() => createAndSaveStudyBookManifest(longChapterBook(), "troppo-grande.epub", "file")).toThrow(/Spazio locale insufficiente/);
    expect(getCurrentStudyBookManifestId()).toBeNull();
  });
});
