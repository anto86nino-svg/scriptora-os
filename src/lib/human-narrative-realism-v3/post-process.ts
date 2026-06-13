import type { HumanNarrativeRealismV3Context } from "./types";
import { isHumanNarrativeRealismV3Enabled, resolveRealismFamily } from "./types";
import { applyNarrativeHumanAuthenticityV3 } from "@/lib/premium-writing/narrative-human-authenticity-v3";
import { evolveRepeatedEmotionalBeats } from "./escalation-v2";
import { applyCharacterResistance } from "./character-resistance";
import { compressEmotionOnlyParagraphs } from "./scene-compression";

type LanguageKey = "it" | "en" | "default";

const THERAPY_SPEECH_PATTERNS: Record<LanguageKey, Array<[RegExp, string]>> = {
  it: [
    [/\bdevi guarire\b/gi, "non sapeva da dove ricominciare"],
    [/\bsei abbastanza\b/gi, "non era sicura di niente"],
    [/\bho capito il mio trauma\b/gi, "forse era quello. Non lo sapeva ancora"],
    [/\bdevo essere vulnerabile\b/gi, "non poteva dirlo così, non ancora"],
    [/\bho paura di amare\b/gi, "non era questo"],
    [/\bho elaborato il trauma\b/gi, "forse. Non lo sapeva ancora"],
    [/\bho elaborato i miei traumi\b/gi, "non era il momento"],
    [/\b(?:lei|lui)\s+era\s+finalmente\s+vulnerabil[ei]\b/gi, "non trovò le parole giuste"],
    [/\bHo paura di amarti perché\b/gi, "Non è quello"],
    [/\bil mio passato mi ha insegnato\b/gi, "non era vero, o forse sì"],
    [/\bperché il mio passato\b/gi, "perché non sapeva fermarsi"],
    [/\bcomunicare apertamente\b/gi, "parlare senza nascondersi"],
    [/\bdobbiamo essere onest[oi] con noi stess[oi]\b/gi, "non sapeva nemmeno da dove cominciare"],
    [/\bogni ferita ha una lezione\b/gi, "non tutto doveva insegnare qualcosa subito"],
    [/\b(?:lei|lui)\s+cap[iì]\s+che\s+[^.]{10,80}\s+perché\s+[^.]{10,120}\./gi, "Non era questo.\n\nGuardò altrove.\n\n\"O forse sì.\"\n\nSilenzio.\n\n\"Lascia stare.\""],
    [/\bHo paura di perderti perché\b/gi, "Non è questo"],
  ],
  en: [
    [/\byou must heal\b/gi, "she didn't know where to start"],
    [/\byou are enough\b/gi, "she wasn't sure of anything"],
    [/\bI understand my trauma\b/gi, "maybe that was it. She didn't know yet"],
    [/\bI need to be vulnerable\b/gi, "she couldn't say it like that, not yet"],
    [/\bI'm afraid to love\b/gi, "that wasn't it"],
    [/\bI processed my trauma\b/gi, "maybe. She didn't know yet"],
    [/\bI have worked through my trauma\b/gi, "not the moment for that"],
    [/\b(?:she|he) was finally vulnerable\b/gi, "couldn't find the right words"],
    [/\bI'm afraid to love you because\b/gi, "That's not it"],
    [/\bmy past taught me\b/gi, "that wasn't true, or maybe it was"],
    [/\bbecause my past\b/gi, "because she couldn't stop"],
    [/\bwe need to communicate openly\b/gi, "talk without hiding"],
    [/\bevery wound has a lesson\b/gi, "not everything had to teach something right away"],
    [/\bI am afraid of losing you because\b/gi, "That's not it"],
    [/\bI'm afraid of losing you because\b/gi, "That's not it"],
  ],
  default: [],
};

const EXPLAINED_EMOTION: Record<LanguageKey, Array<[RegExp, string]>> = {
  it: [
    [/\b(?:sent[iì]|provava|provò)\s+(?:una\s+)?(?:profonda|immensa|totale)\s+(?:tristezza|paura|gioia|colpa)\s+perché\b/gi, "le mani non trovarono nulla da fare"],
    [/\b(?:era|si sentiva)\s+devastat[oa]\s+perché\b/gi, "rimase immobile troppo a lungo"],
    [/\bspiegò\s+(?:a\s+)?sé\s+stess[oa]\s+che\b/gi, "non trovò una frase semplice"],
  ],
  en: [
    [/\b(?:she|he|they)\s+felt\s+(?:deeply|profoundly)\s+\w+\s+because\b/gi, "their hands had nothing to do"],
    [/\b(?:she|he)\s+was\s+devastated\s+because\b/gi, "went still for too long"],
    [/\b(?:she|he)\s+explained\s+to\s+(?:herself|himself)\s+that\b/gi, "couldn't find a simple sentence"],
  ],
  default: [],
};

const POETIC_CLUSTERS = [
  /\b(?:ferita aperta|animale ferito|cuore in gabbia|ombra dell'ombra|anima spezzata|dolore antico)\b/gi,
  /\b(?:open wound|wounded animal|caged heart|shadow of shadow|shattered soul)\b/gi,
];

function languageKey(config?: HumanNarrativeRealismV3Context["config"]): LanguageKey {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

function looksPoetic(sentence: string): boolean {
  const clean = sentence.trim();
  if (clean.length < 36) return false;
  return /\b(anima|cuore|ombra|silenzio|dolore|ferita|memoria|destino|soul|heart|shadow|silence|wound|memory|fate)\b/i.test(clean)
    || /\b(come se|as if|like a|sembrava)\b/i.test(clean);
}

function injectPlainSentenceAfterPoeticRun(text: string, language: LanguageKey): string {
  const plain: Record<LanguageKey, string[]> = {
    it: [
      "La cattedrale cadeva a pezzi.",
      "Nessuno disse niente per un po'.",
      "Il pavimento era freddo sotto le suole.",
      "Una sedia scricchiolò.",
    ],
    en: [
      "The cathedral was falling apart.",
      "No one said anything for a while.",
      "The floor was cold under their shoes.",
      "A chair creaked.",
    ],
    default: ["The floor was cold.", "No one spoke for a while."],
  };

  const paragraphs = text.split(/\n{2,}/);
  let inserted = 0;

  return paragraphs.map((paragraph) => {
    if (inserted >= 2 || paragraph.length < 200) return paragraph;
    const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["”»])?/g);
    if (!sentences || sentences.length < 3) return paragraph;

    let poeticRun = 0;
    const rebuilt: string[] = [];
    for (const sentence of sentences) {
      rebuilt.push(sentence.trim());
      poeticRun = looksPoetic(sentence) ? poeticRun + 1 : 0;
      if (!inserted && poeticRun >= 2) {
        const options = plain[language] || plain.default;
        rebuilt.push(options[inserted % options.length]);
        inserted += 1;
        poeticRun = 0;
      }
    }
    return rebuilt.join(" ");
  }).join("\n\n");
}

function blockTherapySpeech(text: string, language: LanguageKey): string {
  let next = text;
  for (const [pattern, replacement] of THERAPY_SPEECH_PATTERNS[language] || THERAPY_SPEECH_PATTERNS.default) {
    next = next.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of EXPLAINED_EMOTION[language] || EXPLAINED_EMOTION.default) {
    next = next.replace(pattern, replacement);
  }
  for (const pattern of POETIC_CLUSTERS) {
    next = next.replace(pattern, (match, offset, full) => {
      const window = full.slice(Math.max(0, offset - 80), offset + 80);
      const hits = (window.match(pattern) || []).length;
      return hits >= 2 ? (language === "it" ? "qualcosa di rotto" : "something broken") : match;
    });
  }
  return next;
}

function humanizeDialogueV3(text: string, language: LanguageKey): string {
  let next = text.replace(/(["“«])([^"”»]{90,280})(["”»])/g, (match, open, dialogue, close) => {
    if (!/\b(perché|because|sempre|always|mai|never|capisco|understand|feel|sento|amo|love|trauma|vulnerab)\b/i.test(dialogue)) {
      return match;
    }
    const tightened = dialogue
      .replace(/\s*,\s*(perché|because)\s+/gi, "... ")
      .replace(/\s+(e|and)\s+/gi, "— ")
      .replace(/\.\s+/g, ". ")
      .trim();
    if (tightened.length < dialogue.length * 0.55) return match;
    return `${open}${tightened}${close}`;
  });

  // Incomplete sentences + interruption markers
  next = next.replace(
    /(["“«])([^"”»]{40,180}\.)(["”»])/g,
    (match, open, dialogue, close) => {
      if (/\.\.\.|—|…/.test(dialogue)) return match;
      if (!/\b(perché|because|amo|love|paura|afraid|capisco|understand)\b/i.test(dialogue)) return match;
      const interrupted = dialogue.replace(/\.\s*$/, "... —");
      return `${open}${interrupted}${close}`;
    },
  );

  return next;
}

function priorChapterText(ctx: HumanNarrativeRealismV3Context): string {
  return (ctx.previousChapters || [])
    .slice(-3)
    .map((ch) => ch.content || "")
    .join("\n");
}

/** Post-generation realism pass — additive, preserves plot. */
export function applyHumanNarrativeRealismV3(
  text: string,
  ctx: HumanNarrativeRealismV3Context = {},
): string {
  if (!text?.trim() || !isHumanNarrativeRealismV3Enabled()) return text;

  const family = resolveRealismFamily(ctx.config);
  const language = languageKey(ctx.config);
  let next = text;

  next = applyNarrativeHumanAuthenticityV3(next, {
    config: ctx.config as import("@/types/book").BookConfig,
    chapterIndex: ctx.chapterIndex,
    language: ctx.config?.language,
  });

  if (family === "narrative" || family === "poetry") {
    next = blockTherapySpeech(next, language);
    next = humanizeDialogueV3(next, language);
    next = injectPlainSentenceAfterPoeticRun(next, language);
    next = evolveRepeatedEmotionalBeats(next, priorChapterText(ctx), language);
    next = applyCharacterResistance(next, ctx);
    next = compressEmotionOnlyParagraphs(next);
  } else if (family === "nonfiction" || family === "educational" || family === "manual") {
    next = blockTherapySpeech(next, language);
    next = next.replace(/\b(in questo capitolo esploreremo|in this chapter we will explore)\b/gi, "");
  }

  return next.replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function scoreHumanNarrativeRealism(text: string): {
  aiSmell: number;
  dialogueHumanity: number;
  poeticDensity: number;
} {
  let aiPenalty = 0;
  for (const lang of Object.values(THERAPY_SPEECH_PATTERNS)) {
    for (const [pattern] of lang) aiPenalty += (text.match(pattern) || []).length * 10;
  }
  const poeticRuns = (text.match(/\b(anima|cuore|ombra|soul|heart|shadow)\b/gi) || []).length;
  const dialogueLines = (text.match(/["“«][^"”»]{20,}["”»]/g) || []).length;
  const explainedDialogue = (text.match(/["“«][^"”»]*(perché|because|capisco|understand)[^"”»]*["”»]/gi) || []).length;

  return {
    aiSmell: Math.max(20, 100 - aiPenalty - poeticRuns * 3),
    dialogueHumanity: Math.max(25, 100 - explainedDialogue * 18 + Math.min(20, dialogueLines)),
    poeticDensity: Math.max(15, 100 - poeticRuns * 8),
  };
}
