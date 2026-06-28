import { describe, expect, it } from "vitest";
import { inferGenreFromText } from "./genre-inference";

describe("inferGenreFromText poetry mode", () => {
  it("classifies an explicit poetry collection before any commercial genre fallback", () => {
    const inference = inferGenreFromText(
      "",
      "Voglio scrivere una raccolta poetica sulla voce autentica",
    );
    const combined = `${inference.subgenre} ${inference.narrativePromise} ${inference.commercialGoal}`;

    expect(["poetry_collection", "poetic_essay", "lyrical_prose"]).toContain(inference.bookFormat);
    expect(inference.bookTypeId).toBe("poetry");
    expect(inference.genre).toBe("poetry");
    expect(inference.level1).toBe("poesia");
    expect(combined).not.toMatch(/romance|slow burn|forced proximity|attrazione|bacio|riconciliazione/i);
  });

  it("keeps an introspective poetic book out of romance or novel defaults", () => {
    const inference = inferGenreFromText(
      "",
      "Libro poetico introspettivo su silenzio, identità e verità",
    );

    expect(["lyrical_prose", "poetic_essay"]).toContain(inference.bookFormat);
    expect(inference.bookTypeId).toBe("poetry");
    expect(inference.category).toBe("Poesia");
    expect(inference.suggestedChapters).toBeLessThanOrEqual(12);
  });

  it("preserves dark romance when the user explicitly asks for it", () => {
    const inference = inferGenreFromText(
      "",
      "Romanzo dark romance gotico con relazione romantica pericolosa e desiderio proibito",
    );

    expect(inference.bookFormat).toBe("novel");
    expect(inference.bookTypeId).toBe("dark-romance");
    expect(inference.genre).toBe("dark-romance");
    expect(inference.level1).toBe("romanzo");
  });

  it("treats poetic tone as style when the explicit form is fantasy novel", () => {
    const inference = inferGenreFromText(
      "",
      "Romanzo fantasy con tono poetico, magia antica e un regno sommerso",
    );

    expect(inference.bookFormat).toBe("novel");
    expect(inference.bookTypeId).toBe("fantasy");
    expect(inference.genre).toBe("fantasy");
    expect(inference.bookTypeId).not.toBe("poetry");
  });
});
