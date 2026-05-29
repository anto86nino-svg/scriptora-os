import type { HumanWritingContext, HumanWritingProfile } from "./types";
import { resolveHumanWritingProfile } from "./profiles";

function languageKey(config?: HumanWritingContext["config"]): "it" | "en" | "default" {
  const language = String(config?.language || "").toLowerCase();
  if (language.includes("ital")) return "it";
  if (language.includes("english")) return "en";
  return "default";
}

function replaceOne(text: string, pattern: RegExp, replacement: string | ((match: string) => string)): string {
  let replaced = false;
  return text.replace(pattern, (match) => {
    if (replaced) return match;
    replaced = true;
    return typeof replacement === "function" ? replacement(match) : match.replace(pattern, replacement);
  });
}

function looksMetaphorical(sentence: string): boolean {
  return /\b(as if|like a|like the|come se|sembrava|metaphor|simile a)\b/i.test(sentence);
}

function silenceBeat(language: "it" | "en" | "default"): string {
  const beats = {
    it: "Per un momento nessuno disse niente.",
    en: "For a moment, no one said anything.",
    default: "For a moment, no one said anything.",
  };
  return beats[language];
}

/** Strip explicit subtext labels the AI loves to add */
function reduceSubtextLabels(text: string, language: "it" | "en" | "default"): string {
  const patterns: Record<typeof language, Array<[RegExp, string]>> = {
    it: [
      [/\b(?:Voleva dire|Intendeva dire|In realtà voleva|Stava pensando che)\b[^.?!]+[.?!]/gi, ""],
      [/\b(?:Non lo disse, ma|Non disse a voce alta che)\b[^.?!]+[.?!]/gi, ""],
    ],
    en: [
      [/\b(?:She meant to say|He meant to say|What she really meant|What he really meant)\b[^.?!]+[.?!]/gi, ""],
      [/\b(?:She didn't say it, but|He didn't say it, but|She thought, but didn't say)\b[^.?!]+[.?!]/gi, ""],
      [/\b(?:In that moment, (?:she|he) realized that)\b/gi, "Something shifted, but "],
      [/\b(?:She felt a wave of|He felt a wave of)\b/gi, "A "],
    ],
    default: [
      [/\b(?:She meant to say|He meant to say)\b[^.?!]+[.?!]/gi, ""],
    ],
  };

  let next = text;
  for (const [pattern, replacement] of patterns[language]) {
    next = next.replace(pattern, replacement);
  }
  return next.replace(/\n{3,}/g, "\n\n").trim();
}

function reduceExplainedEmotion(text: string, language: "it" | "en" | "default"): string {
  const replacements: Record<typeof language, Array<[RegExp, string]>> = {
    it: [
      [/\b(?:Si sentiva|Si sentì) (?:triste|felice|arrabbiat[oa]|confus[oa]| devastat[oa])\b/gi, "Non trovò subito le parole"],
      [/\b(?:Capì che|Realizzò che) (?:lo|la) amava\b/gi, "Quasi disse qualcosa. Poi no"],
    ],
    en: [
      [/\bShe felt (?:sad|happy|angry|confused|devastated|heartbroken)\b/gi, "She looked away instead"],
      [/\bHe felt (?:sad|happy|angry|confused|devastated|heartbroken)\b/gi, "He looked away instead"],
      [/\bShe realized (?:she|he) (?:loved|wanted|needed)\b/gi, "Almost said it. Didn't"],
      [/\bHe realized (?:she|he) (?:loved|wanted|needed)\b/gi, "Almost said it. Didn't"],
      [/\b(?:A wave of|A rush of) (?:emotion|grief|love|fear) (?:washed over|surged through)\b/gi, "Something tightened"],
      [/\b(?:Her|His) heart (?:ached|swelled|broken)\b/gi, "Breath caught"],
    ],
    default: [
      [/\b(?:She|He) felt (?:sad|happy|angry|confused)\b/gi, "Looked away instead"],
    ],
  };

  let next = text;
  for (const [pattern, replacement] of replacements[language]) {
    next = replaceOne(next, pattern, replacement);
  }
  return next;
}

function reduceSymmetricDialogue(text: string): string {
  return replaceOne(
    text,
    /([“"«][^"”»]+[”"»])\s*\n\s*([“"«][^"”»]+[”"»])\s*\n\s*([“"«][^"”»]+[”"»])\s*\n\s*([“"«][^"”»]+[”"»])/,
    "$1\n\n$2",
  );
}

function capMetaphorDensity(text: string, cap: number): string {
  if (cap <= 0) {
    const paragraphs = text.split(/\n{2,}/);
    return paragraphs
      .map((paragraph) =>
        paragraph.replace(/\b(as if|like a|like the|come se|sembrava)\b[^.?!]+[.?!]/gi, (match) =>
          match.replace(/\bas if\b|\blike a\b|\bcome se\b/gi, "").trim() || match,
        ),
      )
      .join("\n\n");
  }

  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((paragraph) => {
      const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["”»])?/g);
      if (!sentences) return paragraph;
      let metaphorCount = 0;
      const rebuilt: string[] = [];
      for (const sentence of sentences) {
        if (looksMetaphorical(sentence)) {
          metaphorCount += 1;
          if (metaphorCount > cap) {
            rebuilt.push(sentence.replace(/\b(as if|like a|like the|come se|sembrava)\b[^,;.?!]*/gi, "").trim());
            continue;
          }
        }
        rebuilt.push(sentence.trim());
      }
      return rebuilt.join(" ");
    })
    .join("\n\n");
}

function injectSilenceBeat(text: string, language: "it" | "en" | "default", profile: HumanWritingProfile): string {
  if (profile.silenceWeight < 0.4) return text;
  if (/\b(no one said|nessuno disse|silence|silenzio|didn't speak|non disse nulla)\b/i.test(text)) return text;

  const paragraphs = text.split(/\n{2,}/);
  if (paragraphs.length < 2) return text;

  const targetIndex = Math.min(paragraphs.length - 2, Math.floor(paragraphs.length / 2));
  const paragraph = paragraphs[targetIndex];
  if (paragraph.length < 180 || !/[“"«]/.test(paragraph)) return text;

  paragraphs[targetIndex] = `${paragraph.trim()} ${silenceBeat(language)}`;
  return paragraphs.join("\n\n");
}

function addDialogueFriction(text: string, language: "it" | "en" | "default"): string {
  const replacements: Record<typeof language, Array<[RegExp, string]>> = {
    it: [
      [/([“"«])Va tutto bene\.?([”"»])/gi, "$1Va tutto bene.$2 Poi guardò altrove."],
      [/([“"«])Ti amo\.?([”"»])/gi, "$1Ti amo.$2 La voce le venne più bassa del previsto."],
    ],
    en: [
      [/([“"«])I'm fine\.?([”"»])/gi, "$1I'm fine.$2 Then looked away."],
      [/([“"«])I love you\.?([”"»])/gi, "$1I love you.$2 The words came out smaller than intended."],
      [/([“"«])I understand\.?([”"»])/gi, "$1I understand.$2 Not completely, but close enough."],
    ],
    default: [
      [/([“"«])I'm fine\.?([”"»])/gi, "$1I'm fine.$2 Then looked away."],
    ],
  };

  let next = text;
  for (const [pattern, replacement] of replacements[language]) {
    next = replaceOne(next, pattern, replacement);
  }
  return next;
}

export function applyHumanWritingPostProcess(
  text: string,
  context: HumanWritingContext = {},
): string {
  if (!text?.trim()) return text;

  const profile = resolveHumanWritingProfile(context.config);
  if (!profile || (profile.domain === "nonfiction" && profile.subtextLevel < 0.15)) {
    return text;
  }

  const language = languageKey(context.config);
  let next = text;

  next = reduceSubtextLabels(next, language);
  if (profile.emotionalExplainTolerance < 0.4) {
    next = reduceExplainedEmotion(next, language);
  }
  if (profile.dialogueFriction >= 0.6) {
    next = reduceSymmetricDialogue(next);
    next = addDialogueFriction(next, language);
  }
  if (profile.metaphorCap <= 3) {
    next = capMetaphorDensity(next, profile.metaphorCap);
  }
  if (profile.silenceWeight >= 0.55) {
    next = injectSilenceBeat(next, language, profile);
  }

  return next.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
