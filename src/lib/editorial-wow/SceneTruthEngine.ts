/**
 * SCENE TRUTH ENGINE
 *
 * Checks whether the chapter contains the minimum structural DNA for a live scene:
 *   desire | obstacle | micro-choice | consequence | change
 *
 * Does NOT rewrite. Returns diagnostic signals used to:
 *   - Score the chapter
 *   - Inject targeted prompt reinforcement if integrated into a generation retry
 *
 * Pure, synchronous, never throws.
 */

export interface SceneTruthSignal {
  hasDesire: boolean;
  hasObstacle: boolean;
  hasMicroChoice: boolean;
  hasConsequence: boolean;
  hasChange: boolean;
  score: number; // 0–5 (one point per present element)
  warnings: string[];
}

/* ---- Heuristic pattern banks ---- */

// DESIRE: character wants something concrete
const DESIRE_IT = [
  /\bvoleva?\b/i, /\bdesiderava?\b/i, /\baveva bisogno\b/i,
  /\bbramava?\b/i, /\btentava? di\b/i, /\bcercava? di\b/i,
  /\bsi aspettava?\b/i, /\bsperava?\b/i,
];
const DESIRE_EN = [
  /\bwanted?\b/i, /\bdesired?\b/i, /\bneeded?\b/i, /\bcraved?\b/i,
  /\btried? to\b/i, /\bsought?\b/i, /\bhoped? (to|for)\b/i,
  /\byearned?\b/i,
];

// OBSTACLE: something gets in the way
const OBSTACLE_IT = [
  /\bma\b/i, /\beppure\b/i, /\bseppur[e]?\b/i, /\bnon riusciva?\b/i,
  /\bimpediva?\b/i, /\bostacolo\b/i, /\bintralciava?\b/i,
  /\bnon poteva?\b/i, /\bera impossibile\b/i,
];
const OBSTACLE_EN = [
  /\bbut\b/i, /\bhowever\b/i, /\byet\b/i, /\bnevertheless\b/i,
  /\bcould n[o']t\b/i, /\bcouldn'?t\b/i, /\bfailed?\b/i,
  /\bblocked?\b/i, /\bimpossible\b/i, /\bhindered?\b/i,
];

// MICRO-CHOICE: character makes a small decision
const CHOICE_IT = [
  /\bdecise\b/i, /\bscelse\b/i, /\boptò\b/i,
  /\bsi alzò\b/i, /\bsi avvicinò\b/i, /\bsi voltò\b/i,
  /\bprese\b/i, /\brispose\b/i, /\brispose\b/i,
];
const CHOICE_EN = [
  /\bdecided?\b/i, /\bchose\b/i, /\bopted?\b/i,
  /\bstepped?\b/i, /\bturned?\b/i, /\breached?\b/i,
  /\banswered?\b/i, /\bwalked?\b/i, /\bsaid\b/i,
];

// CONSEQUENCE: something changes as result of the choice
const CONSEQUENCE_IT = [
  /\bquindi\b/i, /\ballora\b/i, /\bperciò\b/i,
  /\bdi conseguenza\b/i, /\bcome risultato\b/i,
  /\bdopo (di ciò|questo|quel|averlo)\b/i,
];
const CONSEQUENCE_EN = [
  /\btherefore\b/i, /\bas a result\b/i, /\bconsequently\b/i,
  /\bafter (that|this|doing)\b/i, /\bso (she|he|they)\b/i,
  /\bwhich meant\b/i,
];

// CHANGE: the scene end-state differs from start-state
const CHANGE_IT = [
  /\bnon era più (lo stesso|la stessa|come prima)\b/i,
  /\btutto era cambiato\b/i, /\bqualcosa era cambiato\b/i,
  /\bnon sarebbe stato più\b/i, /\bla situazione era diversa\b/i,
  /\buna nuova\b/i,
];
const CHANGE_EN = [
  /\bnothing would be the same\b/i, /\beverything had changed\b/i,
  /\bsomething (had )?shifted\b/i, /\bshe would never\b/i,
  /\bhe would never\b/i, /\bthey would never\b/i,
  /\bno longer\b/i, /\ba new\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function analyzeSceneTruth(text: string, language = "Italian"): SceneTruthSignal {
  const isItalian = /ital/i.test(language);
  const desirePatterns  = isItalian ? DESIRE_IT  : DESIRE_EN;
  const obstaclePatterns = isItalian ? OBSTACLE_IT : OBSTACLE_EN;
  const choicePatterns  = isItalian ? CHOICE_IT  : CHOICE_EN;
  const conseqPatterns  = isItalian ? CONSEQUENCE_IT : CONSEQUENCE_EN;
  const changePatterns  = isItalian ? CHANGE_IT  : CHANGE_EN;

  const hasDesire      = matchesAny(text, desirePatterns);
  const hasObstacle    = matchesAny(text, obstaclePatterns);
  const hasMicroChoice = matchesAny(text, choicePatterns);
  const hasConsequence = matchesAny(text, conseqPatterns);
  const hasChange      = matchesAny(text, changePatterns);

  const score = [hasDesire, hasObstacle, hasMicroChoice, hasConsequence, hasChange]
    .filter(Boolean).length;

  const warnings: string[] = [];
  if (!hasDesire)      warnings.push("No clear desire signal — add what the character concretely wants.");
  if (!hasObstacle)    warnings.push("No obstacle detected — the scene lacks friction.");
  if (!hasMicroChoice) warnings.push("No micro-choice found — add a small decision or action.");
  if (!hasConsequence) warnings.push("No consequence signal — the scene may end without impact.");
  if (!hasChange)      warnings.push("No change signal — ensure end-state differs from opening.");

  return { hasDesire, hasObstacle, hasMicroChoice, hasConsequence, hasChange, score, warnings };
}

/**
 * Returns a short prompt injection to address the weakest scene element.
 * Used by WowWritingPipeline to reinforce the prompt if needed.
 */
export function sceneTruthPromptNote(signal: SceneTruthSignal): string {
  if (signal.score >= 4) return "";
  const fixes = signal.warnings.map(w => `• ${w}`).join("\n");
  return `SCENE TRUTH — REINFORCE:\n${fixes}`;
}
