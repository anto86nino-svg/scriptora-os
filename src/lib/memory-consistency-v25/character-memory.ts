import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { CharacterMemoryState } from "@/lib/long-book-memory/types";
import type { CharacterPsychologyProfile } from "@/lib/narrative-intelligence-v2/types";
import type { CharacterLiveMemory, LoveResistance } from "./types";
import {
  chapterCorpus,
  clampPercent,
  corpusForCharacter,
  firstMatchSentences,
  normalizeText,
} from "./utils";

const TIC_PATTERNS = [
  { pattern: /\b(tocca(?:va|re)?\s+(?:il\s+)?polso|touched?\s+(?:her|his|their)\s+wrist)\b/i, label: "touches wrist when tense" },
  { pattern: /\b(evita(?:va|re)?\s+(?:lo\s+)?sguardo|avoid(?:ed|s)?\s+eye\s+contact)\b/i, label: "avoids eye contact" },
  { pattern: /\b(accend(?:e|eva|ere)\s+(?:una\s+)?sigaretta|light(?:ed|s)?\s+a\s+cigarette|smok(?:e|ed|ing))\b/i, label: "smokes under stress" },
  { pattern: /\b(si\s+passa(?:va)?\s+le\s+mani\s+nei\s+capelli|ran?\s+hand(?:s)?\s+through\s+hair)\b/i, label: "runs hands through hair" },
  { pattern: /\b(risponde(?:va)?\s+(?:a\s+monosillabi|breve)|short\s+answers?)\b/i, label: "short answers" },
];

const STRESS_PATTERNS = [
  { pattern: /\b(sigaretta|smok|cigarette)\b/i, label: "smokes" },
  { pattern: /\b(trem(?:a|ava|are)|shak(?:e|ing))\b/i, label: "physical tremor" },
  { pattern: /\b(silenzio|silence|went\s+quiet)\b/i, label: "goes silent" },
  { pattern: /\b(passeggia(?:va|re)?|paces?)\b/i, label: "paces" },
];

const SPEECH_PATTERNS = [
  { pattern: /\b(risposte?\s+brevi|short\s+answers?|monosillabi)\b/i, label: "short answers" },
  { pattern: /\b(sarcasm|sarcast|iron(?:y|ic))\b/i, label: "sarcastic cadence" },
  { pattern: /\b(sussurra(?:va|re)?|whisper(?:ed|s)?)\b/i, label: "low-voice restraint" },
  { pattern: /\b(formal|freddo|cold\s+precision)\b/i, label: "controlled formal speech" },
];

const SECRET_PATTERNS = [
  /\b(segret[oi]|secret|non\s+doveva\s+saperlo|hid(?:e|ing)\s+the\s+truth)\b/i,
];
const LIE_PATTERNS = [
  /\b(mentì|mentito|bugia|lied|lied\s+to|fece\s+finta|pretended)\b/i,
];
const AVOID_PATTERNS = [
  /\b(evita(?:va|re)?|avoid(?:ed|s)?|si\s+allontana(?:va)?|withdrew)\b/i,
];

function inferLoveResistance(text: string, psychology?: CharacterPsychologyProfile): LoveResistance {
  if (psychology?.copingMechanism === "avoidance" || psychology?.copingMechanism === "detachment") return "high";
  if (/\b(resist|resistenza|pull(?:ed)?\s+away|si\s+tira\s+indietro|non\s+si\s+fidava)\b/i.test(text)) return "high";
  if (/\b(desider|want|attrazione|kiss|bacio|vulnerab)\b/i.test(text)) return "medium";
  return "low";
}

function inferTrustToward(target: string, corpus: string): number {
  const lower = corpus.toLowerCase();
  const name = target.toLowerCase();
  if (!lower.includes(name)) return 40;
  let score = 42;
  if (/\b(fiducia|trust|safe|sicur)\b/i.test(corpus)) score += 18;
  if (/\b(sospett|doubt|diffid|mistrust)\b/i.test(corpus)) score -= 22;
  if (/\b(tradit|betray|litig|argu|fight)\b/i.test(corpus)) score -= 28;
  if (/\b(abbracc|kiss|bacio|vulnerab|confess)\b/i.test(corpus)) score += 16;
  return clampPercent(score);
}

function collectCast(
  config: BookConfig,
  blueprint: BookBlueprint | null,
  characterStates: CharacterMemoryState[],
): Array<{ name: string; role?: string; wound: string; fear: string; desire: string }> {
  const cast = new Map<string, { name: string; role?: string; wound: string; fear: string; desire: string }>();

  for (const character of config.characters || []) {
    const name = [character.name, character.surname].filter(Boolean).join(" ").trim();
    if (!name) continue;
    cast.set(name.toLowerCase(), {
      name,
      role: character.role,
      wound: character.traumaProfile || character.personality || "",
      fear: "",
      desire: "",
    });
  }

  for (const character of blueprint?.blueprintIntegrity?.characterMemoryEngine || []) {
    if (!character.canonicalName) continue;
    cast.set(character.canonicalName.toLowerCase(), {
      name: character.canonicalName,
      role: character.role,
      wound: [character.emotionalWounds, character.traumaMarkers].filter(Boolean).join(". "),
      fear: character.coreFear || "",
      desire: character.coreDesire || character.secretNeed || "",
    });
  }

  for (const state of characterStates) {
    if (!state.name) continue;
    const key = state.name.toLowerCase();
    const existing = cast.get(key) || { name: state.name, role: state.role, wound: "", fear: "", desire: "" };
    cast.set(key, {
      ...existing,
      role: existing.role || state.role,
      wound: existing.wound || state.traumaState,
    });
  }

  return [...cast.values()].slice(0, 12);
}

export function buildCharacterLiveMemories(input: {
  config: BookConfig;
  blueprint: BookBlueprint | null;
  chapters: Chapter[];
  characterStates: CharacterMemoryState[];
  psychology?: CharacterPsychologyProfile[];
}): CharacterLiveMemory[] {
  const written = input.chapters.filter((chapter) => chapterCorpus(chapter).length > 40);
  const cast = collectCast(input.config, input.blueprint, input.characterStates);
  const names = cast.map((entry) => entry.name);

  return cast.map((entry) => {
    const psychology = input.psychology?.find((profile) => profile.name.toLowerCase() === entry.name.toLowerCase());
    const corpus = corpusForCharacter(entry.name, written);
    const combined = normalizeText([entry.wound, entry.fear, entry.desire, corpus.slice(0, 2400)].join(" "));

    const recurringTics = TIC_PATTERNS
      .filter(({ pattern }) => pattern.test(corpus))
      .map(({ label }) => label)
      .slice(0, 3);
    const recurringGestures = firstMatchSentences(corpus, TIC_PATTERNS.map(({ pattern }) => pattern), 2);
    const stressPattern = STRESS_PATTERNS.find(({ pattern }) => pattern.test(corpus))?.label || "withdraws under pressure";
    const speechStyle = SPEECH_PATTERNS.find(({ pattern }) => pattern.test(corpus))?.label || "consistent with established voice";

    const trustLevels: Record<string, number> = {};
    for (const other of names) {
      if (other.toLowerCase() === entry.name.toLowerCase()) continue;
      trustLevels[other] = inferTrustToward(other, corpus);
    }

    let lastSeenChapter: number | undefined;
    for (let index = written.length - 1; index >= 0; index -= 1) {
      if (corpusForCharacter(entry.name, [written[index]])) {
        lastSeenChapter = index + 1;
        break;
      }
    }

    return {
      name: entry.name,
      role: entry.role,
      dominantFear: psychology?.fear || entry.fear || "vulnerability and loss of control",
      dominantDesire: psychology?.desire || entry.desire || "connection without surrendering self",
      wound: psychology?.woundLabel || entry.wound || "preserve established trauma — no reset",
      loveResistance: inferLoveResistance(combined, psychology),
      speechStyle,
      recurringTics,
      recurringGestures,
      stressPattern,
      trustLevels,
      emotionalEvolution: psychology?.contradiction || "carry forward emotional cost from prior chapters",
      secrets: firstMatchSentences(corpus, SECRET_PATTERNS, 2),
      activeLies: firstMatchSentences(corpus, LIE_PATTERNS, 2),
      avoidancePatterns: firstMatchSentences(corpus, AVOID_PATTERNS, 2),
      lastSeenChapter,
    };
  });
}
