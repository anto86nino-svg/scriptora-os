import { describe, expect, it } from "vitest";
import { safeDisplayText, safeQuickSuggestionLabel, safeQuickSuggestionValue } from "@/lib/safe-display-text";

describe("safe-display-text", () => {
  it("never returns [object Object] for label/value chips", () => {
    const chip = { label: "Dark romance", value: "Dark romance psicologico" };
    expect(safeDisplayText(chip)).toBe("Dark romance");
    expect(safeQuickSuggestionLabel(chip)).toBe("Dark romance");
    expect(safeQuickSuggestionValue(chip)).toBe("Dark romance psicologico");
    expect(safeDisplayText(chip)).not.toContain("[object Object]");
  });
});
