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

export function applyCleanTextPass(text: string, language?: string | null): string {
  const source = String(text || "");
  if (!source.trim()) return source;

  const lang = String(language || "").toLowerCase();
  if (lang && !lang.includes("ital")) return source;

  let result = source;
  for (const [pattern, replacement] of ITALIAN_FIXES) {
    result = result.replace(pattern, replacement);
  }

  return result
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}
