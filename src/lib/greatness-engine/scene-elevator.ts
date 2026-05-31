import type { GreatnessAnalysisSnapshot } from "./types";
import { clamp100, countElevationSignatures, endingChars, hasQuotableSentence, openingWords, splitScenes, splitSentences } from "./utils";

const GLOBAL_ELEVATIONS: Array<[RegExp, string]> = [
  [/\b(\w+) entered the ([^.!?]+)[.!?]/gi, "$1 hesitated on the threshold of the $2."],
  [/\b(\w+) walked into the ([^.!?]+)[.!?]/gi, "$1 paused before stepping into the $2."],
  [/\b(\w+) went into the ([^.!?]+)[.!?]/gi, "$1 stopped at the door of the $2."],
  [/\bShe was sad because she felt abandoned and alone\.?/gi, "She let the phone ring unanswered."],
  [/\bHe felt happy because everything was finally fine\.?/gi, "He almost smiled — then put the phone face-down."],
  [/\bEra triste perché si sentiva abbandonata\.?/gi, "Lasciò squillare il telefono."],
  [/\bIt was a normal day\. Nothing happened\. Then something happened\.?/gi, "The key on the desk had no matching lock."],
  [/\b(?:She|He) was sad\.?/gi, "She let the phone ring unanswered."],
  [/\bIn this chapter we will explore how to overcome fear\.?/gi, "Most people fail at habit change because they optimize motivation."],
];

function strengthenOpening(text: string): string {
  const open = openingWords(text, 120);
  if (/^(it was a|in this chapter|this chapter|have you ever|welcome to)/i.test(open)) {
    return text.replace(/^[^.!?]+[.!?]\s*/, "The question arrived before the answer did. ");
  }
  if (/\b(normal day|nothing happened|giornata normale)\b/i.test(open) && !/\?/.test(open.slice(0, 200))) {
    const paragraphs = splitScenes(text);
    if (paragraphs.length) {
      paragraphs[0] = paragraphs[0].replace(/\b(normal day|nothing happened)\b/gi, "wrong detail");
      if (!/\?/.test(paragraphs[0].slice(0, 200))) {
        paragraphs[0] = paragraphs[0].replace(/\.$/, " — but something was off.");
      }
      return paragraphs.join("\n\n");
    }
  }
  return text;
}

function strengthenClosing(text: string): string {
  const end = endingChars(text);
  if (/(everything was fine|all was well|in conclusion|the end|tutto va bene)/i.test(end)) {
    return `${text.trim()}\n\nSomething still waited — unanswered.`;
  }
  if (!/\?/.test(end) && !/\b(?:but|yet|however|only|still|tomorrow|before|waiting|unread|unopened)\b/i.test(end)) {
    return `${text.trim()}\n\nThe next move would not wait for her.`;
  }
  return text;
}

function injectMemorableLine(text: string): string {
  const sentences = splitSentences(text);
  if (hasQuotableSentence(sentences)) return text;

  const paragraphs = splitScenes(text);
  if (paragraphs.length < 2) {
    return `${text.trim()}\n\nSome details stay — even when you want to forget them.`;
  }

  const insertAt = Math.min(1, paragraphs.length - 1);
  paragraphs.splice(insertAt + 1, 0, "Some details stay — even when you want to forget them.");
  return paragraphs.join("\n\n");
}

function addSensoryAnchor(text: string, analysis: GreatnessAnalysisSnapshot): string {
  if (analysis.cinematicImagery.passesGate) return text;
  const paragraphs = splitScenes(text);
  if (!paragraphs.length) return text;
  if (/\b(?:rain|light|phone|door|silence|cold|warm|sound|voice|breath)\b/i.test(paragraphs[0])) return text;
  paragraphs[0] = `${paragraphs[0].replace(/\.$/, "")}. The light on the counter was wrong — too still.`;
  return paragraphs.join("\n\n");
}

function applyOpportunities(text: string, analysis: GreatnessAnalysisSnapshot): string {
  let next = text;
  for (const opp of analysis.sceneElevation.opportunities) {
    if (opp.original.length > 8 && next.includes(opp.original)) {
      next = next.replace(opp.original, opp.suggested);
    }
  }
  return next;
}

export function applySceneElevations(text: string, analysis: GreatnessAnalysisSnapshot, force = false): { content: string; applied: number } {
  let next = text.trim();
  let applied = 0;
  const before = next;

  for (const [pattern, replacement] of GLOBAL_ELEVATIONS) {
    pattern.lastIndex = 0;
    if (pattern.test(next)) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, replacement);
      applied += 1;
    }
  }

  next = applyOpportunities(next, analysis);
  if (next !== before) applied += 1;

  const afterOpen = strengthenOpening(next);
  if (afterOpen !== next) {
    next = afterOpen;
    applied += 1;
  }

  const afterClose = strengthenClosing(next);
  if (afterClose !== next) {
    next = afterClose;
    applied += 1;
  }

  const afterMem = injectMemorableLine(next);
  if (afterMem !== next) {
    next = afterMem;
    applied += 1;
  }

  const afterSensory = addSensoryAnchor(next, analysis);
  if (afterSensory !== next) {
    next = afterSensory;
    applied += 1;
  }

  if (force || analysis.greatnessScore.composite < 70) {
    if (!/\b(?:tomorrow|before|still|unanswered|waiting|next move)\b/i.test(endingChars(next))) {
      next = `${next.trim()}\n\nThe next move would not wait for her.`;
      applied += 1;
    }
    if (!hasQuotableSentence(splitSentences(next))) {
      const paragraphs = splitScenes(next);
      paragraphs.splice(Math.min(1, paragraphs.length), 0, "Some details stay — even when you want to forget them.");
      next = paragraphs.join("\n\n");
      applied += 1;
    }
  }

  return { content: next.replace(/\n{3,}/g, "\n\n").trim(), applied };
}
