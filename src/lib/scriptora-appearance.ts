export const SCRIPTORA_APPEARANCE_KEY = "scriptora-appearance-v1";
/** @deprecated pre-unification duplicate; read fallback only */
export const SCRIPTORA_APPEARANCE_LEGACY_KEY = "scriptora-appearance-settings-v0";
export const SCRIPTORA_APPEARANCE_OLD_SETTINGS_KEY = "scriptora-appearance-settings";
export const SCRIPTORA_CUSTOM_BACKGROUND_KEY = "scriptora-custom-background-data-url-v1";

export type ScriptoraBackgroundId =
  | "midnight-ink" | "dark-academia" | "velvet-night" | "obsidian" | "storm-library"
  | "moonlit-paper" | "desert-noir" | "crimson-rose" | "deep-ocean" | "forest-myth"
  | "golden-desk" | "arctic-glass" | "purple-dream" | "coffee-writer" | "cinematic-blue"
  | "gothic-violet" | "soft-parchment" | "emerald-focus" | "blood-moon" | "clean-pro"
  | "paris-cafe" | "fantasy-kingdom" | "luxury-penthouse" | "gothic-manor" | "noir-office"
  | "old-library" | "vintage-manuscript" | "publisher-office" | "ocean-morning"
  | "coffee-house" | "tokyo-night" | "tuscany-writer" | "nordic-cabin" | "ancient-rome"
  // Premium immersive theme packs
  | "horror-crime-lab" | "dark-romance-velvet" | "fantasy-throne" | "scifi-intel-lab" | "classic-premium-author"
  | "literary-espresso"
  | "custom-personal";

export type ScriptoraThemeCategory =
  | "horror-crime"
  | "dark-romance"
  | "fantasy"
  | "scifi"
  | "classic-premium"
  | "atmosphere"
  | "minimal"
  | "personal";

export type ScriptoraWritingFont = "system" | "serif" | "literary" | "mono" | "editorial" | "classic";

export interface ScriptoraAppearanceSettings {
  backgroundId: ScriptoraBackgroundId;
  writingFont: ScriptoraWritingFont;
}

export interface ScriptoraThemeGroup {
  category: ScriptoraThemeCategory;
  label: string;
  subtitle: string;
  /** Atmospheric microcopy shown under key feature labels when this theme is active */
  featureSubtitles?: Record<string, string>;
}

export const SCRIPTORA_THEME_GROUPS: ScriptoraThemeGroup[] = [
  {
    category: "horror-crime",
    label: "Horror / Dark Crime",
    subtitle: "Psychological thriller • Gothic noir • Investigation atmosphere",
    featureSubtitles: {
      writer_studio: "Shape tension, dread and emotional impact",
      character_studio: "Secrets, wounds and psychological fractures",
      market_intelligence: "Reader tension and bingeability",
      kdp_launch: "Commercial positioning and dark-market momentum",
      export_studio: "Prepare your final manuscript",
    },
  },
  {
    category: "dark-romance",
    label: "Dark Romance Luxury",
    subtitle: "Black velvet • Warm gold • Intimate cinematic luxury",
    featureSubtitles: {
      writer_studio: "Craft desire, longing and emotional stakes",
      character_studio: "Hearts, wounds and unspoken secrets",
      market_intelligence: "BookTok momentum and reader obsession",
      kdp_launch: "Romance market positioning and series potential",
      export_studio: "Prepare your final manuscript",
    },
  },
  {
    category: "fantasy",
    label: "Fantasy Kingdom",
    subtitle: "Throne room • Magical library • Cinematic epic light",
    featureSubtitles: {
      writer_studio: "Build worlds, lore and legendary arcs",
      character_studio: "Heroes, prophecies, wounds and destinies",
      market_intelligence: "Epic fantasy audience and series momentum",
      kdp_launch: "World-building commercial positioning",
      export_studio: "Prepare your final manuscript",
    },
  },
  {
    category: "scifi",
    label: "Sci-Fi Intelligence Lab",
    subtitle: "Neural interfaces • Holographic UI • Cinematic minimalism",
    featureSubtitles: {
      writer_studio: "Engineer precision narrative and speculative arcs",
      character_studio: "Identity, technology and human fractures",
      market_intelligence: "Hard sci-fi and futurism reader intelligence",
      kdp_launch: "Tech-forward market positioning",
      export_studio: "Prepare your final manuscript",
    },
  },
  {
    category: "classic-premium",
    label: "Classic Premium Author",
    subtitle: "Luxury publishing house • Editorial precision • Premium typography",
    featureSubtitles: {
      writer_studio: "Craft with authority and editorial mastery",
      character_studio: "Character psychology and literary depth",
      market_intelligence: "Literary and crossover market positioning",
      kdp_launch: "Prestige author commercial strategy",
      export_studio: "Prepare your final manuscript",
    },
  },
  {
    category: "atmosphere",
    label: "Atmospheres",
    subtitle: "Immersive writing environments",
  },
  {
    category: "minimal",
    label: "Minimal & Clean",
    subtitle: "Pure focus, no distraction",
  },
  {
    category: "personal",
    label: "Personal",
    subtitle: "Your space, your rules",
  },
];

export const SCRIPTORA_BACKGROUNDS: Array<{ id: ScriptoraBackgroundId; name: string; description: string; css: string; category: ScriptoraThemeCategory; }> = [
  // ── Premium Immersive Theme Packs ──────────────────────────────────────────
  { category: "horror-crime", id: "horror-crime-lab", name: "🔪 Horror / Dark Crime", description: "Cinematic darkness, rain, candle glass, investigation board. Enter the dangerous story laboratory.", css: "radial-gradient(ellipse at 20% 10%, rgba(180,14,14,.22), transparent 38%), radial-gradient(ellipse at 80% 90%, rgba(60,20,80,.18), transparent 36%), linear-gradient(160deg, #050206 0%, #100308 40%, #0a0510 70%, #020102 100%)" },
  { category: "dark-romance", id: "dark-romance-velvet", name: "🥀 Dark Romance Luxury", description: "Black velvet, deep crimson, warm gold. Intimate luxury for your bestselling romance universe.", css: "radial-gradient(ellipse at 30% 15%, rgba(200,30,60,.26), transparent 40%), radial-gradient(ellipse at 75% 85%, rgba(180,120,20,.14), transparent 38%), linear-gradient(150deg, #0c0105 0%, #1e0510 45%, #100208 75%, #050102 100%)" },
  { category: "fantasy", id: "fantasy-throne", name: "🏰 Fantasy Kingdom", description: "Throne room, magical library, ancient maps. Build your epic world in premium cinematic light.", css: "radial-gradient(ellipse at 50% 0%, rgba(120,80,200,.22), transparent 44%), radial-gradient(ellipse at 20% 80%, rgba(40,120,80,.16), transparent 38%), linear-gradient(160deg, #04030f 0%, #0e0820 45%, #060d10 75%, #020208 100%)" },
  { category: "scifi", id: "scifi-intel-lab", name: "🧠 Sci-Fi Intelligence Lab", description: "Neural interfaces, holographic UI, Apple-grade cinematic minimalism. Engineer your bestseller.", css: "radial-gradient(ellipse at 70% 10%, rgba(0,180,220,.20), transparent 42%), radial-gradient(ellipse at 20% 90%, rgba(60,80,200,.16), transparent 36%), linear-gradient(150deg, #020810 0%, #060f1a 42%, #030b14 72%, #010408 100%)" },
  { category: "classic-premium", id: "classic-premium-author", name: "📖 Classic Premium Author", description: "Luxury publishing house, warm materials, editorial precision. The serious professional author.", css: "radial-gradient(ellipse at 60% 10%, rgba(180,130,50,.18), transparent 38%), radial-gradient(ellipse at 30% 85%, rgba(80,50,20,.14), transparent 36%), linear-gradient(155deg, #0c0804 0%, #1a1008 45%, #100c06 72%, #060402 100%)" },
  {
    category: "classic-premium",
    id: "literary-espresso",
    name: "☕ Literary Espresso",
    description: "Espresso brown, parchment warmth, manuscript lines — the Scriptora author studio.",
    css:
      "radial-gradient(ellipse at 14% 0%, rgba(242,196,0,.14), transparent 34%), radial-gradient(ellipse at 88% 18%, rgba(139,90,43,.16), transparent 32%), radial-gradient(ellipse at 50% 100%, rgba(44,24,16,.22), transparent 40%), linear-gradient(155deg, #1a1008 0%, #2c1810 38%, #241610 68%, #120a06 100%)",
  },

  // ── Atmospheres ────────────────────────────────────────────────────────────
  { category: "atmosphere", id: "midnight-ink", name: "🌌 Midnight Writer", description: "Scuro, premium, perfetto per scrivere di notte.", css: "radial-gradient(circle at top left, rgba(79,70,229,.24), transparent 34%), radial-gradient(circle at bottom right, rgba(236,72,153,.12), transparent 36%), linear-gradient(135deg, #050510 0%, #0b1020 45%, #020617 100%)" },
  { category: "atmosphere", id: "dark-academia", name: "📚 Dark Academia", description: "Università gotica, pioggia, pietra, libri antichi e disciplina creativa.", css: "linear-gradient(rgba(4,5,8,.42), rgba(4,5,8,.42)), url('/backgrounds/scriptora-atmospheres/dark-academia.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "velvet-night", name: "🌙 Velvet Night", description: "Elegante, morbido, ideale per romance e introspezione.", css: "radial-gradient(circle at 70% 20%, rgba(190,24,93,.24), transparent 32%), linear-gradient(135deg, #140516 0%, #250a1d 48%, #07020a 100%)" },
  { category: "atmosphere", id: "storm-library", name: "🌧 Rain Library", description: "Blu-grigio, thriller, tensione e lucidità.", css: "linear-gradient(rgba(6,10,20,.45), rgba(6,10,20,.45)), url('/backgrounds/scriptora-atmospheres/rain-library.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "moonlit-paper", name: "🌕 Moonlight Paper", description: "Chiaro, freddo, pulito, adatto a lunghe sessioni.", css: "linear-gradient(rgba(6,10,20,.28), rgba(6,10,20,.28)), url('/backgrounds/scriptora-atmospheres/moonlit-serenity.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "desert-noir", name: "🏜 Desert Noir", description: "Caldo, cinematografico, perfetto per atmosfere americane.", css: "radial-gradient(circle at 70% 15%, rgba(251,146,60,.22), transparent 30%), linear-gradient(135deg, #1c1208 0%, #3b2212 50%, #090605 100%)" },
  { category: "atmosphere", id: "crimson-rose", name: "🌹 Crimson Romance", description: "Dark romance, desiderio, eleganza e pericolo.", css: "radial-gradient(circle at 25% 20%, rgba(244,63,94,.28), transparent 32%), linear-gradient(135deg, #12020a 0%, #270713 52%, #050106 100%)" },
  { category: "atmosphere", id: "deep-ocean", name: "🌊 Ocean Depths", description: "Concentrazione, mistero, respiro lungo.", css: "radial-gradient(circle at bottom left, rgba(14,165,233,.20), transparent 34%), linear-gradient(135deg, #06141f 0%, #082f49 52%, #020617 100%)" },
  { category: "atmosphere", id: "forest-myth", name: "🌲 Forest Myth", description: "Fantasy, natura, magia antica.", css: "radial-gradient(circle at 20% 20%, rgba(34,197,94,.18), transparent 30%), linear-gradient(135deg, #03140d 0%, #064e3b 48%, #020617 100%)" },
  { category: "atmosphere", id: "golden-desk", name: "🔥 Golden Writing Desk", description: "Caldo, creativo, editoriale.", css: "linear-gradient(rgba(10,10,10,.35), rgba(10,10,10,.35)), url('/backgrounds/scriptora-atmospheres/golden-desk.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "purple-dream", name: "💜 Purple Dream", description: "Creativo, immaginifico, romantico.", css: "radial-gradient(circle at top right, rgba(168,85,247,.28), transparent 34%), linear-gradient(135deg, #12051f 0%, #2e1065 50%, #05020a 100%)" },
  { category: "atmosphere", id: "coffee-writer", name: "☕ Coffee Writer", description: "Calore, pagine, concentrazione quotidiana.", css: "linear-gradient(135deg, #1c0f08 0%, #3b2415 50%, #100804 100%)" },
  { category: "atmosphere", id: "cinematic-blue", name: "🎬 Cinematic Blue", description: "Premium, lucido, perfetto per app moderne.", css: "radial-gradient(circle at 80% 15%, rgba(37,99,235,.30), transparent 34%), linear-gradient(135deg, #020617 0%, #111827 45%, #0b1120 100%)" },
  { category: "atmosphere", id: "gothic-violet", name: "🕯 Gothic Violet", description: "Horror elegante, gotico, mystery.", css: "radial-gradient(circle at 30% 20%, rgba(147,51,234,.22), transparent 32%), linear-gradient(135deg, #08030f 0%, #1e102e 52%, #020105 100%)" },
  { category: "atmosphere", id: "emerald-focus", name: "💚 Emerald Focus", description: "Concentrazione, profondità, calma potente.", css: "radial-gradient(circle at 70% 20%, rgba(16,185,129,.24), transparent 32%), linear-gradient(135deg, #02120c 0%, #064e3b 50%, #020617 100%)" },
  { category: "atmosphere", id: "blood-moon", name: "🌘 Blood Moon", description: "Oscuro, passionale, brutale.", css: "radial-gradient(circle at 50% 0%, rgba(220,38,38,.30), transparent 34%), linear-gradient(135deg, #120202 0%, #2a0505 50%, #050101 100%)" },
  { category: "atmosphere", id: "paris-cafe", name: "☕ Paris Cafe", description: "Caffe parigino, pagine aperte e atmosfera autoriale.", css: "linear-gradient(rgba(8,10,16,.42), rgba(8,10,16,.42)), url('/backgrounds/scriptora-atmospheres/paris-cafe.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "fantasy-kingdom", name: "🏰 Fantasy Kingdom Atm.", description: "Regni lontani, luce epica e immaginazione da saga.", css: "linear-gradient(rgba(5,8,18,.42), rgba(5,8,18,.42)), url('/backgrounds/scriptora-atmospheres/fantasy-kingdom.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "luxury-penthouse", name: "🌃 Luxury Penthouse", description: "Notte urbana, lusso discreto e concentrazione premium.", css: "linear-gradient(rgba(5,8,18,.48), rgba(5,8,18,.48)), url('/backgrounds/scriptora-atmospheres/luxury-penthouse.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "gothic-manor", name: "🕯 Gothic Manor", description: "Tenuta gotica, mistero e tensione narrativa.", css: "linear-gradient(rgba(5,5,12,.46), rgba(5,5,12,.46)), url('/backgrounds/scriptora-atmospheres/gothic-manor.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "noir-office", name: "🕵 Noir Office", description: "Ufficio noir, ombre, detective e taglio thriller.", css: "linear-gradient(rgba(4,7,14,.48), rgba(4,7,14,.48)), url('/backgrounds/scriptora-atmospheres/noir-office.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "old-library", name: "📖 Old Library", description: "Scaffali antichi, silenzio e studio profondo.", css: "linear-gradient(rgba(8,7,6,.42), rgba(8,7,6,.42)), url('/backgrounds/scriptora-atmospheres/old-library.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "vintage-manuscript", name: "📝 Vintage Manuscript", description: "Carta, inchiostro e manoscritti da bottega editoriale.", css: "linear-gradient(rgba(22,14,8,.34), rgba(22,14,8,.34)), url('/backgrounds/scriptora-atmospheres/vintage-manuscript.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "publisher-office", name: "🏢 Publisher Office", description: "Studio editoriale moderno, ordinato e professionale.", css: "linear-gradient(rgba(6,10,18,.36), rgba(6,10,18,.36)), url('/backgrounds/scriptora-atmospheres/publisher-office.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "ocean-morning", name: "🌊 Ocean Morning", description: "Luce marina, respiro largo e scrittura limpida.", css: "linear-gradient(rgba(4,12,18,.32), rgba(4,12,18,.32)), url('/backgrounds/scriptora-atmospheres/ocean-morning.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "coffee-house", name: "☕ Coffee House", description: "Calore quotidiano, taccuini e sessioni lunghe.", css: "linear-gradient(rgba(18,10,5,.38), rgba(18,10,5,.38)), url('/backgrounds/scriptora-atmospheres/coffee-house.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "tokyo-night", name: "🌃 Tokyo Night", description: "Neon, ritmo cyber e romanzi contemporanei.", css: "linear-gradient(rgba(4,6,16,.44), rgba(4,6,16,.44)), url('/backgrounds/scriptora-atmospheres/tokyo-night.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "tuscany-writer", name: "🍷 Tuscany Writer", description: "Collina, luce calda e scrittura mediterranea.", css: "linear-gradient(rgba(20,12,4,.34), rgba(20,12,4,.34)), url('/backgrounds/scriptora-atmospheres/tuscany-writer.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "nordic-cabin", name: "🏔 Nordic Cabin", description: "Cabin nordica, neve e isolamento creativo.", css: "linear-gradient(rgba(5,10,16,.38), rgba(5,10,16,.38)), url('/backgrounds/scriptora-atmospheres/nordic-cabin.webp') center center / cover no-repeat" },
  { category: "atmosphere", id: "ancient-rome", name: "🏛 Ancient Rome", description: "Marmo, storia e tono epico-classico.", css: "linear-gradient(rgba(14,10,6,.36), rgba(14,10,6,.36)), url('/backgrounds/scriptora-atmospheres/ancient-rome.webp') center center / cover no-repeat" },

  // ── Minimal & Clean ────────────────────────────────────────────────────────
  { category: "minimal", id: "obsidian", name: "🖤 Obsidian Pro", description: "Nero lucido, minimale, molto pro.", css: "linear-gradient(135deg, #020617 0%, #09090b 50%, #000000 100%)" },
  { category: "minimal", id: "arctic-glass", name: "❄ Arctic Glass", description: "Pulito, luminoso, moderno.", css: "linear-gradient(135deg, #dbeafe 0%, #f8fafc 48%, #e0f2fe 100%)" },
  { category: "minimal", id: "soft-parchment", name: "📜 Soft Parchment", description: "Chiaro, caldo, classico da romanziere.", css: "linear-gradient(135deg, #f4ead8 0%, #ead7b7 50%, #fff7ed 100%)" },
  { category: "minimal", id: "clean-pro", name: "✨ Clean Pro", description: "Neutro, minimale, da software professionale.", css: "linear-gradient(135deg, #f8fafc 0%, #e5e7eb 52%, #f1f5f9 100%)" },

  // ── Personal ───────────────────────────────────────────────────────────────
  { category: "personal", id: "custom-personal", name: "🖼 Sfondo personale", description: "La tua immagine, la tua stanza creativa.", css: "linear-gradient(rgba(4,5,8,.42), rgba(4,5,8,.42)), linear-gradient(135deg, #050816, #111827)" },
];

export const WRITING_FONTS: Array<{ id: ScriptoraWritingFont; name: string; css: string; }> = [
  { id: "system", name: "Sistema", css: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", name: "Serif letterario", css: "Georgia, 'Times New Roman', serif" },
  { id: "literary", name: "Romanzo elegante", css: "Iowan Old Style, Palatino, Georgia, serif" },
  { id: "mono", name: "Macchina da scrivere", css: "'SFMono-Regular', Consolas, monospace" },
  { id: "editorial", name: "Editoriale pulito", css: "Charter, Georgia, serif" },
  { id: "classic", name: "Classico libro", css: "Garamond, Baskerville, Georgia, serif" },
];

export const DEFAULT_SCRIPTORA_APPEARANCE: ScriptoraAppearanceSettings = {
  backgroundId: "literary-espresso",
  writingFont: "system",
};

const LIGHT_SURFACE_BACKGROUNDS = new Set<ScriptoraBackgroundId>([
  "clean-pro",
  "soft-parchment",
  "arctic-glass",
]);

function applySurfaceContrastTokens(backgroundId: ScriptoraBackgroundId) {
  const root = document.documentElement;
  const isLight = LIGHT_SURFACE_BACKGROUNDS.has(backgroundId);

  root.dataset.scriptoraSurface = isLight ? "light" : "dark";

  if (isLight) {
    root.style.setProperty("--foreground", "24 38% 11%");
    root.style.setProperty("--muted-foreground", "24 14% 36%");
    root.style.setProperty("--card", "38 42% 94%");
    root.style.setProperty("--card-foreground", "24 38% 11%");
    root.style.setProperty("--popover", "38 42% 96%");
    root.style.setProperty("--popover-foreground", "24 38% 11%");
    root.style.setProperty("--border", "30 22% 78%");
    root.style.setProperty("--input", "30 22% 78%");
    return;
  }

  root.style.removeProperty("--foreground");
  root.style.removeProperty("--muted-foreground");
  root.style.removeProperty("--card");
  root.style.removeProperty("--card-foreground");
  root.style.removeProperty("--popover");
  root.style.removeProperty("--popover-foreground");
  root.style.removeProperty("--border");
  root.style.removeProperty("--input");
}

export function getCustomScriptoraBackground(): string | null {
  try {
    return localStorage.getItem(SCRIPTORA_CUSTOM_BACKGROUND_KEY);
  } catch {
    return null;
  }
}

export function saveCustomScriptoraBackground(dataUrl: string) {
  try {
    localStorage.setItem(SCRIPTORA_CUSTOM_BACKGROUND_KEY, dataUrl);
  } catch {
    // ignore storage errors
  }
}

export function removeCustomScriptoraBackground() {
  try {
    localStorage.removeItem(SCRIPTORA_CUSTOM_BACKGROUND_KEY);
  } catch {
    // ignore storage errors
  }
}

function normalizeAppearanceSettings(value: any): ScriptoraAppearanceSettings {
  const backgroundId = SCRIPTORA_BACKGROUNDS.some((b) => b.id === value?.backgroundId)
    ? value.backgroundId
    : DEFAULT_SCRIPTORA_APPEARANCE.backgroundId;

  const writingFont = WRITING_FONTS.some((f) => f.id === value?.writingFont)
    ? value.writingFont
    : DEFAULT_SCRIPTORA_APPEARANCE.writingFont;

  return { backgroundId, writingFont };
}

export function loadScriptoraAppearance(): ScriptoraAppearanceSettings {
  try {
    const raw =
      localStorage.getItem(SCRIPTORA_APPEARANCE_KEY) ||
      localStorage.getItem(SCRIPTORA_APPEARANCE_LEGACY_KEY) ||
      localStorage.getItem(SCRIPTORA_APPEARANCE_OLD_SETTINGS_KEY);

    if (!raw) return DEFAULT_SCRIPTORA_APPEARANCE;

    const parsed = JSON.parse(raw);
    return normalizeAppearanceSettings({ ...DEFAULT_SCRIPTORA_APPEARANCE, ...parsed });
  } catch {
    return DEFAULT_SCRIPTORA_APPEARANCE;
  }
}

// ─── Immersive Environment Token Map ─────────────────────────────────────────
// Per-category CSS token sets injected alongside --scriptora-app-bg.
// Consumed by .env-card, .env-hero-book, .env-glow-border utility classes.
const ENV_TOKENS: Record<ScriptoraThemeCategory, Record<string, string>> = {
  "horror-crime": {
    "--env-accent":        "rgba(200,14,14,0.85)",
    "--env-glow":          "rgba(180,14,14,0.28)",
    "--env-card-bg":       "rgba(20,5,5,0.62)",
    "--env-card-border":   "rgba(200,14,14,0.22)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(200,14,14,0.08),transparent)",
    "--env-hover-glow":    "0 0 32px rgba(200,14,14,0.32), 0 20px 48px rgba(0,0,0,0.50)",
    "--env-motion-speed":  "220ms",
  },
  "dark-romance": {
    "--env-accent":        "rgba(200,30,70,0.85)",
    "--env-glow":          "rgba(180,100,20,0.26)",
    "--env-card-bg":       "rgba(18,4,10,0.64)",
    "--env-card-border":   "rgba(180,120,30,0.24)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(180,30,60,0.09),rgba(180,120,20,0.06),transparent)",
    "--env-hover-glow":    "0 0 28px rgba(200,30,70,0.30), 0 18px 44px rgba(0,0,0,0.48)",
    "--env-motion-speed":  "260ms",
  },
  "fantasy": {
    "--env-accent":        "rgba(130,90,220,0.85)",
    "--env-glow":          "rgba(80,160,100,0.24)",
    "--env-card-bg":       "rgba(8,5,22,0.62)",
    "--env-card-border":   "rgba(120,80,200,0.26)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(120,80,200,0.10),rgba(40,120,80,0.06),transparent)",
    "--env-hover-glow":    "0 0 30px rgba(120,80,200,0.34), 0 20px 46px rgba(0,0,0,0.46)",
    "--env-motion-speed":  "280ms",
  },
  "scifi": {
    "--env-accent":        "rgba(0,200,240,0.85)",
    "--env-glow":          "rgba(0,160,210,0.28)",
    "--env-card-bg":       "rgba(2,10,20,0.66)",
    "--env-card-border":   "rgba(0,180,220,0.26)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(0,180,220,0.10),rgba(60,80,200,0.06),transparent)",
    "--env-hover-glow":    "0 0 32px rgba(0,200,240,0.36), 0 20px 48px rgba(0,0,0,0.48)",
    "--env-motion-speed":  "180ms",
  },
  "classic-premium": {
    "--env-accent":        "rgba(200,155,60,0.85)",
    "--env-glow":          "rgba(180,130,40,0.22)",
    "--env-card-bg":       "rgba(16,10,4,0.64)",
    "--env-card-border":   "rgba(180,140,50,0.24)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(180,130,40,0.09),transparent)",
    "--env-hover-glow":    "0 0 26px rgba(200,155,60,0.28), 0 18px 44px rgba(0,0,0,0.44)",
    "--env-motion-speed":  "240ms",
  },
  // Fallback for non-premium categories — neutral values
  "atmosphere": {
    "--env-accent":        "rgba(99,130,255,0.85)",
    "--env-glow":          "rgba(79,70,229,0.22)",
    "--env-card-bg":       "rgba(14,22,38,0.62)",
    "--env-card-border":   "rgba(255,255,255,0.12)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(255,255,255,0.055),transparent)",
    "--env-hover-glow":    "0 0 24px rgba(79,70,229,0.24), 0 18px 44px rgba(0,0,0,0.40)",
    "--env-motion-speed":  "200ms",
  },
  "minimal": {
    "--env-accent":        "rgba(180,180,200,0.80)",
    "--env-glow":          "rgba(160,160,180,0.16)",
    "--env-card-bg":       "rgba(12,18,30,0.60)",
    "--env-card-border":   "rgba(255,255,255,0.10)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(255,255,255,0.04),transparent)",
    "--env-hover-glow":    "0 0 20px rgba(160,160,180,0.18), 0 16px 40px rgba(0,0,0,0.36)",
    "--env-motion-speed":  "200ms",
  },
  "personal": {
    "--env-accent":        "rgba(99,130,255,0.85)",
    "--env-glow":          "rgba(79,70,229,0.22)",
    "--env-card-bg":       "rgba(14,22,38,0.62)",
    "--env-card-border":   "rgba(255,255,255,0.12)",
    "--env-card-texture":  "linear-gradient(180deg,rgba(255,255,255,0.055),transparent)",
    "--env-hover-glow":    "0 0 24px rgba(79,70,229,0.24), 0 18px 44px rgba(0,0,0,0.40)",
    "--env-motion-speed":  "200ms",
  },
};

export function applyScriptoraEnvironment(category: ScriptoraThemeCategory) {
  const tokens = ENV_TOKENS[category] ?? ENV_TOKENS["atmosphere"];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  // Body data attribute for CSS theme-scoped overrides
  document.body.dataset.theme = category;
}

export function applyScriptoraAppearance(settings: ScriptoraAppearanceSettings = loadScriptoraAppearance()) {
  const bg = SCRIPTORA_BACKGROUNDS.find((b) => b.id === settings.backgroundId) || SCRIPTORA_BACKGROUNDS[0];
  const font = WRITING_FONTS.find((f) => f.id === settings.writingFont) || WRITING_FONTS[0];

  const customBackground = getCustomScriptoraBackground();

  const finalBackground =
    settings.backgroundId === "custom-personal" && customBackground
      ? `linear-gradient(rgba(4,5,8,.42), rgba(4,5,8,.42)), url("${customBackground}") center center / cover no-repeat`
      : bg.css;

  document.documentElement.style.setProperty("--scriptora-app-bg", finalBackground);
  document.documentElement.style.setProperty("--scriptora-writing-font", font.css);
  document.documentElement.dataset.scriptoraBg = settings.backgroundId;
  applySurfaceContrastTokens(settings.backgroundId);

  // Inject immersive environment tokens for this theme category
  applyScriptoraEnvironment(bg.category);
}

export function saveScriptoraAppearance(settings: ScriptoraAppearanceSettings) {
  const normalized = normalizeAppearanceSettings(settings);
  localStorage.setItem(SCRIPTORA_APPEARANCE_KEY, JSON.stringify(normalized));

  // Manteniamo anche la vecchia chiave per compatibilità, ma la chiave vera ora è scriptora-appearance-v1.
  try {
    localStorage.setItem(SCRIPTORA_APPEARANCE_LEGACY_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore legacy save */
  }

  applyScriptoraAppearance(normalized);
}