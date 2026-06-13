import type { BookConfig, Chapter } from "@/types/book";
import type { CallbackAnchor } from "./types";
import { chapterCorpus, corpusForCharacter } from "./utils";

const CALLBACK_RULES: Array<{
  type: CallbackAnchor["type"];
  patterns: RegExp[];
  label: string;
  reuse: string;
}> = [
  {
    type: "gesture",
    patterns: [/\b(tocca(?:va|re)?\s+(?:il\s+)?polso|touched?\s+(?:her|his|their)\s+wrist)\b/i],
    label: "touches wrist when lying or tense",
    reuse: "Reuse this gesture when the same character withholds truth or feels cornered.",
  },
  {
    type: "tic",
    patterns: [/\b(evita(?:va|re)?\s+(?:lo\s+)?sguardo|avoid(?:ed|s)?\s+eye\s+contact)\b/i],
    label: "avoids eye contact under stress",
    reuse: "Bring back the averted gaze before difficult admissions.",
  },
  {
    type: "tic",
    patterns: [/\b(accend(?:e|eva|ere)\s+(?:una\s+)?sigaretta|light(?:ed|s)?\s+a\s+cigarette)\b/i],
    label: "lights a cigarette when anxious",
    reuse: "Repeat the smoking tic when pressure returns — not as decoration, as tell.",
  },
  {
    type: "object",
    patterns: [/\b(chiave|key|lettera|letter|anello|ring|medaglione|locket)\b/i],
    label: "recurring charged object",
    reuse: "Let this object reappear with meaning — reader should feel the callback land.",
  },
  {
    type: "phrase",
    patterns: [/\b(non\s+è\s+quello\s+che\s+sembra|not\s+what\s+it\s+seems|come\s+sempre|as\s+always)\b/i],
    label: "recurring phrase motif",
    reuse: "Echo the phrase with a twist when stakes rise.",
  },
];

function detectCharacterForSentence(sentence: string, names: string[]): string | undefined {
  const lower = sentence.toLowerCase();
  return names.find((name) => lower.includes(name.toLowerCase()));
}

export function buildCallbackAnchors(
  config: BookConfig,
  chapters: Chapter[],
): CallbackAnchor[] {
  const names = (config.characters || [])
    .map((character) => [character.name, character.surname].filter(Boolean).join(" ").trim())
    .filter(Boolean);
  const anchors: CallbackAnchor[] = [];

  chapters.forEach((chapter, index) => {
    const text = chapterCorpus(chapter);
    if (!text) return;
    const sentences = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    for (const sentence of sentences) {
      for (const rule of CALLBACK_RULES) {
        if (!rule.patterns.some((pattern) => pattern.test(sentence))) continue;
        anchors.push({
          detail: rule.label,
          chapterIntroduced: index + 1,
          character: detectCharacterForSentence(sentence, names),
          type: rule.type,
          suggestedReuse: rule.reuse,
        });
        break;
      }
    }
  });

  for (const name of names.slice(0, 6)) {
    const corpus = corpusForCharacter(name, chapters);
    if (/\b(polso|wrist)\b/i.test(corpus) && !anchors.some((anchor) => anchor.character === name && anchor.type === "gesture")) {
      anchors.push({
        detail: `${name} wrist-touch tell`,
        chapterIntroduced: 1,
        character: name,
        type: "gesture",
        suggestedReuse: `When ${name} lies or deflects, reuse the wrist-touch tell planted earlier.`,
      });
    }
  }

  const deduped = new Map<string, CallbackAnchor>();
  for (const anchor of anchors) {
    const key = `${anchor.type}:${anchor.detail}`;
    if (!deduped.has(key)) deduped.set(key, anchor);
  }

  return [...deduped.values()].slice(0, 10);
}
