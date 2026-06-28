export interface GenreDominanceContract {
  genreKey: "dark-romance" | "gothic-horror" | "self-help" | "horror" | "romance" | "generic";
  hierarchy: string[];
  requiredElements: string[];
  optionalElements: string[];
  mustNotDominate: string[];
  generationInstruction: string;
}

export interface GenreDominanceScore {
  requiredHits: string[];
  optionalHits: string[];
  forbiddenDominanceHits: string[];
  dominanceRatio: number;
  passed: boolean;
}

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hitTerms(text: string, terms: string[]): string[] {
  const hay = normalize(text);
  return terms.filter((term) => hay.includes(normalize(term)));
}

export function resolveGenreDominanceContract(input: {
  genre?: string;
  subcategory?: string;
  bookFormat?: string;
}): GenreDominanceContract {
  const identity = normalize([input.genre, input.subcategory, input.bookFormat].filter(Boolean).join(" "));

  if (/dark\s*romance|mafia romance|friends to lovers|amici ad amanti/.test(identity)) {
    return {
      genreKey: "dark-romance",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["attrazione", "desiderio", "tensione emotiva", "ferita", "relazione"],
      optionalElements: ["mistero", "pericolo", "segreto", "colpa", "ossessione"],
      mustNotDominate: ["indagine", "cold case", "serial killer", "procedura", "enigma"],
      generationInstruction:
        "Dark Romance domina: la relazione, il desiderio, la ferita e la tensione emotiva devono essere il motore. Mistero, thriller, tecnologia o fantasy possono esistere solo come pressione sulla relazione.",
    };
  }

  if (/gothic horror|horror gotico|folk horror/.test(identity)) {
    return {
      genreKey: "gothic-horror",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["atmosfera", "inquietudine", "decadenza", "paura"],
      optionalElements: ["casa", "luogo", "presenza", "segreto", "rituale"],
      mustNotDominate: ["battaglia", "magia epica", "quest", "regno", "sistema magico"],
      generationInstruction:
        "Horror gotico domina: atmosfera, inquietudine, decadenza e paura devono pesare piu' di azione, quest o worldbuilding fantasy.",
    };
  }

  if (/horror/.test(identity)) {
    return {
      genreKey: "horror",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["paura", "minaccia", "inquietudine", "conseguenza"],
      optionalElements: ["sangue", "presenza", "luogo", "rituale", "segreto"],
      mustNotDominate: ["magia epica", "destino del regno", "romance centrale"],
      generationInstruction:
        "Horror domina: la paura e la minaccia devono guidare ritmo, immagini e scelte. Fantasy o romance restano subordinati.",
    };
  }

  if (/self\s*help|self-help|crescita personale|manuale|manual|workbook/.test(identity)) {
    return {
      genreKey: "self-help",
      hierarchy: ["FORMATO", "GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["trasformazione", "strumenti", "chiarezza", "applicazione pratica"],
      optionalElements: ["esercizi", "metodo", "checklist", "esempi", "piano"],
      mustNotDominate: ["tesi astratta", "saggio generico", "protagonista", "trama"],
      generationInstruction:
        "Self Help domina: ogni output deve promettere trasformazione concreta, strumenti, chiarezza e applicazione pratica. Niente saggio astratto o romanzo travestito.",
    };
  }

  if (/romance|romantasy/.test(identity)) {
    return {
      genreKey: "romance",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["relazione", "desiderio", "tensione emotiva", "payoff"],
      optionalElements: ["segreto", "ferita", "prossimita", "scelta"],
      mustNotDominate: ["indagine procedurale", "worldbuilding dominante"],
      generationInstruction:
        "Romance domina: la relazione e il payoff emotivo devono restare il motore principale.",
    };
  }

  return {
    genreKey: "generic",
    hierarchy: ["FORMATO", "GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
    requiredElements: [],
    optionalElements: [],
    mustNotDominate: [],
    generationInstruction: "Rispetta il formato e non permettere all'idea originale di contraddire genere o DNA scelti.",
  };
}

export function scoreGenreDominance(text: string, contract: GenreDominanceContract): GenreDominanceScore {
  const requiredHits = hitTerms(text, contract.requiredElements);
  const optionalHits = hitTerms(text, contract.optionalElements);
  const forbiddenDominanceHits = hitTerms(text, contract.mustNotDominate);
  const requiredTotal = Math.max(1, contract.requiredElements.length);
  const dominanceRatio = Math.round((requiredHits.length / requiredTotal) * 100);
  const passed = contract.genreKey === "generic"
    ? true
    : dominanceRatio >= 60 && forbiddenDominanceHits.length <= Math.max(1, requiredHits.length - 2);

  return {
    requiredHits,
    optionalHits,
    forbiddenDominanceHits,
    dominanceRatio,
    passed,
  };
}
