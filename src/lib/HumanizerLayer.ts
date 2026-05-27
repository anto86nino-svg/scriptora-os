import type { BookCharacter, BookConfig, Chapter } from "@/types/book";
import {
  applyTensionEngine,
  buildTensionPromptBlock,
  isNarrativeHumanizerGenre,
  type NarrativeTensionContext,
} from "@/lib/TensionEngine";
import {
  orderedRefinementSteps,
  poetryRunLimit,
  resolveGenreBrainProfile,
  stepBudget,
  type GenreBrainProfile,
  type GenreBrainRefinementStep,
} from "@/lib/GenreBrain";
import { applyHumanImperfectionLayer } from "@/lib/HumanImperfectionLayer";
import { applyStoryBibleLock } from "@/lib/StoryBibleLock";

export const HUMANIZER_LAYER_STORAGE_KEY = "scriptora-humanizer-v2-enabled";
const MAX_CHANGED_PERCENT = 14.5;
const MAX_DIALOGUE_REWRITES_PER_INTENT = 1;

export type HumanizerContext = NarrativeTensionContext & {
  intensity?: "light" | "balanced";
  characterVoiceProfile?: CharacterVoiceProfile;
  genreBrainEnabled?: boolean;
  humanImperfectionEnabled?: boolean;
  storyBibleLockEnabled?: boolean;
};

type LanguageKey = "it" | "en" | "default";
export type CharacterVoiceProfile = "avoidant" | "expressive" | "proud" | "anxious";
type DialogueIntent = "loveConfession" | "fearLoss" | "askTruth";

function languageKey(config?: Partial<BookConfig>): LanguageKey {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

const CHARACTER_VOICE_PROFILES: CharacterVoiceProfile[] = ["avoidant", "expressive", "proud", "anxious"];

const VOICE_PROFILE_KEYWORDS: Record<CharacterVoiceProfile, RegExp[]> = {
  avoidant: [
    /\b(avoidant|distant|guarded|closed|reserved|detached|withdrawn|evita|evitante|distaccat[oa]|chius[oa]|riservat[oa]|trattenut[oa])\b/i,
    /\b(non parla|si chiude|evita il confronto|keeps distance|does not answer|shuts down)\b/i,
  ],
  expressive: [
    /\b(expressive|vulnerable|open|direct|warm|honest|emotiva|vulnerabile|apert[oa]|dirett[oa]|intens[oa]|trasparente)\b/i,
    /\b(dice quello che prova|speaks from the heart|emotional honesty|confessa|si espone)\b/i,
  ],
  proud: [
    /\b(proud|sarcastic|arrogant|controlled|mask|pride|orgoglios[oa]|sarcastic[oa]|alter[oa]|fier[oa]|maschera|controllat[oa])\b/i,
    /\b(non ammette|never admits|uses sarcasm|ironia|superiorità|facciata)\b/i,
  ],
  anxious: [
    /\b(anxious|clingy|overthinking|abandonment|reassurance|ansios[oa]|abbandono|rassicurazion[ei]|rimugin|ipercontroll)\b/i,
    /\b(chiede conferme|needs to know|asks if|fear of leaving|paura che.*lasci|paura di perder)\b/i,
  ],
};

function characterDescriptor(character: BookCharacter): string {
  return [
    character.name,
    character.surname,
    character.role,
    character.personality,
    character.wound,
    character.externalDesire,
    character.internalNeed,
    character.secret,
    character.relationships,
    character.strictRules,
  ].filter(Boolean).join(" ");
}

function sceneCharacterSource(context: HumanizerContext, text: string): string {
  const characters = Array.isArray(context.config?.characters) ? context.config.characters : [];
  const focusText = `${context.outlineSummary || ""}\n${text}`;
  const explicitFocus = String(context.outlineSummary || "").match(/\bFocus\s+([A-ZÀ-Ý][\p{L}'’-]{1,40})\b/u)?.[1];
  if (explicitFocus) {
    const focused = characters.find((character) =>
      [character.name, character.surname]
        .filter(Boolean)
        .some((value) => String(value).trim().toLowerCase() === explicitFocus.toLowerCase()),
    );
    if (focused) return characterDescriptor(focused);
  }

  const namedCharacter = characters
    .map((character) => {
      const names = [character.name, character.surname].filter(Boolean).map((value) => String(value).trim()).filter(Boolean);
      const score = names.reduce((total, name) => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return total + (focusText.match(new RegExp(`\\b${escaped}\\b`, "gi")) || []).length;
      }, 0);
      return { character, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.character;

  if (namedCharacter) return characterDescriptor(namedCharacter);
  if (characters.length) return characters.map(characterDescriptor).join("\n");

  return [
    text.slice(0, 900),
    context.outlineSummary,
    context.config?.tone,
    context.config?.authorIdentity?.voice,
  ].filter(Boolean).join("\n");
}

export function deriveHumanizerVoiceProfile(context: HumanizerContext = {}, text = ""): CharacterVoiceProfile {
  if (context.characterVoiceProfile && CHARACTER_VOICE_PROFILES.includes(context.characterVoiceProfile)) {
    return context.characterVoiceProfile;
  }

  const source = sceneCharacterSource(context, text);
  const scores = CHARACTER_VOICE_PROFILES.map((profile) => ({
    profile,
    score: VOICE_PROFILE_KEYWORDS[profile].reduce((total, pattern) => total + (pattern.test(source) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score);

  if (scores[0]?.score) return scores[0].profile;

  const genreBrain = resolveGenreBrainProfile(context);
  if (genreBrain.enabled) {
    if (genreBrain.id === "romance") return "avoidant";
    if (genreBrain.id === "thriller") return "avoidant";
    if (genreBrain.id === "fantasy") return "expressive";
    if (genreBrain.id === "crime") return "proud";
  }

  const seed = hashText(`${source}${context.chapterIndex ?? 0}`);
  return CHARACTER_VOICE_PROFILES[seed % CHARACTER_VOICE_PROFILES.length];
}

export function isHumanizerLayerEnabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_HUMANIZER_V2 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(HUMANIZER_LAYER_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setHumanizerLayerEnabled(enabled: boolean) {
  try {
    localStorage.setItem(HUMANIZER_LAYER_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-humanizer-v2-change"));
  } catch {
    // Storage can fail in private contexts. The generation flow must continue.
  }
}

export function shouldUseHumanizer(context: HumanizerContext = {}): boolean {
  return isHumanizerLayerEnabled() && isNarrativeHumanizerGenre(context.config);
}

export function buildHumanizerPromptBlock(context: HumanizerContext = {}): string {
  if (!shouldUseHumanizer(context)) return "";
  return buildTensionPromptBlock(context);
}

const GROUNDED_BEATS: Record<LanguageKey, string[]> = {
  it: [
    "Abbassò lo sguardo sulle proprie mani.",
    "La risposta rimase li, piccola e scomoda.",
    "Una sedia sfioro il pavimento con un suono troppo forte.",
    "Si schiarì la voce, ma non disse subito nulla.",
  ],
  en: [
    "They looked down at their hands.",
    "The answer stayed there, small and uncomfortable.",
    "A chair scraped the floor too loudly.",
    "Someone cleared their throat and still did not speak.",
  ],
  default: [
    "They looked down at their hands.",
    "The answer stayed there, small and uncomfortable.",
    "A small sound crossed the room.",
    "Someone almost spoke, then did not.",
  ],
};

const EMOTION_REPLACEMENTS: Record<LanguageKey, Array<[RegExp, string]>> = {
  it: [
    [/\b(?:lei|lui)?\s*si sentiva devastat[ao]\b/gi, "non riuscì a guardare subito in alto"],
    [/\b([A-ZÀ-Ý][a-zà-ÿ]+)\s+cap[iì]\s+che\s+lo\s+amava\s+ancora\b/g, "$1 aprì la bocca, poi la richiuse"],
    [/\b(?:lei|lui)?\s*cap[iì] che lo amava ancora\b/gi, "aprì la bocca, poi la richiuse"],
    [/\b(?:lei|lui)?\s*sent[iì] il cuore spezzarsi\b/gi, "strinse le dita attorno a cio che aveva in mano"],
    [/\bera impossibile negare quello che provava\b/gi, "non trovò una frase abbastanza semplice"],
    [/\baveva paura di perderl[ao]\b/gi, "guardò la porta come se fosse già troppo tardi"],
  ],
  en: [
    [/\bShe felt her heart break\b/g, "She tightened her grip on the glass"],
    [/\bshe felt her heart break\b/gi, "she tightened her grip on the glass"],
    [/\bHe felt his heart break\b/g, "He looked away before answering"],
    [/\bhe felt his heart break\b/gi, "he looked away before answering"],
    [/\bthey felt their heart break\b/gi, "they held still for too long"],
    [/\bHe was devastated by\b/g, "He could not look straight at"],
    [/\bhe was devastated\b/gi, "he looked away before answering"],
    [/\bShe was devastated by\b/g, "She could not look straight at"],
    [/\bshe was devastated\b/gi, "she tightened her grip on the glass"],
    [/\bShe realized she still loved him\b/g, "She opened her mouth, then closed it again"],
    [/\bshe realized she still loved him\b/gi, "she opened her mouth, then closed it again"],
    [/\bHe realized he still loved her\b/g, "He opened his mouth, then closed it again"],
    [/\bhe realized he still loved her\b/gi, "he opened his mouth, then closed it again"],
  ],
  default: [
    [/\bwas devastated\b/gi, "looked away before answering"],
    [/\brealized .* still loved\b/gi, "opened their mouth, then closed it again"],
    [/\bfelt .* heart break\b/gi, "held still for too long"],
  ],
};

const DIALOGUE_REPLACEMENTS: Record<LanguageKey, Array<[RegExp, string]>> = {
  it: [
    [/([“"«])Dimmi quello che provi davvero\.?([”"»])/gi, "$1Dimmi solo... no, lascia stare.$2"],
  ],
  en: [
    [/([“"«])Tell me what you really feel\.?([”"»])/gi, "$1Just tell me... no, forget it.$2"],
  ],
  default: [],
};

const DIALOGUE_PATTERNS: Record<LanguageKey, Record<DialogueIntent, RegExp[]>> = {
  it: {
    loveConfession: [/([“"«])Non ho mai smesso di amarti\.?([”"»])/gi],
    fearLoss: [/([“"«])Ho paura di perderti\.?([”"»])/gi],
    askTruth: [/([“"«])Dimmi quello che provi davvero\.?([”"»])/gi],
  },
  en: {
    loveConfession: [/([“"«])I never stopped loving you\.?([”"»])/gi],
    fearLoss: [
      /([“"«])I am afraid of losing you\.?([”"»])/gi,
      /([“"«])I'm afraid of losing you\.?([”"»])/gi,
    ],
    askTruth: [/([“"«])Tell me what you really feel\.?([”"»])/gi],
  },
  default: {
    loveConfession: [/([“"«])I never stopped loving you\.?([”"»])/gi],
    fearLoss: [
      /([“"«])I am afraid of losing you\.?([”"»])/gi,
      /([“"«])I'm afraid of losing you\.?([”"»])/gi,
    ],
    askTruth: [/([“"«])Tell me what you really feel\.?([”"»])/gi],
  },
};

const DIALOGUE_VARIANTS: Record<LanguageKey, Record<DialogueIntent, Record<CharacterVoiceProfile, string[]>>> = {
  it: {
    loveConfession: {
      avoidant: ["Ci ho provato. Non so dirlo meglio.", "Non e sparito. Io si, forse.", "Ho provato a non pensarci.", "E rimasto li. Io no.", "Non chiedermi di renderlo bello."],
      expressive: ["Ti amo ancora. Anche se mi fa paura.", "Non e passato. Vorrei che fosse passato.", "Io ci sono ancora dentro.", "La verita e questa, anche se arriva male.", "Non riesco a farlo diventare piccolo."],
      proud: ["Non sorridere. Ho provato a smettere.", "A quanto pare sono pessima a dimenticarti.", "Non farmelo dire meglio di cosi.", "Non trasformarlo in una vittoria.", "Evidentemente dimenticare non e il mio talento."],
      anxious: ["Dimmi che non sono l'unica a essere rimasta qui.", "Aspettavo che passasse. Non e passato.", "Se lo dico, tu resti?", "Devo sapere se per te e ancora qualcosa.", "Non lasciarmi da sola con questa frase."],
    },
    fearLoss: {
      avoidant: ["Non posso farlo adesso.", "Se lo dico, diventa vero.", "Lascia stare. Davvero."],
      expressive: ["Non voglio perderti.", "Ho paura che tu vada via.", "Mi fa paura quanto ci tengo."],
      proud: ["Magnifico. Ora ho paura anch'io.", "Non darmi un altro motivo per sembrare stupida.", "Se te ne vai, almeno non fingere sorpresa."],
      anxious: ["Tu resti se te lo dico?", "Devo sapere se stai gia andando via.", "Dimmi solo che non sparisci."],
    },
    askTruth: {
      avoidant: ["Dillo o non dirlo. Ma scegli.", "Lascia stare. No, aspetta.", "Non farmi tirare fuori tutto."],
      expressive: ["Voglio sentirlo da te.", "Dimmi la verita. Anche se trema.", "Parlami senza salvarmi."],
      proud: ["Potresti anche provarci, per una volta.", "Sorprendimi. Di' qualcosa di vero.", "Non recitare. Non con me."],
      anxious: ["Dimmi che non me lo sto inventando.", "Ho bisogno di sapere dove sei.", "Se c'e qualcosa, dillo adesso."],
    },
  },
  en: {
    loveConfession: {
      avoidant: ["I tried. That's all I can say.", "It did not go away. I did.", "I tried not to think about it.", "It stayed. I didn't.", "Don't ask me to make it pretty."],
      expressive: ["I still love you. I hate how true that is.", "It never stopped. I wish it had.", "I am still here, even now.", "That's the truth, even if it comes out badly.", "I can't make it smaller than it is."],
      proud: ["Don't smile. I tried to stop.", "Apparently I'm terrible at forgetting you.", "Don't make me say it better than that.", "Don't turn this into a victory.", "It seems forgetting you is not one of my talents."],
      anxious: ["Tell me I'm not the only one still here.", "I kept waiting for it to go away. It didn't.", "If I say it, do you stay?", "I need to know if this is still something to you.", "Don't leave me alone with that sentence."],
    },
    fearLoss: {
      avoidant: ["I can't do this right now.", "If I say it, it becomes real.", "Leave it. Please."],
      expressive: ["I don't want to lose you.", "I'm scared you'll walk away.", "It scares me how much I care."],
      proud: ["Brilliant. Now I'm scared too.", "Don't give me another reason to look foolish.", "If you leave, don't act surprised."],
      anxious: ["Do you stay if I say it?", "I need to know if you're already leaving.", "Just tell me you're not disappearing."],
    },
    askTruth: {
      avoidant: ["Say it or don't. Just choose.", "Forget it. No, wait.", "Don't make me drag it out of you."],
      expressive: ["I want to hear it from you.", "Tell me the truth, even if it shakes.", "Talk to me without saving me."],
      proud: ["You could try being honest for once.", "Surprise me. Say something true.", "Don't perform. Not with me."],
      anxious: ["Tell me I'm not making this up.", "I need to know where you are.", "If there is something, say it now."],
    },
  },
  default: {
    loveConfession: {
      avoidant: ["I tried. That's all I can say.", "It did not go away. I did.", "I tried not to think about it.", "It stayed. I didn't.", "Don't ask me to make it pretty."],
      expressive: ["I still love you. I hate how true that is.", "It never stopped. I wish it had.", "I am still here, even now.", "That's the truth, even if it comes out badly.", "I can't make it smaller than it is."],
      proud: ["Don't smile. I tried to stop.", "Apparently I'm terrible at forgetting you.", "Don't make me say it better than that.", "Don't turn this into a victory.", "It seems forgetting you is not one of my talents."],
      anxious: ["Tell me I'm not the only one still here.", "I kept waiting for it to go away. It didn't.", "If I say it, do you stay?", "I need to know if this is still something to you.", "Don't leave me alone with that sentence."],
    },
    fearLoss: {
      avoidant: ["I can't do this right now.", "If I say it, it becomes real.", "Leave it. Please."],
      expressive: ["I don't want to lose you.", "I'm scared you'll walk away.", "It scares me how much I care."],
      proud: ["Brilliant. Now I'm scared too.", "Don't give me another reason to look foolish.", "If you leave, don't act surprised."],
      anxious: ["Do you stay if I say it?", "I need to know if you're already leaving.", "Just tell me you're not disappearing."],
    },
    askTruth: {
      avoidant: ["Say it or don't. Just choose.", "Forget it. No, wait.", "Don't make me drag it out of you."],
      expressive: ["I want to hear it from you.", "Tell me the truth, even if it shakes.", "Talk to me without saving me."],
      proud: ["You could try being honest for once.", "Surprise me. Say something true.", "Don't perform. Not with me."],
      anxious: ["Tell me I'm not making this up.", "I need to know where you are.", "If there is something, say it now."],
    },
  },
};

const DIALOGUE_INTENT_MEMORY_KEYS: Record<LanguageKey, Record<DialogueIntent, string[]>> = {
  it: {
    loveConfession: ["non ho mai smesso di amarti"],
    fearLoss: ["ho paura di perderti"],
    askTruth: ["dimmi quello che provi davvero"],
  },
  en: {
    loveConfession: ["i never stopped loving you"],
    fearLoss: ["i am afraid of losing you", "i'm afraid of losing you"],
    askTruth: ["tell me what you really feel"],
  },
  default: {
    loveConfession: ["i never stopped loving you"],
    fearLoss: ["i am afraid of losing you", "i'm afraid of losing you"],
    askTruth: ["tell me what you really feel"],
  },
};

const BODY_BEAT_VARIANTS: Record<LanguageKey, Record<string, string[]>> = {
  it: {
    "non riuscì a guardare subito in alto": [
      "rimase con lo sguardo fermo sul bordo del tavolo",
      "prese tempo sistemando qualcosa che era gia dritto",
      "respirò una volta, troppo piano",
    ],
    "aprì la bocca, poi la richiuse": [
      "lasciò la frase a metà prima ancora di iniziarla",
      "si passò il pollice sul palmo e tacque",
      "fece per rispondere, poi scelse il silenzio",
    ],
    "strinse le dita attorno a cio che aveva in mano": [
      "sentì le dita irrigidirsi sul bordo più vicino",
      "spostò il peso da un piede all'altro",
      "tenne le mani occupate per non tremare",
    ],
    "guardò la porta come se fosse già troppo tardi": [
      "controllò la via d'uscita senza volerlo",
      "spostò lo sguardo verso il corridoio",
      "misurò la distanza fino alla porta",
    ],
  },
  en: {
    "She tightened her grip on the glass": [
      "She looked down at her hands",
      "Her hand went still on the rim",
      "She pressed her thumb against the glass",
    ],
    "she tightened her grip on the glass": [
      "she looked down at her hands",
      "her hand went still on the rim",
      "she pressed her thumb against the glass",
    ],
    "He looked away before answering": [
      "He took too long to answer",
      "He studied the doorframe instead",
      "He let the question sit between them",
    ],
    "he looked away before answering": [
      "he took too long to answer",
      "he studied the doorframe instead",
      "he let the question sit between them",
    ],
    "She opened her mouth, then closed it again": [
      "She let the first answer die there",
      "She touched the table and said nothing",
      "She swallowed the sentence before it reached him",
    ],
    "she opened her mouth, then closed it again": [
      "she let the first answer die there",
      "she touched the table and said nothing",
      "she swallowed the sentence before it reached him",
    ],
  },
  default: {},
};

function hashText(text: string): number {
  let hash = 0;
  for (let index = 0; index < Math.min(text.length, 900); index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function diffTokens(text: string): string[] {
  return text.match(/[\p{L}\p{N}'’-]+|[^\s\p{L}\p{N}]/gu) || [];
}

function levenshteinDistance(a: string[], b: string[]): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j < previous.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length] || 0;
}

export function estimateHumanizerChangePercent(raw: string, refined: string): number {
  const source = diffTokens(raw);
  if (!source.length) return 0;
  return (levenshteinDistance(source, diffTokens(refined)) / source.length) * 100;
}

function acceptWithinBudget(
  original: string,
  current: string,
  candidate: string,
  genreBrain?: GenreBrainProfile,
  step?: GenreBrainRefinementStep,
): string {
  if (candidate === current) return current;
  const limit = genreBrain && step ? stepBudget(genreBrain, step) : MAX_CHANGED_PERCENT;
  return estimateHumanizerChangePercent(original, candidate) <= limit ? candidate : current;
}

function chooseBeat(language: LanguageKey, seed: number): string {
  const beats = GROUNDED_BEATS[language] || GROUNDED_BEATS.default;
  return beats[seed % beats.length] || beats[0];
}

function chooseVariant(items: string[], seed: number): string {
  return items[Math.abs(seed) % items.length] || items[0] || "";
}

function normalizePatternText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countNormalizedOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function previousChapterText(context: HumanizerContext): string {
  return normalizePatternText(
    (context.previousChapters || [])
      .slice(-8)
      .map((chapter) => `${chapter.title || ""}\n${chapter.content || ""}`)
      .join("\n"),
  );
}

function chooseVariantWithMemory(
  items: string[],
  seed: number,
  context: HumanizerContext,
  currentText: string,
): string {
  if (!items.length) return "";
  const history = previousChapterText(context);
  const current = normalizePatternText(currentText);
  const scored = items.map((item, index) => {
    const normalized = normalizePatternText(item);
    return {
      item,
      index,
      repeats: countNormalizedOccurrences(history, normalized) * 3 + countNormalizedOccurrences(current, normalized),
    };
  });
  const lowest = Math.min(...scored.map((entry) => entry.repeats));
  const leastRepeated = scored.filter((entry) => entry.repeats === lowest);
  return leastRepeated[Math.abs(seed) % leastRepeated.length]?.item || scored[0].item;
}

function dialogueVariants(
  language: LanguageKey,
  intent: DialogueIntent,
  profile: CharacterVoiceProfile,
): string[] {
  return (
    DIALOGUE_VARIANTS[language]?.[intent]?.[profile] ||
    DIALOGUE_VARIANTS.default[intent][profile] ||
    DIALOGUE_VARIANTS.default[intent].avoidant
  );
}

function dialogueIntentOrder(language: LanguageKey, context: HumanizerContext, currentText: string): DialogueIntent[] {
  const history = previousChapterText(context);
  const current = normalizePatternText(currentText);
  const defaultOrder: DialogueIntent[] = ["fearLoss", "loveConfession", "askTruth"];
  const keys = DIALOGUE_INTENT_MEMORY_KEYS[language] || DIALOGUE_INTENT_MEMORY_KEYS.default;

  return defaultOrder
    .map((intent, index) => ({
      intent,
      index,
      score: (keys[intent] || []).reduce(
        (total, key) =>
          total +
          countNormalizedOccurrences(history, normalizePatternText(key)) * 3 +
          countNormalizedOccurrences(current, normalizePatternText(key)),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.intent);
}

function replaceDialogueIntent(
  text: string,
  language: LanguageKey,
  context: HumanizerContext,
  intent: DialogueIntent,
  profile: CharacterVoiceProfile,
): string {
  const patterns = DIALOGUE_PATTERNS[language]?.[intent] || DIALOGUE_PATTERNS.default[intent];
  const variants = dialogueVariants(language, intent, profile);
  const seed = hashText(`${text.slice(0, 400)}${intent}${profile}${context.chapterIndex ?? 0}`);
  let occurrence = 0;
  let rewrites = 0;

  return patterns.reduce((next, pattern) => next.replace(pattern, (_match, open, close) => {
    if (rewrites >= MAX_DIALOGUE_REWRITES_PER_INTENT) return _match;
    const variant = chooseVariantWithMemory(variants, seed + occurrence * 7, context, next);
    occurrence += 1;
    rewrites += 1;
    return `${open}${variant}${close}`;
  }), text);
}

function applyCharacterVoiceDialogueVariance(
  text: string,
  language: LanguageKey,
  context: HumanizerContext,
  intents: DialogueIntent[] = ["loveConfession", "fearLoss", "askTruth"],
): string {
  const profile = deriveHumanizerVoiceProfile(context, text);
  let next = text;
  for (const intent of intents) {
    next = replaceDialogueIntent(next, language, context, intent, profile);
  }
  return next;
}

function softenDialogueIntent(
  text: string,
  language: LanguageKey,
  context: HumanizerContext,
  intent: DialogueIntent,
): string {
  return applyCharacterVoiceDialogueVariance(text, language, context, [intent]);
}

function diversifyPlainEmotionPhrases(text: string, language: LanguageKey, context: HumanizerContext): string {
  const profile = deriveHumanizerVoiceProfile(context, text);
  const patterns =
    language === "it"
      ? [/\bho paura di perderti\b/gi]
      : [/\bi am afraid of losing you\b/gi, /\bi'?m afraid of losing you\b/gi];
  const variants = dialogueVariants(language, "fearLoss", profile);
  const seed = hashText(`${text.slice(0, 500)}plain-${profile}${context.chapterIndex ?? 0}`);
  let occurrence = 0;

  return patterns.reduce((next, pattern) => next.replace(pattern, () => {
    const variant = chooseVariantWithMemory(variants, seed + occurrence * 5, context, next);
    occurrence += 1;
    return variant.replace(/[.!?]$/, "");
  }), text);
}

function reduceExplainedEmotion(text: string, language: LanguageKey): string {
  return (EMOTION_REPLACEMENTS[language] || EMOTION_REPLACEMENTS.default).reduce(
    (next, [pattern, replacement]) => next.replace(pattern, replacement),
    text,
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function diversifyRepeatedBodyBeats(text: string, language: LanguageKey, context: HumanizerContext): string {
  const variants = BODY_BEAT_VARIANTS[language] || BODY_BEAT_VARIANTS.default;
  const history = previousChapterText(context);
  let next = text;

  for (const [phrase, replacements] of Object.entries(variants)) {
    const normalized = normalizePatternText(phrase);
    if (!normalized || !countNormalizedOccurrences(history, normalized)) continue;
    const pattern = new RegExp(escapeRegExp(phrase), "g");
    if (!pattern.test(next)) continue;
    const seed = hashText(`${phrase}${next.slice(0, 300)}${context.chapterIndex ?? 0}`);
    pattern.lastIndex = 0;
    next = next.replace(pattern, () => chooseVariantWithMemory(replacements, seed, context, next));
  }

  return next;
}

function softenPerfectDialogue(text: string, language: LanguageKey): string {
  let next = (DIALOGUE_REPLACEMENTS[language] || DIALOGUE_REPLACEMENTS.default).reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text,
  );

  next = next.replace(/(["“«])([^"”»]{130,260})(["”»])/g, (match, open, dialogue, close) => {
    if (!/\b(because|always|never|understand|feel|love|scared|perche|sempre|mai|capisco|sento|amo|paura)\b/i.test(dialogue)) {
      return match;
    }
    const tightened = dialogue
      .replace(/\s*,\s*(because|perche)\s+/i, ". ")
      .replace(/\s+(and|e)\s+/i, "... ")
      .trim();
    return `${open}${tightened}${close}`;
  });

  return next;
}

function looksLyrical(sentence: string): boolean {
  const clean = sentence.trim();
  if (clean.length < 42) return false;
  const markers = /\b(soul|heart|shadow|silence|eternity|infinite|stars|moon|blood|ghost|memory|anima|cuore|ombra|silenzio|eterno|stelle|luna|sangue|fantasma|memoria)\b/i;
  return markers.test(clean) || /come se|as if|like the|sembrava che/i.test(clean);
}

function balancePoetry(text: string, language: LanguageKey, lyricalRunLimit = 3): string {
  const paragraphs = text.split(/\n{2,}/);
  const seed = hashText(text);
  let inserts = 0;

  return paragraphs.map((paragraph, paragraphIndex) => {
    if (inserts >= 2 || paragraph.length < 260) return paragraph;

    const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["”»])?/g);
    if (!sentences || sentences.length < 4) return paragraph;

    let lyricalRun = 0;
    const rebuilt: string[] = [];
    for (const sentence of sentences) {
      rebuilt.push(sentence.trim());
      lyricalRun = looksLyrical(sentence) ? lyricalRun + 1 : 0;
      if (lyricalRun >= lyricalRunLimit && inserts < 2) {
        rebuilt.push(chooseBeat(language, seed + paragraphIndex + inserts));
        inserts += 1;
        lyricalRun = 0;
      }
    }

    return rebuilt.join(" ");
  }).join("\n\n");
}

function removeTherapistClarity(text: string, language: LanguageKey): string {
  const replacements: Record<LanguageKey, Array<[RegExp, string]>> = {
    it: [
      [/\b(?:Dobbiamo|Devo) comunicare apertamente cio che provo\b/gi, "Non so nemmeno da dove cominciare"],
      [/\bquesta relazione ha bisogno di chiarezza emotiva\b/gi, "questa cosa ci sta sfuggendo di mano"],
    ],
    en: [
      [/\bwe need to communicate openly about our feelings\b/gi, "I don't even know where to start"],
      [/\bthis relationship needs emotional clarity\b/gi, "This thing is getting away from us"],
    ],
    default: [],
  };

  return (replacements[language] || []).reduce(
    (next, [pattern, replacement]) => next.replace(pattern, replacement),
    text,
  );
}

export function humanizeNarrativeText(text: string, context: HumanizerContext = {}): string {
  if (!text?.trim()) return text;
  if (!shouldUseHumanizer(context)) return applyStoryBibleLock(text, context);

  const language = languageKey(context.config);
  const genreBrain = resolveGenreBrainProfile(context);
  const original = text.trim();
  let next = original;

  for (const step of orderedRefinementSteps(genreBrain)) {
    if (step === "dialogueIntent") {
      for (const intent of dialogueIntentOrder(language, context, next)) {
        next = acceptWithinBudget(original, next, softenDialogueIntent(next, language, context, intent), genreBrain, step);
      }
    }
    if (step === "plainEmotion") {
      next = acceptWithinBudget(original, next, diversifyPlainEmotionPhrases(next, language, context), genreBrain, step);
    }
    if (step === "perfectDialogue") {
      next = acceptWithinBudget(original, next, softenPerfectDialogue(next, language), genreBrain, step);
    }
    if (step === "explainedEmotion") {
      next = acceptWithinBudget(original, next, reduceExplainedEmotion(next, language), genreBrain, step);
    }
    if (step === "bodyBeat") {
      next = acceptWithinBudget(original, next, diversifyRepeatedBodyBeats(next, language, context), genreBrain, step);
    }
    if (step === "therapistClarity") {
      next = acceptWithinBudget(original, next, removeTherapistClarity(next, language), genreBrain, step);
    }
    if (step === "poetryBalance") {
      next = acceptWithinBudget(original, next, balancePoetry(next, language, poetryRunLimit(genreBrain)), genreBrain, step);
    }
    if (step === "tension") {
      next = acceptWithinBudget(original, next, applyTensionEngine(next, context), genreBrain, step);
    }
  }
  next = acceptWithinBudget(original, next, applyHumanImperfectionLayer(next, context), genreBrain, "bodyBeat");
  next = applyStoryBibleLock(next, context);

  return next.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function humanizeChapter(chapter: Chapter, context: HumanizerContext = {}): Chapter {
  if (!chapter?.content) return chapter;
  return {
    ...chapter,
    content: humanizeNarrativeText(chapter.content, context),
    subchapters: Array.isArray(chapter.subchapters)
      ? chapter.subchapters.map((subchapter, subIndex) => ({
          ...subchapter,
          content: humanizeNarrativeText(subchapter.content, {
            ...context,
            chapterIndex: (context.chapterIndex || 0) + subIndex,
          }),
        }))
      : chapter.subchapters,
  };
}
