import { describe, expect, it } from "vitest";
import { resolveChapterTitle } from "./chapter-titles";

describe("chapter title resolver", () => {
  it("rejects internal romance beats as public chapter titles", () => {
    const title = resolveChapterTitle("Forced proximity / inevitable encounter", 1, {
      config: {
        language: "Italian",
        genre: "dark gothic romance",
      },
      summary: "Celeste entra nella Sala del Sangue e trova un sigillo d'argento.",
      content:
        "Nei condotti, la coscienza artificiale ripete il falso nome di Leo. " +
        "Il bracciale di rame conserva una memoria nel ferro e un debito di sangue.",
    });

    expect(title).not.toBe("Forced proximity / inevitable encounter");
    expect(title).toMatch(/Condotti|Sangue|Sigillo|Ferro|Nome/);
  });

  it("keeps real narrative titles untouched", () => {
    expect(resolveChapterTitle("Memoria nel Ferro", 1)).toBe("Memoria nel Ferro");
  });
});
