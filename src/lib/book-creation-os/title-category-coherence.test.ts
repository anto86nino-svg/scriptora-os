import { describe, expect, it } from "vitest";
import { computeTitleCategoryCoherence } from "./title-category-coherence";

describe("computeTitleCategoryCoherence", () => {
  it("does not warn for metaphorical literary titles with coherent idea and category", () => {
    const result = computeTitleCategoryCoherence({
      title: "Spostati di un secondo",
      idea: "Romanzo contemporaneo emozionale con amore maturo, destino, memoria e scelte irreversibili",
      genre: "philosophy",
      category: "Fiction",
      subcategory: "Literary",
      subgenre: "Romance emozionale maturo",
      bookTypeId: "literary",
    });

    expect(result.level).toBe("high");
  });

  it("does not warn for metaphorical romance titles", () => {
    const result = computeTitleCategoryCoherence({
      title: "Il rumore delle foglie",
      idea: "Storia romantica tra due persone che si ritrovano dopo anni",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: "contemporary romance",
      bookTypeId: "romance",
    });

    expect(result.level).toBe("high");
  });

  it("does not warn for contemporary narrative titles", () => {
    const result = computeTitleCategoryCoherence({
      title: "Quando il mare tace",
      idea: "Romanzo di narrativa contemporanea su memoria, famiglia e ritorno",
      genre: "philosophy",
      category: "Fiction",
      subcategory: "Literary",
      subgenre: "Narrativa contemporanea",
      bookTypeId: "literary",
    });

    expect(result.level).toBe("high");
  });

  it("does not warn for women's fiction metaphorical titles", () => {
    const result = computeTitleCategoryCoherence({
      title: "La stanza delle promesse",
      idea: "Romanzo intimo su amicizia, scelte di vita e seconda opportunità",
      genre: "romance",
      category: "Fiction",
      subcategory: "Women's Fiction",
      subgenre: "women's fiction contemporanea",
      bookTypeId: "romance",
    });

    expect(result.level).toBe("high");
  });

  it("warns for marketing manual titles paired with fantasy", () => {
    const result = computeTitleCategoryCoherence({
      title: "Manuale definitivo di marketing",
      idea: "Strategie di marketing digitale per piccole imprese",
      genre: "fantasy",
      category: "Fiction",
      subcategory: "Fantasy",
      subgenre: "epic fantasy",
      bookTypeId: "fantasy",
    });

    expect(result.level).toBe("low");
  });

  it("warns for leadership guide titles paired with romance", () => {
    const result = computeTitleCategoryCoherence({
      title: "Guida alla leadership",
      idea: "Framework pratico per manager e team leader",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: "contemporary romance",
      bookTypeId: "romance",
    });

    expect(result.level).toBe("low");
  });

  it("warns for cookbook titles paired with thriller", () => {
    const result = computeTitleCategoryCoherence({
      title: "Ricette per la friggitrice ad aria",
      idea: "100 ricette veloci e salutari per ogni giorno",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Thriller",
      subgenre: "psychological thriller",
      bookTypeId: "thriller",
    });

    expect(result.level).toBe("low");
  });
});
