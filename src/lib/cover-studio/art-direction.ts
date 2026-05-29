import type { CoverArtDirection, CoverMotif } from "./types";

function stableSeed(source: string): number {
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 10000;
}

const PROFILES: Array<{
  motif: CoverMotif;
  label: string;
  templateIndex: number;
  keywords: string[];
}> = [
  {
    motif: "dark-romance",
    label: "dark romance — obsessive luxury",
    templateIndex: 9,
    keywords: ["dark romance", "obsession", "mafia", "captive", "morally gray", "spicy", "toxic", "possessive"],
  },
  {
    motif: "romantasy",
    label: "romantasy — cinematic fantasy romance",
    templateIndex: 9,
    keywords: ["romantasy", "fae", "faerie", "court", "enemies to lovers fantasy", "fae romance"],
  },
  {
    motif: "thriller",
    label: "thriller cinematico",
    templateIndex: 2,
    keywords: ["thriller", "noir", "crime", "giallo", "mistero", "detective", "killer", "suspense", "horror", "paura", "segreto"],
  },
  {
    motif: "romance",
    label: "romance emozionale",
    templateIndex: 4,
    keywords: ["romance", "amore", "love", "cuore", "passione", "sentimenti", "relazione", "bacio", "desiderio", "booktok"],
  },
  {
    motif: "business",
    label: "business / self-help premium",
    templateIndex: 3,
    keywords: ["business", "self-help", "self help", "crescita", "produttivita", "successo", "mindset", "marketing", "finanza", "manuale", "guida", "authority"],
  },
  {
    motif: "fantasy",
    label: "fantasy epico",
    templateIndex: 9,
    keywords: ["fantasy", "magia", "mago", "regno", "drago", "spada", "epico", "mito", "destino", "strega", "incantesimo", "cinematic"],
  },
  {
    motif: "scifi",
    label: "sci-fi futuristico",
    templateIndex: 7,
    keywords: ["sci-fi", "scifi", "fantascienza", "futuro", "cyber", "robot", "ai", "spazio", "astronave", "tecnologia", "distopia"],
  },
  {
    motif: "memoir",
    label: "memoir editoriale",
    templateIndex: 5,
    keywords: ["memoir", "biografia", "autobiografia", "memorie", "vita", "ricordo", "famiglia", "viaggio", "testimonianza"],
  },
  {
    motif: "historical",
    label: "storico classico",
    templateIndex: 8,
    keywords: ["storico", "storia", "guerra", "antico", "medioevo", "rinascimento", "vintage", "epoca", "classico"],
  },
  {
    motif: "literary",
    label: "narrativa letteraria",
    templateIndex: 0,
    keywords: ["romanzo", "narrativa", "literary", "letterario", "dramma", "famiglia", "segreti", "citta", "psicologico", "cozy"],
  },
];

export function inferCoverArtDirection(source: string): CoverArtDirection {
  const text = source.toLowerCase();

  const ranked = PROFILES
    .map((profile) => ({
      ...profile,
      score: profile.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const fallback = PROFILES.find((p) => p.motif === "literary")!;
  const selected = best && best.score > 0 ? best : fallback;

  return {
    motif: selected.motif,
    label: selected.label,
    templateIndex: selected.templateIndex,
    seed: stableSeed(`${selected.motif}-${source}`),
  };
}
