import type { GuidedInterviewState } from "./types";
import type { StoryFutureState } from "./forge-evolution-types";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value).toLowerCase();
}

export function createEmptyStoryFuture(): StoryFutureState {
  return {};
}

/** Hidden internal simulation — never shown to the author. */
export function updateStoryFutureFromAnswer(
  current: StoryFutureState | undefined,
  answer: string,
  questionKey?: string,
): StoryFutureState {
  const next: StoryFutureState = { ...(current ?? {}) };
  const text = clean(answer);

  if (/sopravvive|salva|vince|liber|escape|alive|sopravviver/.test(text)) {
    next.finalStatus = "alive";
  }
  if (/muore|muoiono|perde|perdono|trascinat|oscurit|caduta|morte|dies/.test(text)) {
    next.finalStatus = "lost";
  }
  if (/tradisce|tradimento|betray|tradit/.test(text)) {
    next.betrayalArc = true;
  }
  if (/finale amaro|bittersweet|dolceamaro|amaro/.test(text)) {
    next.endingTone = "bittersweet";
  }
  if (/speranza|hope|luminos|redenzione/.test(text)) {
    next.endingTone = "hopeful";
    next.hopeOrDread = "hope";
  }
  if (/inquietudine|dread|paura|horror|disturb/.test(text)) {
    next.endingTone = "unsettling";
    next.hopeOrDread = "dread";
  }
  if (/regno.*(sopravvive|resiste|vince)|kingdom.*survive/.test(text)) {
    next.kingdomFate = "survives";
  }
  if (/regno.*(crolla|cade|perde)|kingdom.*fall/.test(text)) {
    next.kingdomFate = "falls";
  }
  if (/gradual|lento|passo dopo passo|progressiv/.test(text)) {
    next.transformationPace = "gradual";
  }
  if (/svolta radicale|shock|immediat|brusco/.test(text)) {
    next.transformationPace = "radical";
  }
  if (/colpevole.*(scoperto|scoperta)|colpevole.*(rivelato)|culprit.*found/.test(text)) {
    next.culpritRevealed = true;
  }
  if (/ombra|resta nell'ombra|non scoperto|mystery remains/.test(text)) {
    next.culpritRevealed = false;
  }
  if (/ultima pagina|chiude il libro|last page/.test(text) && /speranza|hope/.test(text)) {
    next.lastPageFeeling = "hope";
  }
  if (/ultima pagina|chiude il libro|last page/.test(text) && /inquiet|dread|paura/.test(text)) {
    next.lastPageFeeling = "dread";
  }

  if (questionKey?.startsWith("decision-")) {
    next[questionKey.replace("decision-", "")] = answer.trim();
  }

  return next;
}
