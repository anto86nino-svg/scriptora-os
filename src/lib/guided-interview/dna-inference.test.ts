import { describe, expect, it } from "vitest";
import { inferBookProfileFromText } from "./dna-inference";

describe("inferBookProfileFromText — horror vs thriller", () => {
  it("infers horror from horror psicologico, not thriller", () => {
    const profile = inferBookProfileFromText("horror psicologico in una casa isolata con minaccia vicina");
    expect(profile.genre).toBe("horror");
    expect(profile.genre).not.toBe("thriller");
  });

  it("still infers thriller from plain thriller psicologico", () => {
    const profile = inferBookProfileFromText("thriller psicologico con indagine e omicidio");
    expect(profile.genre).toBe("thriller");
  });
});
