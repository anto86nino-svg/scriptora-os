import { buildTitleV2Pipeline, type TitleV2Input } from "@/lib/title-intelligence-v2";
import { isWeakBookTitle } from "@/lib/title-shadow";
import { isGenericPhilosophyTitleForFiction } from "@/lib/concept-dominance";

const TITLE_STOP_WORDS = new Set([
  "una", "uno", "un", "il", "lo", "la", "le", "gli", "i", "di", "del", "della", "delle", "degli", "dei",
  "da", "dal", "dallo", "dalla", "nel", "nella", "nei", "sul", "sulla", "e", "che", "con", "per", "tra", "fra",
  "ogni", "notte", "alle", "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for", "with",
]);

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function countMeaningfulTitleWords(title: string): number {
  return normalize(title)
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !TITLE_STOP_WORDS.has(word))
    .length;
}

export function isIdeaTruncatedTitle(title: string, idea: string): boolean {
  const normalizedTitle = normalize(title);
  const normalizedIdea = normalize(idea);
  if (!normalizedTitle || !normalizedIdea) return false;

  if (normalizedIdea.startsWith(normalizedTitle) && normalizedTitle.length >= 12) return true;

  const ideaStart = normalizedIdea.split(/[.!?]/)[0]?.trim() || normalizedIdea;
  if (ideaStart.startsWith(normalizedTitle) && normalizedTitle.length >= 10) return true;

  const titleWords = normalizedTitle.split(/\s+/).filter(Boolean);
  const ideaWords = normalizedIdea.split(/\s+/).filter(Boolean);
  if (titleWords.length >= 4) {
    const prefix = ideaWords.slice(0, titleWords.length).join(" ");
    if (prefix === normalizedTitle) return true;
  }

  const firstPeriod = idea.split(/[.!?…]/)[0]?.trim() || "";
  if (firstPeriod && normalize(firstPeriod).startsWith(normalizedTitle) && normalizedTitle.length >= 10) {
    return true;
  }

  return false;
}

export function isStopWordHeavyTitle(title: string): boolean {
  const words = normalize(title).split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;
  const stopCount = words.filter((word) => TITLE_STOP_WORDS.has(word)).length;
  const meaningful = countMeaningfulTitleWords(title);
  return meaningful < 3 || stopCount / words.length > 0.55;
}

export function isInvalidGeneratedTitle(title: string, idea: string): boolean {
  const clean = String(title || "").trim();
  if (!clean || isWeakBookTitle(clean)) return true;
  if (countMeaningfulTitleWords(clean) < 3) return true;
  if (isIdeaTruncatedTitle(clean, idea)) return true;
  if (isStopWordHeavyTitle(clean)) return true;
  if (isGenericPhilosophyTitleForFiction(clean, idea)) return true;
  return false;
}

export function regenerateTitleFromIdea(input: TitleV2Input): { title: string; subtitle: string; commercialReason: string } | null {
  const idea = String(input.idea || input.titleSeed || "").trim();
  if (!idea) return null;

  const pipeline = buildTitleV2Pipeline(input);
  const candidates = [
    ...pipeline.finalists,
    ...pipeline.semifinalists,
    ...pipeline.allCandidates,
  ];

  for (const candidate of candidates) {
    if (isInvalidGeneratedTitle(candidate.title, idea)) continue;
    if (candidate.couldBelongToThousandBooks && candidate.usedDistinctiveElements.length < 2) continue;
    return {
      title: candidate.title,
      subtitle: candidate.subtitle,
      commercialReason: `Title Intelligence V2: specificita' ${candidate.scores.specificity}/100, elementi distintivi: ${candidate.usedDistinctiveElements.slice(0, 3).join(", ") || "tema"}.`,
    };
  }

  const elements = pipeline.distinctiveElements;
  if (elements.length >= 2) {
    const e1 = elements[0]!.text;
    const e2 = elements[1]!.text;
    const italian = /ital/i.test(String(input.language || "")) || /\b(una|della|che|per)\b/i.test(idea);
    const title = italian ? `${e1} e ${e2}` : `${e1} and ${e2}`;
    if (!isInvalidGeneratedTitle(title, idea)) {
      return {
        title,
        subtitle: italian
          ? `Quando ${e1.toLowerCase()} rivela ${e2.toLowerCase()}, la verità non può restare sepolta.`
          : `When ${e1.toLowerCase()} reveals ${e2.toLowerCase()}, the truth cannot stay buried.`,
        commercialReason: "Titolo ricostruito dagli elementi distintivi dell'idea.",
      };
    }
  }

  return null;
}

export function filterValidTitleCandidates<T extends { title: string }>(candidates: T[], idea: string): T[] {
  return candidates.filter((candidate) => !isInvalidGeneratedTitle(candidate.title, idea));
}
