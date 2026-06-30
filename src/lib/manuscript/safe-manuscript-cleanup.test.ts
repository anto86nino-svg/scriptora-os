import { describe, expect, it } from "vitest";
import {
  applySafeManuscriptCleanup,
  validateManuscriptCandidate,
} from "./safe-manuscript-cleanup";

describe("safe manuscript cleanup", () => {
  it("keeps valid pre-cleaning text when cleanup produces invalid output", () => {
    const original = Array.from({ length: 340 }, (_, index) =>
      index % 17 === 0 ? "Elisa" : "testo",
    ).join(" ");

    const result = applySafeManuscriptCleanup(
      original,
      () => "# Capitolo 1",
      { label: "Capitolo 1", minWords: 300 },
    );

    expect(result.status).toBe("completed_with_warning");
    expect(result.cleanupApplied).toBe(false);
    expect(result.content).toBe(original);
    expect(result.warning).toMatch(/cleanup non applicato/i);
    expect(result.blockingError || "").not.toMatch(/Generation failed/i);
  });

  it("validates a chapter when all expected subchapters are written", () => {
    const validation = validateManuscriptCandidate("# Capitolo 1", {
      minWords: 300,
      expectedSubchapters: 3,
      writtenSubchapters: 3,
    });

    expect(validation.valid).toBe(true);
  });
});
