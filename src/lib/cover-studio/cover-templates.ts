import type { CoverGenreFamily, CoverTemplateMeta } from "./cover-types";

export const COVER_TEMPLATES: CoverTemplateMeta[] = [
  {
    id: "booktok-dark-romance",
    name: "BookTok Dark Romance",
    genreFamily: "dark-romance",
    bestFor: "Dark romance, miliardario, ossessione",
    layout: "Titolo grande centrato, autore in basso, accent oro/rosso",
    typographyStyle: "Serif elegante, uppercase titolo",
    palette: ["#000000", "#0b0b0f", "#343434", "#f5d27a"],
    mood: "Lussuosa, sensuale, scura",
    thumbnailStrength: 86,
    kdpFit: 84,
    booktokFit: 92,
    templateIndex: 9,
  },
  {
    id: "luxury-romance",
    name: "Luxury Romance",
    genreFamily: "luxury-romance",
    bestFor: "Romance premium, passione elegante",
    layout: "Centrato, rule accent, subtitle italic",
    typographyStyle: "Georgia serif, soft glow",
    palette: ["#160713", "#3b0f2d", "#7f1d58", "#f0b8c8"],
    mood: "Romance dusk, emotivo",
    thumbnailStrength: 82,
    kdpFit: 83,
    booktokFit: 88,
    templateIndex: 4,
  },
  {
    id: "psychological-thriller",
    name: "Psychological Thriller",
    genreFamily: "psychological-thriller",
    bestFor: "Thriller domestico, suspense psicologica",
    layout: "Alto contrasto, titolo bold, atmosfera noir",
    typographyStyle: "Times bold condensed feel",
    palette: ["#060606", "#171717", "#3b0c0c", "#d7d7d7"],
    mood: "Teso, inquietante, thumbnail-strong",
    thumbnailStrength: 90,
    kdpFit: 88,
    booktokFit: 62,
    templateIndex: 2,
  },
  {
    id: "mystery-crime",
    name: "Mystery / Crime",
    genreFamily: "mystery-crime",
    bestFor: "Giallo, crime, indagine",
    layout: "Noir smoke, accent rosso",
    typographyStyle: "Strong serif, high contrast",
    palette: ["#060606", "#171717", "#3b0c0c", "#c72d2d"],
    mood: "Noir, tensione",
    thumbnailStrength: 85,
    kdpFit: 86,
    booktokFit: 58,
    templateIndex: 2,
  },
  {
    id: "minimal-self-help",
    name: "Minimal Self-help",
    genreFamily: "self-help",
    bestFor: "Self-help, ansia, promessa chiara",
    layout: "Pulito, ivory, titolo leggibile",
    typographyStyle: "Editorial clean serif",
    palette: ["#f7efe0", "#e5d0aa", "#24211c", "#8f5f2d"],
    mood: "Chiaro, commerciale, rassicurante",
    thumbnailStrength: 84,
    kdpFit: 86,
    booktokFit: 48,
    templateIndex: 1,
  },
  {
    id: "kdp-bestseller-nonfiction",
    name: "KDP Bestseller Nonfiction",
    genreFamily: "kdp-nonfiction",
    bestFor: "Nonfiction commerciale, promessa forte",
    layout: "Emerald/gold authority",
    typographyStyle: "Palatino authority",
    palette: ["#02120c", "#064e3b", "#0f766e", "#d4af37"],
    mood: "Business/self-help premium",
    thumbnailStrength: 83,
    kdpFit: 90,
    booktokFit: 42,
    templateIndex: 3,
  },
  {
    id: "study-manual",
    name: "Study / Manual",
    genreFamily: "study-manual",
    bestFor: "Manuali studenti, metodo, esami",
    layout: "Ordinato, minimal gold accent",
    typographyStyle: "Arial clean, gerarchia chiara",
    palette: ["#f8fafc", "#e8edf2", "#101828", "#c89211"],
    mood: "Didattico, moderno, affidabile",
    thumbnailStrength: 86,
    kdpFit: 84,
    booktokFit: 38,
    templateIndex: 6,
  },
  {
    id: "cozy-fantasy",
    name: "Cozy Fantasy",
    genreFamily: "cozy-fantasy",
    bestFor: "Cozy fantasy, bookshop, tea magic",
    layout: "Warm ocean glow, soft fantasy",
    typographyStyle: "Georgia whimsical",
    palette: ["#04131c", "#075985", "#0ea5e9", "#d5f3ff"],
    mood: "Caldo, magico, BookTok-friendly",
    thumbnailStrength: 80,
    kdpFit: 78,
    booktokFit: 90,
    templateIndex: 5,
  },
  {
    id: "fantasy-cinematic",
    name: "Fantasy Cinematic",
    genreFamily: "fantasy-cinematic",
    bestFor: "Fantasy epico, saga, glow",
    layout: "Literary night, epic glow",
    typographyStyle: "Georgia epic serif",
    palette: ["#05070f", "#10233f", "#5b3b82", "#e6c36a"],
    mood: "Epico, cinematic",
    thumbnailStrength: 82,
    kdpFit: 80,
    booktokFit: 76,
    templateIndex: 0,
  },
  {
    id: "business-ai",
    name: "Business / AI",
    genreFamily: "business-ai",
    bestFor: "Business, AI, solopreneur",
    layout: "Cyber minimal tech",
    typographyStyle: "Arial modern corporate",
    palette: ["#020617", "#111827", "#2563eb", "#22d3ee"],
    mood: "Pulito, tech, autorevole",
    thumbnailStrength: 88,
    kdpFit: 87,
    booktokFit: 44,
    templateIndex: 7,
  },
];

export function getTemplateById(id: string): CoverTemplateMeta | undefined {
  return COVER_TEMPLATES.find((t) => t.id === id);
}

export function templatesForFamily(family: CoverGenreFamily): CoverTemplateMeta[] {
  return COVER_TEMPLATES.filter((t) => t.genreFamily === family || t.genreFamily === "general");
}

export function inferGenreFamily(genre?: string, title?: string, subtitle?: string): CoverGenreFamily {
  const blob = `${genre || ""} ${title || ""} ${subtitle || ""}`.toLowerCase();

  if (/dark romance|miliardario|ossessiv|romance oscur|billionaire.*obsess/.test(blob)) return "dark-romance";
  if (/romance|romanzo rosa|love story/.test(blob)) return "luxury-romance";
  if (/thriller psicolog|psychological thriller|domestic thriller|moglie|marito/.test(blob)) return "psychological-thriller";
  if (/thriller|giallo|crime|mystery|noir/.test(blob)) return "mystery-crime";
  if (/cozy fantasy|bookshop|tea magic|found family/.test(blob)) return "cozy-fantasy";
  if (/fantasy|magia|epic|saga/.test(blob)) return "fantasy-cinematic";
  if (/studio|esami|universit|manual|study|didattic/.test(blob)) return "study-manual";
  if (/business|ai|solopreneur|automation|imprenditor/.test(blob)) return "business-ai";
  if (/self-help|ansia|overthinking|motivaz|mindset|crescita/.test(blob)) return "self-help";
  if (/nonfiction|saggio|guida pratica/.test(blob)) return "kdp-nonfiction";

  return "general";
}

export function recommendTemplate(family: CoverGenreFamily): CoverTemplateMeta {
  const match = COVER_TEMPLATES.find((t) => t.genreFamily === family);
  if (match) return match;
  return COVER_TEMPLATES.find((t) => t.id === "kdp-bestseller-nonfiction")!;
}

export function buildVariants(family: CoverGenreFamily, italian: boolean): import("./cover-types").CoverVariant[] {
  const primary = recommendTemplate(family);
  const pool = COVER_TEMPLATES.filter(
    (t) => t.genreFamily === family || (family === "dark-romance" && t.genreFamily === "luxury-romance"),
  );

  const labels = italian
    ? {
        premium: "Premium",
        bold: "Bold commerciale",
        minimal: "Minimal",
        booktok: "BookTok emotivo",
        classic: "Classico genere",
      }
    : {
        premium: "Premium",
        bold: "Bold commercial",
        minimal: "Minimal",
        booktok: "BookTok emotional",
        classic: "Genre classic",
      };

  const ordered = [
    { tpl: primary, label: labels.premium, tag: "recommended" },
    { tpl: pool.find((t) => t.id !== primary.id) || COVER_TEMPLATES[2], label: labels.bold, tag: "commercial" },
    { tpl: COVER_TEMPLATES.find((t) => t.id === "minimal-self-help") || primary, label: labels.minimal, tag: "minimal" },
    { tpl: COVER_TEMPLATES.find((t) => t.booktokFit >= 85) || primary, label: labels.booktok, tag: "booktok" },
    { tpl: COVER_TEMPLATES.find((t) => t.genreFamily === family) || primary, label: labels.classic, tag: "classic" },
  ];

  const seen = new Set<string>();
  return ordered
    .filter(({ tpl }) => {
      if (seen.has(tpl.id)) return false;
      seen.add(tpl.id);
      return true;
    })
    .map(({ tpl, label }) => ({
      templateId: tpl.id,
      label,
      description: tpl.mood,
      recommendedFor: tpl.bestFor,
      score: Math.round((tpl.thumbnailStrength + tpl.kdpFit + tpl.booktokFit) / 3),
      rationale: italian
        ? `Layout ${tpl.layout} — ${tpl.typographyStyle}`
        : `Layout ${tpl.layout} — ${tpl.typographyStyle}`,
      templateIndex: tpl.templateIndex,
    }));
}
