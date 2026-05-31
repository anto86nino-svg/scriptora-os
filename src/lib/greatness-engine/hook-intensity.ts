import type { HookIntensityReport } from "./types";
import { clamp100, endingChars, openingWords, wordCount } from "./utils";

function scoreOpening(open: string): number {
  let score = 48;
  if (/^(it was a|era un|in this chapter|this chapter|have you ever)/i.test(open)) score -= 22;
  if (/\b(normal day|giornata normale|woke up|si svegliò)\b/i.test(open)) score -= 14;
  if (/\?/.test(open.slice(0, 200))) score += 14;
  if (/\b(?:wrong|blood|sangue|door|porta|key|chiave|silence|silenz|hesitated|esitò|promised|promett)\b/i.test(open)) score += 16;
  if (/\b(?:forbidden|seal|ward|pact|prophecy|oath|threshold|vault|bell|chosen)\b/i.test(open)) score += 16;
  if (open.split(/\s+/).length <= 22 && /[.!?]/.test(open)) score += 10;
  return clamp100(score);
}

function scoreMidpoint(text: string): number {
  const wc = wordCount(text);
  const words = text.split(/\s+/);
  const midStart = Math.floor(wc * 0.35);
  const mid = words.slice(midStart, midStart + 80).join(" ").toLowerCase();
  let score = 50;
  if (/\?/.test(mid)) score += 12;
  if (/\b(?:but|yet|however|suddenly|only|still|before|secret|truth|danger)\b/i.test(mid)) score += 14;
  if (/\b(?:forbidden|seal|ward|pact|prophecy|who|why)\b/i.test(mid)) score += 10;
  if (/\b(?:understood|finally|peace|fine|tutto va bene)\b/i.test(mid)) score -= 12;
  return clamp100(score);
}

function scoreClosing(end: string): number {
  let score = 48;
  if (/\?/.test(end)) score += 14;
  if (/\b(?:but|yet|however|only|still|tomorrow|domani|before|waiting|secret|truth|danger|knock|message)\b/i.test(end)) score += 16;
  if (/(everything was fine|all was well|in conclusion|the end)/i.test(end)) score -= 24;
  if (/\b(?:promised|promett|unanswered|unread|unopened)\b/i.test(end)) score += 10;
  return clamp100(score);
}

const WEAK_OPENING_PATTERNS: Array<[RegExp, string]> = [
  [
    /^In this chapter we will explore how to[^.!?]+[.!?]\s*/i,
    "Fear does not announce itself — it hides inside the habit you keep avoiding. ",
  ],
  [
    /^In this chapter[^.!?]+[.!?]\s*/i,
    "Most people fail here for one reason they never name aloud. ",
  ],
  [
    /^Have you ever wondered[^.!?]+[.!?]\s*/i,
    "The cost of avoidance is measurable — and you are already paying it. ",
  ],
  [
    /^It was a (?:normal|quiet|ordinary)[^.!?]+[.!?]\s*/i,
    "Something was wrong before anyone admitted it. ",
  ],
];

/** Replaces throat-clearing openings that fail hook validation (Greatness Engine). */
export function applyHookMicroRewrite(content: string): string {
  const paragraphs = content.split(/\n\n+/);
  if (!paragraphs.length) return content;

  let open = paragraphs[0];
  for (const [pattern, replacement] of WEAK_OPENING_PATTERNS) {
    if (pattern.test(open)) {
      open = open.replace(pattern, replacement);
      break;
    }
  }

  if (open === paragraphs[0] && /^(in this chapter|this chapter|have you ever|it was a)/i.test(open.trim())) {
    open = `The first mistake is subtle — ${open.charAt(0).toLowerCase()}${open.slice(1)}`;
  }

  paragraphs[0] = open.trim();
  return paragraphs.join("\n\n").trim();
}

export function analyzeHookIntensity(content: string): HookIntensityReport {
  const text = String(content || "").trim();
  const open = openingWords(text, 120);
  const end = endingChars(text);

  const openingHook = scoreOpening(open.toLowerCase());
  const midpointHook = scoreMidpoint(text);
  const closingHook = scoreClosing(end.toLowerCase());

  return {
    openingHook,
    midpointHook,
    closingHook,
    openingExcerpt: open.slice(0, 160),
    closingExcerpt: end.slice(-160),
    passesGate: openingHook >= 55 && closingHook >= 52,
  };
}
