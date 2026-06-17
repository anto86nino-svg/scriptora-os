import { describe, expect, it } from "vitest";
import { buildGenreTruthLock, resolveGenreTruthFamily } from "./genre-truth-lock";

describe("genre truth lock", () => {
  it("locks dark romance as narrative fiction, not philosophy", () => {
    const lock = buildGenreTruthLock({
      genre: "Dark romance",
      bookTypeId: "dark-romance",
      category: "Fiction",
      subgenre: "dark romance psicologico",
    });

    expect(resolveGenreTruthFamily({ genre: "Dark romance" })).toBe("dark-romance");
    expect(lock).toMatch(/ROMANZO DARK ROMANCE/i);
    expect(lock).toMatch(/Vietato trasformarlo in filosofia/i);
    expect(lock).toMatch(/protagonisti|attrazione proibita|slow burn/i);
  });

  it("locks self-help as practical nonfiction", () => {
    const lock = buildGenreTruthLock({
      genre: "self-help",
      bookTypeId: "self-help",
      category: "Non-Fiction",
    });

    expect(resolveGenreTruthFamily({ genre: "self-help" })).toBe("self-help");
    expect(lock).toMatch(/SELF-HELP LOCK/i);
    expect(lock).toMatch(/metodo|esercizi|passi applicabili/i);
    expect(lock).toMatch(/Vietato trasformarlo in romanzo/i);
  });

  it("locks fantasy as world and quest narrative", () => {
    const lock = buildGenreTruthLock({
      genre: "fantasy",
      bookTypeId: "fantasy",
      category: "Fiction",
    });

    expect(resolveGenreTruthFamily({ genre: "fantasy" })).toBe("fantasy");
    expect(lock).toMatch(/FANTASY LOCK/i);
    expect(lock).toMatch(/mondo|lore|missione|magia/i);
  });

  it("locks manuals as usable step-by-step guides", () => {
    const lock = buildGenreTruthLock({
      genre: "manual",
      bookTypeId: "manual",
      category: "Manuale",
    });

    expect(resolveGenreTruthFamily({ genre: "manuale pratico" })).toBe("manual");
    expect(lock).toMatch(/MANUAL LOCK/i);
    expect(lock).toMatch(/step|checklist|applicazione/i);
  });
});
