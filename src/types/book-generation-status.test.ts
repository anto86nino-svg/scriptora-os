import { describe, expect, it } from "vitest";
import { isGenerationCompleteStatus, isGenerationFailureStatus } from "./book";

describe("generation status truth", () => {
  it("treats warning and partial recovery as usable chapter output", () => {
    expect(isGenerationCompleteStatus("completed")).toBe(true);
    expect(isGenerationCompleteStatus("completed_with_warning")).toBe(true);
    expect(isGenerationCompleteStatus("recovered_partial")).toBe(true);
    expect(isGenerationFailureStatus("completed_with_warning")).toBe(false);
  });

  it("keeps hard failures separate from recoverable output", () => {
    expect(isGenerationFailureStatus("error")).toBe(true);
    expect(isGenerationFailureStatus("failed_empty")).toBe(true);
    expect(isGenerationFailureStatus("failed_wrong_chapter")).toBe(true);
    expect(isGenerationCompleteStatus("failed_empty")).toBe(false);
  });
});
