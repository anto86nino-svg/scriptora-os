/**
 * EMOTIONAL RESTRAINT ENGINE
 *
 * Slows down emotional payoff in narrative (especially romance/dark romance).
 * Targets:
 *   - Premature love declarations in first 30% of a chapter
 *   - Over-available love interests
 *   - Grand confessions that short-circuit slow burn
 *
 * Nonfiction bypass: skips all restraint logic for nonfiction genres.
 * Conservative: only touches the most egregious patterns.
 * Pure, synchronous, never throws.
 */

type Lang = "it" | "en" | "default";

function langKey(l: string): Lang {
  if (/ital/i.test(l)) return "it";
  if (/engl/i.test(l)) return "en";
  return "default";
}

function isNonfiction(genre: string): boolean {
  return /self[- ]help|business|productivity|nonfiction|non.fiction|guide|manual|cookbook|philosophy|spirituality|diet|fitness|health|education|ai.tools/i.test(genre);
}

/* ---- Early-payoff detection: declaration within first 20% of text ---- */

const EARLY_DECLARATION_IT: RegExp[] = [
  /\b(ti amo|ti voglio bene|sono innamorat[oa] di te)\b/i,
  /\bsei la (persona|cosa) più importante\b/i,
  /\bvoglio stare con te per sempre\b/i,
  /\bnon posso vivere senza di te\b/i,
];

const EARLY_DECLARATION_EN: RegExp[] = [
  /\b(i love you|i'm in love with you|i've fallen for you)\b/i,
  /\byou're the most important (person|thing) in my life\b/i,
  /\bi want to be with you forever\b/i,
  /\bi can't live without you\b/i,
];

/* ---- Over-availability patterns ---- */

const OVER_AVAILABLE_IT: Array<[RegExp, string]> = [
  [/([""«])Sono sempre qui per te\.?([""»])/gi, "$1Dipende.$2"],
  [/([""«])Qualunque cosa tu abbia bisogno\.?([""»])/gi, "$1Non sempre posso essere quello che ti serve.$2"],
  [/([""«])Ti proteggerò sempre\.?([""»])/gi, "$1Farò quello che posso.$2"],
];

const OVER_AVAILABLE_EN: Array<[RegExp, string]> = [
  [/([""«])I'll always be here for you\.?([""»])/gi, "$1It depends.$2"],
  [/([""«])Whatever you need\.?([""»])/gi, "$1I can't always be what you need.$2"],
  [/([""«])I'll always protect you\.?([""»])/gi, "$1I'll try.$2"],
  [/([""«])I'?m here, always\.?([""»])/gi, "$1I'm here. For now.$2"],
];

/* ---- Grand declaration → micro-payoff ---- */

const GRAND_DECLARATION_IT: Array<[RegExp, string]> = [
  [/([""«])Sei la luce della mia vita\.?([""»])/gi, "$1Ti penso più di quanto voglia ammettere.$2"],
  [/([""«])Sei tutto per me\.?([""»])/gi, "$1Sei... troppo, forse.$2"],
];

const GRAND_DECLARATION_EN: Array<[RegExp, string]> = [
  [/([""«])You're the light of my life\.?([""»])/gi, "$1I think about you more than I want to admit.$2"],
  [/([""«])You're everything to me\.?([""»])/gi, "$1You're... a lot. Maybe too much.$2"],
  [/([""«])You complete me\.?([""»])/gi, "$1I didn't expect this.$2"],
];

export interface RestraintResult {
  text: string;
  earlyDeclarationsFound: number;
  interventions: string[];
}

export function applyEmotionalRestraintEngine(
  text: string,
  language = "Italian",
  genre = "romance",
): RestraintResult {
  if (!text?.trim()) return { text: text ?? "", earlyDeclarationsFound: 0, interventions: [] };
  if (isNonfiction(genre)) return { text, earlyDeclarationsFound: 0, interventions: [] };

  const lang = langKey(language);
  const interventions: string[] = [];
  let result = text;

  // 1. Count early declarations (first 25% of text)
  const earlySlice = text.slice(0, Math.floor(text.length * 0.25));
  const earlyPatterns = lang === "it" ? EARLY_DECLARATION_IT : EARLY_DECLARATION_EN;
  let earlyCount = 0;
  for (const p of earlyPatterns) {
    const m = earlySlice.match(new RegExp(p, "gi"));
    if (m) earlyCount += m.length;
  }

  // 2. Over-availability softening
  const availablePatterns = lang === "it" ? OVER_AVAILABLE_IT : OVER_AVAILABLE_EN;
  for (const [p, r] of availablePatterns) {
    const before = result;
    result = result.replace(p, r);
    if (result !== before) interventions.push(`Over-availability softened: ${p.source.slice(0, 40)}…`);
  }

  // 3. Grand declaration → micro-payoff
  const grandPatterns = lang === "it" ? GRAND_DECLARATION_IT : GRAND_DECLARATION_EN;
  for (const [p, r] of grandPatterns) {
    const before = result;
    result = result.replace(p, r);
    if (result !== before) interventions.push(`Grand declaration → micro-payoff: ${p.source.slice(0, 40)}…`);
  }

  return { text: result.trim(), earlyDeclarationsFound: earlyCount, interventions };
}
