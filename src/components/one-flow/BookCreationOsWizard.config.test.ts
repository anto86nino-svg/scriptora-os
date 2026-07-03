import { describe, expect, it } from "vitest";
import {
  BOOK_CREATION_DECISIONS,
  BOOK_FLOW_REQUIRED_CONFIGURATION_FIELDS,
} from "@/components/one-flow/BookCreationOsWizard";

describe("BookCreationOsWizard configuration flow", () => {
  it("exposes the ordered eight-step book flow", () => {
    expect(BOOK_CREATION_DECISIONS).toEqual([
      "Base libro",
      "Stile e lettore",
      "Struttura",
      "Scheda libro",
      "Limiti e regole",
      "Mercato e pubblicazione",
      "Blueprint",
      "Conferma e Writer",
    ]);
  });

  it("covers the required configurable book decisions", () => {
    expect(BOOK_FLOW_REQUIRED_CONFIGURATION_FIELDS).toEqual(
      expect.arrayContaining([
        "lingua",
        "genere",
        "sottogenere",
        "lunghezza",
        "capitoli",
        "sottocapitoli",
        "tono",
        "pov",
        "finale",
        "protagonista",
        "ambientazione",
        "regole canoniche",
      ]),
    );
  });
});
