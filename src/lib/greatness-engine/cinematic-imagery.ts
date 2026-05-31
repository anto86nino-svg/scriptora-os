import type { CinematicImageryReport } from "./types";
import { clamp100, openingWords, splitScenes } from "./utils";

const SENSORY = /\b(?:saw|heard|smelled|touched|tasted|looked|sound|smell|cold|warm|bright|dark|silence|silenz|rain|pioggia|light|luce|voice|voce|breath|respiro|skin|pelle|glass|vetro|metal|metallo)\b/gi;
const ABSTRACT = /\b(?:feeling|emotion|thought|idea|concept|understanding|realization|sentimento|pensiero|concetto)\b/gi;
const ANCHOR = /\b(?:morning|evening|midnight|kitchen|cucina|bar|warehouse|magazzino|bridge|ponte|elevator|ascensore|door|porta|window|finestra|street|strada|room|stanza)\b/gi;

export function analyzeCinematicImagery(content: string): CinematicImageryReport {
  const text = String(content || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordN = words.length || 1;

  SENSORY.lastIndex = 0;
  ABSTRACT.lastIndex = 0;
  const sensoryHits = (text.match(SENSORY) || []).length;
  const abstractHits = (text.match(ABSTRACT) || []).length;

  const concreteNouns = (text.match(/\b(?:phone|door|key|hand|eye|blood|knife|letter|coin|seal|rain|light|window|bar|warehouse|bridge|elevator|telefono|porta|chiave|mano|occhio|sangue|coltello|lettera|moneta|sigillo|pioggia|luce|finestra|ponte|ascensore)\b/gi) || []).length;
  const concreteNounRatio = clamp100((concreteNouns / wordN) * 400);

  const visualClarity = clamp100(48 + concreteNounRatio * 0.35 + sensoryHits * 4 - abstractHits * 5);
  const sensoryPresence = clamp100(40 + sensoryHits * 7 - abstractHits * 4);

  const open = openingWords(text, 80).toLowerCase();
  ANCHOR.lastIndex = 0;
  let sceneAnchoring = 45;
  if (ANCHOR.test(open)) sceneAnchoring += 22;
  if (/\b(?:at|on|in|nel|nella|sul|sulla)\s+\w+/i.test(open)) sceneAnchoring += 10;
  if (splitScenes(text)[0]?.split(/\s+/).length <= 25) sceneAnchoring += 8;

  sceneAnchoring = clamp100(sceneAnchoring);

  return {
    visualClarity,
    sensoryPresence,
    sceneAnchoring,
    concreteNounRatio,
    passesGate: visualClarity >= 55 && sensoryPresence >= 50 && sceneAnchoring >= 52,
  };
}
