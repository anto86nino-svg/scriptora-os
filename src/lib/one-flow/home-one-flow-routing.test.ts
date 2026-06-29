import { describe, expect, it } from "vitest";
import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";

function readHomeIdeaSeed(): string {
  try {
    const raw = sessionStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
    if (!raw) return "";
    const draft = JSON.parse(raw) as { idea?: string; title?: string };
    return String(draft.idea || draft.title || "").trim();
  } catch {
    return "";
  }
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
});
