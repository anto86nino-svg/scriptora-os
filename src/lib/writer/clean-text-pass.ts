const ITALIAN_FIXES: Array<[RegExp, string]> = [
  [/\bniente fosse successo\b/gi, "non fosse successo"],
  [/\bcome se niente fosse successo\b/gi, "come se non fosse successo"],
  [/\bqualcosa,\s*dall'/gi, "qualcosa dall'"],
  [/\bqualcosa,\s*dall"/gi, 'qualcosa dall"'],
  [/\btutto quello che aveva visto fosse stato un sogno\b/gi, "tutto ciò che aveva visto fosse stato un sogno"],
  [/\bquello che aveva visto fosse stato\b/gi, "ciò che aveva visto fosse stato"],
  [/\b,\s+dall'/g, " dall'"],
  [/\bpero\s*,\s*/gi, "però "],
  [/\bpoiche\s+/gi, "poiché "],
  [/\bqual'e\b/gi, "qual è"],
  [/\bun' altra\b/gi, "un'altra"],
  [/\bun' altro\b/gi, "un altro"],
];

const CORRUPTED_MERGE_PATTERNS: Array<[RegExp, string]> = [
  [/\bnon diceva a\./gi, "non diceva nulla."],
  [/\bAnch'io Le mani non trovarono a da fare\./gi, "Anch'io non trovai nulla da fare con le mani."],
  [/\bLe mani non trovarono a da fare\b/gi, "Le mani non trovarono nulla da fare"],
  [/\bnon trovarono a da fare\b/gi, "non trovarono nulla da fare"],
  [/\.\s*([a-zàèéìòù])/g, ". $1"],
  [/\s+([,.!?…])/g, "$1"],
  [/\b([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+)\s+([a-zàèéìòù]{1,2})\s+([A-ZÀÈÉÌÒÙ])/g, "$1 $2. $3"],
];

export function repairCorruptedMergeFragments(text: string): string {
  let result = String(text || "");
  if (!result.trim()) return result;

  for (const [pattern, replacement] of CORRUPTED_MERGE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function applyCleanTextPass(text: string, language?: string | null): string {
  const source = String(text || "");
  if (!source.trim()) return source;

  const lang = String(language || "").toLowerCase();
  let result = repairCorruptedMergeFragments(source);
  if (lang && !lang.includes("ital")) return result;

  for (const [pattern, replacement] of ITALIAN_FIXES) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
