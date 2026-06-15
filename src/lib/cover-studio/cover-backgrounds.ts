import type { CSSProperties } from "react";
import type { CoverLayer } from "./cover-layers";

export type CoverBackgroundCategory =
  | "horror"
  | "dark-romance"
  | "romance"
  | "fantasy"
  | "thriller"
  | "sci-fi"
  | "self-help"
  | "business"
  | "study";

export interface CoverBackgroundPreset {
  id: string;
  name: string;
  category: CoverBackgroundCategory;
  genreTags: string[];
  previewStyle: CSSProperties;
  coverStyle: CSSProperties;
  colors: [string, string, string, string?];
  pattern: "gradient" | "radial" | "mesh" | "stripes" | "silhouette" | "noise" | "spotlight" | "grid";
  readability: "high" | "medium" | "low";
  overlays?: CoverLayer[];
}

type BgSeed = {
  id: string;
  name: string;
  category: CoverBackgroundCategory;
  tags: string[];
  colors: [string, string, string, string?];
  pattern: CoverBackgroundPreset["pattern"];
  angle?: number;
  readability?: CoverBackgroundPreset["readability"];
};

const CATEGORY_LABELS: Record<CoverBackgroundCategory, string> = {
  horror: "Horror / Dark Crime",
  "dark-romance": "Dark Romance",
  romance: "Romance",
  fantasy: "Fantasy",
  thriller: "Thriller",
  "sci-fi": "Sci-Fi",
  "self-help": "Self-help / Mindset",
  business: "Business / AI",
  study: "Study / Education",
};

const HORROR: BgSeed[] = [
  { id: "hr-fog-black", name: "Nebbia nera", category: "horror", tags: ["horror", "crime"], colors: ["#030303", "#111", "#1a0a0a", "#2d1515"], pattern: "mesh" },
  { id: "hr-blood-abstract", name: "Rosso sangue astratto", category: "horror", tags: ["horror"], colors: ["#120404", "#3b0c0c", "#6b1010", "#1a0505"], pattern: "radial", readability: "medium" },
  { id: "hr-night-forest", name: "Bosco notturno", category: "horror", tags: ["horror", "thriller"], colors: ["#020804", "#0a1f14", "#142a1a", "#051008"], pattern: "silhouette" },
  { id: "hr-gothic-house", name: "Casa gotica", category: "horror", tags: ["horror", "gothic"], colors: ["#08060e", "#1a1428", "#2a1f3d", "#0d0a14"], pattern: "silhouette" },
  { id: "hr-wall-scratches", name: "Graffi su muro", category: "horror", tags: ["crime"], colors: ["#1a1814", "#2a2620", "#3d3830", "#0f0e0c"], pattern: "stripes" },
  { id: "hr-burnt-paper", name: "Carta bruciata", category: "horror", tags: ["crime", "mystery"], colors: ["#1c1208", "#3d2810", "#5c3d18", "#0f0a06"], pattern: "noise" },
  { id: "hr-rain-glass", name: "Pioggia su vetro", category: "horror", tags: ["thriller"], colors: ["#0a1018", "#142030", "#1e3048", "#060a10"], pattern: "stripes" },
  { id: "hr-crime-scene", name: "Scena crimine astratta", category: "horror", tags: ["crime"], colors: ["#0e0a0a", "#2a1414", "#4a2020", "#180808"], pattern: "spotlight", readability: "medium" },
  { id: "hr-dark-corridor", name: "Corridoio oscuro", category: "horror", tags: ["horror"], colors: ["#050508", "#101018", "#1a1a28", "#08080c"], pattern: "gradient", angle: 180 },
  { id: "hr-moon-branches", name: "Luna e rami", category: "horror", tags: ["gothic"], colors: ["#060810", "#101828", "#1a2840", "#0a1018"], pattern: "silhouette" },
];

const DARK_ROMANCE: BgSeed[] = [
  { id: "dr-red-velvet", name: "Velluto rosso", category: "dark-romance", tags: ["dark romance"], colors: ["#1a0408", "#4a0a18", "#7f1d3a", "#2d0814"], pattern: "radial" },
  { id: "dr-dark-rose", name: "Rosa scura", category: "dark-romance", tags: ["dark romance"], colors: ["#160713", "#3b0f2d", "#5c1a42", "#0f050c"], pattern: "mesh" },
  { id: "dr-silk-shadow", name: "Ombra seta", category: "dark-romance", tags: ["luxury"], colors: ["#120810", "#2a1420", "#4a2838", "#080408"], pattern: "gradient" },
  { id: "dr-neon-luxury", name: "Neon luxury", category: "dark-romance", tags: ["luxury"], colors: ["#0a0614", "#1a0a2e", "#3d1a5c", "#f0b8c8"], pattern: "spotlight", readability: "medium" },
  { id: "dr-purple-smoke", name: "Fumo viola", category: "dark-romance", tags: ["dark romance"], colors: ["#0e0818", "#1e1038", "#3a2068", "#120818"], pattern: "mesh" },
  { id: "dr-burnt-letters", name: "Lettere bruciate", category: "dark-romance", tags: ["romance"], colors: ["#1a1008", "#3d2818", "#5c3d28", "#0f0a06"], pattern: "noise" },
  { id: "dr-broken-heart", name: "Cuore spezzato", category: "dark-romance", tags: ["dark romance"], colors: ["#140610", "#3a1028", "#6b1a42", "#0a0408"], pattern: "radial" },
  { id: "dr-night-skyline", name: "Skyline notte", category: "dark-romance", tags: ["urban"], colors: ["#060810", "#101828", "#1a2840", "#f0b8c8"], pattern: "silhouette" },
  { id: "dr-romantic-rain", name: "Pioggia romantica", category: "dark-romance", tags: ["romance"], colors: ["#0a1018", "#1a2030", "#2a3048", "#101820"], pattern: "stripes" },
  { id: "dr-candlelight", name: "Luce candela", category: "dark-romance", tags: ["romance"], colors: ["#1a1008", "#3d2810", "#6b4820", "#f5d27a"], pattern: "spotlight" },
];

const ROMANCE: BgSeed[] = [
  { id: "rm-soft-dawn", name: "Alba morbida", category: "romance", tags: ["romance"], colors: ["#fff1f5", "#f8d4e0", "#e8a8c0", "#f0b8c8"], pattern: "gradient", readability: "high" },
  { id: "rm-paris-abstract", name: "Parigi astratta", category: "romance", tags: ["romance"], colors: ["#f5efe8", "#e8d8c8", "#c8a898", "#8f6a5a"], pattern: "silhouette", readability: "high" },
  { id: "rm-delicate-flowers", name: "Fiori delicati", category: "romance", tags: ["romance"], colors: ["#fff5f8", "#fce8ef", "#f0c8d8", "#e8a0b8"], pattern: "mesh", readability: "high" },
  { id: "rm-pink-sky", name: "Cielo rosa", category: "romance", tags: ["romance"], colors: ["#fff0f5", "#ffd0e0", "#f0a0c0", "#e880a8"], pattern: "gradient", readability: "high" },
  { id: "rm-window-light", name: "Finestra con luce", category: "romance", tags: ["romance"], colors: ["#f8f0e8", "#e8d8c0", "#d0c0a0", "#a89070"], pattern: "spotlight", readability: "high" },
  { id: "rm-letter-paper", name: "Carta lettera", category: "romance", tags: ["romance"], colors: ["#f7efe0", "#e8dcc8", "#d8c8a8", "#c0a880"], pattern: "noise", readability: "high" },
  { id: "rm-poetic-beach", name: "Spiaggia poetica", category: "romance", tags: ["romance"], colors: ["#e8f4f8", "#c8e0f0", "#a0c8e0", "#78a8c8"], pattern: "gradient", readability: "high" },
  { id: "rm-pastel-spring", name: "Primavera pastello", category: "romance", tags: ["romance"], colors: ["#f0fff4", "#d8f0e0", "#b8e0c8", "#98c8a8"], pattern: "mesh", readability: "high" },
  { id: "rm-warm-bokeh", name: "Bokeh caldo", category: "romance", tags: ["romance"], colors: ["#fff8f0", "#f8e8d0", "#e8c8a0", "#d8a870"], pattern: "radial", readability: "high" },
  { id: "rm-champagne-silk", name: "Seta champagne", category: "romance", tags: ["luxury"], colors: ["#faf6f0", "#f0e8d8", "#e0d0b0", "#c8a878"], pattern: "gradient", readability: "high" },
];

const FANTASY: BgSeed[] = [
  { id: "fn-golden-kingdom", name: "Regno dorato", category: "fantasy", tags: ["fantasy"], colors: ["#1a1408", "#3d3010", "#6b5020", "#e6c36a"], pattern: "radial" },
  { id: "fn-magic-forest", name: "Foresta magica", category: "fantasy", tags: ["fantasy"], colors: ["#04120c", "#0a2818", "#144030", "#22d3a0"], pattern: "mesh" },
  { id: "fn-castle-silhouette", name: "Castello silhouette", category: "fantasy", tags: ["fantasy"], colors: ["#0a0818", "#1a1430", "#2a2050", "#4a3880"], pattern: "silhouette" },
  { id: "fn-ancient-map", name: "Mappa antica", category: "fantasy", tags: ["fantasy"], colors: ["#1c1408", "#3d3018", "#5c4828", "#8f6a3a"], pattern: "noise" },
  { id: "fn-light-portal", name: "Portale luminoso", category: "fantasy", tags: ["fantasy"], colors: ["#080818", "#101040", "#202880", "#60a0ff"], pattern: "spotlight" },
  { id: "fn-runes", name: "Rune", category: "fantasy", tags: ["fantasy"], colors: ["#0a1018", "#142030", "#1e3048", "#7dd3fc"], pattern: "grid" },
  { id: "fn-dragon-shadow", name: "Drago ombra", category: "fantasy", tags: ["fantasy"], colors: ["#080408", "#1a0a18", "#3a1430", "#6b2048"], pattern: "silhouette" },
  { id: "fn-starry-sky", name: "Cielo stellato", category: "fantasy", tags: ["fantasy"], colors: ["#020617", "#0f172a", "#1e3a5f", "#60a5fa"], pattern: "noise" },
  { id: "fn-enchanted-stone", name: "Pietra incantata", category: "fantasy", tags: ["fantasy"], colors: ["#101018", "#202030", "#303048", "#8080a0"], pattern: "mesh" },
  { id: "fn-blue-mist", name: "Nebbia blu", category: "fantasy", tags: ["fantasy"], colors: ["#04101c", "#0a2038", "#143050", "#2060a0"], pattern: "gradient" },
];

const THRILLER: BgSeed[] = [
  { id: "th-night-city", name: "Città notturna", category: "thriller", tags: ["thriller"], colors: ["#040608", "#0c1018", "#182030", "#304060"], pattern: "silhouette" },
  { id: "th-red-lines", name: "Linee rosse", category: "thriller", tags: ["thriller"], colors: ["#0a0a0a", "#1a1010", "#3a1010", "#c72d2d"], pattern: "stripes" },
  { id: "th-secret-dossier", name: "Dossier segreto", category: "thriller", tags: ["thriller"], colors: ["#1a1814", "#2a2620", "#3a3428", "#8f7a50"], pattern: "noise" },
  { id: "th-man-shadow", name: "Ombra uomo", category: "thriller", tags: ["thriller"], colors: ["#060606", "#121212", "#242424", "#404040"], pattern: "silhouette" },
  { id: "th-wet-street", name: "Strada bagnata", category: "thriller", tags: ["thriller"], colors: ["#080a10", "#101820", "#1a2838", "#283848"], pattern: "stripes" },
  { id: "th-cryptic-code", name: "Codice criptico", category: "thriller", tags: ["thriller"], colors: ["#0a0e08", "#142010", "#1e3020", "#40a060"], pattern: "grid" },
  { id: "th-crosshair", name: "Target mirino", category: "thriller", tags: ["thriller"], colors: ["#0a0a0a", "#1a1a1a", "#2a2a2a", "#c72d2d"], pattern: "radial" },
  { id: "th-cold-neon", name: "Neon freddo", category: "thriller", tags: ["thriller"], colors: ["#040818", "#081830", "#103050", "#22d3ee"], pattern: "spotlight" },
  { id: "th-broken-glass", name: "Vetro rotto", category: "thriller", tags: ["thriller"], colors: ["#101418", "#202830", "#304048", "#608090"], pattern: "mesh" },
  { id: "th-footprints", name: "Impronte", category: "thriller", tags: ["crime"], colors: ["#1a1814", "#2a2820", "#3a3830", "#5a5848"], pattern: "noise" },
];

const SCIFI: BgSeed[] = [
  { id: "sf-orbital-station", name: "Stazione orbitale", category: "sci-fi", tags: ["sci-fi"], colors: ["#020617", "#0f172a", "#1e3a5f", "#38bdf8"], pattern: "mesh" },
  { id: "sf-cyber-neon", name: "Neon cyber", category: "sci-fi", tags: ["sci-fi"], colors: ["#020408", "#0a1020", "#142040", "#a855f7"], pattern: "gradient" },
  { id: "sf-distant-planet", name: "Pianeta lontano", category: "sci-fi", tags: ["sci-fi"], colors: ["#040818", "#081830", "#103060", "#2060c0"], pattern: "radial" },
  { id: "sf-holo-grid", name: "Griglia olografica", category: "sci-fi", tags: ["sci-fi"], colors: ["#020810", "#041820", "#083040", "#22d3ee"], pattern: "grid" },
  { id: "sf-ai-lab", name: "Laboratorio AI", category: "sci-fi", tags: ["ai"], colors: ["#040a10", "#081820", "#103040", "#60a5fa"], pattern: "mesh" },
  { id: "sf-liquid-metal", name: "Metallo liquido", category: "sci-fi", tags: ["sci-fi"], colors: ["#101018", "#202028", "#404050", "#a0a8b8"], pattern: "radial" },
  { id: "sf-circuit", name: "Circuito", category: "sci-fi", tags: ["tech"], colors: ["#020810", "#041820", "#083040", "#22c55e"], pattern: "grid" },
  { id: "sf-galaxy", name: "Galassia", category: "sci-fi", tags: ["sci-fi"], colors: ["#020408", "#0a0820", "#1a1040", "#6040a0"], pattern: "mesh" },
  { id: "sf-blue-light", name: "Luce blu", category: "sci-fi", tags: ["sci-fi"], colors: ["#040818", "#081830", "#103060", "#3b82f6"], pattern: "spotlight" },
  { id: "sf-future-city", name: "Città futuristica", category: "sci-fi", tags: ["sci-fi"], colors: ["#060810", "#101828", "#1a2840", "#2563eb"], pattern: "silhouette" },
];

const SELF_HELP: BgSeed[] = [
  { id: "sh-golden-dawn", name: "Alba dorata", category: "self-help", tags: ["self-help"], colors: ["#fff8f0", "#f8e8d0", "#e8c890", "#d4af37"], pattern: "gradient", readability: "high" },
  { id: "sh-mountain", name: "Montagna", category: "self-help", tags: ["mindset"], colors: ["#e8f0f8", "#c8d8e8", "#a0b8c8", "#608090"], pattern: "silhouette", readability: "high" },
  { id: "sh-minimal-cream", name: "Minimal cream", category: "self-help", tags: ["self-help"], colors: ["#faf8f4", "#f0ece4", "#e0d8c8", "#c8c0a8"], pattern: "gradient", readability: "high" },
  { id: "sh-solar-circle", name: "Cerchio solare", category: "self-help", tags: ["mindset"], colors: ["#fffaf0", "#f8e8c0", "#e8c878", "#d4af37"], pattern: "radial", readability: "high" },
  { id: "sh-open-road", name: "Strada aperta", category: "self-help", tags: ["mindset"], colors: ["#e8f0f8", "#d0e0f0", "#a8c8e0", "#78a8c8"], pattern: "gradient", readability: "high" },
  { id: "sh-clean-gradient", name: "Gradiente pulito", category: "self-help", tags: ["self-help"], colors: ["#f8fafc", "#e8edf2", "#d0d8e0", "#a0a8b0"], pattern: "gradient", readability: "high" },
  { id: "sh-window-glow", name: "Luce da finestra", category: "self-help", tags: ["self-help"], colors: ["#faf8f4", "#f0ece0", "#e0d8c0", "#c8b898"], pattern: "spotlight", readability: "high" },
  { id: "sh-white-sheet", name: "Foglio bianco", category: "self-help", tags: ["self-help"], colors: ["#ffffff", "#f8f8f8", "#f0f0f0", "#e8e8e8"], pattern: "noise", readability: "high" },
  { id: "sh-zen-balance", name: "Equilibrio zen", category: "self-help", tags: ["mindset"], colors: ["#f0f8f4", "#d8f0e4", "#b8e0c8", "#88c0a0"], pattern: "mesh", readability: "high" },
  { id: "sh-clear-sky", name: "Cielo chiaro", category: "self-help", tags: ["mindset"], colors: ["#e8f4ff", "#c8e0f8", "#a0c8f0", "#78a8e0"], pattern: "gradient", readability: "high" },
];

const BUSINESS: BgSeed[] = [
  { id: "bz-tech-blue", name: "Blu tech", category: "business", tags: ["business", "ai"], colors: ["#020617", "#0f172a", "#1e40af", "#3b82f6"], pattern: "gradient" },
  { id: "bz-abstract-chart", name: "Grafico astratto", category: "business", tags: ["business"], colors: ["#0a1020", "#142040", "#1e3060", "#22d3ee"], pattern: "stripes" },
  { id: "bz-neural-net", name: "Rete neurale", category: "business", tags: ["ai"], colors: ["#040818", "#081830", "#103060", "#a855f7"], pattern: "mesh" },
  { id: "bz-minimal-office", name: "Ufficio minimal", category: "business", tags: ["business"], colors: ["#f8fafc", "#e8edf2", "#d0d8e0", "#101828"], pattern: "gradient", readability: "high" },
  { id: "bz-data-pattern", name: "Pattern dati", category: "business", tags: ["ai"], colors: ["#020810", "#041820", "#083040", "#22c55e"], pattern: "grid" },
  { id: "bz-gold-black", name: "Oro/nero premium", category: "business", tags: ["business"], colors: ["#000000", "#0b0b0f", "#1a1a20", "#f5d27a"], pattern: "radial" },
  { id: "bz-corporate-lines", name: "Linee corporate", category: "business", tags: ["business"], colors: ["#f0f4f8", "#d8e0e8", "#a0b0c0", "#1e40af"], pattern: "stripes", readability: "high" },
  { id: "bz-fiber-optic", name: "Fibra ottica", category: "business", tags: ["tech"], colors: ["#020408", "#0a1020", "#142040", "#22d3ee"], pattern: "mesh" },
  { id: "bz-dashboard-matrix", name: "Matrice dashboard", category: "business", tags: ["ai"], colors: ["#040a10", "#081820", "#103040", "#60a5fa"], pattern: "grid" },
  { id: "bz-executive-paper", name: "Carta executive", category: "business", tags: ["business"], colors: ["#f7efe0", "#e8dcc8", "#d0c0a0", "#8f6a3a"], pattern: "noise", readability: "high" },
];

const STUDY: BgSeed[] = [
  { id: "st-note-paper", name: "Carta appunti", category: "study", tags: ["study"], colors: ["#fffef8", "#f8f4e8", "#f0e8d0", "#e0d8c0"], pattern: "noise", readability: "high" },
  { id: "st-dark-board", name: "Lavagna scura", category: "study", tags: ["study"], colors: ["#1a2820", "#243830", "#304840", "#40a060"], pattern: "noise" },
  { id: "st-highlighter", name: "Evidenziator", category: "study", tags: ["study"], colors: ["#fffef0", "#fff8c0", "#ffe840", "#f0c020"], pattern: "stripes", readability: "high" },
  { id: "st-notebook", name: "Quaderno", category: "study", tags: ["study"], colors: ["#f8f4f0", "#e8e0d8", "#d0c8c0", "#a09890"], pattern: "stripes", readability: "high" },
  { id: "st-library", name: "Biblioteca astratta", category: "study", tags: ["study"], colors: ["#1a1408", "#2a2010", "#3a3020", "#8f6a3a"], pattern: "silhouette" },
  { id: "st-study-grid", name: "Griglia studio", category: "study", tags: ["study"], colors: ["#f0f4f8", "#d8e4f0", "#b8d0e8", "#88a8c8"], pattern: "grid", readability: "high" },
  { id: "st-mind-map", name: "Mappa mentale", category: "study", tags: ["study"], colors: ["#f8faf0", "#e8f0d8", "#c8e0b0", "#88c070"], pattern: "mesh", readability: "high" },
  { id: "st-academic-blue", name: "Blu accademico", category: "study", tags: ["study"], colors: ["#e8f0f8", "#c8d8f0", "#88a8d8", "#1e40af"], pattern: "gradient", readability: "high" },
  { id: "st-light-desk", name: "Scrivania chiara", category: "study", tags: ["study"], colors: ["#faf8f4", "#f0ece4", "#e0d8c8", "#c0b8a0"], pattern: "gradient", readability: "high" },
  { id: "st-open-pages", name: "Pagine aperte", category: "study", tags: ["study"], colors: ["#fffef8", "#f8f0e8", "#f0e0d0", "#d8c8b0"], pattern: "mesh", readability: "high" },
];

const ALL_SEEDS = [...HORROR, ...DARK_ROMANCE, ...ROMANCE, ...FANTASY, ...THRILLER, ...SCIFI, ...SELF_HELP, ...BUSINESS, ...STUDY];

function seedToPreset(seed: BgSeed): CoverBackgroundPreset {
  const [c0, c1, c2, c3] = seed.colors;
  const angle = seed.angle ?? 135;
  const gradient = `linear-gradient(${angle}deg, ${c0} 0%, ${c1} 45%, ${c2} 100%)`;
  const radial = `radial-gradient(ellipse at 50% 40%, ${c2} 0%, ${c1} 40%, ${c0} 100%)`;
  const bg = seed.pattern === "radial" || seed.pattern === "spotlight" ? radial : gradient;

  const previewStyle: CSSProperties = {
    background: bg,
    backgroundColor: c0,
  };
  const coverStyle: CSSProperties = { ...previewStyle };

  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    genreTags: seed.tags,
    previewStyle,
    coverStyle,
    colors: seed.colors,
    pattern: seed.pattern,
    readability: seed.readability ?? (seed.category === "romance" || seed.category === "self-help" || seed.category === "study" ? "high" : "medium"),
  };
}

export const COVER_BACKGROUND_PRESETS: CoverBackgroundPreset[] = ALL_SEEDS.map(seedToPreset);

export const COVER_BACKGROUND_CATEGORIES: { id: CoverBackgroundCategory | "all"; label: string }[] = [
  { id: "all", label: "Tutti" },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id: id as CoverBackgroundCategory, label })),
];

export function getBackgroundById(id: string): CoverBackgroundPreset | undefined {
  return COVER_BACKGROUND_PRESETS.find((p) => p.id === id);
}

export function filterBackgrounds(category: CoverBackgroundCategory | "all", genre?: string): CoverBackgroundPreset[] {
  let list = COVER_BACKGROUND_PRESETS;
  if (category !== "all") list = list.filter((p) => p.category === category);
  if (genre) {
    const g = genre.toLowerCase();
    const tagged = list.filter((p) => p.genreTags.some((t) => g.includes(t) || t.includes(g)));
    if (tagged.length > 0) return tagged;
  }
  return list;
}

export function recommendBackgroundForGenre(genre: string): CoverBackgroundPreset {
  const g = genre.toLowerCase();
  if (/horror|crime|gothic|noir/.test(g)) return getBackgroundById("hr-fog-black")!;
  if (/dark.?rom|ossession|miliard/.test(g)) return getBackgroundById("dr-red-velvet")!;
  if (/romance|romantico/.test(g)) return getBackgroundById("rm-soft-dawn")!;
  if (/fantasy|magia|incant/.test(g)) return getBackgroundById("fn-magic-forest")!;
  if (/thriller|suspense|psicolog/.test(g)) return getBackgroundById("th-night-city")!;
  if (/sci|futur|cyber|tech|ai/.test(g)) return getBackgroundById("sf-cyber-neon")!;
  if (/self|mindset|motivaz/.test(g)) return getBackgroundById("sh-golden-dawn")!;
  if (/business|produttiv|imprend/.test(g)) return getBackgroundById("bz-tech-blue")!;
  if (/study|manuale|esame|scuol|univers/.test(g)) return getBackgroundById("st-note-paper")!;
  return COVER_BACKGROUND_PRESETS[0];
}

export type CanvasRect = { x: number; y: number; w: number; h: number };

export function drawBackgroundPreset(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  preset: CoverBackgroundPreset,
  seed = 1,
) {
  const [c0, c1, c2, c3 = c1] = preset.colors;
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, c0);
  grad.addColorStop(0.45, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  if (preset.pattern === "radial" || preset.pattern === "spotlight") {
    const rg = ctx.createRadialGradient(rect.x + rect.w * 0.5, rect.y + rect.h * 0.35, 0, rect.x + rect.w * 0.5, rect.y + rect.h * 0.4, rect.w * 0.75);
    rg.addColorStop(0, c3);
    rg.addColorStop(0.4, `${c2}88`);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (preset.pattern === "mesh") {
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 6; i++) {
      const px = pseudo(seed + i) * rect.w;
      const py = pseudo(seed + i + 3) * rect.h;
      const r = rect.w * (0.15 + pseudo(seed + i + 6) * 0.2);
      const mg = ctx.createRadialGradient(rect.x + px, rect.y + py, 0, rect.x + px, rect.y + py, r);
      mg.addColorStop(0, c3);
      mg.addColorStop(1, "transparent");
      ctx.fillStyle = mg;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  }

  if (preset.pattern === "stripes") {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = c3;
    ctx.lineWidth = Math.max(1, rect.w * 0.003);
    for (let i = 0; i < 24; i++) {
      const offset = (i / 24) * rect.w * 1.4 - rect.w * 0.2;
      ctx.beginPath();
      ctx.moveTo(rect.x + offset, rect.y);
      ctx.lineTo(rect.x + offset + rect.h * 0.6, rect.y + rect.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (preset.pattern === "grid") {
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = c3;
    const step = rect.w * 0.08;
    for (let x = rect.x; x < rect.x + rect.w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + rect.h);
      ctx.stroke();
    }
    for (let y = rect.y; y < rect.y + rect.h; y += step) {
      ctx.beginPath();
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + rect.w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (preset.pattern === "noise" || preset.pattern === "silhouette") {
    ctx.save();
    ctx.globalAlpha = preset.pattern === "silhouette" ? 0.35 : 0.08;
    for (let i = 0; i < 80; i++) {
      const nx = rect.x + pseudo(seed + i) * rect.w;
      const ny = rect.y + pseudo(seed + i + 40) * rect.h;
      const nr = rect.w * (0.002 + pseudo(seed + i + 80) * 0.006);
      ctx.fillStyle = preset.pattern === "silhouette" ? c0 : c3;
      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fill();
    }
    if (preset.pattern === "silhouette") {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = c0;
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y + rect.h * 0.72);
      for (let i = 0; i <= 10; i++) {
        const px = rect.x + (rect.w * i) / 10;
        const py = rect.y + rect.h * (0.72 - pseudo(seed + i) * 0.08);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
      ctx.lineTo(rect.x, rect.y + rect.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawGenrePremiumOverlay(ctx, rect, preset.category, seed);
}

/** Editorial bestseller atmosphere — layered on top of procedural base. */
export function drawGenrePremiumOverlay(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  category: CoverBackgroundCategory,
  seed: number,
) {
  ctx.save();
  const [c0, c1, c2, c3 = c1] = ["#000", "#111", "#222", "#333"];

  switch (category) {
    case "thriller": {
      const fog = ctx.createRadialGradient(rect.x + rect.w * 0.5, rect.y + rect.h * 0.3, 0, rect.x + rect.w * 0.5, rect.y + rect.h * 0.35, rect.w * 0.9);
      fog.addColorStop(0, "rgba(180,200,220,0.08)");
      fog.addColorStop(1, "transparent");
      ctx.fillStyle = fog;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "rgba(200,220,255,0.35)";
      for (let i = 0; i < 18; i++) {
        const ox = pseudo(seed + i) * rect.w * 0.6 - rect.w * 0.1;
        ctx.beginPath();
        ctx.moveTo(rect.x + ox, rect.y);
        ctx.lineTo(rect.x + ox + rect.h * 0.35, rect.y + rect.h);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.arc(rect.x + rect.w * 0.78, rect.y + rect.h * 0.22, rect.w * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "dark-romance": {
      const velvet = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      velvet.addColorStop(0, "rgba(127,29,58,0.12)");
      velvet.addColorStop(0.5, "transparent");
      velvet.addColorStop(1, "rgba(230,195,106,0.08)");
      ctx.fillStyle = velvet;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 5; i++) {
        const gx = rect.x + pseudo(seed + i) * rect.w;
        const gy = rect.y + pseudo(seed + i + 2) * rect.h * 0.5;
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, rect.w * 0.18);
        rg.addColorStop(0, "rgba(240,184,200,0.2)");
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      break;
    }
    case "fantasy": {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "rgba(230,195,106,0.35)";
      for (let i = 0; i < 24; i++) {
        const px = rect.x + pseudo(seed + i) * rect.w;
        const py = rect.y + pseudo(seed + i + 12) * rect.h;
        ctx.beginPath();
        ctx.arc(px, py, rect.w * 0.003, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "rgba(125,211,252,0.4)";
      const step = rect.w * 0.14;
      for (let x = rect.x; x < rect.x + rect.w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, rect.y + rect.h * 0.2);
        ctx.lineTo(x + step * 0.3, rect.y + rect.h * 0.8);
        ctx.stroke();
      }
      break;
    }
    case "sci-fi": {
      const neon = ctx.createLinearGradient(rect.x, rect.y + rect.h, rect.x + rect.w, rect.y);
      neon.addColorStop(0, "rgba(34,211,238,0.06)");
      neon.addColorStop(0.5, "transparent");
      neon.addColorStop(1, "rgba(167,139,250,0.08)");
      ctx.fillStyle = neon;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = "rgba(56,189,248,0.25)";
      const grid = rect.w * 0.06;
      for (let x = rect.x; x < rect.x + rect.w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, rect.y);
        ctx.lineTo(x, rect.y + rect.h);
        ctx.stroke();
      }
      break;
    }
    case "self-help":
    case "business": {
      ctx.globalAlpha = 0.06;
      for (let i = 0; i < 40; i++) {
        const nx = rect.x + pseudo(seed + i) * rect.w;
        const ny = rect.y + pseudo(seed + i + 20) * rect.h;
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.15)";
        ctx.fillRect(nx, ny, rect.w * 0.002, rect.h * 0.002);
      }
      const trust = ctx.createRadialGradient(rect.x + rect.w * 0.5, rect.y + rect.h * 0.25, 0, rect.x + rect.w * 0.5, rect.y + rect.h * 0.3, rect.w * 0.65);
      trust.addColorStop(0, "rgba(255,255,255,0.1)");
      trust.addColorStop(1, "transparent");
      ctx.fillStyle = trust;
      ctx.globalAlpha = 1;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      break;
    }
    default:
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = c3;
      for (let i = 0; i < 12; i++) {
        const px = rect.x + pseudo(seed + i) * rect.w;
        const py = rect.y + pseudo(seed + i + 6) * rect.h;
        ctx.beginPath();
        ctx.arc(px, py, rect.w * 0.008, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.restore();
}

function pseudo(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
