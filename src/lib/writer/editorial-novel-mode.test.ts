import { describe, expect, it } from "vitest";
import { applyEditorialNovelModePass, buildEditorialNovelModeBlock } from "./editorial-novel-mode";

describe("editorial-novel-mode", () => {
  it("builds prompt block for literary romance config", () => {
    const block = buildEditorialNovelModeBlock({
      genre: "philosophy",
      subcategory: "Literary",
      subgenre: "Romance emozionale maturo",
      bookTypeId: "literary",
    });
    expect(block).toMatch(/EDITORIAL NOVEL MODE/i);
    expect(block).toMatch(/social-media/i);
  });

  it("merges isolated short paragraphs into narrative blocks", () => {
    const input = "Elisa guardò il telefono.\n\nNon sapeva cosa rispondere.\n\n«Non posso», disse.";
    const output = applyEditorialNovelModePass(input);
    expect(output).toContain("Elisa guardò il telefono. Non sapeva cosa rispondere.");
    expect(output).toContain("«Non posso», disse.");
  });
});
