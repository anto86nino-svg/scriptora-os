import type { BookConfig, GenreLock } from "@/types/book";
import { BOOK_LENGTH_CONFIG, getBookTotalWords } from "@/types/book";
import { buildGenreSystemBlock, getGenreBlueprint, resolveGenreKey } from "@/lib/genre-intelligence";
import { buildBookTypeEngineBlock } from "@/lib/book-type-engine";
import { buildBlueprintIntegrityFoundationBlock } from "@/lib/BlueprintIntegrityEngine";
import { buildEditorialMasteryBlock } from "@/lib/editorial-mastery";
import { buildWritingStyleBlock, findStylePresetById, findStylePresetByLabel } from "@/lib/writing-styles";
import { sanitizeBookConfiguration } from "./sanitize";
import { buildGenreDnaPromptBlock, resolveGenreDnaProfile } from "./genre-dna";

function resolveLockedBlueprint(config: BookConfig, lock?: GenreLock) {
  if (lock) {
    return {
      structure: lock.structure,
      tone: lock.tone,
      chapterStyle: lock.chapterStyle,
      hasSubchapters: lock.hasSubchapters,
      frontMatterTemplate: lock.frontMatterTemplate,
      backMatterTemplate: lock.backMatterTemplate,
      contentRules: lock.rules,
    };
  }
  return getGenreBlueprint(config.genre, config.subcategory);
}

function buildStyleLockBlock(config: BookConfig): string {
  const preset = findStylePresetById(config.authorStyle) ?? findStylePresetByLabel(config.authorStyle);
  const styleLabel = preset?.label ?? config.authorStyle;
  const styleBlock = buildWritingStyleBlock(config.authorStyle);
  const lang = config.language;

  return `STYLE LOCK — MAINTAIN CONSISTENTLY:
- Tone: "${config.tone}" — NEVER deviate from this voice
- Author/Style DNA: "${styleLabel}" — channel this voice's rhythm, vocabulary, and sensibility
- Genre conventions: ${config.genre} — honor genre expectations while transcending them
- Language: ${lang} — EVERY word in ${lang}, no exceptions

${styleBlock}

If previous chapters established a specific vocabulary, rhythm, or narrative device, CONTINUE using it. Style drift = failure.`;
}

/**
 * Clean-room system prompt — always built from sanitized canonical config.
 * No incremental merges with legacy selections.
 */
export function buildPromptFromCanonicalConfig(
  rawConfig: BookConfig,
  lock?: GenreLock,
  opts?: { dominateMode?: boolean },
): { config: BookConfig; prompt: string; fixes: ReturnType<typeof sanitizeBookConfiguration>["fixes"] } {
  const { config, fixes } = sanitizeBookConfiguration(rawConfig);

  const langMap: Record<string, string> = {
    English: "English", Italian: "Italian (Italiano)", Spanish: "Spanish (Español)",
    French: "French (Français)", German: "German (Deutsch)",
  };
  const lang = langMap[config.language] || config.language;
  const genrePrompt = buildGenreSystemBlock(config.genre, config.subcategory, config.bookFormat);
  const dnaBlock = buildGenreDnaPromptBlock(resolveGenreDnaProfile(config));
  const bp = resolveLockedBlueprint(config, lock);
  const editorialBlock = `EDITORIAL BLUEPRINT — ${resolveGenreKey(config.genre, config.subcategory, config.bookFormat).toUpperCase()}${lock ? " (LOCKED)" : ""}
Book structure (sections): ${bp.structure.join(" → ")}
Editorial tone: ${bp.tone}
Chapter style: ${bp.chapterStyle}
Subchapters expected: ${bp.hasSubchapters ? "yes" : "no"}

CONTENT RULES (mandatory for every chapter):
${bp.contentRules.map((r) => `• ${r}`).join("\n")}`;

  const masteryBlock = buildEditorialMasteryBlock({
    genre: config.genre,
    subcategory: config.subcategory,
    language: lang,
    tone: config.tone,
    dominateMode: opts?.dominateMode,
  });

  const bookTypeEngineBlock = buildBookTypeEngineBlock(config);

  const prompt = `${genrePrompt}

${dnaBlock}

${buildBlueprintIntegrityFoundationBlock(config)}

${editorialBlock}

${buildStyleLockBlock(config)}

${masteryBlock}

${bookTypeEngineBlock}

ABSOLUTE RULES — BESTSELLER STANDARD:
1. WRITE EVERYTHING IN ${lang.toUpperCase()}. Every word, title, sentence MUST be in ${lang}. No exceptions.
2. START every chapter with a powerful HOOK — tension, uncomfortable truth, or scene-in-motion. Never throat-clearing.
3. Include at least 3–5 quotable, highlight-worthy sentences per chapter.
4. NEVER repeat ideas, phrases, examples, or structural patterns across chapters.
5. Each chapter must escalate — building emotional, cognitive, or narrative momentum.
6. Write at PUBLISHED BESTSELLER quality — superior to current market average.
7. Create sentences readers will screenshot, highlight, and share.
8. Use varied sentence rhythm — short punches mixed with flowing prose.
9. Book scope: ${BOOK_LENGTH_CONFIG[config.bookLength].description} (target: ~${getBookTotalWords(config).toLocaleString()} total words)
10. RESPECT THE EDITORIAL BLUEPRINT — chapter style and content rules are MANDATORY${lock ? " AND LOCKED" : ""}.
11. RESPECT THE EDITORIAL MASTERY LAYER — apply silently, never expose its rules in the text.
12. OUTPUT RULE: return ONLY the final content. No commentary, no explanations, no labels, no apologies.`;

  return { config, prompt, fixes };
}
