/**
 * SUBTEXT AND SILENCE ENGINE
 *
 * Replaces direct emotion-naming with gestural/physical equivalents.
 * Favors:
 *   - Physical actions over stated feelings
 *   - Silence over explanation
 *   - Symbolic objects and gestures over declarations
 *
 * Conservative: only replaces clearly "tell don't show" patterns.
 * Pure, synchronous, never throws.
 */

type Lang = "it" | "en" | "default";

function langKey(l: string): Lang {
  if (/ital/i.test(l)) return "it";
  if (/engl/i.test(l)) return "en";
  return "default";
}

/* ---- Emotion → gesture replacements ---- */

const REPLACEMENTS_IT: Array<[RegExp, string]> = [
  // "si sentì" + abstract emotion
  [/\bsi sentì (molto )?felice\b/gi, "sorrise senza accorgersene"],
  [/\bsi sentì (molto )?triste\b/gi, "guardò in un punto fisso"],
  [/\bsi sentì (molto )?sola\b/gi, "si voltò dall'altra parte"],
  [/\bsi sentì (molto )?sol[oa]\b/gi, "rimase in silenzio troppo a lungo"],
  [/\bsi sentì (molto )?confusa?\b/gi, "non riuscì a rispondere subito"],
  [/\bsi sentì (molto )?arrabbiata?\b/gi, "strinse le dita"],
  [/\bsi sentì (molto )?in colpa\b/gi, "abbassò gli occhi"],
  [/\bsi sentì sollevata?\b/gi, "lasciò uscire l'aria lentamente"],
  // "capì che" + emotion
  [/\bcapì che era (felice|innamorata?|cambiata?)\b/gi, "qualcosa di diverso si mosse dentro di lei"],
  [/\bcapì che voleva (restare|andare|scappare)\b/gi, "fece un mezzo passo, poi si fermò"],
  // Flat "provava + emotion"
  [/\bprovava (amore|odio|nostalgia|rimpianto) per\b/gi, "non riusciva a guardare altrove quando pensava a"],
];

const REPLACEMENTS_EN: Array<[RegExp, string]> = [
  // "she/he felt" + abstract emotion
  [/\b(she|he) felt (very )?(happy|joyful|elated)\b/gi, "$1 smiled before knowing why"],
  [/\b(she|he) felt (very )?sad\b/gi, "$1 stared at nothing in particular"],
  [/\b(she|he) felt (very )?lonely\b/gi, "$1 turned to look at the window"],
  [/\b(she|he) felt (very )?confused\b/gi, "$1 took a moment before answering"],
  [/\b(she|he) felt (very )?angry\b/gi, "$1 tightened $2 fingers"],
  [/\b(she|he) felt (very )?guilty\b/gi, "$1 looked down"],
  [/\b(she|he) felt (very )?relieved\b/gi, "$1 exhaled slowly"],
  // "she realized she was" + emotion
  [/\b(she|he) realized (she|he) was (happy|in love|changed)\b/gi, "something different moved inside $1"],
  // Stated love/desire
  [/\b(she|he) felt (deep )?love for\b/gi, "$1 couldn't look anywhere else when thinking of"],
  [/\b(she|he) was in love\b/gi, "$1 stopped pretending not to notice"],
];

/* ---- "Explained" vs "shown" — strip psychological commentary ---- */

const OVER_EXPLAIN_IT: Array<[RegExp, string]> = [
  [/\(a livello emotivo, questo significava che[^)]+\)/gi, ""],
  [/In realtà, quello che (lei|lui) provava era\b[^.]+\./gi, ""],
  [/Dal punto di vista psicologico,?[^.]+\./gi, ""],
];

const OVER_EXPLAIN_EN: Array<[RegExp, string]> = [
  [/\(emotionally, this meant that[^)]+\)/gi, ""],
  [/On a deeper level, (she|he|they) (was|were) (feeling|experiencing)[^.]+\./gi, ""],
  [/Psychologically speaking,?[^.]+\./gi, ""],
  [/What (she|he|they) was really feeling was[^.]+\./gi, ""],
];

export interface SubtextResult {
  text: string;
  interventions: string[];
}

export function applySubtextAndSilenceEngine(
  text: string,
  language = "Italian",
): SubtextResult {
  if (!text?.trim()) return { text: text ?? "", interventions: [] };

  const lang = langKey(language);
  const interventions: string[] = [];
  let result = text;

  const emotionPatterns = lang === "it" ? REPLACEMENTS_IT : REPLACEMENTS_EN;
  const explainPatterns = lang === "it" ? OVER_EXPLAIN_IT : OVER_EXPLAIN_EN;

  for (const [pattern, replacement] of emotionPatterns) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) interventions.push(`Emotion → gesture: ${pattern.source.slice(0, 50)}…`);
  }

  for (const [pattern, replacement] of explainPatterns) {
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) interventions.push(`Removed psychological commentary`);
  }

  return { text: result.trim(), interventions };
}
