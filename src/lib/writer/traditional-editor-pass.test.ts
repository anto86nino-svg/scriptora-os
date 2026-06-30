import { describe, expect, it } from "vitest";
import {
  TRADITIONAL_EDITOR_SYSTEM_PROMPT,
  applyTraditionalEditorLocalPrep,
  buildTraditionalEditorUserPrompt,
  meetsTraditionalEditorWordCountGuard,
  shouldApplyTraditionalEditorPass,
} from "./traditional-editor-pass";

describe("traditional-editor-pass", () => {
  it("activates for literary romance and philosophy literary fiction", () => {
    expect(shouldApplyTraditionalEditorPass({
      genre: "philosophy",
      subcategory: "Literary",
      subgenre: "Romance emozionale maturo",
    })).toBe(true);
    expect(shouldApplyTraditionalEditorPass({
      genre: "romance",
      subcategory: "Contemporary",
    })).toBe(true);
    expect(shouldApplyTraditionalEditorPass({
      genre: "narrativa",
      subgenre: "women's fiction",
    })).toBe(true);
  });

  it("does not activate for cookbook or thriller", () => {
    expect(shouldApplyTraditionalEditorPass({
      genre: "cookbook",
      subcategory: "Italian",
    })).toBe(false);
    expect(shouldApplyTraditionalEditorPass({
      genre: "thriller",
      subcategory: "Psychological",
    })).toBe(false);
  });

  it("includes mandatory editorial rules in system prompt", () => {
    const prompt = TRADITIONAL_EDITOR_SYSTEM_PROMPT({
      genre: "romance",
      characters: [{ name: "Giovanna", role: "protagonist" }],
    });
    expect(prompt).toMatch(/NON CAMBIARE LA STORIA/i);
    expect(prompt).toMatch(/NON ACCORCIARE IL TESTO/i);
    expect(prompt).toMatch(/GIOVANNA/i);
  });

  it("builds user prompt with non-shortening constraint", () => {
    const chapter = "Elisa guardò il telefono. Non sapeva cosa rispondere.";
    const prompt = buildTraditionalEditorUserPrompt(chapter, {
      config: { genre: "romance", language: "Italian" },
      chapterIndex: 0,
      chapterTitle: "La scelta",
    });
    expect(prompt).toMatch(/non accorciare/i);
    expect(prompt).toContain(chapter);
  });

  it("dedupes consecutive repeated sentences locally", () => {
    const input = "Elisa guardò il telefono. Elisa guardò il telefono. Poi rispose.";
    const output = applyTraditionalEditorLocalPrep(input);
    expect(output).toBe("Elisa guardò il telefono. Poi rispose.");
  });

  it("enforces word count guard at 95 percent", () => {
    expect(meetsTraditionalEditorWordCountGuard(1000, 950)).toBe(true);
    expect(meetsTraditionalEditorWordCountGuard(1000, 949)).toBe(false);
    expect(meetsTraditionalEditorWordCountGuard(0, 10)).toBe(true);
  });
});
