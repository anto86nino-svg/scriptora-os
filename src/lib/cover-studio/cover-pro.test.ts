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
    expect(c.layers.length).toBeGreaterThanOrEqual(8);
    expect(c.layers.some((l) => l.type === "title")).toBe(true);
    expect(c.layers.some((l) => l.type === "back-bio")).toBe(true);
    expect(c.layers.find((l) => l.type === "title")?.content).toBe("Test Book");
  });

  it("default layers include title subtitle author", () => {
    const layers = createDefaultLayers("A", "B", "C");
    expect(layers.map((l) => l.type)).toEqual(expect.arrayContaining(["title", "subtitle", "author"]));
  });
});

describe("cover composition utils", () => {
  it("clamps pointer percent inside cover bounds", async () => {
    const { pointerToCoverPercent } = await import("./cover-composition-utils");
    const rect = { left: 0, top: 0, width: 200, height: 400 } as DOMRect;
    expect(pointerToCoverPercent(rect, -10, 50)).toEqual({ x: 2, y: 12.5 });
    expect(pointerToCoverPercent(rect, 500, 500)).toEqual({ x: 98, y: 98 });
  });

  it("validates composition with title and background", async () => {
    const { validateCoverComposition } = await import("./cover-composition-utils");
    const c = migrateComposition(null, {
      title: "Book",
      subtitle: "",
      author: "Author",
      templateId: "thriller",
      templateIndex: 0,
      backgroundPresetId: "hr-fog-black",
    });
    expect(validateCoverComposition(c).valid).toBe(true);
  });

  it("fits open book inside viewport", async () => {
    const { computeViewportFit } = await import("./cover-viewport-fit");
    const fit = computeViewportFit({
      containerWidth: 400,
      containerHeight: 500,
      canvasWidth: 3700,
      canvasHeight: 2700,
      viewMode: "open-book",
      spec: {
        isPrint: true,
        width: 3700,
        height: 2700,
        bleedPx: 38,
        frontRect: { x: 1900, y: 38, w: 1800, h: 2700 },
        backRect: { x: 38, y: 38, w: 1800, h: 2700 },
        spineRect: { x: 1838, y: 38, w: 62, h: 2700 },
      },
      userZoom: 1,
      isMobile: true,
    });
    expect(fit.displayWidth).toBeLessThanOrEqual(400);
    expect(fit.displayHeight).toBeLessThanOrEqual(500);
  });

  it("assesses print compatibility", async () => {
    const { assessPrintCompatibility } = await import("./cover-print-check");
    const c = migrateComposition(null, {
      title: "Book",
      subtitle: "",
      author: "Author",
      templateId: "thriller",
      templateIndex: 0,
      backgroundPresetId: "hr-fog-black",
    });
    const report = assessPrintCompatibility({
      composition: c,
      score: {
        finalScore: 70,
        titleReadability: 72,
        thumbnailReadability: 65,
        genreFit: 70,
        contrast: 68,
        kdpReadiness: 70,
        authorReadability: 70,
        typography: 70,
        marketFit: 65,
        emotionalPull: 65,
        professionalPolish: 70,
        booktokPotential: 60,
        strengths: [],
        weaknesses: [],
        improvements: [],
      },
      spineWidthIn: 0.5,
      italian: true,
    });
    expect(["pass", "warning", "fail"]).toContain(report.overall);
    expect(report.items.length).toBeGreaterThan(3);
  });
});
