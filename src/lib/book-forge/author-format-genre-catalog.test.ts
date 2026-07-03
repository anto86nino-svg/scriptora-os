import { describe, expect, it } from "vitest";
import {
  BOOK_FORMAT_OPTIONS,
  formatForbidsNarrativeFields,
  getGenresForFormat,
  isAuthorFoundationsComplete,
  resolveAuthorFoundationsToConfig,
  type AuthorFoundations,
} from "./author-format-genre-catalog";

describe("author-format-genre-catalog", () => {
  it("lists all required book formats", () => {
    const labels = BOOK_FORMAT_OPTIONS.map((option) => option.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Romanzo",
        "Raccolta racconti",
        "Raccolta poetica",
        "Self Help",
        "Business",
        "Memoir",
        "Workbook",
        "Saggio",
        "Cookbook",
        "Libro per bambini",
        "Altro",
      ]),
    );
  });

  it("returns dynamic genres per format", () => {
    expect(getGenresForFormat("romanzo").map((g) => g.label)).toEqual(
      expect.arrayContaining(["Fantasy", "Thriller", "Horror", "Romance", "Literary Fiction"]),
    );
    expect(getGenresForFormat("raccolta_poetica").map((g) => g.label)).toEqual(
      expect.arrayContaining(["Contemporanea", "Introspettiva", "Romantica"]),
    );
    expect(getGenresForFormat("self_help").map((g) => g.label)).toEqual(
      expect.arrayContaining(["Crescita personale", "Produttività", "Mindset"]),
    );
  });

  it("requires format and genre for complete foundations", () => {
    expect(isAuthorFoundationsComplete({ formatId: "romanzo" })).toBe(false);
    expect(isAuthorFoundationsComplete({ genreId: "fantasy" } as Partial<AuthorFoundations>)).toBe(false);
    expect(isAuthorFoundationsComplete({ formatId: "romanzo", genreId: "fantasy" })).toBe(true);
    expect(
      isAuthorFoundationsComplete({
        formatId: "romanzo",
        formatLabel: "Romanzo",
        genreId: "fantasy",
        genreLabel: "Fantasy",
      }),
    ).toBe(true);
  });

  it("maps poetry foundations to poetry format — never romance genre slug", () => {
    const mapped = resolveAuthorFoundationsToConfig({
      formatId: "raccolta_poetica",
      formatLabel: "Raccolta poetica",
      genreId: "contemporanea",
      genreLabel: "Contemporanea",
    });
    expect(mapped.bookFormat).toBe("poetry_collection");
    expect(mapped.genre).toBe("poetry");
    expect(mapped.genre).not.toBe("romance");
    expect(mapped.authorFormatLocked).toBe(true);
  });

  it("maps self help foundations — never horror genre slug", () => {
    const mapped = resolveAuthorFoundationsToConfig({
      formatId: "self_help",
      formatLabel: "Self Help",
      genreId: "crescita-personale",
      genreLabel: "Crescita personale",
    });
    expect(mapped.bookFormat).toBe("self_help");
    expect(mapped.genre).toBe("self-help");
    expect(mapped.genre).not.toBe("horror");
  });

  it("flags non-narrative formats", () => {
    expect(formatForbidsNarrativeFields("raccolta_poetica")).toBe(true);
    expect(formatForbidsNarrativeFields("self_help")).toBe(true);
    expect(formatForbidsNarrativeFields("cookbook")).toBe(true);
    expect(formatForbidsNarrativeFields("romanzo")).toBe(false);
  });
});
