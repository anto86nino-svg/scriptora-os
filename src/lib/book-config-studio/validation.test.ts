import { describe, expect, it } from "vitest";
import { validateBookConfigStudio } from "./validation";
import { normalizeBookConfig } from "./defaults";

describe("book config studio validation", () => {
  it("passes with complete config", () => {
    const config = normalizeBookConfig({
      title: "Il libro",
      language: "Italian",
      genre: "romance",
      category: "Fiction",
      subcategory: "Contemporary",
      authorName: "Lua Galli",
      numberOfChapters: 12,
      tone: "emotivo",
      targetReader: "Lettrici romance contemporaneo che cercano tensione emotiva e slow burn.",
    });
    const issues = validateBookConfigStudio(config, {
      id: "custom-test",
      name: "Lua",
      penName: "Lua Galli",
      biography: "Bio autore con almeno venti caratteri utili per la validazione.",
      voice: "Voce intima e diretta, sensoriale.",
      archetype: "Romance",
      signatureMoves: "Scene forti e dialoghi con sottotesto emotivo.",
      forbiddenMoves: "Cliché e frasi generiche da evitare sempre.",
      recurringThemes: "Amore",
    });
    expect(issues.length).toBe(0);
  });

  it("flags placeholder title", () => {
    const issues = validateBookConfigStudio(normalizeBookConfig({ title: "" }));
    expect(issues.some((i) => i.id === "title")).toBe(true);
  });

  it("preserves publishing metadata during normalization", () => {
    const config = normalizeBookConfig({
      title: "Il libro",
      publishingMetadata: {
        backendKeywords: ["focus profondo"],
        kdpCategories: ["Self-Help > Personal Growth"],
        sourceTools: ["keyword-gold"],
      },
    });

    expect(config.publishingMetadata?.backendKeywords).toContain("focus profondo");
    expect(config.publishingMetadata?.sourceTools).toContain("keyword-gold");
  });
});
