import { describe, expect, it } from "vitest";
import { COVER_BACKGROUND_PRESETS } from "./cover-backgrounds";
import { COVER_STICKER_PRESETS } from "./cover-stickers";
import { createDefaultLayers, migrateComposition } from "./cover-layers";

describe("cover-studio pro assets", () => {
  it("has 80+ background presets", () => {
    expect(COVER_BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(80);
  });

  it("has 80+ sticker presets", () => {
    expect(COVER_STICKER_PRESETS.length).toBeGreaterThanOrEqual(80);
  });

  it("migrates legacy cover to default text layers", () => {
    const c = migrateComposition(null, {
      title: "Test Book",
      subtitle: "A subtitle",
      author: "Author Name",
      templateId: "thriller",
      templateIndex: 2,
      backgroundPresetId: "hr-fog-black",
    });
    expect(c.layers.length).toBeGreaterThanOrEqual(3);
    expect(c.layers.some((l) => l.type === "title")).toBe(true);
    expect(c.layers.find((l) => l.type === "title")?.content).toBe("Test Book");
  });

  it("default layers include title subtitle author", () => {
    const layers = createDefaultLayers("A", "B", "C");
    expect(layers.map((l) => l.type)).toEqual(expect.arrayContaining(["title", "subtitle", "author"]));
  });
});
