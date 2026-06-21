import type { ExpressForgeInput } from "./express-forge-types";

export type ExpressScenarioVariant = "safe" | "commercial" | "bold";

const NONFICTION_GENRE_RE =
  /self-help|self help|business|manuale|manual|saggio|educational|didattic|nonfiction|non-fiction|guida|psicologia|crescita/i;

const POETRY_GENRE_RE = /poesia|poetry|lyric/i;

const FICTION_GENRE_RE =
  /romance|thriller|horror|fantasy|narrativ|fiction|giallo|noir|distopi|urban fantasy|dark romance/i;

export function isNonfictionExpressGenre(genre: string): boolean {
  return NONFICTION_GENRE_RE.test(genre);
}

export function isPoetryExpressGenre(genre: string): boolean {
  return POETRY_GENRE_RE.test(genre);
}

export function isFictionExpressGenre(genre: string): boolean {
  if (isNonfictionExpressGenre(genre) || isPoetryExpressGenre(genre)) return false;
  return FICTION_GENRE_RE.test(genre) || genre === "altro";
}

export type ExpressIdeaFieldConfig = {
  label: string;
  placeholder: string;
};

export function getExpressIdeaFieldConfig(genre: string): ExpressIdeaFieldConfig {
  if (isNonfictionExpressGenre(genre)) {
    return {
      label: "Tema / problema del lettore / trasformazione promessa",
      placeholder:
        "Es. aiutare persone bloccate dalla paura del fallimento a ricostruire fiducia, disciplina e direzione in 30 giorni…",
    };
  }
  if (isPoetryExpressGenre(genre)) {
    return {
      label: "Tema poetico / voce / atmosfera",
      placeholder:
        "Es. una raccolta sulla perdita, la rinascita e le città che restano dentro…",
    };
  }
  return {
    label: "Idea breve / protagonista / atmosfera",
    placeholder:
      "Es. una restauratrice torna nella villa dove sua sorella è morta in un incendio doloso…",
  };
}

export const EXPRESS_FICTION_TONES = [
  "oscuro",
  "emozionale",
  "commerciale",
  "poetico",
  "diretto",
  "psicologico",
  "epico",
  "didattico",
];

export const EXPRESS_NONFICTION_TONES = [
  "empatico",
  "pratico",
  "motivazionale",
  "profondo",
  "diretto",
  "spirituale",
  "scientifico",
  "trasformativo",
];

export const EXPRESS_POETRY_TONES = ["lirico", "intimo", "crudo", "contemplativo", "visivo", "minimalista"];

export function getExpressTones(genre: string): string[] {
  if (isNonfictionExpressGenre(genre)) return EXPRESS_NONFICTION_TONES;
  if (isPoetryExpressGenre(genre)) return EXPRESS_POETRY_TONES;
  return EXPRESS_FICTION_TONES;
}

export function getExpressDefaultTone(genre: string): string {
  if (isNonfictionExpressGenre(genre)) return "pratico";
  if (isPoetryExpressGenre(genre)) return "lirico";
  return "emozionale";
}

export type ExpressLengthOption = {
  value: ExpressForgeInput["length"];
  label: string;
};

export function getExpressLengthOptions(genre: string): ExpressLengthOption[] {
  if (isNonfictionExpressGenre(genre)) {
    return [
      { value: "breve", label: "breve — guida rapida (8–12 cap.)" },
      { value: "medio", label: "medio — libro pratico completo (16–24 cap.)" },
      { value: "lungo", label: "lungo — metodo approfondito (30–45 cap.)" },
      { value: "epico", label: "epico — programma completo con esercizi (60+ cap.)" },
    ];
  }
  if (isPoetryExpressGenre(genre)) {
    return [
      { value: "breve", label: "breve — 4 sezioni / circa 40 poesie" },
      { value: "medio", label: "medio — 5 sezioni / circa 60 poesie" },
      { value: "lungo", label: "lungo — 7 sezioni / circa 80 poesie" },
      { value: "epico", label: "epico — 7 sezioni dense / circa 80 poesie" },
    ];
  }
  return [
    { value: "breve", label: "breve — 8–12 capitoli" },
    { value: "medio", label: "medio — 16–24 capitoli" },
    { value: "lungo", label: "lungo — 30–45 capitoli" },
    { value: "epico", label: "epico — 60+ capitoli" },
  ];
}

export function getExpressPanelIntro(genre: string): string {
  if (isNonfictionExpressGenre(genre)) {
    return "Poche scelte essenziali. Scriptora costruisce metodo, promessa e struttura — poi ti propone 3 versioni del libro.";
  }
  if (isPoetryExpressGenre(genre)) {
    return "Poche scelte essenziali. Scriptora costruisce voce, tema e architettura della raccolta — poi ti propone 3 versioni.";
  }
  return "Poche scelte essenziali. Scriptora costruisce il libro completo e ti propone 3 versioni forti.";
}

export function getExpressVariantMeta(
  genre: string,
  variant: ExpressScenarioVariant,
): { label: string; pitch: string; risk: string; intensity: number } {
  if (isNonfictionExpressGenre(genre)) {
    const map = {
      safe: {
        label: "Libro A — Practical",
        pitch: "Pratico, chiaro, esercizi applicabili subito",
        risk: "Meno distintivo ma più accessibile al mercato mass market.",
        intensity: 0.9,
      },
      commercial: {
        label: "Libro B — Transformative",
        pitch: "Promessa forte, percorso memorabile, payoff misurabile",
        risk: "Richiede coerenza tra promessa e metodo in ogni capitolo.",
        intensity: 1,
      },
      bold: {
        label: "Libro C — Deep / Premium",
        pitch: "Profondo, premium, trasformazione identitaria",
        risk: "Più esigente — serve voce autoriale forte e esercizi consistenti.",
        intensity: 1.15,
      },
    } as const;
    return map[variant];
  }

  if (isPoetryExpressGenre(genre)) {
    const map = {
      safe: { label: "Raccolta A — Intima", pitch: "Voce coerente, immagini chiare", risk: "Meno sperimentale.", intensity: 0.9 },
      commercial: { label: "Raccolta B — Commerciale", pitch: "Hook emotivo, accessibilità", risk: "Meno letteraria.", intensity: 1 },
      bold: { label: "Raccolta C — Audace", pitch: "Immagini forti, rischio poetico", risk: "Meno universale.", intensity: 1.2 },
    } as const;
    return map[variant];
  }

  const map = {
    safe: {
      label: "Libro A — Safe",
      pitch: "Solido, coerente, payoff chiaro",
      risk: "Meno memorabile ma più stabile sul mercato.",
      intensity: 0.85,
    },
    commercial: {
      label: "Libro B — Commercial",
      pitch: "Hook forte, ritmo alto, promessa vendibile",
      risk: "Più commerciale, meno sperimentale.",
      intensity: 1,
    },
    bold: {
      label: "Libro C — Bold",
      pitch: "Intenso, memorabile, atmosfera forte",
      risk: "Più rischioso ma più distintivo.",
      intensity: 1.2,
    },
  } as const;
  return map[variant];
}

export function resolveExpressBookType(genre: string): string {
  if (isNonfictionExpressGenre(genre)) {
    if (/manuale|manual|business|educational|didattic/i.test(genre)) return "Manuale";
    return "Saggio o self-help";
  }
  if (isPoetryExpressGenre(genre)) return "Poesia";
  return "Romanzo";
}
