import { describe, expect, it } from "vitest";
import { normalizeHomeIdeaOverride, saveHomeCreationDraft } from "./home-creation-draft";
import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";

describe("home creation draft", () => {
  it("ignores click events passed by React onClick handlers", () => {
    const clickLikeEvent = { currentTarget: { tagName: "BUTTON" }, type: "click" };

    expect(normalizeHomeIdeaOverride(clickLikeEvent)).toBe("");
  });

  it("keeps string idea overrides trimmed", () => {
    expect(normalizeHomeIdeaOverride("  La Vita Che Rimandi Sempre  ")).toBe("La Vita Che Rimandi Sempre");
  });

  it("does not serialize object events as ideas", () => {
    const storage = window.sessionStorage;
    storage.clear();

    saveHomeCreationDraft({ idea: { type: "click" } as never }, storage);

    expect(storage.getItem(STUDIO_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
