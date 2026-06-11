export interface ManuscriptGuardOptions {
  language?: string;
}

const UI_LEAK_PATTERNS = [
  /genre coach/gi,
  /editorial os/gi,
  /assistant for genre/gi,
  /assistente per genere/gi,
  /scriptora system/gi,
  /analysis pro/gi,
  /blueprint integrity/gi,
  /character studio/gi,
  /market intelligence/gi,
  /booktok intensity/gi,
  /reader drop risk/gi,
  /genre dna/gi,
];

function removeUiLeaks(text: string): string {
  const lines = text.split("\n");

  return lines
    .filter(line => {
      const l = line.trim();
      return !UI_LEAK_PATTERNS.some(rx => rx.test(l));
    })
    .join("\n");
}

function repairBrokenPunctuation(text: string): string {
  return text
    .replace(/,\s*\./g, ".")
    .replace(/\.\s*,/g, ".")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

function removeStreamingArtifacts(text: string): string {
  return text
    .replace(/__RESULT__/g, "")
    .replace(/\[DONE\]/g, "")
    .replace(/undefined/gi, "")
    .replace(/null/gi, "");
}

function enforceItalian(text: string): string {
  const suspicious = [
    "the next move",
    "one detail stuck",
    "finally revealed itself",
    "closure",
    "genre coach",
  ];

  const lines = text.split("\n");

  return lines
    .filter(line => {
      const l = line.toLowerCase();
      return !suspicious.some(x => l.includes(x));
    })
    .join("\n");
}

function removeDuplicateParagraphs(text: string): string {
  const seen = new Set<string>();

  return text
    .split("\n")
    .filter(p => {
      const normalized = p.trim().toLowerCase();

      if (normalized.length < 40) return true;
      if (seen.has(normalized)) return false;

      seen.add(normalized);
      return true;
    })
    .join("\n");
}

export function finalManuscriptGuard(
  text: string,
  options?: ManuscriptGuardOptions
): string {
  let cleaned = text;

  cleaned = removeStreamingArtifacts(cleaned);
  cleaned = removeUiLeaks(cleaned);
  cleaned = repairBrokenPunctuation(cleaned);
  cleaned = removeDuplicateParagraphs(cleaned);

  if (
    options?.language?.toLowerCase() === "italian" ||
    options?.language?.toLowerCase() === "it"
  ) {
    cleaned = enforceItalian(cleaned);
  }

  return cleaned.trim();
}
