import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import { generateShadowTitleSet } from "@/lib/title-shadow";
import type { Language } from "@/types/book";

export type AuthorVoice =
  | "cinematic"
  | "emotional"
  | "commercial"
  | "literary"
  | "fast_paced"
  | "dark"
  | "minimalist"
  | "poetic"
  | "psychological"
  | "educational";

export type DialogueStyle =
  | "natural"
  | "sharp"
  | "emotional"
  | "commercial"
  | "slow_burn"
  | "psychological"
  | "minimal";

export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "ally"
  | "love_interest"
  | "mentor"
  | "";

export interface BestsellerCharacter {
  name: string;
  role: CharacterRole;
  fear: string;
  desire: string;
  secret: string;
  note: string;
}

export type SubtitleMode = "auto" | "manual" | "hybrid";

export interface BestsellerProConfig {
  authorVoice: AuthorVoice;
  customVoice: string;
  narrativeIntensity: "low" | "balanced" | "high";
  dialogueStyle: DialogueStyle;
  pacing: "slow_burn" | "balanced" | "fast";
  endingType: "happy" | "bittersweet" | "dark" | "open" | "twist";
  emotionalIntensity: "low" | "balanced" | "high";
  violenceLevel: "low" | "medium" | "strong";
  romanceLevel: "minimal" | "subplot" | "central";
  twistDensity: "low" | "balanced" | "high";
  subtitleMode: SubtitleMode;
  characters: BestsellerCharacter[];
}

export const AUTHOR_VOICE_OPTIONS: { value: AuthorVoice; label: string }[] = [
  { value: "cinematic", label: "Cinematic" },
  { value: "emotional", label: "Emotional" },
  { value: "commercial", label: "Commercial Bestseller" },
  { value: "literary", label: "Literary" },
  { value: "fast_paced", label: "Fast-paced" },
  { value: "dark", label: "Dark" },
  { value: "minimalist", label: "Minimalist" },
  { value: "poetic", label: "Poetic" },
  { value: "psychological", label: "Psychological" },
  { value: "educational", label: "Educational" },
];

export const DIALOGUE_STYLE_OPTIONS: { value: DialogueStyle; label: string }[] = [
  { value: "natural", label: "Natural" },
  { value: "sharp", label: "Sharp" },
  { value: "emotional", label: "Emotional" },
  { value: "commercial", label: "Commercial" },
  { value: "slow_burn", label: "Slow Burn" },
  { value: "psychological", label: "Psychological" },
  { value: "minimal", label: "Minimal" },
];

export const CHARACTER_ROLE_OPTIONS: { value: CharacterRole; label: string }[] = [
  { value: "protagonist", label: "Protagonist" },
  { value: "antagonist", label: "Antagonist" },
  { value: "ally", label: "Ally" },
  { value: "love_interest", label: "Love interest" },
  { value: "mentor", label: "Mentor" },
];

const VOICE_TONE_MAP: Record<AuthorVoice, string> = {
  cinematic: "cinematic, visual, scene-driven, commercially readable",
  emotional: "warm, emotionally resonant, human, transformative",
  commercial: "commercial bestseller, hook-driven, accessible, page-turning",
  literary: "literary, layered, precise, voice-forward",
  fast_paced: "fast-paced, propulsive, high momentum, lean prose",
  dark: "dark, tense, atmospheric, morally complex",
  minimalist: "minimalist, clean, restrained, high signal-to-noise",
  poetic: "poetic, lyrical, image-rich, memorable cadence",
  psychological: "psychological, introspective, tension through mind and motive",
  educational: "educational, clear, practical, authoritative but approachable",
};

const DIALOGUE_TONE_MAP: Record<DialogueStyle, string> = {
  natural: "natural dialogue rhythm",
  sharp: "sharp, subtext-rich dialogue",
  emotional: "emotionally charged dialogue",
  commercial: "commercial, quotable dialogue beats",
  slow_burn: "slow-burn dialogue tension",
  psychological: "psychological, revealing dialogue",
  minimal: "minimal, purposeful dialogue",
};

function genreDefaultVoice(genre?: string): AuthorVoice {
  const g = String(genre || "").toLowerCase();
  if (/thriller|crime|mystery|horror/.test(g)) return "psychological";
  if (/romance|dark-romance/.test(g)) return "emotional";
  if (/fantasy|sci-fi/.test(g)) return "cinematic";
  if (/self-help|business|productivity|education|health/.test(g)) return "educational";
  if (/poetry|literary/.test(g)) return "literary";
  return "commercial";
}

export function emptyBestsellerCharacter(): BestsellerCharacter {
  return { name: "", role: "", fear: "", desire: "", secret: "", note: "" };
}

export function defaultBestsellerProConfig(genre?: string): BestsellerProConfig {
  const voice = genreDefaultVoice(genre);
  const fiction = /thriller|romance|fantasy|horror|mystery|crime|sci-fi|dark-romance/.test(String(genre || "").toLowerCase());
  return {
    authorVoice: voice,
    customVoice: "",
    narrativeIntensity: "balanced",
    dialogueStyle: fiction ? "natural" : "commercial",
    pacing: fiction ? "balanced" : "fast",
    endingType: fiction ? "bittersweet" : "happy",
    emotionalIntensity: "balanced",
    violenceLevel: /thriller|horror|crime/.test(String(genre || "").toLowerCase()) ? "medium" : "low",
    romanceLevel: /romance/.test(String(genre || "").toLowerCase()) ? "central" : "minimal",
    twistDensity: /thriller|mystery|crime/.test(String(genre || "").toLowerCase()) ? "balanced" : "low",
    subtitleMode: "hybrid",
    characters: [],
  };
}

export function mergeBestsellerPro(
  partial?: Partial<BestsellerProConfig> | null,
  genre?: string,
): BestsellerProConfig {
  const base = defaultBestsellerProConfig(genre);
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    characters: Array.isArray(partial.characters) ? partial.characters : base.characters,
  };
}

export function buildAuthorStyleFromPro(pro: BestsellerProConfig): string {
  const parts = [
    VOICE_TONE_MAP[pro.authorVoice],
    DIALOGUE_TONE_MAP[pro.dialogueStyle],
    `narrative intensity: ${pro.narrativeIntensity}`,
    `pacing: ${pro.pacing.replace("_", " ")}`,
    `ending: ${pro.endingType.replace("_", " ")}`,
    `emotional intensity: ${pro.emotionalIntensity}`,
    `twist density: ${pro.twistDensity}`,
  ];
  if (pro.violenceLevel !== "low") parts.push(`violence level: ${pro.violenceLevel}`);
  if (pro.romanceLevel !== "minimal") parts.push(`romance level: ${pro.romanceLevel}`);
  if (pro.customVoice.trim()) parts.push(pro.customVoice.trim());
  return parts.join("; ");
}

export function charactersProToText(characters: BestsellerCharacter[]): string {
  return characters
    .filter((c) => c.name.trim())
    .map((c) => {
      const lines = [`${c.name.trim()}${c.role ? ` (${c.role.replace("_", " ")})` : ""}`];
      if (c.fear.trim()) lines.push(`Fear: ${c.fear.trim()}`);
      if (c.desire.trim()) lines.push(`Desire: ${c.desire.trim()}`);
      if (c.secret.trim()) lines.push(`Secret: ${c.secret.trim()}`);
      if (c.note.trim()) lines.push(c.note.trim());
      return lines.join("\n");
    })
    .join("\n\n");
}

export function applyBestsellerProToInput(
  input: AutoBestsellerInput,
  pro?: BestsellerProConfig | null,
): AutoBestsellerInput {
  const merged = mergeBestsellerPro(pro, input.genre);
  const authorStyle = buildAuthorStyleFromPro(merged);
  const charText = charactersProToText(merged.characters);
  const existingChars = input.charactersText?.trim() || "";
  const charactersText = charText || existingChars || undefined;
  const tone = [input.tone, authorStyle].filter(Boolean).join("; ") || authorStyle;

  return {
    ...input,
    tone,
    charactersText,
    bestsellerPro: merged,
  };
}

export function generateSubtitleOptions(
  input: Pick<AutoBestsellerInput, "idea" | "genre" | "subcategory" | "targetAudience" | "tone" | "language" | "titleLanguage" | "prefilledTitle" | "readerPromise">,
  count = 4,
): string[] {
  const candidates = generateShadowTitleSet(
    {
      idea: input.idea,
      genre: input.genre,
      subcategory: input.subcategory,
      targetAudience: input.targetAudience,
      readerPromise: input.readerPromise || input.targetAudience,
      tone: input.tone,
      language: input.language,
      titleLanguage: (input.titleLanguage || input.language) as Language,
      title: input.prefilledTitle,
    },
    count,
  );
  const subs = candidates.map((c) => c.subtitle.trim()).filter(Boolean);
  return [...new Set(subs)].slice(0, count);
}

export function resolveSubtitleFromPro(
  input: AutoBestsellerInput,
  pro: BestsellerProConfig,
): { title?: string; subtitle?: string } {
  if (pro.subtitleMode === "manual") {
    return {
      title: input.prefilledTitle,
      subtitle: input.prefilledSubtitle,
    };
  }
  const options = generateSubtitleOptions(input, 5);
  if (pro.subtitleMode === "auto") {
    return {
      title: input.prefilledTitle || undefined,
      subtitle: options[0] || input.prefilledSubtitle,
    };
  }
  return {
    title: input.prefilledTitle || undefined,
    subtitle: input.prefilledSubtitle?.trim() || options[0],
  };
}
