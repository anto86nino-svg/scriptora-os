import type { MemorabilityReport } from "./types";
import { clamp100, hasQuotableSentence, splitScenes, splitSentences } from "./utils";

const CONCRETE_OBJECT = /\b(?:phone|telefono|envelope|busta|key|chiave|ring|anello|letter|lettera|knife|coltello|seal|sigillo|coin|moneta|mirror|specchio|window|finestra|rain|pioggia)\b/gi;
const SIGNATURE_VERB = /\b(?:promised|promett|hesitated|esitò|lied|mentì|noticed|notò|refused|rifiutò|waited|aspettò)\b/gi;

function extractQuotableLines(text: string): string[] {
  const sentences = splitSentences(text);
  const contrastMarkers = /\b(but|yet|however|instead|ma|però|invece|eppure)\b/i;
  return sentences
    .filter(s => {
      const wc = s.split(/\s+/).length;
      return wc >= 5 && wc <= 28 && !/\b(very|really|truly)\b/i.test(s) && (contrastMarkers.test(s) || /[.!?…]$/.test(s.trim()));
    })
    .slice(0, 4)
    .map(s => s.trim());
}

export function analyzeMemorability(content: string): MemorabilityReport {
  const text = String(content || "").trim();
  const warnings: string[] = [];
  const quotableLines = extractQuotableLines(text);
  const memorableMoments: string[] = [...quotableLines];

  const scenes = splitScenes(text);
  const sceneSignature: string[] = [];

  for (const scene of scenes.slice(0, 5)) {
    CONCRETE_OBJECT.lastIndex = 0;
    SIGNATURE_VERB.lastIndex = 0;
    const objects = scene.match(CONCRETE_OBJECT) || [];
    const verbs = scene.match(SIGNATURE_VERB) || [];
    if (objects.length || verbs.length) {
      sceneSignature.push([...new Set(objects.slice(0, 2))].join(", ") || verbs[0] || scene.slice(0, 40));
    }
  }

  const questions = (text.match(/\?/g) || []).length;
  const concreteHits = (text.match(CONCRETE_OBJECT) || []).length;
  const hasAction = /\b(?:looked|turned|stopped|opened|closed|guardò|si fermò|aprì|chiuse)\b/i.test(text);
  const hasQuotable = hasQuotableSentence(splitSentences(text));

  let readerRecallScore = 42;
  if (concreteHits >= 2) readerRecallScore += 18;
  if (questions >= 1) readerRecallScore += 12;
  if (hasAction) readerRecallScore += 10;
  if (hasQuotable) readerRecallScore += 16;
  if (memorableMoments.length >= 2) readerRecallScore += 8;
  if (sceneSignature.length >= 2) readerRecallScore += 6;

  if (!hasQuotable) {
    warnings.push("If the reader closed the book now, nothing would stick — no underline-worthy line");
  }
  if (concreteHits < 2) {
    warnings.push("No strong visual object for reader recall");
  }
  if (questions === 0 && !memorableMoments.length) {
    warnings.push("Scene leaves no question or image behind");
  }

  return {
    memorableMoments: memorableMoments.slice(0, 5),
    sceneSignature: sceneSignature.slice(0, 4),
    readerRecallScore: clamp100(readerRecallScore),
    quotableLines,
    passesGate: readerRecallScore >= 58 && (hasQuotable || memorableMoments.length >= 1),
    warnings,
  };
}
