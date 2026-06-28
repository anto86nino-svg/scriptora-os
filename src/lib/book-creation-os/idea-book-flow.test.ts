import { describe, expect, it } from "vitest";
import { buildIdeaBookDraft } from "./idea-book-flow";

describe("buildIdeaBookDraft", () => {
  it("classifies narcissism as psychology/self-help, never romance", () => {
    const draft = buildIdeaBookDraft("un libro sul narcisismo");

    expect(draft.bookFormat).toBe("self_help");
    expect(draft.genre).toBe("self-help");
    expect(`${draft.bookTypeId} ${draft.category} ${draft.subcategory}`).toMatch(/psychology|psicologia/i);
    expect(`${draft.genre} ${draft.subgenre}`).not.toMatch(/romance/i);
  });

  it("classifies Second World War as historical essay", () => {
    const draft = buildIdeaBookDraft("un libro sulla Seconda guerra mondiale");

    expect(draft.bookFormat).toBe("historical_essay");
    expect(draft.bookTypeId).toBe("history-school");
    expect(draft.subcategory).toMatch(/storia/i);
    expect(`${draft.genre} ${draft.subgenre}`).not.toMatch(/romance/i);
  });

  it("classifies tomato cultivation as practical manual", () => {
    const draft = buildIdeaBookDraft("manuale coltivazione pomodori");

    expect(["manual", "guide"]).toContain(draft.bookFormat);
    expect(draft.bookTypeId).toBe("manual");
    expect(draft.genre).toBe("manual");
    expect(draft.subchaptersEnabled).toBe(true);
  });

  it("classifies addictions as short essay or self-help, never romance", () => {
    const draft = buildIdeaBookDraft("saggio breve sulle dipendenze");

    expect(["short_essay", "essay", "self_help"]).toContain(draft.bookFormat);
    expect(draft.genre).toBe("self-help");
    expect(`${draft.bookTypeId} ${draft.subgenre}`).not.toMatch(/romance/i);
  });

  it("classifies authentic voice poetry as poetry", () => {
    const draft = buildIdeaBookDraft("raccolta poetica sulla voce autentica");

    expect(["poetry_collection", "poetic_essay"]).toContain(draft.bookFormat);
    expect(draft.genre).toBe("poetry");
    expect(draft.category).toBe("Poesia");
    expect(draft.subchaptersEnabled).toBe(false);
  });

  it("keeps poetic tone fantasy as novel/fantasy", () => {
    const draft = buildIdeaBookDraft("romanzo fantasy con tono poetico");

    expect(draft.bookFormat).toBe("novel");
    expect(draft.genre).toBe("fantasy");
    expect(draft.bookTypeId).toBe("fantasy");
  });

  it("classifies explicit dark romance as romance", () => {
    const draft = buildIdeaBookDraft("dark romance gotico");

    expect(draft.bookFormat).toBe("novel");
    expect(["dark-romance", "romance"]).toContain(draft.genre);
    expect(["dark-romance", "romance"]).toContain(draft.bookTypeId);
  });
});
