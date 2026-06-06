/**
 * NARRATIVE CONSEQUENCE ENGINE
 *
 * Verifies that each chapter ends with a forward promise — something changed.
 * Checks for at least one of:
 *   new decision | new information | altered relationship | raised risk |
 *   complicated desire | exposed wound | future narrative hook
 *
 * Pure diagnostic — returns signals and optional warning. Does not rewrite.
 * Never throws.
 */

export interface ConsequenceSignal {
  hasDecision: boolean;
  hasNewInfo: boolean;
  hasRelationshipShift: boolean;
  hasRaisedRisk: boolean;
  hasComplicatedDesire: boolean;
  hasExposedWound: boolean;
  hasFutureHook: boolean;
  score: number; // 0–7
  passed: boolean; // at least 1 element present
  warnings: string[];
}

const DECISION_IT = [
  /\bdecise\b/i, /\bscelse\b/i, /\bpromise\b/i,
  /\bgiurò\b/i, /\bsi impegnò\b/i, /\bavrebbe fatto\b/i,
];
const DECISION_EN = [
  /\bdecided?\b/i, /\bchose?\b/i, /\bpromised?\b/i,
  /\bswore\b/i, /\bcommitted?\b/i, /\bwould (do|go|leave|stay|fight)\b/i,
];

const NEWINFO_IT = [
  /\bscopri\b/i, /\bvenne a sapere\b/i, /\bla verità era\b/i,
  /\bgliene disse\b/i, /\bconfessò\b/i, /\brevelo\b/i,
];
const NEWINFO_EN = [
  /\bdiscovered?\b/i, /\bfound out\b/i, /\bthe truth was\b/i,
  /\btold (her|him|them)\b/i, /\bconfessed?\b/i, /\brevealed?\b/i,
];

const RELSHIFT_IT = [
  /\bnon erano più\b/i, /\bqualcosa tra (loro|di loro)\b/i,
  /\bsi erano allontanat[ie]\b/i, /\bsi erano avvicinat[ie]\b/i,
  /\bun nuovo (patto|equilibrio|accordo)\b/i,
];
const RELSHIFT_EN = [
  /\bthey were no longer\b/i, /\bsomething between them\b/i,
  /\bthey had grown (apart|closer)\b/i, /\ba new (understanding|distance|closeness)\b/i,
];

const RISK_IT = [
  /\bpericolos[oa]\b/i, /\brischio\b/i, /\bminacci[ae]\b/i,
  /\bpoteva costar(gli|le|gli)\b/i, /\bscommessa\b/i,
];
const RISK_EN = [
  /\bdangerous\b/i, /\brisk\b/i, /\bthreat\b/i,
  /\bcould cost (her|him|them)\b/i, /\bon the line\b/i,
];

const DESIRE_IT = [
  /\bvoleva ancora\b/i, /\bnon riusciva a smettere\b/i,
  /\bdesiderio più forte\b/i, /\bnonostante tutto\b/i,
];
const DESIRE_EN = [
  /\bstill wanted?\b/i, /\bcouldn'?t stop\b/i,
  /\bstronger desire\b/i, /\bdespite everything\b/i,
];

const WOUND_IT = [
  /\bferita\b/i, /\btrauma\b/i, /\bsegreto\b/i,
  /\bcosa che non aveva mai (detto|confessato|ammesso)\b/i,
];
const WOUND_EN = [
  /\bwound\b/i, /\btrauma\b/i, /\bsecret\b/i,
  /\bsomething (she|he|they) had never (said|admitted|confessed)\b/i,
];

const HOOK_IT = [
  /\bpresto\b/i, /\bnon sapeva ancora\b/i, /\bavrebbe (dovuto|capito|scoperto)\b/i,
  /\bla storia non era finita\b/i, /\bma c'era ancora\b/i,
];
const HOOK_EN = [
  /\bsoon\b/i, /\bshe didn'?t know yet\b/i, /\bhe would (have to|learn|discover)\b/i,
  /\bthe story wasn'?t over\b/i, /\bbut there was still\b/i,
];

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function analyzeNarrativeConsequence(text: string, language = "Italian"): ConsequenceSignal {
  const it = /ital/i.test(language);

  // Check mostly the last 30% of the text (the end of the chapter)
  const tail = text.slice(Math.floor(text.length * 0.70));

  const hasDecision        = matchAny(tail, it ? DECISION_IT : DECISION_EN);
  const hasNewInfo         = matchAny(tail, it ? NEWINFO_IT : NEWINFO_EN);
  const hasRelationshipShift = matchAny(tail, it ? RELSHIFT_IT : RELSHIFT_EN);
  const hasRaisedRisk      = matchAny(tail, it ? RISK_IT : RISK_EN);
  const hasComplicatedDesire = matchAny(tail, it ? DESIRE_IT : DESIRE_EN);
  const hasExposedWound    = matchAny(tail, it ? WOUND_IT : WOUND_EN);
  const hasFutureHook      = matchAny(tail, it ? HOOK_IT : HOOK_EN);

  const score = [
    hasDecision, hasNewInfo, hasRelationshipShift, hasRaisedRisk,
    hasComplicatedDesire, hasExposedWound, hasFutureHook,
  ].filter(Boolean).length;

  const passed = score >= 1;
  const warnings: string[] = [];
  if (!passed) {
    warnings.push("Chapter ending has no consequence signal — add a decision, revelation, risk, or forward hook.");
  }

  return {
    hasDecision, hasNewInfo, hasRelationshipShift, hasRaisedRisk,
    hasComplicatedDesire, hasExposedWound, hasFutureHook,
    score, passed, warnings,
  };
}
