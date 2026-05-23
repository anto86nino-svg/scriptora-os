export const SCRIPTORA_APPEARANCE_KEY = "nexora-appearance-v1";
export const SCRIPTORA_APPEARANCE_LEGACY_KEY = "scriptora-appearance-v1";
export const SCRIPTORA_APPEARANCE_OLD_SETTINGS_KEY = "scriptora-appearance-settings";

export type ScriptoraBackgroundId =
  | "midnight-ink" | "dark-academia" | "velvet-night" | "obsidian" | "storm-library"
  | "moonlit-paper" | "desert-noir" | "crimson-rose" | "deep-ocean" | "forest-myth"
  | "golden-desk" | "arctic-glass" | "purple-dream" | "coffee-writer" | "cinematic-blue"
  | "gothic-violet" | "soft-parchment" | "emerald-focus" | "blood-moon" | "clean-pro"
  | "paris-cafe" | "fantasy-kingdom" | "luxury-penthouse" | "gothic-manor" | "noir-office"
  | "old-library" | "vintage-manuscript" | "publisher-office" | "ocean-morning"
  | "coffee-house" | "tokyo-night" | "tuscany-writer" | "nordic-cabin" | "ancient-rome";

export type ScriptoraWritingFont = "system" | "serif" | "literary" | "mono" | "editorial" | "classic";

export interface ScriptoraAppearanceSettings {
  backgroundId: ScriptoraBackgroundId;
  writingFont: ScriptoraWritingFont;
}

export const SCRIPTORA_BACKGROUNDS: Array<{ id: ScriptoraBackgroundId; name: string; description: string; css: string; }> = [
  { id: "midnight-ink", name: "🌌 Midnight Writer", description: "Scuro, premium, perfetto per scrivere di notte.", css: "radial-gradient(circle at top left, rgba(79,70,229,.24), transparent 34%), radial-gradient(circle at bottom right, rgba(236,72,153,.12), transparent 36%), linear-gradient(135deg, #050510 0%, #0b1020 45%, #020617 100%)" },
  { id: "dark-academia", name: "📚 Dark Academia", description: "Università gotica, pioggia, pietra, libri antichi e disciplina creativa.", css: "linear-gradient(rgba(4,5,8,.42), rgba(4,5,8,.42)), url('/backgrounds/scriptora-atmospheres/dark-academia.webp') center center / cover no-repeat" },
  { id: "velvet-night", name: "🌙 Velvet Night", description: "Elegante, morbido, ideale per romance e introspezione.", css: "radial-gradient(circle at 70% 20%, rgba(190,24,93,.24), transparent 32%), linear-gradient(135deg, #140516 0%, #250a1d 48%, #07020a 100%)" },
  { id: "obsidian", name: "🖤 Obsidian Pro", description: "Nero lucido, minimale, molto pro.", css: "linear-gradient(135deg, #020617 0%, #09090b 50%, #000000 100%)" },
  { id: "storm-library", name: "🌧 Rain Library", description: "Blu-grigio, thriller, tensione e lucidità.", css: "linear-gradient(rgba(6,10,20,.45), rgba(6,10,20,.45)), url('/backgrounds/scriptora-atmospheres/rain-library.webp') center center / cover no-repeat" },
  { id: "moonlit-paper", name: "🌕 Moonlight Paper", description: "Chiaro, freddo, pulito, adatto a lunghe sessioni.", css: "linear-gradient(rgba(6,10,20,.28), rgba(6,10,20,.28)), url('/backgrounds/scriptora-atmospheres/moonlit-serenity.webp') center center / cover no-repeat" },
  { id: "desert-noir", name: "🏜 Desert Noir", description: "Caldo, cinematografico, perfetto per atmosfere americane.", css: "radial-gradient(circle at 70% 15%, rgba(251,146,60,.22), transparent 30%), linear-gradient(135deg, #1c1208 0%, #3b2212 50%, #090605 100%)" },
  { id: "crimson-rose", name: "🌹 Crimson Romance", description: "Dark romance, desiderio, eleganza e pericolo.", css: "radial-gradient(circle at 25% 20%, rgba(244,63,94,.28), transparent 32%), linear-gradient(135deg, #12020a 0%, #270713 52%, #050106 100%)" },
  { id: "deep-ocean", name: "🌊 Ocean Depths", description: "Concentrazione, mistero, respiro lungo.", css: "radial-gradient(circle at bottom left, rgba(14,165,233,.20), transparent 34%), linear-gradient(135deg, #06141f 0%, #082f49 52%, #020617 100%)" },
  { id: "forest-myth", name: "🌲 Forest Myth", description: "Fantasy, natura, magia antica.", css: "radial-gradient(circle at 20% 20%, rgba(34,197,94,.18), transparent 30%), linear-gradient(135deg, #03140d 0%, #064e3b 48%, #020617 100%)" },
  { id: "golden-desk", name: "🔥 Golden Writing Desk", description: "Caldo, creativo, editoriale.", css: "linear-gradient(rgba(10,10,10,.35), rgba(10,10,10,.35)), url('/backgrounds/scriptora-atmospheres/golden-desk.webp') center center / cover no-repeat" },
  { id: "arctic-glass", name: "❄ Arctic Glass", description: "Pulito, luminoso, moderno.", css: "linear-gradient(135deg, #dbeafe 0%, #f8fafc 48%, #e0f2fe 100%)" },
  { id: "purple-dream", name: "💜 Purple Dream", description: "Creativo, immaginifico, romantico.", css: "radial-gradient(circle at top right, rgba(168,85,247,.28), transparent 34%), linear-gradient(135deg, #12051f 0%, #2e1065 50%, #05020a 100%)" },
  { id: "coffee-writer", name: "☕ Coffee Writer", description: "Calore, pagine, concentrazione quotidiana.", css: "linear-gradient(135deg, #1c0f08 0%, #3b2415 50%, #100804 100%)" },
  { id: "cinematic-blue", name: "🎬 Cinematic Blue", description: "Premium, lucido, perfetto per app moderne.", css: "radial-gradient(circle at 80% 15%, rgba(37,99,235,.30), transparent 34%), linear-gradient(135deg, #020617 0%, #111827 45%, #0b1120 100%)" },
  { id: "gothic-violet", name: "🕯 Gothic Violet", description: "Horror elegante, gotico, mystery.", css: "radial-gradient(circle at 30% 20%, rgba(147,51,234,.22), transparent 32%), linear-gradient(135deg, #08030f 0%, #1e102e 52%, #020105 100%)" },
  { id: "soft-parchment", name: "📜 Soft Parchment", description: "Chiaro, caldo, classico da romanziere.", css: "linear-gradient(135deg, #f4ead8 0%, #ead7b7 50%, #fff7ed 100%)" },
  { id: "emerald-focus", name: "💚 Emerald Focus", description: "Concentrazione, profondità, calma potente.", css: "radial-gradient(circle at 70% 20%, rgba(16,185,129,.24), transparent 32%), linear-gradient(135deg, #02120c 0%, #064e3b 50%, #020617 100%)" },
  { id: "blood-moon", name: "🌘 Blood Moon", description: "Oscuro, passionale, brutale.", css: "radial-gradient(circle at 50% 0%, rgba(220,38,38,.30), transparent 34%), linear-gradient(135deg, #120202 0%, #2a0505 50%, #050101 100%)" },
  { id: "clean-pro", name: "✨ Clean Pro", description: "Neutro, minimale, da software professionale.", css: "linear-gradient(135deg, #f8fafc 0%, #e5e7eb 52%, #f1f5f9 100%)" },
  { id: "paris-cafe", name: "☕ Paris Cafe", description: "Caffe parigino, pagine aperte e atmosfera autoriale.", css: "linear-gradient(rgba(8,10,16,.42), rgba(8,10,16,.42)), url('/backgrounds/scriptora-atmospheres/paris-cafe.webp') center center / cover no-repeat" },
  { id: "fantasy-kingdom", name: "🏰 Fantasy Kingdom", description: "Regni lontani, luce epica e immaginazione da saga.", css: "linear-gradient(rgba(5,8,18,.42), rgba(5,8,18,.42)), url('/backgrounds/scriptora-atmospheres/fantasy-kingdom.webp') center center / cover no-repeat" },
  { id: "luxury-penthouse", name: "🌃 Luxury Penthouse", description: "Notte urbana, lusso discreto e concentrazione premium.", css: "linear-gradient(rgba(5,8,18,.48), rgba(5,8,18,.48)), url('/backgrounds/scriptora-atmospheres/luxury-penthouse.webp') center center / cover no-repeat" },
  { id: "gothic-manor", name: "🕯 Gothic Manor", description: "Tenuta gotica, mistero e tensione narrativa.", css: "linear-gradient(rgba(5,5,12,.46), rgba(5,5,12,.46)), url('/backgrounds/scriptora-atmospheres/gothic-manor.webp') center center / cover no-repeat" },
  { id: "noir-office", name: "🕵 Noir Office", description: "Ufficio noir, ombre, detective e taglio thriller.", css: "linear-gradient(rgba(4,7,14,.48), rgba(4,7,14,.48)), url('/backgrounds/scriptora-atmospheres/noir-office.webp') center center / cover no-repeat" },
  { id: "old-library", name: "📖 Old Library", description: "Scaffali antichi, silenzio e studio profondo.", css: "linear-gradient(rgba(8,7,6,.42), rgba(8,7,6,.42)), url('/backgrounds/scriptora-atmospheres/old-library.webp') center center / cover no-repeat" },
  { id: "vintage-manuscript", name: "📝 Vintage Manuscript", description: "Carta, inchiostro e manoscritti da bottega editoriale.", css: "linear-gradient(rgba(22,14,8,.34), rgba(22,14,8,.34)), url('/backgrounds/scriptora-atmospheres/vintage-manuscript.webp') center center / cover no-repeat" },
  { id: "publisher-office", name: "🏢 Publisher Office", description: "Studio editoriale moderno, ordinato e professionale.", css: "linear-gradient(rgba(6,10,18,.36), rgba(6,10,18,.36)), url('/backgrounds/scriptora-atmospheres/publisher-office.webp') center center / cover no-repeat" },
  { id: "ocean-morning", name: "🌊 Ocean Morning", description: "Luce marina, respiro largo e scrittura limpida.", css: "linear-gradient(rgba(4,12,18,.32), rgba(4,12,18,.32)), url('/backgrounds/scriptora-atmospheres/ocean-morning.webp') center center / cover no-repeat" },
  { id: "coffee-house", name: "☕ Coffee House", description: "Calore quotidiano, taccuini e sessioni lunghe.", css: "linear-gradient(rgba(18,10,5,.38), rgba(18,10,5,.38)), url('/backgrounds/scriptora-atmospheres/coffee-house.webp') center center / cover no-repeat" },
  { id: "tokyo-night", name: "🌃 Tokyo Night", description: "Neon, ritmo cyber e romanzi contemporanei.", css: "linear-gradient(rgba(4,6,16,.44), rgba(4,6,16,.44)), url('/backgrounds/scriptora-atmospheres/tokyo-night.webp') center center / cover no-repeat" },
  { id: "tuscany-writer", name: "🍷 Tuscany Writer", description: "Collina, luce calda e scrittura mediterranea.", css: "linear-gradient(rgba(20,12,4,.34), rgba(20,12,4,.34)), url('/backgrounds/scriptora-atmospheres/tuscany-writer.webp') center center / cover no-repeat" },
  { id: "nordic-cabin", name: "🏔 Nordic Cabin", description: "Cabin nordica, neve e isolamento creativo.", css: "linear-gradient(rgba(5,10,16,.38), rgba(5,10,16,.38)), url('/backgrounds/scriptora-atmospheres/nordic-cabin.webp') center center / cover no-repeat" },
  { id: "ancient-rome", name: "🏛 Ancient Rome", description: "Marmo, storia e tono epico-classico.", css: "linear-gradient(rgba(14,10,6,.36), rgba(14,10,6,.36)), url('/backgrounds/scriptora-atmospheres/ancient-rome.webp') center center / cover no-repeat" },
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
