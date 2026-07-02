import { describe, expect, it } from "vitest";
import {
  shouldBlockAutofillGenreMutation,
  shouldBlockCloudGenreMutation,
  stripGenreFieldsFromAutofillPatch,
} from "./genre-priority";

describe("genre priority chain", () => {
  it("blocks cloud when genre is manually locked", () => {
    expect(shouldBlockCloudGenreMutation({ genreManuallyLocked: true })).toBe(true);
  });

  it("blocks cloud when detection was accepted", () => {
    expect(shouldBlockCloudGenreMutation({ genreDetectionAccepted: true })).toBe(true);
  });

  it("blocks cloud while auto-detection proposal is pending", () => {
    expect(shouldBlockCloudGenreMutation({ hasPendingAutoDetection: true })).toBe(true);
  });

  it("allows cloud when no higher-priority lock is active", () => {
    expect(shouldBlockCloudGenreMutation({})).toBe(false);
  });

  it("strips genre fields from autofill patch when locked", () => {
    const patch = stripGenreFieldsFromAutofillPatch(
      { genre: "fantasy", category: "Fiction", tone: "dark", bookTypeId: "fantasy" },
      { genreManuallyLocked: true },
    );
    expect(patch.genre).toBeUndefined();
    expect(patch.bookTypeId).toBeUndefined();
    expect(patch.tone).toBe("dark");
  });
});
