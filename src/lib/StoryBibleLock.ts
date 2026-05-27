import type { BookCharacter, BookConfig, Chapter } from "@/types/book";
import { detectGenreBrainId, type GenreBrainId } from "@/lib/GenreBrain";

export const STORY_BIBLE_LOCK_STORAGE_KEY = "scriptora-story-bible-lock-enabled";

export type StoryBibleLockContext = {
  config?: Partial<BookConfig>;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  chapterIndex?: number;
  outlineSummary?: string;
  storyBibleLockEnabled?: boolean;
  storyEngineV11Enabled?: boolean;
};

export type StoryBibleCorrectionType =
  | "character-name"
  | "victim"
  | "relationship-fact"
  | "location"
  | "world-rule"
  | "reveal-pace"
  | "chapter-focus"
  | "emotional-arc"
  | "genre-stability"
  | "entity"
  | "orphan-fragment"
  | "beauty-density";

export type StoryBibleCorrection = {
  type: StoryBibleCorrectionType;
  before: string;
  after: string;
  reason: string;
};

export type StoryStabilityMetrics = {
  continuityStability: number;
  characterConsistency: number;
  revealPacing: number;
  contradictionRate: number;
  canonMutationRate: number;
  emotionalPacing: number;
  genreDrift: number;
  longFormCoherence: number;
  revealCount: number;
  subplotMarkers: number;
  emotionalTeleportationMarkers: number;
  genreDriftMarkers: number;
  canonMutations: number;
  contradictions: number;
  protectedFacts: number;
  nameDrift: number;
  orphanFragments: number;
  beautyDensity: number;
  emotionalRealism: number;
  immersion: number;
  aiDetectability: number;
};

export type StoryBibleLockResult = {
  text: string;
  corrections: StoryBibleCorrection[];
  metrics: StoryStabilityMetrics;
};

type CanonCharacter = {
  firstName: string;
  surname?: string;
  fullName: string;
  role?: string;
  age?: string;
  personalityCore?: string;
  traumaProfile?: string;
  relationships?: string;
  strictRules?: string;
};

type CanonFactKind =
  | "victim"
  | "fatherProfession"
  | "villa"
  | "city"
  | "village"
  | "kingdom"
  | "organization"
  | "faction"
  | "artifact"
  | "familyMember"
  | "magicRule"
  | "techRule";

type CanonFact = {
  kind: CanonFactKind;
  value: string;
  source: "config" | "previous";
};

type StoryBible = {
  characters: CanonCharacter[];
  facts: CanonFact[];
  genre: GenreBrainId;
  rawGenre: string;
  isDarkRomance: boolean;
};

const MAX_PROTECTIVE_EDITS = 9;

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function previousText(context: StoryBibleLockContext): string {
  return (context.previousChapters || [])
    .slice(-12)
    .map((chapter) => `${chapter.title || ""}\n${chapter.content || ""}`)
    .join("\n");
}

function normalizeSpaces(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreFromIssues(issueCount: number, tolerance = 0): number {
  return Math.max(0, Math.round(100 - Math.max(0, issueCount - tolerance) * 18));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): number {
  return normalize(text).split(/\s+/).filter(Boolean).length || 1;
}

function levenshtein(a: string, b: string): number {
  const source = a.toLowerCase();
  const target = b.toLowerCase();
  const matrix = Array.from({ length: source.length + 1 }, (_, row) => [row]);

  for (let column = 1; column <= target.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= source.length; row += 1) {
    for (let column = 1; column <= target.length; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[source.length][target.length];
}

function isCloseName(candidate: string, canon: string): boolean {
  if (candidate === canon || candidate.length < 3 || canon.length < 3) return false;
  const distance = levenshtein(candidate, canon);
  return distance <= 1 || (candidate[0]?.toLowerCase() === canon[0]?.toLowerCase() && distance <= 2);
}

function isStoryEngineV11Enabled(context: StoryBibleLockContext = {}): boolean {
  return context.storyEngineV11Enabled !== false;
}

function characterFromConfig(character: BookCharacter): CanonCharacter | null {
  const firstName = textOf(character.name).trim();
  if (!firstName) return null;
  const surname = textOf(character.surname).trim();
  return {
    firstName,
    surname: surname || undefined,
    fullName: [firstName, surname].filter(Boolean).join(" "),
    role: textOf(character.role).trim() || undefined,
    age: textOf(character.age).trim() || undefined,
    personalityCore: textOf(character.personality).trim() || undefined,
    traumaProfile: textOf(character.wound).trim() || undefined,
    relationships: textOf(character.relationships).trim() || undefined,
    strictRules: textOf(character.strictRules).trim() || undefined,
  };
}

function uniqueFacts(facts: CanonFact[]): CanonFact[] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.kind}:${normalize(fact.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    pattern.lastIndex = 0;
    const value = match?.[1]?.trim();
    if (value) return value.replace(/[.,;:!?]+$/g, "");
  }
  return undefined;
}

function extractCanonFacts(text: string): CanonFact[] {
  const facts: CanonFact[] = [];
  const victim = firstMatch(text, [
    /\b(?:victim|vittima)\s*(?:=|was|is|era|è|named|chiamat[ao])?\s+([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/giu,
    /\b([A-ZÀ-Ý][\p{L}'’-]{1,40}),?\s+(?:the victim|la vittima)\b/giu,
  ]);
  const fatherProfession = firstMatch(text, [
    /\b(?:father|padre)\s+(?:was|is|era|è)\s+(?:a|an|un|una)?\s*([a-zà-ÿ][\p{L}-]{2,40})\b/giu,
  ]);
  const villa = firstMatch(text, [
    /\b(Villa\s+(?:delle|dei|degli|del|della|de|of)\s+[A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/gu,
  ]);
  const magicRule = firstMatch(text, [
    /\b(?:magic rule|regola della magia)\s*[:=]\s*([^.\n]{8,120})/giu,
    /\b(?:gate|portal|portale)\s+(?:opens|opened|si apre|apre)\s+(?:only\s+)?(?:with|through|con|tramite)\s+([^.\n]{3,80})/giu,
  ]);
  const techRule = firstMatch(text, [
    /\b(?:tech rule|science rule|regola tecnologica)\s*[:=]\s*([^.\n]{8,120})/giu,
    /\b(?:quantum gate|engine|station core|AI core)\s+(?:requires|needs|richiede)\s+([^.\n]{4,90})/giu,
  ]);
  const city = firstMatch(text, [
    /\b(?:city|città)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
  ]);
  const village = firstMatch(text, [
    /\b(?:village|villaggio)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
  ]);
  const kingdom = firstMatch(text, [
    /\b(?:kingdom|regno)\s*(?:=|was|is|era|è|of|di|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    /\b(Kingdom\s+of\s+[A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/gu,
  ]);
  const organization = firstMatch(text, [
    /\b(?:organization|organisation|ordine|order|guild|gilda)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
  ]);
  const faction = firstMatch(text, [
    /\b(?:faction|fazione|clan|house|casata)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
  ]);
  const artifact = firstMatch(text, [
    /\b(?:artifact|artefact|relic|reliquia|blade|sword|crown|artefatto)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+(?:the\s+)?([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
  ]);
  const familyMember = firstMatch(text, [
    /\b(?:brother|sister|mother|father|fratello|sorella|madre|padre)\s*(?:=|was|is|era|è|named|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/giu,
  ]);

  if (victim) facts.push({ kind: "victim", value: victim, source: "previous" });
  if (fatherProfession) facts.push({ kind: "fatherProfession", value: fatherProfession, source: "previous" });
  if (villa) facts.push({ kind: "villa", value: villa, source: "previous" });
  if (city) facts.push({ kind: "city", value: city, source: "previous" });
  if (village) facts.push({ kind: "village", value: village, source: "previous" });
  if (kingdom) facts.push({ kind: "kingdom", value: kingdom, source: "previous" });
  if (organization) facts.push({ kind: "organization", value: organization, source: "previous" });
  if (faction) facts.push({ kind: "faction", value: faction, source: "previous" });
  if (artifact) facts.push({ kind: "artifact", value: artifact, source: "previous" });
  if (familyMember) facts.push({ kind: "familyMember", value: familyMember, source: "previous" });
  if (magicRule) facts.push({ kind: "magicRule", value: magicRule, source: "previous" });
  if (techRule) facts.push({ kind: "techRule", value: techRule, source: "previous" });
  return facts;
}

function buildStoryBible(context: StoryBibleLockContext): StoryBible {
  const characters = (context.config?.characters || [])
    .map(characterFromConfig)
    .filter((character): character is CanonCharacter => Boolean(character));
  const genre = detectGenreBrainId(context.config);
  const rawGenre = String(context.config?.genre || "").toLowerCase();
  const isDarkRomance = rawGenre.includes("dark");

  return {
    characters,
    facts: uniqueFacts(extractCanonFacts(previousText(context))),
    genre,
    rawGenre,
    isDarkRomance,
  };
}

export function isStoryBibleLockEnabled(context: StoryBibleLockContext = {}): boolean {
  if (context.storyBibleLockEnabled === false) return false;
  if (context.storyBibleLockEnabled === true) return true;

  try {
    if (import.meta.env.VITE_SCRIPTORA_STORY_BIBLE_LOCK === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(STORY_BIBLE_LOCK_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setStoryBibleLockEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORY_BIBLE_LOCK_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-story-bible-lock-change"));
  } catch {
    // Generation must keep working when storage is unavailable.
  }
}

function withCorrection(
  current: string,
  candidate: string,
  corrections: StoryBibleCorrection[],
  type: StoryBibleCorrectionType,
  before: string,
  after: string,
  reason: string,
): string {
  if (candidate === current || corrections.length >= MAX_PROTECTIVE_EDITS) return current;
  corrections.push({ type, before, after, reason });
  return candidate;
}

function withCriticalCorrection(
  current: string,
  candidate: string,
  corrections: StoryBibleCorrection[],
  type: StoryBibleCorrectionType,
  before: string,
  after: string,
  reason: string,
): string {
  if (candidate === current) return current;
  corrections.push({ type, before, after, reason });
  return candidate;
}

function replaceNameToken(text: string, before: string, after: string): string {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}'’-])(${escapeRegExp(before)})(?=$|[^\\p{L}\\p{N}'’-])`, "gu");
  return text.replace(pattern, `$1${after}`);
}

function correctCharacterNameTypos(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  const factParts = new Set(
    bible.facts
      .flatMap((fact) => fact.value.split(/\s+/))
      .map((part) => normalize(part))
      .filter(Boolean),
  );
  const capitalizedTokens = Array.from(
    new Set(
      (text.match(/\b[A-ZÀ-Ý][\p{L}'’-]{3,32}\b/gu) || [])
        .map((token) => token.replace(/['’]s$/i, ""))
        .filter((token) => token.length <= 32 && !ENTITY_STOPWORDS.has(token) && !factParts.has(normalize(token))),
    ),
  );
  let next = text;

  for (const character of bible.characters) {
    for (const token of capitalizedTokens) {
      if (corrections.length >= MAX_PROTECTIVE_EDITS) return next;
      if (isCloseName(token, character.firstName)) {
        const candidate = replaceNameToken(next, token, character.firstName);
        next = withCorrection(
          next,
          candidate,
          corrections,
          "character-name",
          token,
          character.firstName,
          "near-match character name restored to canonical identity",
        );
      }
      if (character.surname && isCloseName(token, character.surname)) {
        const candidate = replaceNameToken(next, token, character.surname);
        next = withCorrection(
          next,
          candidate,
          corrections,
          "character-name",
          token,
          character.surname,
          "near-match surname restored to canonical identity",
        );
      }
    }
  }

  return next;
}

const ENTITY_STOPWORDS = new Set([
  "A",
  "An",
  "And",
  "As",
  "At",
  "But",
  "Chapter",
  "For",
  "He",
  "Her",
  "His",
  "If",
  "In",
  "It",
  "La",
  "Le",
  "Lo",
  "Nel",
  "Nobody",
  "Not",
  "She",
  "Someone",
  "The",
  "They",
  "This",
  "When",
  "Where",
]);

function characterNames(bible: StoryBible): string[] {
  return bible.characters
    .flatMap((character) => [character.firstName, character.surname, character.fullName])
    .filter((value): value is string => Boolean(value?.trim()));
}

function tokenSet(text: string): Set<string> {
  return new Set((text.match(/\b[A-ZÀ-Ý][\p{L}'’-]{2,32}\b/gu) || []).map((token) => token.replace(/['’]s$/i, "")));
}

function unknownPersonTokens(text: string, bible: StoryBible): string[] {
  const canon = new Set(characterNames(bible).map((name) => normalize(name)));
  const factValues = new Set(bible.facts.map((fact) => normalize(fact.value)));
  const factParts = new Set(
    bible.facts
      .flatMap((fact) => fact.value.split(/\s+/))
      .map((part) => normalize(part))
      .filter(Boolean),
  );
  return Array.from(tokenSet(text)).filter((token) => {
    if (ENTITY_STOPWORDS.has(token)) return false;
    if (/^\d/.test(token)) return false;
    const normalized = normalize(token);
    if (!normalized || canon.has(normalized) || factValues.has(normalized) || factParts.has(normalized)) return false;
    if (token.length < 3 || token.length > 24) return false;
    return true;
  });
}

function countTokenMentions(text: string, token: string): number {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}'’-])${escapeRegExp(token)}(?=$|[^\\p{L}\\p{N}'’-])`, "gu");
  return Array.from(text.matchAll(pattern)).length;
}

function correctStrictCharacterEntityDrift(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  if (bible.characters.length < 2) return text;

  const present = tokenSet(text);
  const missingCharacters = bible.characters.filter((character) => !present.has(character.firstName));
  if (missingCharacters.length !== 1) return text;

  const missing = missingCharacters[0];
  const hasOtherCanon = bible.characters.some((character) => character.firstName !== missing.firstName && present.has(character.firstName));
  const unknowns = unknownPersonTokens(text, bible)
    .map((token) => {
      const rolePattern = new RegExp(
        `\\b(looked at|watched|asked|told|followed|with|beside|toward|touched|said|answered|almost said|contro|verso|chiese a|disse a|seguì)\\s+${escapeRegExp(token)}\\b|\\b${escapeRegExp(token)}\\s+(looked|watched|asked|told|followed|touched|said|answered|almost said)\\b`,
        "iu",
      );
      return { token, mentions: countTokenMentions(text, token), relational: rolePattern.test(text) };
    })
    .filter((item) => item.mentions > 0 && item.mentions <= 8);

  const relationalUnknowns = unknowns.filter((item) => item.relational);
  const selected = relationalUnknowns.length === 1 ? relationalUnknowns[0] : unknowns.length === 1 ? unknowns[0] : null;
  if (!selected) return text;

  if (!hasOtherCanon && !selected.relational) return text;

  const candidate = replaceNameToken(text, selected.token, missing.firstName);
  return withCriticalCorrection(
    text,
    candidate,
    corrections,
    "entity",
    selected.token,
    missing.firstName,
    "strict immutable character entity restored",
  );
}

function correctStrictFactEntityDrift(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  const patterns: Partial<Record<CanonFactKind, RegExp>> = {
    city: /\b(city|città)(\s*(?:=|was|is|era|è|called|chiamat[ao])\s+)([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    village: /\b(village|villaggio)(\s*(?:=|was|is|era|è|called|chiamat[ao])\s+)([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    kingdom: /\b(kingdom|regno)(\s*(?:=|was|is|era|è|of|di|called|chiamat[ao])\s+)([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    organization: /\b(organization|organisation|ordine|order|guild|gilda)(\s*(?:=|was|is|era|è|called|chiamat[ao])\s+)([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
    faction: /\b(faction|fazione|clan|house|casata)(\s*(?:=|was|is|era|è|called|chiamat[ao])\s+)([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
    artifact: /\b(artifact|artefact|relic|reliquia|blade|sword|crown|artefatto)(\s*(?:=|was|is|era|è|called|chiamat[ao])\s+(?:the\s+)?)([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
    familyMember: /\b(brother|sister|mother|father|fratello|sorella|madre|padre)(\s*(?:=|was|is|era|è|named|called|chiamat[ao])\s+)([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/giu,
  };

  let next = text;
  for (const fact of bible.facts) {
    const pattern = patterns[fact.kind];
    let candidate = next;
    if (pattern) {
      candidate = candidate.replace(pattern, (match, label: string, spacer: string, currentValue: string) => {
        if (normalize(currentValue) === normalize(fact.value)) return match;
        return `${label}${spacer}${fact.value}`;
      });
    }
    if (fact.kind === "artifact") {
      candidate = candidate.replace(/\b(the\s+)([A-ZÀ-Ý][\p{L}'’-]+(?:\s+[A-ZÀ-Ý][\p{L}'’-]+){0,3}\s(?:Key|Crown|Blade|Sword|Relic))\b/gu, (match, article: string, currentValue: string) => {
        if (normalize(currentValue) === normalize(fact.value)) return match;
        return `${article}${fact.value}`;
      });
    }
    next = withCriticalCorrection(
      next,
      candidate,
      corrections,
      "entity",
      `changed ${fact.kind}`,
      fact.value,
      "strict immutable world entity restored",
    );
  }

  return next;
}

function factValue(bible: StoryBible, kind: CanonFactKind): string | undefined {
  return bible.facts.find((fact) => fact.kind === kind)?.value;
}

function correctVictimDrift(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  const victim = factValue(bible, "victim");
  if (!victim) return text;
  let next = text;
  const patterns: RegExp[] = [
    /\b(victim|vittima)(\s*(?:=|was|is|era|è|named|chiamat[ao])?\s+)([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/giu,
    /\b([A-ZÀ-Ý][\p{L}'’-]{1,40})(,?\s+(?:the victim|la vittima))\b/giu,
  ];

  for (const pattern of patterns) {
    const candidate = next.replace(pattern, (...args: string[]) => {
      const match = args[0];
      if (/\b(second|another|new|seconda|nuova|altra)\b/i.test(match)) return match;
      if (pattern === patterns[0]) {
        const [, label, spacer, currentVictim] = args;
        return currentVictim === victim ? match : `${label}${spacer}${victim}`;
      }
      const [, currentVictim, suffix] = args;
      return currentVictim === victim ? match : `${victim}${suffix}`;
    });
    if (candidate !== next) {
      next = withCorrection(next, candidate, corrections, "victim", "changed victim name", victim, "victim identity canon lock");
    }
  }

  return next;
}

function correctFatherProfessionDrift(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  const profession = factValue(bible, "fatherProfession");
  if (!profession) return text;
  const pattern = /\b(father|padre)(\s+(?:was|is|era|è)\s+(?:a|an|un|una)?\s*)([a-zà-ÿ][\p{L}-]{2,40})\b/giu;
  const candidate = text.replace(pattern, (match, label: string, spacer: string, currentProfession: string) => {
    if (normalize(currentProfession) === normalize(profession)) return match;
    return `${label}${spacer}${profession}`;
  });

  return withCorrection(
    text,
    candidate,
    corrections,
    "relationship-fact",
    "changed father profession",
    profession,
    "family fact restored to established canon",
  );
}

function correctVillaDrift(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  const villa = factValue(bible, "villa");
  if (!villa) return text;
  const pattern = /\bVilla\s+(?:delle|dei|degli|del|della|de|of)\s+[A-ZÀ-Ý][\p{L}'’ -]{2,60}\b/gu;
  const candidate = text.replace(pattern, (match) => (match === villa ? match : villa));

  return withCorrection(text, candidate, corrections, "location", "changed villa/location name", villa, "location canon lock");
}

function correctWorldRuleDrift(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  let next = text;
  const magicRule = factValue(bible, "magicRule");
  const techRule = factValue(bible, "techRule");

  if (magicRule && /\bblood\b/i.test(magicRule)) {
    const candidate = next.replace(/\b(tears?|lacrime)\s+(opened?|opens|aprirono|apre|apriva)\s+(the\s+)?(gate|portal|portale)\b/giu, (match, _key, verb, article = "", gate) => {
      const articlePart = article || (String(gate).toLowerCase() === "portale" ? "il " : "the ");
      return `blood ${verb} ${articlePart}${gate}`;
    });
    next = withCorrection(next, candidate, corrections, "world-rule", "changed magic key", "blood remains the gate key", "magic rule restored");
  }

  if (techRule) {
    const pattern = /\b(quantum gate|engine|station core|AI core)(\s+(?:requires|needs|richiede)\s+)([^.\n]{4,90})/giu;
    const candidate = next.replace(pattern, (match, subject: string, spacer: string, currentRule: string) => {
      if (normalize(currentRule).includes(normalize(techRule))) return match;
      return `${subject}${spacer}${techRule}`;
    });
    next = withCorrection(next, candidate, corrections, "world-rule", "changed technology rule", techRule, "technology rule restored");
  }

  return next;
}

const MAJOR_REVEAL_PATTERN =
  /\b(revealed that|revealed the truth|the truth was|the killer was|the murderer was|confessed that|finally understood that|the prophecy meant|the secret was|scoprì che|la verità era|il colpevole era|confessò che|la profezia significava)\b/i;

function countMajorReveals(text: string): number {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => MAJOR_REVEAL_PATTERN.test(sentence)).length;
}

function limitRevealOverload(text: string, corrections: StoryBibleCorrection[]): string {
  if (countMajorReveals(text) <= 1) return text;

  let seen = 0;
  const candidate = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      if (!MAJOR_REVEAL_PATTERN.test(sentence)) return sentence;
      seen += 1;
      if (seen <= 1) return sentence;
      return sentence
        .replace(/\brevealed that\b/i, "hinted that")
        .replace(/\brevealed the truth\b/i, "opened another question")
        .replace(/\bthe truth was\b/i, "the shape of the truth was still unstable")
        .replace(/\bthe killer was\b/i, "the killer might be")
        .replace(/\bthe murderer was\b/i, "the murderer might be")
        .replace(/\bconfessed that\b/i, "almost admitted that")
        .replace(/\bfinally understood that\b/i, "could not stop circling the thought that")
        .replace(/\bthe prophecy meant\b/i, "the prophecy seemed to lean toward")
        .replace(/\bthe secret was\b/i, "the secret had edges around")
        .replace(/\bscoprì che\b/i, "intuì che")
        .replace(/\bla verità era\b/i, "la verità sembrava ancora instabile")
        .replace(/\bil colpevole era\b/i, "il colpevole poteva essere")
        .replace(/\bconfessò che\b/i, "quasi ammise che")
        .replace(/\bla profezia significava\b/i, "la profezia sembrava puntare verso");
    })
    .join(" ");

  return withCorrection(
    text,
    candidate,
    corrections,
    "reveal-pace",
    "multiple major reveals in one chapter",
    "secondary reveals softened into questions",
    "reveal pace controller",
  );
}

const SUBPLOT_MARKER_PATTERN =
  /\b(Meanwhile|Elsewhere|At the same time|A new stranger|Another secret|A new mystery|Nel frattempo|Altrove|Allo stesso tempo|Un nuovo estraneo|Un altro segreto|Un nuovo mistero)\b/g;

function countSubplotMarkers(text: string): number {
  return (text.match(SUBPLOT_MARKER_PATTERN) || []).length;
}

function limitSubplotExplosion(text: string, corrections: StoryBibleCorrection[]): string {
  if (countSubplotMarkers(text) <= 2) return text;

  let seen = 0;
  const candidate = text.replace(SUBPLOT_MARKER_PATTERN, (match) => {
    seen += 1;
    if (seen <= 2) return match;
    if (/^[A-Z]/.test(match)) return "The same unresolved pressure";
    return "la stessa tensione irrisolta";
  });

  return withCorrection(
    text,
    candidate,
    corrections,
    "chapter-focus",
    "too many subplot openers",
    "existing pressure expanded instead of new threads",
    "chapter focus and subplot budget",
  );
}

const HEALING_TELEPORT_PATTERN =
  /\b(forgave (?:herself|himself|themselves)|finally healed|at peace|was whole again|learned to let go|completely understood|si perdonò|finalmente guarì|era in pace|era di nuovo inter[oa]|imparò a lasciare andare)\b/gi;

function countEmotionalTeleportation(text: string): number {
  return (text.match(HEALING_TELEPORT_PATTERN) || []).length;
}

function hasRecentTrauma(context: StoryBibleLockContext): boolean {
  return /\b(death|dead|murder|blood|betrayal|abandoned|trauma|grief|loss|sacrifice|war|morte|morto|omicidio|sangue|tradimento|abbandon|trauma|lutto|perdita|sacrificio|guerra)\b/i.test(
    previousText(context),
  );
}

function limitEmotionalTeleportation(
  text: string,
  context: StoryBibleLockContext,
  corrections: StoryBibleCorrection[],
): string {
  if (!hasRecentTrauma(context) && (context.chapterIndex || 0) > 5) return text;
  const replacements: Array<[RegExp, string]> = [
    [/\bforgave herself\b/gi, "wanted to forgive herself, and failed"],
    [/\bforgave himself\b/gi, "wanted to forgive himself, and failed"],
    [/\bforgave themselves\b/gi, "wanted forgiveness to be simpler"],
    [/\bfinally healed\b/gi, "did not heal; not yet"],
    [/\bat peace\b/gi, "too tired to name it peace"],
    [/\bwas whole again\b/gi, "could not remember what whole was supposed to feel like"],
    [/\blearned to let go\b/gi, "loosened her grip for one second"],
    [/\bcompletely understood\b/gi, "understood one small part of it"],
    [/\bsi perdonò\b/gi, "avrebbe voluto perdonarsi, ma non ci riuscì"],
    [/\bfinalmente guarì\b/gi, "non guarì; non ancora"],
    [/\bera in pace\b/gi, "era troppo stanca per chiamarla pace"],
    [/\bera di nuovo inter[oa]\b/gi, "non ricordava più cosa volesse dire essere intera"],
    [/\bimparò a lasciare andare\b/gi, "allentò la presa per un istante"],
  ];

  const candidate = replacements.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), text);
  return withCorrection(
    text,
    candidate,
    corrections,
    "emotional-arc",
    "instant emotional recovery",
    "partial aftershock preserved",
    "emotional arc discipline",
  );
}

function countGenreDrift(text: string, bible: StoryBible): number {
  const therapyDrift = (text.match(/\b(process your feelings|emotional boundaries|safe space|closure|validate your pain|heal your trauma)\b/gi) || [])
    .length;
  const fantasyModern = bible.genre === "fantasy" ? therapyDrift : 0;
  const crimeOvershare = bible.genre === "crime" ? (text.match(/\bI felt betrayed\b/gi) || []).length : 0;
  const romanceTherapy = bible.genre === "romance" || bible.isDarkRomance ? therapyDrift : 0;
  return fantasyModern + crimeOvershare + romanceTherapy;
}

function protectGenreStability(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  let candidate = text;

  if (bible.genre === "fantasy") {
    candidate = candidate
      .replace(/\bprocess your feelings\b/gi, "survive what the oath left behind")
      .replace(/\bemotional boundaries\b/gi, "old vows")
      .replace(/\bsafe space\b/gi, "a door that would hold")
      .replace(/\bclosure\b/gi, "an ending that would not lie")
      .replace(/\bvalidate your pain\b/gi, "name the wound without worshipping it")
      .replace(/\bheal your trauma\b/gi, "carry the wound without letting it rule");
  }

  if (bible.genre === "crime") {
    candidate = candidate.replace(/\bI felt betrayed\b/gi, "After everything I did for you");
  }

  if (bible.genre === "romance" || bible.isDarkRomance) {
    candidate = candidate
      .replace(/\bwe need to process our trauma\b/gi, "we keep making this worse")
      .replace(/\bthis is a safe space\b/gi, "you can stop pretending for one minute")
      .replace(/\bI validate your pain\b/gi, "I heard you. That does not make it simple");
  }

  return withCorrection(
    text,
    candidate,
    corrections,
    "genre-stability",
    "genre-contaminating therapy language",
    "genre-consistent emotional language",
    "genre stability guard",
  );
}

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

const ORPHAN_OBJECTS = ["glass", "cup", "mug", "bottle", "strap", "button", "sleeve", "bicchiere", "tazza", "bottone", "manica"];

function countWord(text: string, word: string): number {
  return (text.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi")) || []).length;
}

function looksLikeOrphanFragment(sentence: string, wholeText: string, context: StoryBibleLockContext): boolean {
  const clean = sentence.trim();
  if (clean.length < 18 || clean.length > 150) return false;
  const previous = normalize(previousText(context));
  const normalizedSentence = normalize(clean);

  if (previous.includes(normalizedSentence) && /\b(glass|cup|strap|button|sleeve|breath|silence|bicchiere|tazza|bottone|manica|respiro|silenzio)\b/i.test(clean)) {
    return true;
  }

  const object = ORPHAN_OBJECTS.find((item) => countWord(clean, item) > 0);
  if (!object) return false;
  const objectAppearsOnce = countWord(wholeText, object) === 1;
  const carryOverVerb = /\b(stayed|remained|held|dug|pulled|caught|resto|rimase|stringeva|tirò|graffiò)\b/i.test(clean);
  const genericOwner = /\b(her|his|their|one|its|le|gli|sua|suo|loro)\b/i.test(clean);
  return objectAppearsOnce && carryOverVerb && genericOwner;
}

function countOrphanFragments(text: string, context: StoryBibleLockContext): number {
  return sentencesOf(text).filter((sentence) => looksLikeOrphanFragment(sentence, text, context)).length;
}

function removeOrphanFragments(
  text: string,
  context: StoryBibleLockContext,
  corrections: StoryBibleCorrection[],
): string {
  const sentences = sentencesOf(text);
  if (sentences.length < 2) return text;

  const kept = sentences.filter((sentence) => !looksLikeOrphanFragment(sentence, text, context));
  if (kept.length === sentences.length || kept.length === 0) return text;

  const candidate = kept.join(" ");
  return withCorrection(
    text,
    candidate,
    corrections,
    "orphan-fragment",
    "high-confidence orphan sentence",
    "fragment removed",
    "orphan sentence filter",
  );
}

function isSpeculativeBeautyLimited(bible: StoryBible): boolean {
  return (
    bible.genre === "fantasy" ||
    /\b(fantasy|dark fantasy|post-apocalyptic|post apocalyptic|sci-fi|science fiction|dystopian|paranormal)\b/i.test(bible.rawGenre)
  );
}

function looksOverpolished(sentence: string): boolean {
  const clean = sentence.trim();
  if (clean.length < 42) return false;
  const lyricalMarkers =
    /\b(hope|ash|soul|heart|silence|eternity|infinite|stars|moon|blood|ghost|memory|sacred|prophecy|destiny|grief|beautiful|kingdom|wound|truth|anima|cuore|ombra|silenzio|eterno|stelle|luna|sangue|fantasma|memoria|sacro|profezia|destino|dolore|verità)\b/i;
  const polishedCadence =
    /\b(hurt more than|became a|became the|was the shape of|carried the weight|carried a|finally understood|knew then that|meant that|remembered the shape|come se|sembrava che|capì finalmente)\b/i;
  return lyricalMarkers.test(clean) && (polishedCadence.test(clean) || /\b(as if|like a|like the|come se|sembrava)\b/i.test(clean));
}

function countBeautyDensity(text: string): number {
  const beautiful = sentencesOf(text).filter(looksOverpolished).length;
  return Number(((beautiful / words(text)) * 1000).toFixed(2));
}

function roughenBeautifulSentence(sentence: string): string {
  if (/\bhope hurt more than ash\b/i.test(sentence)) return "Hope came back wrong, and nobody knew what to do with it.";
  if (/\bfinally understood\b/i.test(sentence)) return "Understanding did not arrive cleanly. It came in pieces.";
  if (/\bthe truth\b/i.test(sentence)) return "The truth did not settle. It made the room harder to breathe in.";
  if (/\bprophecy\b/i.test(sentence)) return "The prophecy stayed there, unfinished and inconvenient.";
  if (/\bsoul|heart|grief|wound\b/i.test(sentence)) return "Something in it hurt before anyone could name why.";
  return "For a moment, nobody made it beautiful. They just kept going.";
}

function limitBeautyDensity(text: string, bible: StoryBible, corrections: StoryBibleCorrection[]): string {
  if (!isSpeculativeBeautyLimited(bible)) return text;
  const sentences = sentencesOf(text);
  const beautifulIndexes = sentences
    .map((sentence, index) => ({ sentence, index }))
    .filter((item) => looksOverpolished(item.sentence))
    .map((item) => item.index);

  if (beautifulIndexes.length < 2) return text;

  const maxRewrites = Math.max(1, Math.ceil(beautifulIndexes.length * 0.15));
  const rewriteIndexes = new Set(beautifulIndexes.filter((_, index) => index % 3 === 2).slice(0, maxRewrites));
  if (!rewriteIndexes.size) return text;

  const candidate = sentences
    .map((sentence, index) => (rewriteIndexes.has(index) ? roughenBeautifulSentence(sentence) : sentence))
    .join(" ");

  return withCorrection(
    text,
    candidate,
    corrections,
    "beauty-density",
    "clustered polished/lyrical sentence",
    "grounded human reaction",
    "beauty density controller",
  );
}

function countNameDrift(text: string, bible: StoryBible): number {
  if (bible.characters.length < 2) return 0;
  const present = tokenSet(text);
  const missingCharacters = bible.characters.filter((character) => !present.has(character.firstName));
  const unknowns = unknownPersonTokens(text, bible);
  const relationalUnknowns = unknowns.filter((token) => {
    const rolePattern = new RegExp(
      `\\b(looked at|watched|asked|told|followed|with|beside|toward|touched|said|answered|almost said|contro|verso|chiese a|disse a|seguì)\\s+${escapeRegExp(token)}\\b|\\b${escapeRegExp(token)}\\s+(looked|watched|asked|told|followed|touched|said|answered|almost said)\\b`,
      "iu",
    );
    return rolePattern.test(text);
  });
  const inferredDrift = missingCharacters.length === 1 && relationalUnknowns.length === 1 ? 1 : 0;
  const nearMisses = bible.characters.reduce((count, character) => {
    return count + relationalUnknowns.filter((token) => isCloseName(token, character.firstName)).length;
  }, 0);
  return inferredDrift + nearMisses;
}

function countCanonMutations(text: string, bible: StoryBible): number {
  let mutations = 0;
  const victim = factValue(bible, "victim");
  const profession = factValue(bible, "fatherProfession");
  const villa = factValue(bible, "villa");
  const magicRule = factValue(bible, "magicRule");
  const techRule = factValue(bible, "techRule");

  if (victim) {
    const victimMentions = Array.from(text.matchAll(/\b(?:victim|vittima)\s*(?:=|was|is|era|è|named|chiamat[ao])?\s+([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/giu));
    mutations += victimMentions.filter((match) => match[1] && match[1] !== victim).length;
  }

  if (profession) {
    const professionMentions = Array.from(text.matchAll(/\b(?:father|padre)\s+(?:was|is|era|è)\s+(?:a|an|un|una)?\s*([a-zà-ÿ][\p{L}-]{2,40})\b/giu));
    mutations += professionMentions.filter((match) => match[1] && normalize(match[1]) !== normalize(profession)).length;
  }

  if (villa) {
    mutations += (text.match(/\bVilla\s+(?:delle|dei|degli|del|della|de|of)\s+[A-ZÀ-Ý][\p{L}'’ -]{2,60}\b/gu) || []).filter(
      (match) => match !== villa,
    ).length;
  }

  if (magicRule && /\bblood\b/i.test(magicRule)) {
    mutations += (text.match(/\b(tears?|lacrime)\s+(?:opened?|opens|aprirono|apre|apriva)\s+(?:the\s+)?(?:gate|portal|portale)\b/giu) || []).length;
  }

  if (techRule) {
    const techMentions = Array.from(text.matchAll(/\b(?:quantum gate|engine|station core|AI core)\s+(?:requires|needs|richiede)\s+([^.\n]{4,90})/giu));
    mutations += techMentions.filter((match) => match[1] && !normalize(match[1]).includes(normalize(techRule))).length;
  }

  const entityPatterns: Partial<Record<CanonFactKind, RegExp>> = {
    city: /\b(?:city|città)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    village: /\b(?:village|villaggio)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    kingdom: /\b(?:kingdom|regno)\s*(?:=|was|is|era|è|of|di|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,60})\b/giu,
    organization: /\b(?:organization|organisation|ordine|order|guild|gilda)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
    faction: /\b(?:faction|fazione|clan|house|casata)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
    artifact: /\b(?:artifact|artefact|relic|reliquia|blade|sword|crown|artefatto)\s*(?:=|was|is|era|è|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’ -]{2,80})\b/giu,
    familyMember: /\b(?:brother|sister|mother|father|fratello|sorella|madre|padre)\s*(?:=|was|is|era|è|named|called|chiamat[ao])\s+([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/giu,
  };

  for (const fact of bible.facts) {
    const pattern = entityPatterns[fact.kind];
    if (!pattern) continue;
    const mentions = Array.from(text.matchAll(pattern));
    mutations += mentions.filter((match) => match[1] && normalize(match[1]) !== normalize(fact.value)).length;
  }

  return mutations + countNameDrift(text, bible);
}

export function analyzeStoryStability(text: string, context: StoryBibleLockContext = {}): StoryStabilityMetrics {
  const bible = buildStoryBible(context);
  const revealCount = countMajorReveals(text);
  const subplotMarkers = countSubplotMarkers(text);
  const emotionalTeleportationMarkers = countEmotionalTeleportation(text);
  const genreDriftMarkers = countGenreDrift(text, bible);
  const nameDrift = countNameDrift(text, bible);
  const orphanFragments = countOrphanFragments(text, context);
  const beautyDensity = countBeautyDensity(text);
  const canonMutations = countCanonMutations(text, bible);
  const protectedFacts = bible.characters.length + bible.facts.length;
  const contradictions = canonMutations + orphanFragments + Math.max(0, revealCount - 1);
  const contradictionRate = Number(((contradictions / words(text)) * 1000).toFixed(2));
  const canonMutationRate = protectedFacts ? Number(((canonMutations / protectedFacts) * 100).toFixed(2)) : 0;
  const continuityStability = scoreFromIssues(canonMutations);
  const characterConsistency = scoreFromIssues(canonMutations);
  const revealPacing = scoreFromIssues(revealCount, 1);
  const emotionalPacing = scoreFromIssues(emotionalTeleportationMarkers);
  const genreDrift = scoreFromIssues(genreDriftMarkers);
  const emotionalRealism = scoreFromIssues(emotionalTeleportationMarkers + Math.floor(beautyDensity / 8), 1);
  const immersion = scoreFromIssues(canonMutations + orphanFragments + genreDriftMarkers);
  const aiDetectability = Math.min(100, Math.round(beautyDensity * 3 + emotionalTeleportationMarkers * 10 + orphanFragments * 16));
  const longFormCoherence = Math.round(
    (continuityStability + characterConsistency + revealPacing + emotionalPacing + genreDrift + immersion) / 6,
  );

  return {
    continuityStability,
    characterConsistency,
    revealPacing,
    contradictionRate,
    canonMutationRate,
    emotionalPacing,
    genreDrift,
    longFormCoherence,
    revealCount,
    subplotMarkers,
    emotionalTeleportationMarkers,
    genreDriftMarkers,
    canonMutations,
    contradictions,
    protectedFacts,
    nameDrift,
    orphanFragments,
    beautyDensity,
    emotionalRealism,
    immersion,
    aiDetectability,
  };
}

export function applyStoryBibleLockWithReport(text: string, context: StoryBibleLockContext = {}): StoryBibleLockResult {
  if (!text?.trim() || !isStoryBibleLockEnabled(context)) {
    return {
      text,
      corrections: [],
      metrics: analyzeStoryStability(text, context),
    };
  }

  const bible = buildStoryBible(context);
  const corrections: StoryBibleCorrection[] = [];
  let next = text;
  const useV11 = isStoryEngineV11Enabled(context);

  next = correctCharacterNameTypos(next, bible, corrections);
  if (useV11) next = correctStrictCharacterEntityDrift(next, bible, corrections);
  next = correctVictimDrift(next, bible, corrections);
  next = correctFatherProfessionDrift(next, bible, corrections);
  next = correctVillaDrift(next, bible, corrections);
  next = correctWorldRuleDrift(next, bible, corrections);
  if (useV11) next = correctStrictFactEntityDrift(next, bible, corrections);
  next = limitRevealOverload(next, corrections);
  next = limitSubplotExplosion(next, corrections);
  next = limitEmotionalTeleportation(next, context, corrections);
  next = protectGenreStability(next, bible, corrections);
  if (useV11) {
    next = removeOrphanFragments(next, context, corrections);
    next = limitBeautyDensity(next, bible, corrections);
    next = correctCharacterNameTypos(next, bible, corrections);
    next = correctStrictCharacterEntityDrift(next, bible, corrections);
    next = correctStrictFactEntityDrift(next, bible, corrections);
  }

  const lockedText = normalizeSpaces(next);
  return {
    text: lockedText,
    corrections,
    metrics: analyzeStoryStability(lockedText, context),
  };
}

export function applyStoryBibleLock(text: string, context: StoryBibleLockContext = {}): string {
  return applyStoryBibleLockWithReport(text, context).text;
}
