import {
  buildHorrorGothicIdentityString,
  resolveHorrorGothicDominanceGenreKey,
} from "@/lib/genre/horror-gothic-identity";

export interface GenreDominanceContract {
  genreKey:
    | "dark-romance"
    | "gothic-horror"
    | "self-help"
    | "horror"
    | "romance"
    | "friends-to-lovers"
    | "enemies-to-lovers"
    | "fantasy"
    | "thriller"
    | "sci-fi"
    | "generic";
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
  idea?: string;
}): GenreDominanceContract {
  const identity = buildHorrorGothicIdentityString({
    genre: input.genre,
    subcategory: input.subcategory,
    bookFormat: input.bookFormat,
    idea: input.idea,
  });
  const horrorKey = resolveHorrorGothicDominanceGenreKey({
    genre: input.genre,
    subcategory: input.subcategory,
    bookFormat: input.bookFormat,
    idea: input.idea,
  });

  if (horrorKey === "gothic-horror" || /gothic horror|horror gotico|folk horror/.test(identity)) {
    return {
      genreKey: "gothic-horror",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["atmosfera", "inquietudine", "decadenza", "paura"],
      optionalElements: ["casa", "luogo", "presenza", "segreto", "rituale"],
      mustNotDominate: [
        "battaglia",
        "magia epica",
        "quest",
        "regno",
        "sistema magico",
        "attrazione",
        "dinamica romantica",
        "slow burn",
        "desiderio",
      ],
      generationInstruction:
        "Horror gotico domina: atmosfera, inquietudine, decadenza e paura devono pesare piu' di azione, quest, worldbuilding fantasy o romance.",
    };
  }

  if (horrorKey === "horror" || /horror/.test(identity)) {
    return {
      genreKey: "horror",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["paura", "minaccia", "inquietudine", "conseguenza"],
      optionalElements: ["sangue", "presenza", "luogo", "rituale", "segreto"],
      mustNotDominate: ["magia epica", "destino del regno", "romance centrale", "attrazione", "slow burn"],
      generationInstruction:
        "Horror domina: la paura e la minaccia devono guidare ritmo, immagini e scelte. Fantasy o romance restano subordinati.",
    };
  }

  const normalizedIdentity = normalize([input.genre, input.subcategory, input.bookFormat, input.idea].filter(Boolean).join(" "));

  if (/friends to lovers|amici ad amanti|friend to lover/.test(normalizedIdentity)) {
    return {
      genreKey: "friends-to-lovers",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["amicizia", "prossimita", "tensione emotiva", "fiducia", "relazione"],
      optionalElements: ["segreto", "ferita", "scelta", "intimita"],
      mustNotDominate: ["indagine procedurale", "worldbuilding dominante", "magia epica", "serial killer", "desiderio proibito oscuro"],
      generationInstruction:
        "Friends-to-lovers domina: amicizia, prossimita e tensione emotiva devono guidare il payoff. Mistero o fantasy restano subordinati alla relazione.",
    };
  }

  if (/enemies to lovers|nemici che si innamorano|nemici ad amanti/.test(normalizedIdentity)) {
    return {
      genreKey: "enemies-to-lovers",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["attrito", "attrazione", "tensione emotiva", "conflitto", "relazione"],
      optionalElements: ["alleanza", "ferita", "scelta", "prossimita"],
      mustNotDominate: ["indagine procedurale", "worldbuilding dominante", "magia epica", "serial killer", "self-help"],
      generationInstruction:
        "Enemies-to-lovers domina: attrito, attrazione e conflitto emotivo devono costruire il payoff. Thriller o fantasy restano pressione sulla coppia.",
    };
  }

  if (/dark\s*romance|mafia romance/.test(normalizedIdentity)) {
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

  if (/sci\s*[-\s]?fi|science fiction|fantascienza|cyberpunk|distopi|spazio|astronave|colonia/.test(normalizedIdentity)) {
    return {
      genreKey: "sci-fi",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["tecnologia", "mondo", "conseguenza", "scelta"],
      optionalElements: ["futuro", "sistema", "minaccia", "identita", "esplorazione"],
      mustNotDominate: ["slow burn", "attrazione romantica centrale", "magia epica", "regno medievale", "self-help"],
      generationInstruction:
        "Sci-fi domina: tecnologia, worldbuilding e posta in gioco speculativa devono guidare ritmo e scelte. Romance o fantasy restano subordinati.",
    };
  }

  if (/fantasy|dark fantasy|epic fantasy|urban fantasy|magia|draghi|regno/.test(normalizedIdentity)) {
    return {
      genreKey: "fantasy",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["magia", "mondo", "destino", "conflitto"],
      optionalElements: ["regno", "quest", "alleanza", "potere", "tradimento"],
      mustNotDominate: ["self-help", "trasformazione personale", "checklist", "indagine procedurale", "serial killer"],
      generationInstruction:
        "Fantasy domina: magia, mondo e posta in gioco epica devono pesare piu' di romance accessorio o saggio travestito.",
    };
  }

  if (/thriller|mystery|giallo|noir|crime|suspense|indagine/.test(normalizedIdentity)) {
    return {
      genreKey: "thriller",
      hierarchy: ["GENERE", "SOTTOGENERE", "DNA", "IDEA_ORIGINALE"],
      requiredElements: ["minaccia", "segreto", "tensione", "rivelazione"],
      optionalElements: ["indagine", "prova", "sospetto", "pericolo", "inganno"],
      mustNotDominate: ["slow burn centrale", "payoff romantico dominante", "magia epica", "self-help", "esercizi pratici"],
      generationInstruction:
        "Thriller domina: minaccia, segreto e rivelazione devono guidare ritmo e payoff. Romance resta subordinato alla tensione investigativa.",
    };
  }

  if (/self\s*help|self-help|crescita personale|manuale|manual|workbook/.test(normalizedIdentity)) {
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

  if (/romance|romantasy/.test(normalizedIdentity)) {
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
