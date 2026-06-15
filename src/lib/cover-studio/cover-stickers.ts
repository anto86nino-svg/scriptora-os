export type StickerSymbolKey =
  | "moon" | "star" | "rose" | "broken-heart" | "crown" | "key" | "knife" | "blood-drop"
  | "footprint" | "feather" | "pen" | "book" | "scroll" | "crystal" | "rune" | "portal"
  | "sword" | "eye" | "mask" | "compass" | "hourglass" | "divider" | "gold-frame" | "double-line"
  | "corner-deco" | "filigree" | "thin-circle" | "rect-border" | "spotlight" | "ribbon"
  | "badge-bestseller" | "badge-book1" | "badge-novel" | "label-workbook" | "label-study"
  | "smoke" | "fog" | "scratches" | "sparkles" | "bokeh" | "diagonal-light" | "paper-tex"
  | "vignette" | "dust" | "rain" | "blood-abstract" | "neon-glow" | "film-grain"
  | "checkmark" | "diagram" | "bulb" | "chart" | "target" | "growth-arrow" | "neural"
  | "brain" | "grad-cap" | "highlighter" | "flashcard" | "quiz";

export interface CoverStickerPreset {
  id: string;
  name: string;
  category: string;
  tags: string[];
  symbol: StickerSymbolKey;
  defaultStyle: {
    color?: string;
    opacity?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };
}

type StickerSeed = Omit<CoverStickerPreset, "defaultStyle"> & { defaultStyle?: CoverStickerPreset["defaultStyle"] };

const DEFAULT_STYLE = { color: "#e6c36a", opacity: 0.85, width: 18, height: 18, rotation: 0 };

function s(seed: StickerSeed): CoverStickerPreset {
  return { ...seed, defaultStyle: { ...DEFAULT_STYLE, ...seed.defaultStyle } };
}

const BOOK_GENRE: StickerSeed[] = [
  { id: "sk-moon", name: "Luna", category: "Simboli", tags: ["fantasy", "horror"], symbol: "moon" },
  { id: "sk-star", name: "Stella", category: "Simboli", tags: ["fantasy"], symbol: "star" },
  { id: "sk-rose", name: "Rosa", category: "Simboli", tags: ["romance"], symbol: "rose", defaultStyle: { color: "#f0b8c8" } },
  { id: "sk-broken-heart", name: "Cuore spezzato", category: "Simboli", tags: ["dark romance"], symbol: "broken-heart", defaultStyle: { color: "#c72d2d" } },
  { id: "sk-crown", name: "Corona", category: "Simboli", tags: ["fantasy", "luxury"], symbol: "crown" },
  { id: "sk-key", name: "Chiave", category: "Simboli", tags: ["mystery"], symbol: "key" },
  { id: "sk-knife", name: "Coltello stilizzato", category: "Simboli", tags: ["thriller"], symbol: "knife", defaultStyle: { color: "#c0c0c0" } },
  { id: "sk-blood-drop", name: "Goccia sangue", category: "Simboli", tags: ["horror"], symbol: "blood-drop", defaultStyle: { color: "#8b0000" } },
  { id: "sk-footprint", name: "Impronta", category: "Simboli", tags: ["thriller"], symbol: "footprint" },
  { id: "sk-feather", name: "Piuma", category: "Simboli", tags: ["literary"], symbol: "feather" },
  { id: "sk-pen", name: "Penna", category: "Simboli", tags: ["literary"], symbol: "pen" },
  { id: "sk-book", name: "Libro", category: "Simboli", tags: ["general"], symbol: "book" },
  { id: "sk-scroll", name: "Pergamena", category: "Simboli", tags: ["fantasy", "historical"], symbol: "scroll" },
  { id: "sk-crystal", name: "Cristallo", category: "Simboli", tags: ["fantasy"], symbol: "crystal", defaultStyle: { color: "#7dd3fc" } },
  { id: "sk-rune", name: "Runa", category: "Simboli", tags: ["fantasy"], symbol: "rune" },
  { id: "sk-portal", name: "Portale", category: "Simboli", tags: ["fantasy", "sci-fi"], symbol: "portal", defaultStyle: { color: "#a855f7" } },
  { id: "sk-sword", name: "Spada fantasy", category: "Simboli", tags: ["fantasy"], symbol: "sword" },
  { id: "sk-eye", name: "Occhio", category: "Simboli", tags: ["thriller"], symbol: "eye" },
  { id: "sk-mask", name: "Maschera", category: "Simboli", tags: ["thriller"], symbol: "mask" },
  { id: "sk-compass", name: "Bussola", category: "Simboli", tags: ["adventure"], symbol: "compass" },
  { id: "sk-hourglass", name: "Clessidra", category: "Simboli", tags: ["thriller"], symbol: "hourglass" },
];

const LINES_DECO: StickerSeed[] = [
  { id: "sk-divider", name: "Divider elegante", category: "Decorazioni", tags: ["general"], symbol: "divider", defaultStyle: { width: 60, height: 4 } },
  { id: "sk-gold-frame", name: "Cornice oro", category: "Decorazioni", tags: ["luxury"], symbol: "gold-frame", defaultStyle: { width: 85, height: 90, opacity: 0.5 } },
  { id: "sk-double-line", name: "Doppia linea", category: "Decorazioni", tags: ["general"], symbol: "double-line", defaultStyle: { width: 50, height: 6 } },
  { id: "sk-corner-deco", name: "Angoli decorativi", category: "Decorazioni", tags: ["luxury"], symbol: "corner-deco", defaultStyle: { width: 30, height: 30 } },
  { id: "sk-filigree", name: "Filigrana", category: "Decorazioni", tags: ["romance"], symbol: "filigree", defaultStyle: { width: 40, height: 40, opacity: 0.4 } },
  { id: "sk-thin-circle", name: "Cerchio sottile", category: "Decorazioni", tags: ["minimal"], symbol: "thin-circle", defaultStyle: { width: 35, height: 35 } },
  { id: "sk-rect-border", name: "Rettangolo bordo", category: "Decorazioni", tags: ["nonfiction"], symbol: "rect-border", defaultStyle: { width: 80, height: 85, opacity: 0.35 } },
  { id: "sk-spotlight-deco", name: "Spotlight", category: "Decorazioni", tags: ["drama"], symbol: "spotlight", defaultStyle: { width: 70, height: 70, opacity: 0.25 } },
  { id: "sk-ribbon", name: "Ribbon", category: "Decorazioni", tags: ["romance"], symbol: "ribbon", defaultStyle: { color: "#c72d2d" } },
  { id: "sk-badge-bestseller", name: "Badge Bestseller", category: "Badge", tags: ["marketing"], symbol: "badge-bestseller", defaultStyle: { width: 28, height: 10, color: "#f5d27a" } },
  { id: "sk-badge-book1", name: "Badge Book 1", category: "Badge", tags: ["series"], symbol: "badge-book1", defaultStyle: { width: 22, height: 8 } },
  { id: "sk-badge-novel", name: "Badge A Novel", category: "Badge", tags: ["fiction"], symbol: "badge-novel", defaultStyle: { width: 26, height: 8 } },
  { id: "sk-label-workbook", name: "Label Workbook", category: "Badge", tags: ["study"], symbol: "label-workbook", defaultStyle: { width: 30, height: 9, color: "#064e3b" } },
  { id: "sk-label-study", name: "Label Study Guide", category: "Badge", tags: ["study"], symbol: "label-study", defaultStyle: { width: 32, height: 9, color: "#1e40af" } },
];

const EFFECTS_GFX: StickerSeed[] = [
  { id: "sk-smoke", name: "Fumo", category: "Effetti", tags: ["atmosphere"], symbol: "smoke", defaultStyle: { width: 80, height: 30, opacity: 0.3 } },
  { id: "sk-fog", name: "Nebbia", category: "Effetti", tags: ["horror"], symbol: "fog", defaultStyle: { width: 100, height: 40, opacity: 0.25 } },
  { id: "sk-scratches", name: "Graffi", category: "Effetti", tags: ["horror"], symbol: "scratches", defaultStyle: { width: 60, height: 40, opacity: 0.2 } },
  { id: "sk-sparkles", name: "Scintille", category: "Effetti", tags: ["fantasy"], symbol: "sparkles", defaultStyle: { color: "#f5d27a" } },
  { id: "sk-bokeh", name: "Bokeh", category: "Effetti", tags: ["romance"], symbol: "bokeh", defaultStyle: { width: 50, height: 50, opacity: 0.2 } },
  { id: "sk-diagonal-light", name: "Luce diagonale", category: "Effetti", tags: ["cinematic"], symbol: "diagonal-light", defaultStyle: { width: 80, height: 80, opacity: 0.15 } },
  { id: "sk-paper-tex", name: "Texture carta", category: "Effetti", tags: ["nonfiction"], symbol: "paper-tex", defaultStyle: { width: 100, height: 100, opacity: 0.12 } },
  { id: "sk-vignette-deco", name: "Vignette", category: "Effetti", tags: ["cinematic"], symbol: "vignette", defaultStyle: { width: 100, height: 100, opacity: 0.35 } },
  { id: "sk-dust", name: "Polvere", category: "Effetti", tags: ["atmosphere"], symbol: "dust", defaultStyle: { opacity: 0.15 } },
  { id: "sk-rain-deco", name: "Pioggia", category: "Effetti", tags: ["thriller"], symbol: "rain", defaultStyle: { width: 100, height: 100, opacity: 0.15 } },
  { id: "sk-blood-abstract", name: "Sangue astratto", category: "Effetti", tags: ["horror"], symbol: "blood-abstract", defaultStyle: { color: "#6b1010", opacity: 0.25 } },
  { id: "sk-neon-glow", name: "Neon glow", category: "Effetti", tags: ["sci-fi"], symbol: "neon-glow", defaultStyle: { color: "#22d3ee", opacity: 0.4 } },
  { id: "sk-film-grain", name: "Grana pellicola", category: "Effetti", tags: ["cinematic"], symbol: "film-grain", defaultStyle: { width: 100, height: 100, opacity: 0.1 } },
];

const STUDY_BIZ: StickerSeed[] = [
  { id: "sk-checkmark", name: "Checkmark", category: "Study/Business", tags: ["study"], symbol: "checkmark", defaultStyle: { color: "#22c55e" } },
  { id: "sk-diagram", name: "Diagramma", category: "Study/Business", tags: ["business"], symbol: "diagram", defaultStyle: { width: 30, height: 30 } },
  { id: "sk-bulb", name: "Lampadina", category: "Study/Business", tags: ["self-help"], symbol: "bulb", defaultStyle: { color: "#f5d27a" } },
  { id: "sk-chart", name: "Grafico", category: "Study/Business", tags: ["business"], symbol: "chart", defaultStyle: { width: 28, height: 28 } },
  { id: "sk-target", name: "Target", category: "Study/Business", tags: ["business"], symbol: "target", defaultStyle: { color: "#c72d2d" } },
  { id: "sk-growth-arrow", name: "Freccia crescita", category: "Study/Business", tags: ["business"], symbol: "growth-arrow", defaultStyle: { color: "#22c55e" } },
  { id: "sk-neural", name: "Rete neurale", category: "Study/Business", tags: ["ai"], symbol: "neural", defaultStyle: { color: "#a855f7", width: 35, height: 35 } },
  { id: "sk-brain", name: "Cervello astratto", category: "Study/Business", tags: ["self-help"], symbol: "brain", defaultStyle: { width: 30, height: 30 } },
  { id: "sk-grad-cap", name: "Cappello laurea", category: "Study/Business", tags: ["study"], symbol: "grad-cap", defaultStyle: { color: "#1e40af" } },
  { id: "sk-highlighter", name: "Evidenziator", category: "Study/Business", tags: ["study"], symbol: "highlighter", defaultStyle: { color: "#ffe840" } },
  { id: "sk-flashcard", name: "Flashcard", category: "Study/Business", tags: ["study"], symbol: "flashcard", defaultStyle: { width: 24, height: 18 } },
  { id: "sk-quiz", name: "Quiz icon", category: "Study/Business", tags: ["study"], symbol: "quiz", defaultStyle: { color: "#064e3b" } },
];

// Extra symbols to reach 80+
const EXTRA: StickerSeed[] = [
  { id: "sk-moon-2", name: "Luna crescente", category: "Simboli", tags: ["fantasy"], symbol: "moon", defaultStyle: { rotation: -30 } },
  { id: "sk-star-2", name: "Stella brillante", category: "Simboli", tags: ["fantasy"], symbol: "star", defaultStyle: { color: "#fff", width: 22, height: 22 } },
  { id: "sk-rose-2", name: "Rosa scura", category: "Simboli", tags: ["dark romance"], symbol: "rose", defaultStyle: { color: "#7f1d58" } },
  { id: "sk-book-2", name: "Libro aperto", category: "Simboli", tags: ["study"], symbol: "book", defaultStyle: { width: 24, height: 20 } },
  { id: "sk-key-2", name: "Chiave antica", category: "Simboli", tags: ["mystery"], symbol: "key", defaultStyle: { color: "#8f6a3a" } },
  { id: "sk-crown-2", name: "Corona regale", category: "Simboli", tags: ["fantasy"], symbol: "crown", defaultStyle: { color: "#f5d27a", width: 28, height: 20 } },
  { id: "sk-eye-2", name: "Occhio mistico", category: "Simboli", tags: ["thriller"], symbol: "eye", defaultStyle: { color: "#22d3ee" } },
  { id: "sk-portal-2", name: "Portale magico", category: "Simboli", tags: ["fantasy"], symbol: "portal", defaultStyle: { width: 40, height: 40 } },
  { id: "sk-divider-2", name: "Linea sottile", category: "Decorazioni", tags: ["minimal"], symbol: "divider", defaultStyle: { width: 40, height: 2, opacity: 0.6 } },
  { id: "sk-gold-frame-2", name: "Cornice sottile", category: "Decorazioni", tags: ["luxury"], symbol: "gold-frame", defaultStyle: { width: 75, height: 80, opacity: 0.3 } },
  { id: "sk-smoke-2", name: "Fumo leggero", category: "Effetti", tags: ["romance"], symbol: "smoke", defaultStyle: { opacity: 0.15 } },
  { id: "sk-sparkles-2", name: "Scintille dorate", category: "Effetti", tags: ["romance"], symbol: "sparkles", defaultStyle: { width: 40, height: 40 } },
  { id: "sk-chart-2", name: "Grafico crescita", category: "Study/Business", tags: ["business"], symbol: "chart", defaultStyle: { color: "#3b82f6" } },
  { id: "sk-neural-2", name: "AI Network", category: "Study/Business", tags: ["ai"], symbol: "neural", defaultStyle: { color: "#22d3ee" } },
  { id: "sk-badge-novel-2", name: "Badge Fiction", category: "Badge", tags: ["fiction"], symbol: "badge-novel", defaultStyle: { color: "#8f5f2d" } },
  { id: "sk-feather-2", name: "Piuma elegante", category: "Simboli", tags: ["literary"], symbol: "feather", defaultStyle: { color: "#f5d27a" } },
  { id: "sk-rune-2", name: "Runa antica", category: "Simboli", tags: ["fantasy"], symbol: "rune", defaultStyle: { color: "#7dd3fc" } },
  { id: "sk-target-2", name: "Mirino", category: "Study/Business", tags: ["thriller"], symbol: "target", defaultStyle: { width: 24, height: 24 } },
  { id: "sk-bulb-2", name: "Idea lamp", category: "Study/Business", tags: ["self-help"], symbol: "bulb", defaultStyle: { color: "#ffe840" } },
  { id: "sk-ribbon-2", name: "Nastro premio", category: "Decorazioni", tags: ["romance"], symbol: "ribbon", defaultStyle: { color: "#f0b8c8" } },
];

export const COVER_STICKER_PRESETS: CoverStickerPreset[] = [
  ...BOOK_GENRE,
  ...LINES_DECO,
  ...EFFECTS_GFX,
  ...STUDY_BIZ,
  ...EXTRA,
].map(s);

export const STICKER_CATEGORIES = ["Tutti", "Simboli", "Decorazioni", "Badge", "Effetti", "Study/Business"];

export function getStickerById(id: string): CoverStickerPreset | undefined {
  return COVER_STICKER_PRESETS.find((p) => p.id === id);
}

export function filterStickers(category: string, query?: string): CoverStickerPreset[] {
  let list = COVER_STICKER_PRESETS;
  if (category && category !== "Tutti") list = list.filter((p) => p.category === category);
  if (query?.trim()) {
    const q = query.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)));
  }
  return list;
}

export type CanvasRect = { x: number; y: number; w: number; h: number };

export function drawStickerSymbol(
  ctx: CanvasRenderingContext2D,
  symbol: StickerSymbolKey,
  cx: number,
  cy: number,
  size: number,
  color: string,
  opacity: number,
  rotation = 0,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.04);
  const r = size / 2;

  switch (symbol) {
    case "moon":
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0.2, Math.PI * 2 - 0.2);
      ctx.stroke();
      ctx.globalAlpha = opacity * 0.5;
      ctx.beginPath();
      ctx.arc(r * 0.3, -r * 0.1, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "star":
      drawStar(ctx, 0, 0, 5, r, r * 0.45);
      ctx.fill();
      break;
    case "rose":
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(Math.cos(i * 1.2) * r * 0.3, Math.sin(i * 1.2) * r * 0.3, r * 0.5, r * 0.3, i * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "broken-heart":
      ctx.beginPath();
      ctx.moveTo(0, r * 0.3);
      ctx.bezierCurveTo(-r, -r * 0.5, -r * 0.2, -r, 0, -r * 0.3);
      ctx.bezierCurveTo(r * 0.2, -r, r, -r * 0.5, 0, r * 0.3);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.1);
      ctx.lineTo(r * 0.15, r * 0.2);
      ctx.stroke();
      break;
    case "crown":
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, r * 0.3);
      ctx.lineTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(0, r * 0.1);
      ctx.lineTo(r * 0.5, -r * 0.5);
      ctx.lineTo(r * 0.8, r * 0.3);
      ctx.closePath();
      ctx.stroke();
      break;
    case "book":
      ctx.strokeRect(-r * 0.6, -r * 0.7, r * 1.2, r * 1.4);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(0, r * 0.7);
      ctx.stroke();
      break;
    case "divider":
    case "double-line":
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      if (symbol === "double-line") {
        ctx.beginPath();
        ctx.moveTo(-r, r * 0.2);
        ctx.lineTo(r, r * 0.2);
        ctx.stroke();
      }
      break;
    case "gold-frame":
    case "rect-border":
      ctx.strokeRect(-r * 0.9, -r * 0.95, r * 1.8, r * 1.9);
      break;
    case "thin-circle":
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "badge-bestseller":
    case "badge-book1":
    case "badge-novel":
    case "label-workbook":
    case "label-study":
      drawBadge(ctx, symbol, r, color);
      break;
    case "smoke":
    case "fog":
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = opacity * (0.3 + i * 0.1);
        ctx.beginPath();
        ctx.ellipse(-r * 0.5 + i * r * 0.35, 0, r * 0.6, r * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "sparkles":
      for (let i = 0; i < 6; i++) {
        const sx = Math.cos(i) * r * 0.6;
        const sy = Math.sin(i * 1.3) * r * 0.6;
        drawStar(ctx, sx, sy, 4, r * 0.15, r * 0.06);
        ctx.fill();
      }
      break;
    case "checkmark":
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, 0);
      ctx.lineTo(-r * 0.1, r * 0.4);
      ctx.lineTo(r * 0.6, -r * 0.5);
      ctx.lineWidth = Math.max(2, size * 0.08);
      ctx.stroke();
      break;
    case "chart":
    case "growth-arrow":
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, r * 0.5);
      ctx.lineTo(-r * 0.2, -r * 0.1);
      ctx.lineTo(r * 0.2, r * 0.2);
      ctx.lineTo(r * 0.7, -r * 0.6);
      ctx.stroke();
      if (symbol === "growth-arrow") {
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.6);
        ctx.lineTo(r * 0.7, -r * 0.6);
        ctx.lineTo(r * 0.7, -r * 0.3);
        ctx.stroke();
      }
      break;
    case "neural":
      for (let i = 0; i < 5; i++) {
        const nx = Math.cos(i * 1.25) * r * 0.6;
        const ny = Math.sin(i * 1.25) * r * 0.6;
        ctx.beginPath();
        ctx.arc(nx, ny, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
      break;
    case "grad-cap":
      ctx.fillRect(-r * 0.8, -r * 0.1, r * 1.6, r * 0.3);
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.1);
      ctx.lineTo(0, -r * 0.7);
      ctx.lineTo(r * 0.9, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      if (["vignette", "bokeh", "paper-tex", "film-grain", "rain", "dust", "diagonal-light", "neon-glow", "blood-abstract", "scratches"].includes(symbol)) {
        ctx.globalAlpha = opacity * 0.5;
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          ctx.arc((Math.random() - 0.5) * r * 1.6, (Math.random() - 0.5) * r * 1.6, r * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
  }
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outer: number, inner: number) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outer);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
    rot += step;
  }
  ctx.lineTo(cx, cy - outer);
  ctx.closePath();
}

function drawBadge(ctx: CanvasRenderingContext2D, symbol: StickerSymbolKey, r: number, color: string) {
  const labels: Record<string, string> = {
    "badge-bestseller": "BESTSELLER",
    "badge-book1": "BOOK 1",
    "badge-novel": "A NOVEL",
    "label-workbook": "WORKBOOK",
    "label-study": "STUDY GUIDE",
  };
  const text = labels[symbol] ?? "BADGE";
  const w = r * 1.6;
  const h = r * 0.5;
  ctx.fillStyle = `${color}44`;
  ctx.strokeStyle = color;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.max(8, r * 0.22)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 0);
}

