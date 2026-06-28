import { describe, expect, it } from "vitest";
import { buildGenreSystemBlock, resolveGenreKey } from "./genre-intelligence";

describe("resolveGenreKey", () => {
  it("maps mystery to thriller, not self-help", () => {
    expect(resolveGenreKey("mystery")).toBe("thriller");
    expect(resolveGenreKey("mystery")).not.toBe("self-help");
  });

  it("maps crime and giallo to thriller", () => {
    expect(resolveGenreKey("crime")).toBe("thriller");
    expect(resolveGenreKey("giallo")).toBe("thriller");
  });

  it("builds thriller system block for mystery", () => {
    const block = buildGenreSystemBlock("mystery");
    expect(block).toMatch(/THRILLER/i);
    expect(block).not.toMatch(/SELF-HELP/i);
  });
});
