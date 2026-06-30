import { describe, expect, it } from "vitest";
import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";
import { readHomeIdeaSeedFromStorage, saveHomeCreationDraft } from "@/lib/one-flow/home-creation-draft";

function readHomeIdeaSeed(): string {
  return readHomeIdeaSeedFromStorage();
}

describe("home One Flow idea seed", () => {
  it("reads draft idea from studio storage for Continua handoff", () => {
    sessionStorage.setItem(
      STUDIO_DRAFT_STORAGE_KEY,
      JSON.stringify({ idea: "thriller psicologico in un maniero", title: "Ombre" }),
    );

    expect(readHomeIdeaSeed()).toBe("thriller psicologico in un maniero");
  });

  it("returns empty string when no draft exists", () => {
    sessionStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
    expect(readHomeIdeaSeed()).toBe("");
  });

  it("seeds the canonical wizard at step 0 without generating title or subtitle", () => {
    saveHomeCreationDraft({
      idea: "Il Nome Scritto nel Buio con Elisa Ferri e un countdown di sette giorni.",
      genreHint: "Thriller",
    });

    const raw = sessionStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const draft = JSON.parse(raw || "{}");
    expect(draft.step).toBe(0);
    expect(draft.idea).toContain("Elisa Ferri");
    expect(draft.homeGenreHint).toBe("Thriller");
    expect(draft.title).toBeUndefined();
    expect(draft.subtitle).toBeUndefined();
    expect(draft.characters).toBeUndefined();
  });
});
