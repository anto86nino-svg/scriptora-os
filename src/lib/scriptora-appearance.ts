export const SCRIPTORA_APPEARANCE_KEY = "nexora-appearance-v1";
export const SCRIPTORA_APPEARANCE_LEGACY_KEY = "scriptora-appearance-v1";
export const SCRIPTORA_APPEARANCE_OLD_SETTINGS_KEY = "scriptora-appearance-settings";

export type ScriptoraBackgroundId =
  | "midnight-ink" | "dark-academia" | "velvet-night" | "obsidian" | "storm-library"
  | "moonlit-paper" | "desert-noir" | "crimson-rose" | "deep-ocean" | "forest-myth"
  | "golden-desk" | "arctic-glass" | "purple-dream" | "coffee-writer" | "cinematic-blue"
  | "gothic-violet" | "soft-parchment" | "emerald-focus" | "blood-moon" | "clean-pro";

export type ScriptoraWritingFont = "system" | "serif" | "literary" | "mono" | "editorial" | "classic";

export interface ScriptoraAppearanceSettings {
  backgroundId: ScriptoraBackgroundId;
  writingFont: ScriptoraWritingFont;
}

export const SCRIPTORA_BACKGROUNDS: Array<{ id: ScriptoraBackgroundId; name: string; description: string; css: string; }> = [
  { id: "midnight-ink", name: "🌌 Midnight Writer", description: "Scuro, premium, perfetto per scrivere di notte.", css: "radial-gradient(circle at top left, rgba(79,70,229,.24), transparent 34%), radial-gradient(circle at bottom right, rgba(236,72,153,.12), transparent 36%), linear-gradient(135deg, #050510 0%, #0b1020 45%, #020617 100%)" },
  { id: "dark-academia", name: "📚 Dark Academia", description: "Biblioteca antica, legno, ombre e concentrazione.", css: "radial-gradient(circle at 20% 10%, rgba(180,83,9,.22), transparent 30%), linear-gradient(135deg, #120b07 0%, #1c120c 42%, #090605 100%)" },
  { id: "velvet-night", name: "🌙 Velvet Night", description: "Elegante, morbido, ideale per romance e introspezione.", css: "radial-gradient(circle at 70% 20%, rgba(190,24,93,.24), transparent 32%), linear-gradient(135deg, #140516 0%, #250a1d 48%, #07020a 100%)" },
  { id: "obsidian", name: "🖤 Obsidian Pro", description: "Nero lucido, minimale, molto pro.", css: "linear-gradient(135deg, #020617 0%, #09090b 50%, #000000 100%)" },
  { id: "storm-library", name: "🌧 Rain Library", description: "Blu-grigio, thriller, tensione e lucidità.", css: "linear-gradient(rgba(6,10,20,.45), rgba(6,10,20,.45)), url('/backgrounds/scriptora-atmospheres/rain-library.webp') center center / cover no-repeat" },
  { id: "moonlit-paper", name: "🌕 Moonlight Paper", description: "Chiaro, freddo, pulito, adatto a lunghe sessioni.", css: "linear-gradient(135deg, #e5e7eb 0%, #cbd5e1 45%, #f8fafc 100%)" },
  { id: "desert-noir", name: "🏜 Desert Noir", description: "Caldo, cinematografico, perfetto per atmosfere americane.", css: "radial-gradient(circle at 70% 15%, rgba(251,146,60,.22), transparent 30%), linear-gradient(135deg, #1c1208 0%, #3b2212 50%, #090605 100%)" },
  { id: "crimson-rose", name: "🌹 Crimson Romance", description: "Dark romance, desiderio, eleganza e pericolo.", css: "radial-gradient(circle at 25% 20%, rgba(244,63,94,.28), transparent 32%), linear-gradient(135deg, #12020a 0%, #270713 52%, #050106 100%)" },
  { id: "deep-ocean", name: "🌊 Ocean Depths", description: "Concentrazione, mistero, respiro lungo.", css: "radial-gradient(circle at bottom left, rgba(14,165,233,.20), transparent 34%), linear-gradient(135deg, #06141f 0%, #082f49 52%, #020617 100%)" },
  { id: "forest-myth", name: "🌲 Forest Myth", description: "Fantasy, natura, magia antica.", css: "radial-gradient(circle at 20% 20%, rgba(34,197,94,.18), transparent 30%), linear-gradient(135deg, #03140d 0%, #064e3b 48%, #020617 100%)" },
  { id: "golden-desk", name: "🔥 Golden Writing Desk", description: "Caldo, creativo, editoriale.", css: "linear-gradient(rgba(10,10,10,.35), rgba(10,10,10,.35)), url('/backgrounds/scriptora-atmospheres/fireplace-study.webp') center center / cover no-repeat" },
  { id: "arctic-glass", name: "❄ Arctic Glass", description: "Pulito, luminoso, moderno.", css: "linear-gradient(135deg, #dbeafe 0%, #f8fafc 48%, #e0f2fe 100%)" },
  { id: "purple-dream", name: "💜 Purple Dream", description: "Creativo, immaginifico, romantico.", css: "radial-gradient(circle at top right, rgba(168,85,247,.28), transparent 34%), linear-gradient(135deg, #12051f 0%, #2e1065 50%, #05020a 100%)" },
  { id: "coffee-writer", name: "☕ Coffee Writer", description: "Calore, pagine, concentrazione quotidiana.", css: "linear-gradient(135deg, #1c0f08 0%, #3b2415 50%, #100804 100%)" },
  { id: "cinematic-blue", name: "🎬 Cinematic Blue", description: "Premium, lucido, perfetto per app moderne.", css: "radial-gradient(circle at 80% 15%, rgba(37,99,235,.30), transparent 34%), linear-gradient(135deg, #020617 0%, #111827 45%, #0b1120 100%)" },
  { id: "gothic-violet", name: "🕯 Gothic Violet", description: "Horror elegante, gotico, mystery.", css: "radial-gradient(circle at 30% 20%, rgba(147,51,234,.22), transparent 32%), linear-gradient(135deg, #08030f 0%, #1e102e 52%, #020105 100%)" },
  { id: "soft-parchment", name: "📜 Soft Parchment", description: "Chiaro, caldo, classico da romanziere.", css: "linear-gradient(135deg, #f4ead8 0%, #ead7b7 50%, #fff7ed 100%)" },
  { id: "emerald-focus", name: "💚 Emerald Focus", description: "Concentrazione, profondità, calma potente.", css: "radial-gradient(circle at 70% 20%, rgba(16,185,129,.24), transparent 32%), linear-gradient(135deg, #02120c 0%, #064e3b 50%, #020617 100%)" },
  { id: "blood-moon", name: "🌘 Blood Moon", description: "Oscuro, passionale, brutale.", css: "radial-gradient(circle at 50% 0%, rgba(220,38,38,.30), transparent 34%), linear-gradient(135deg, #120202 0%, #2a0505 50%, #050101 100%)" },
  { id: "clean-pro", name: "✨ Clean Pro", description: "Neutro, minimale, da software professionale.", css: "linear-gradient(135deg, #f8fafc 0%, #e5e7eb 52%, #f1f5f9 100%)" },
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
  backgroundId: "midnight-ink",
  writingFont: "system",
};

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

export function applyScriptoraAppearance(settings: ScriptoraAppearanceSettings = loadScriptoraAppearance()) {
  const bg = SCRIPTORA_BACKGROUNDS.find((b) => b.id === settings.backgroundId) || SCRIPTORA_BACKGROUNDS[0];
  const font = WRITING_FONTS.find((f) => f.id === settings.writingFont) || WRITING_FONTS[0];

  document.documentElement.style.setProperty("--scriptora-app-bg", bg.css);
  document.documentElement.style.setProperty("--scriptora-writing-font", font.css);
}

export function saveScriptoraAppearance(settings: ScriptoraAppearanceSettings) {
  const normalized = normalizeAppearanceSettings(settings);
  localStorage.setItem(SCRIPTORA_APPEARANCE_KEY, JSON.stringify(normalized));

  // Manteniamo anche la vecchia chiave per compatibilità, ma la chiave vera ora è nexora-appearance-v1.
  try {
    localStorage.setItem(SCRIPTORA_APPEARANCE_LEGACY_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore legacy save */
  }

  applyScriptoraAppearance(normalized);
}
