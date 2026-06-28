import type { BookConfig } from "@/types/book";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { studioGenresFromRegistry } from "@/lib/book-type-engine";
import { DEFAULT_STYLE_PROFILE } from "@/lib/book-creation-os/objectives";
import { applyBookKernelToConfig } from "@/lib/book-intelligence";
import type { ConfigFix, SanitizeResult } from "./types";
import {
  defaultBookTypeIdForLevel1,
  getLevel1Definition,
  inferLevel1FromConfig,
  isBookTypeAllowedForLevel1,
  resolveLevel1FromBookTypeId,
  subcategoryMatchesBlockedToken,
} from "./level1-lock";
import { resolveGenreDnaProfile } from "./genre-dna";

function stripStyleDirectiveFromTone(tone: string): string {
  const idx = tone.indexOf(" · Voce autore:");
  if (idx >= 0) return tone.slice(0, idx).trim();
  const idx2 = tone.indexOf("Voce autore:");
  if (idx2 >= 0) return tone.slice(0, idx2).trim();
  return tone.trim();
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function pushFix(fixes: ConfigFix[], field: string, before: string, after: string, reason: string) {
  if (before === after) return;
  fixes.push({ field, before, after, reason });
}

export function resetConfigForLevel1Change(
  config: BookConfig,
  newLevel1: ReturnType<typeof inferLevel1FromConfig>,
  previousLevel1?: ReturnType<typeof inferLevel1FromConfig>,
): { config: BookConfig; fixes: ConfigFix[] } {
  const fixes: ConfigFix[] = [];
  const levelDef = getLevel1Definition(newLevel1);
  const dna = resolveGenreDnaProfile({ bookTypeId: defaultBookTypeIdForLevel1(newLevel1) });
  const defaultType = studioGenresFromRegistry().find((g) => g.id === defaultBookTypeIdForLevel1(newLevel1));

  let next: BookConfig = { ...config };

  const allowedId = isBookTypeAllowedForLevel1(next.bookTypeId || "", newLevel1)
    ? next.bookTypeId
    : defaultBookTypeIdForLevel1(newLevel1);

  if (next.bookTypeId !== allowedId) {
    pushFix(fixes, "bookTypeId", next.bookTypeId || "", allowedId || "", `Incompatibile con ${levelDef.label}`);
    next.bookTypeId = allowedId;
  }

  if (defaultType) {
    if (next.genre !== defaultType.genre) {
      pushFix(fixes, "genre", next.genre, defaultType.genre, `Allineato a ${levelDef.label}`);
      next.genre = defaultType.genre;
    }
    if (next.category !== defaultType.category) {
      pushFix(fixes, "category", next.category, defaultType.category, `Categoria per ${levelDef.label}`);
      next.category = defaultType.category;
    }
  }

  if (subcategoryMatchesBlockedToken(next.subcategory, levelDef.blockedSubcategoryTokens)) {
    const replacement = defaultType?.defaultSubcategory || "General";
    pushFix(fixes, "subcategory", next.subcategory, replacement, `Sottocategoria incompatibile con ${levelDef.label}`);
    next.subcategory = replacement;
    next.subgenre = replacement;
  }

  const cleanTone = stripStyleDirectiveFromTone(next.tone);
  if (previousLevel1 && previousLevel1 !== newLevel1) {
    pushFix(fixes, "tone", next.tone, dna.defaultTone, `Reset tono per cambio tipo libro`);
    next.tone = dna.defaultTone;
    pushFix(fixes, "authorStyle", next.authorStyle, dna.defaultAuthorStyle, `Reset stile autore per cambio tipo libro`);
    next.authorStyle = dna.defaultAuthorStyle;
    next.styleProfile = { ...DEFAULT_STYLE_PROFILE, ...dna.styleProfile };
  } else if (matchesAny(cleanTone, dna.blockedTonePatterns)) {
    pushFix(fixes, "tone", next.tone, dna.defaultTone, `Tono incompatibile con DNA ${dna.label}`);
    next.tone = dna.defaultTone;
  }

  if (matchesAny(next.authorStyle, dna.blockedAuthorStylePatterns)) {
    pushFix(fixes, "authorStyle", next.authorStyle, dna.defaultAuthorStyle, `Stile autore incompatibile con DNA ${dna.label}`);
    next.authorStyle = dna.defaultAuthorStyle;
  }

  return { config: next, fixes };
}

/** Universal config sanitization — run before any generation path. */
export function sanitizeBookConfiguration(
  input: BookConfig,
  opts?: { previousLevel1?: ReturnType<typeof inferLevel1FromConfig> },
): SanitizeResult {
  const fixes: ConfigFix[] = [];
  let config: BookConfig = { ...input };

  const level1 = inferLevel1FromConfig(config);
  const previousLevel1 = opts?.previousLevel1 ?? resolveLevel1FromBookTypeId(config.bookTypeId);

  const levelDef = getLevel1Definition(level1);

  // 1. bookTypeId must belong to level-1 allowlist
  if (config.bookTypeId && !isBookTypeAllowedForLevel1(config.bookTypeId, level1)) {
    const replacement = defaultBookTypeIdForLevel1(level1);
    pushFix(fixes, "bookTypeId", config.bookTypeId, replacement, `bookTypeId non ammesso per ${levelDef.label}`);
    config.bookTypeId = replacement;
  }

  // 2. Align genre with resolved book type definition
  const typeDef = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  if (config.bookTypeId !== typeDef.id) {
    pushFix(fixes, "bookTypeId", config.bookTypeId || "", typeDef.id, "Allineato alla definizione libro risolta");
    config.bookTypeId = typeDef.id;
  }
  if (config.genre !== typeDef.genre) {
    pushFix(fixes, "genre", config.genre, typeDef.genre, "Genere allineato al tipo libro");
    config.genre = typeDef.genre;
  }

  // 3. Block incompatible subcategory/subgenre tokens
  if (subcategoryMatchesBlockedToken(config.subcategory, levelDef.blockedSubcategoryTokens)) {
    const replacement = typeDef.subcategoryHints[0] || "General";
    pushFix(fixes, "subcategory", config.subcategory, replacement, `Sottocategoria bloccata per ${levelDef.label}`);
    config.subcategory = replacement;
  }
  if (subcategoryMatchesBlockedToken(config.subgenre || "", levelDef.blockedSubcategoryTokens)) {
    const replacement = typeDef.subcategoryHints[0] || config.subcategory;
    pushFix(fixes, "subgenre", config.subgenre || "", replacement, `Sottogenere bloccato per ${levelDef.label}`);
    config.subgenre = replacement;
  }

  // 4. Genre DNA enforcement on tone / authorStyle / styleProfile
  const dna = resolveGenreDnaProfile(config);
  const cleanTone = stripStyleDirectiveFromTone(config.tone);

  if (matchesAny(cleanTone, dna.blockedTonePatterns)) {
    pushFix(fixes, "tone", config.tone, dna.defaultTone, `Tono incoerente con ${dna.label}`);
    config.tone = dna.defaultTone;
  }

  if (matchesAny(config.authorStyle, dna.blockedAuthorStylePatterns)) {
    pushFix(fixes, "authorStyle", config.authorStyle, dna.defaultAuthorStyle, `Stile autore incoerente con ${dna.label}`);
    config.authorStyle = dna.defaultAuthorStyle;
  }

  // Clamp style sliders when they contradict DNA (e.g. high poetic on thriller)
  const profile = { ...DEFAULT_STYLE_PROFILE, ...(config.styleProfile || {}) };
  const dnaProfile = { ...DEFAULT_STYLE_PROFILE, ...dna.styleProfile };
  let profileChanged = false;

  if (dna.traits.poeticDensity === "LOW" && profile.poeticLevel > 45) {
    profile.poeticLevel = dnaProfile.poeticLevel ?? 30;
    profileChanged = true;
    fixes.push({ field: "styleProfile.poeticLevel", before: String(config.styleProfile?.poeticLevel ?? ""), after: String(profile.poeticLevel), reason: "DNA: poeticDensity LOW" });
  }
  if (dna.traits.therapeuticSpeech === "BLOCKED" && profile.emotionalIntensity > 80 && profile.psychologicalDepth > 75) {
    profile.emotionalIntensity = dnaProfile.emotionalIntensity ?? 55;
    profile.psychologicalDepth = dnaProfile.psychologicalDepth ?? 55;
    profileChanged = true;
  }
  if (dna.traits.tension === "HIGH" && profile.tensionIntensity < 60) {
    profile.tensionIntensity = dnaProfile.tensionIntensity ?? 80;
    profileChanged = true;
  }
  if (profileChanged) {
    config.styleProfile = { ...profile, presetId: dnaProfile.presetId || profile.presetId };
  }

  // 5. targetReader / commercial contamination heuristics
  const readerHay = `${config.targetReader || ""} ${config.idea || ""}`.toLowerCase();
  if (level1 === "romanzo" && /mindset|self.?help|coaching|healing framework|productivity/i.test(readerHay)) {
    const replacement = "Lettori di narrativa che cercano tensione, atmosfera e personaggi credibili.";
    pushFix(fixes, "targetReader", config.targetReader || "", replacement, "Target lettore incoerente con narrativa");
    config.targetReader = replacement;
  }
  if (level1 === "self-help" && /dark romance|gothic thriller|murder mystery|fantasy quest/i.test(readerHay)) {
    const replacement = "Lettori che cercano chiarezza, strumenti pratici e trasformazione concreta.";
    pushFix(fixes, "targetReader", config.targetReader || "", replacement, "Target lettore incoerente con self-help");
    config.targetReader = replacement;
  }

  return {
    config: applyBookKernelToConfig(config),
    fixes,
    level1,
    previousLevel1,
    level1Changed: Boolean(opts?.previousLevel1 && opts.previousLevel1 !== level1),
  };
}
