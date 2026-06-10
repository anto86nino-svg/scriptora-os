import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import type { BookConfig } from "@/types/book";
import { SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/lib/character-studio-keys";
import {
  applyAuthorIdentityToConfig,
  getSelectedAuthorIdentity,
  resolveAuthorIdentity,
  type AuthorIdentity,
} from "@/lib/author-identity";
import { ensureBookTitleMetadata } from "@/lib/title-shadow";
import {
  AUTHOR_VOICE_OPTIONS,
  DIALOGUE_STYLE_OPTIONS,
  buildAuthorStyleFromPro,
  defaultBestsellerProConfig,
  mergeBestsellerPro,
  type AuthorVoice,
  type BestsellerProConfig,
} from "@/lib/bestseller-pro-config";
import type { AutoBestsellerArchitectResult, AutoBestsellerHandoffPack } from "@/lib/auto-bestseller-architect/types";
import { buildArchitectBookConfig, buildHandoffPack } from "@/lib/auto-bestseller-architect";
import { sanitizeBlueprintChapterTitles } from "@/lib/chapter-generation-guard";
import { buildLongBookMemory } from "@/lib/long-book-memory";

export const NEXORA_AUTO_BRIEF_KEY = "nexora-auto-brief";
export const NEXORA_NEW_BOOK_KEY = "nexora-new-book";

export interface CharacterStudioProject {
  idea?: string;
  genre?: string;
  subcategory?: string;
  tone?: string;
  language?: string;
  titleLanguage?: string;
  category?: string;
  characterBible?: string;
  manualCharacterNames?: string;
  intensity?: string;
  centralDynamic?: string;
  protagonistType?: string;
}

export function isNarrativeGenreForCharacters(genre?: string): boolean {
  const g = String(genre || "").toLowerCase();
  return ["romance", "dark-romance", "thriller", "fantasy", "fiction", "memoir", "historical", "horror", "sci-fi", "mystery", "crime"].some((x) => g.includes(x));
}

export function getPendingCharacterProject(): CharacterStudioProject | null {
  try {
    const raw =
      sessionStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY) ||
      localStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CharacterStudioProject;
    if (!parsed?.characterBible && !parsed?.idea) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getCharacterBibleText(): string {
  return (
    sessionStorage.getItem(SCRIPTORA_CHARACTER_BIBLE_KEY) ||
    localStorage.getItem(SCRIPTORA_CHARACTER_BIBLE_KEY) ||
    getPendingCharacterProject()?.characterBible ||
    ""
  ).trim();
}

export function charactersFromBibleText(text?: string): NonNullable<BookConfig["characters"]> {
  const raw = String(text || "").trim();
  if (!raw) return [];

  return raw
    .split(/\n{2,}(?=Nome:|Name:)|^\s*[-•]\s*/gm)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const get = (label: string) => {
        const found = lines.find((l) => l.toLowerCase().startsWith(label.toLowerCase()));
        return found ? found.replace(new RegExp(`^${label}\\s*`, "i"), "").trim() : "";
      };

      const nameLine = get("Nome:") || get("Name:") || lines[0] || "";
      const surname = get("Cognome:") || get("Surname:");

      return {
        name: nameLine || "Personaggio",
        surname,
        age: get("Età:") || get("Age:"),
        role: get("Ruolo nella storia:") || get("Role:"),
        physicalDescription: get("Aspetto fisico:") || get("Physical description:"),
        personality: get("Carattere:") || get("Personality:") || block,
        wound: get("Ferita interiore:") || get("Core wound:"),
        externalDesire: get("Desiderio esterno:") || get("External desire:"),
        internalNeed: get("Bisogno interiore:") || get("Internal need:"),
        secret: get("Segreto:") || get("Secret:"),
        relationships: get("Rapporto con gli altri personaggi:") || get("Relationship to other characters:"),
        strictRules:
          get("Regole di continuità:") ||
          "Never rename this character. Preserve role, wound, desire, relationships and continuity.",
      };
    })
    .filter((c) => String(c.name || "").trim());
}

function characterBibleToBriefText(bible: string): string {
  return charactersFromBibleText(bible)
    .map((c) => {
      const lines = [`${c.name}${c.role ? ` (${c.role})` : ""}`];
      if (c.wound) lines.push(`Fear/Wound: ${c.wound}`);
      if (c.externalDesire) lines.push(`Desire: ${c.externalDesire}`);
      if (c.secret) lines.push(`Secret: ${c.secret}`);
      if (c.personality) lines.push(String(c.personality));
      return lines.join("\n");
    })
    .join("\n\n");
}

export function mergeCharacterStudioIntoConfig(
  config: BookConfig,
  pending?: CharacterStudioProject | null,
): BookConfig {
  const project = pending ?? getPendingCharacterProject();
  const bible = String(project?.characterBible || getCharacterBibleText() || "").trim();
  if (!bible) return config;

  const genre = project?.genre || config.genre;
  if (!isNarrativeGenreForCharacters(genre)) return config;

  const parsed = charactersFromBibleText(bible);
  const characters = (config.characters?.length ? config.characters : parsed) as BookConfig["characters"];

  return {
    ...config,
    genre: (project?.genre || config.genre) as BookConfig["genre"],
    category: project?.category || config.category || "Fiction",
    subcategory: project?.subcategory || config.subcategory || "",
    tone: project?.tone || config.tone,
    language: (project?.language || config.language) as BookConfig["language"],
    titleLanguage: (project?.titleLanguage || project?.language || config.titleLanguage) as BookConfig["titleLanguage"],
    authorStyle: config.authorStyle?.trim() ? config.authorStyle : project?.tone || config.tone,
    characters,
  };
}

export function mergeCharacterStudioIntoAutoBestsellerInput(input: AutoBestsellerInput): AutoBestsellerInput {
  const pending = getPendingCharacterProject();
  const bible = String(pending?.characterBible || getCharacterBibleText() || "").trim();
  const author = getSelectedAuthorIdentity();
  const charsText = bible ? characterBibleToBriefText(bible) : "";

  const merged: AutoBestsellerInput = {
    ...input,
    idea: input.idea?.trim() || pending?.idea || input.idea,
    genre: input.genre || pending?.genre || input.genre,
    subcategory: input.subcategory || pending?.subcategory,
    targetAudience: input.targetAudience?.trim() || pending?.tone || input.targetAudience,
    tone: input.tone || pending?.tone || input.tone,
    language: input.language || pending?.language || input.language,
    titleLanguage: input.titleLanguage || pending?.titleLanguage || pending?.language || input.titleLanguage,
    charactersText: input.charactersText?.trim() || charsText || input.charactersText,
    authorName: input.authorName || author.penName,
    authorIdentityId: input.authorIdentityId || author.id,
    authorIdentity: input.authorIdentity || author,
  };

  if (!merged.bestsellerPro && (pending?.genre || merged.genre)) {
    merged.bestsellerPro = defaultBestsellerProConfig(merged.genre);
  }

  return merged;
}

function applyProStyleToConfig(config: BookConfig, pro?: BestsellerProConfig): BookConfig {
  if (!isNarrativeGenreForCharacters(config.genre)) return config;

  const merged = mergeBestsellerPro(pro, config.genre);
  const style = buildAuthorStyleFromPro(merged);
  const genericStyle = !config.authorStyle?.trim() || config.authorStyle === "Brianna Wiest";
  const genericTone = !config.tone?.trim() || config.tone === "warm, insightful, transformative";

  return {
    ...config,
    authorStyle: genericStyle ? style : config.authorStyle,
    tone: genericTone
      ? style
      : config.tone?.includes("narrative intensity")
        ? config.tone
        : [config.tone, style].filter(Boolean).join("; "),
  };
}

export function enrichBookConfigForCreation(
  config: BookConfig,
  authorIdentity?: AuthorIdentity | null,
): BookConfig {
  const identity =
    authorIdentity ||
    resolveAuthorIdentity(config.authorIdentity, config.authorIdentityId) ||
    getSelectedAuthorIdentity();

  let enriched = applyAuthorIdentityToConfig(config, identity) as BookConfig;
  enriched = mergeCharacterStudioIntoConfig(enriched);
  enriched = applyProStyleToConfig(enriched, defaultBestsellerProConfig(enriched.genre));

  const pending = getPendingCharacterProject();
  return ensureBookTitleMetadata(enriched, {
    idea: pending?.idea,
    genre: enriched.genre,
    category: enriched.category,
    subcategory: enriched.subcategory,
    targetAudience: enriched.tone,
    language: enriched.language,
    titleLanguage: enriched.titleLanguage,
    characterBible: getCharacterBibleText() || undefined,
    manualCharacterNames: pending?.manualCharacterNames,
  });
}

export interface DashboardBriefParams {
  idea: string;
  genre: string;
  subcategory?: string;
  targetAudience: string;
  tone?: string;
  language: string;
  titleLanguage: string;
  numberOfChapters: number;
  subchaptersEnabled: boolean;
  subchaptersPerChapter?: number;
  bookLength: BookConfig["bookLength"];
  customTotalWords?: number;
  totalWordTarget: number;
  level?: AutoBestsellerInput["level"];
  readerPromise?: string;
  prefilledTitle?: string;
  prefilledSubtitle?: string;
  authorIdentityId: string;
  authorIdentity: AuthorIdentity;
  authorName: string;
  bestsellerPro?: BestsellerProConfig;
  autoStart?: boolean;
}

export function buildDashboardAutoBrief(params: DashboardBriefParams): AutoBestsellerInput & { autoStart?: boolean } {
  const brief: AutoBestsellerInput & { autoStart?: boolean } = {
    idea: params.idea.trim(),
    genre: params.genre,
    subcategory: params.subcategory,
    targetAudience: params.targetAudience,
    tone: params.tone,
    language: params.language,
    titleLanguage: params.titleLanguage || params.language,
    numberOfChapters: params.numberOfChapters,
    subchaptersEnabled: params.subchaptersEnabled,
    subchaptersPerChapter: params.subchaptersEnabled ? params.subchaptersPerChapter : undefined,
    bookLength: params.bookLength,
    customTotalWords: params.customTotalWords,
    totalWordTarget: params.totalWordTarget,
    level: params.level,
    readerPromise: params.readerPromise,
    prefilledTitle: params.prefilledTitle,
    prefilledSubtitle: params.prefilledSubtitle,
    authorIdentityId: params.authorIdentityId,
    authorIdentity: params.authorIdentity,
    authorName: params.authorName,
    bestsellerPro: params.bestsellerPro || defaultBestsellerProConfig(params.genre),
    autoStart: params.autoStart,
  };
  return mergeCharacterStudioIntoAutoBestsellerInput(brief);
}

export function persistAutoBestsellerBrief(brief: AutoBestsellerInput & { autoStart?: boolean }): void {
  sessionStorage.setItem(NEXORA_AUTO_BRIEF_KEY, JSON.stringify(brief));
}

export function buildAutoBriefFromCharacterStudio(project: CharacterStudioProject): AutoBestsellerInput {
  const author = getSelectedAuthorIdentity();
  const genre = project.genre || "romance";
  return mergeCharacterStudioIntoAutoBestsellerInput({
    idea: project.idea || "",
    genre,
    subcategory: project.subcategory,
    targetAudience: project.tone || "",
    tone: project.tone,
    language: project.language || "Italian",
    titleLanguage: project.titleLanguage || project.language || "Italian",
    numberOfChapters: 12,
    subchaptersEnabled: false,
    bookLength: "medium",
    totalWordTarget: 50000,
    authorIdentityId: author.id,
    authorIdentity: author,
    authorName: author.penName,
    charactersText: project.characterBible ? characterBibleToBriefText(project.characterBible) : undefined,
    bestsellerPro: defaultBestsellerProConfig(genre),
    autoStart: false,
  });
}

export function rebuildArchitectHandoffPack(
  result: AutoBestsellerArchitectResult,
  input: AutoBestsellerInput,
  selectedTitleIndex: number,
): AutoBestsellerHandoffPack {
  const selected = result.titleConcepts[selectedTitleIndex] || result.titleConcepts[0];
  if (!selected) {
    return buildHandoffPack(result);
  }

  const config = buildArchitectBookConfig(
    input,
    result.ideaIntelligence,
    result.marketPositioning,
    selected,
  );

  let blueprint = sanitizeBlueprintChapterTitles(result.blueprint, config);
  const oldTitle = result.config.title;
  if (oldTitle && oldTitle !== config.title && blueprint.overview?.includes(oldTitle)) {
    blueprint = {
      ...blueprint,
      overview: blueprint.overview.split(oldTitle).join(config.title),
    };
  }

  const memorySeed = buildLongBookMemory({ config, blueprint, chapters: [] });

  return buildHandoffPack({
    ...result,
    config,
    blueprint,
    memorySeed,
    selectedTitleIndex,
  });
}

export function persistNewBookConfig(config: BookConfig): void {
  sessionStorage.setItem(NEXORA_NEW_BOOK_KEY, JSON.stringify(enrichBookConfigForCreation(config)));
}

export interface BookCreationContextSnapshot {
  authorName: string;
  authorVoiceLabel: string;
  dialogueLabel: string;
  pacingLabel: string;
  castCount: number;
  castLinked: boolean;
  castSource: "studio" | "brief" | "both" | null;
  genreLabel?: string;
  hasActiveContext: boolean;
}

function labelForVoice(voice: AuthorVoice): string {
  return AUTHOR_VOICE_OPTIONS.find((o) => o.value === voice)?.label || voice;
}

export function getBookCreationContextSnapshot(options?: {
  authorIdentity?: AuthorIdentity | null;
  authorVoice?: AuthorVoice;
  bestsellerPro?: BestsellerProConfig | null;
  genre?: string;
}): BookCreationContextSnapshot {
  const author = options?.authorIdentity || getSelectedAuthorIdentity();
  const genre = options?.genre || getPendingCharacterProject()?.genre;
  const pro = mergeBestsellerPro(options?.bestsellerPro, genre);
  const voice = options?.authorVoice || pro.authorVoice;

  const studioChars = charactersFromBibleText(getCharacterBibleText());
  const briefChars = (pro.characters || []).filter((c) => c.name.trim());
  const castCount = Math.max(studioChars.length, briefChars.length);
  const castLinked = castCount > 0;
  const castSource: BookCreationContextSnapshot["castSource"] = studioChars.length && briefChars.length
    ? "both"
    : studioChars.length
      ? "studio"
      : briefChars.length
        ? "brief"
        : null;

  const pacingLabel = pro.pacing === "slow_burn" ? "Slow burn" : pro.pacing === "fast" ? "Fast" : "Balanced";
  const dialogueLabel = DIALOGUE_STYLE_OPTIONS.find((o) => o.value === pro.dialogueStyle)?.label || pro.dialogueStyle;

  return {
    authorName: author.penName || author.name || "Autore",
    authorVoiceLabel: labelForVoice(voice),
    dialogueLabel,
    pacingLabel,
    castCount,
    castLinked,
    castSource,
    genreLabel: genre ? String(genre) : undefined,
    hasActiveContext: Boolean(author.penName || castLinked || genre),
  };
}
