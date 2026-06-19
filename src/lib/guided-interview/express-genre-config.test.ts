import { describe, expect, it } from "vitest";
import {
  getExpressDefaultTone,
  getExpressIdeaFieldConfig,
  getExpressLengthOptions,
  getExpressVariantMeta,
  isNonfictionExpressGenre,
} from "./express-genre-config";

describe("express-genre-config", () => {
  it("detects nonfiction genres", () => {
    expect(isNonfictionExpressGenre("self-help")).toBe(true);
    expect(isNonfictionExpressGenre("business")).toBe(true);
    expect(isNonfictionExpressGenre("manuale")).toBe(true);
    expect(isNonfictionExpressGenre("saggio")).toBe(true);
    expect(isNonfictionExpressGenre("fantasy")).toBe(false);
  });

  it("returns nonfiction idea field without protagonista", () => {
    const config = getExpressIdeaFieldConfig("self-help");
    expect(config.label).toContain("Tema / problema del lettore");
    expect(config.label.toLowerCase()).not.toContain("protagonista");
    expect(config.placeholder).toContain("paura del fallimento");
    expect(config.placeholder).not.toContain("restauratrice");
  });

  it("returns fiction idea field with narrative placeholder", () => {
    const config = getExpressIdeaFieldConfig("fantasy");
    expect(config.label).toContain("protagonista");
    expect(config.placeholder).toContain("restauratrice");
  });

  it("defaults self-help tone to pratico not oscuro", () => {
    expect(getExpressDefaultTone("self-help")).toBe("pratico");
    expect(getExpressDefaultTone("self-help")).not.toBe("oscuro");
  });

  it("uses nonfiction length labels", () => {
    const options = getExpressLengthOptions("self-help");
    expect(options.find((o) => o.value === "breve")?.label).toContain("guida rapida");
    expect(options.find((o) => o.value === "epico")?.label).toContain("esercizi");
  });

  it("uses Practical / Transformative / Deep scenario labels for nonfiction", () => {
    expect(getExpressVariantMeta("self-help", "safe").label).toContain("Practical");
    expect(getExpressVariantMeta("self-help", "commercial").label).toContain("Transformative");
    expect(getExpressVariantMeta("self-help", "bold").label).toContain("Deep");
  });

  it("keeps Safe / Commercial / Bold for fiction", () => {
    expect(getExpressVariantMeta("fantasy", "safe").label).toContain("Safe");
  });
});
