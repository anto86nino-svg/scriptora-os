const ITALIAN_FIXES: Array<[RegExp, string]> = [
  [/\bun\s+crepa\b/gi, "una crepa"],
  [/\bcome\s+se\s+a\s+fosse\s+successo\b/gi, "come se nulla fosse successo"],
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
  [/\bp\s+er\b/gi, "per"],
  [/\bpar\s+te\b/gi, "parte"],
  [/\bnon diceva a\./gi, "non diceva nulla."],
  [/\bAnch'io Le mani non trovarono a da fare\./gi, "Anch'io non trovai nulla da fare con le mani."],
  [/\bLe mani non trovarono a da fare\b/gi, "Le mani non trovarono nulla da fare"],
  [/\bnon trovarono a da fare\b/gi, "non trovarono nulla da fare"],
  [/\.\s*([a-zàèéìòù])/g, ". $1"],
  [/\s+([,.!?…])/g, "$1"],
  [/\b([A-ZÀÈÉÌÒÙ][a-zàèéìòù]+)\s+([a-zàèéìòù]{1,2})\s+([A-ZÀÈÉÌÒÙ])/g, "$1 $2. $3"],
];

export type SplitBoundaryIssue = {
  boundaryIndex: number;
  before: string;
  after: string;
  repaired: boolean;
  message: string;
};

const KNOWN_SPLIT_WORDS = new Set([
  "per",
  "parte",
  "perche",
  "perché",
  "prima",
  "proprio",
  "quando",
  "questo",
  "questa",
  "quello",
  "quella",
  "come",
  "dove",
  "senza",
  "niente",
  "nulla",
]);

function normalizeWord(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findSplitBoundary(
  prevContent: string,
  nextContent: string,
  boundaryIndex: number,
): SplitBoundaryIssue | null {
  const prev = String(prevContent || "").trimEnd();
  const next = String(nextContent || "").trimStart();
  if (!prev || !next || /[.!?…,:;)"»”]\s*$/.test(prev)) return null;

  const tail = prev.match(/([A-Za-zÀ-ÿ]{1,3})$/)?.[1] || "";
  const headMatch = next.match(/^([a-zàèéìòù]{1,4})([.!?…,:;])?(?=\s|$)/);
  const head = headMatch?.[1] || "";
  if (!tail || !head) return null;

  const candidate = `${tail}${head}`;
  const normalized = normalizeWord(candidate);
  const repaired = KNOWN_SPLIT_WORDS.has(normalized);
  if (!repaired && !(tail.length <= 2 && head.length <= 2 && candidate.length >= 3)) return null;

  return {
    boundaryIndex,
    before: `${tail} ${head}`,
    after: repaired ? candidate : "",
    repaired,
    message: repaired
      ? `Parola spezzata tra sottocapitoli ricucita: "${tail} ${head}" → "${candidate}".`
      : `Possibile parola spezzata tra sottocapitoli: "${tail} ${head}".`,
  };
}

export function detectSubchapterBoundaryIssues(
  subchapters: Array<{ content?: string }>,
): SplitBoundaryIssue[] {
  const issues: SplitBoundaryIssue[] = [];
  for (let index = 0; index < subchapters.length - 1; index += 1) {
    const issue = findSplitBoundary(
      subchapters[index]?.content || "",
      subchapters[index + 1]?.content || "",
      index,
    );
    if (issue) issues.push(issue);
  }
  return issues;
}

export function repairSubchapterSplitBoundaries<T extends { content?: string }>(
  subchapters: T[],
): { subchapters: T[]; issues: SplitBoundaryIssue[] } {
  const repaired = subchapters.map((sub) => ({ ...sub, content: String(sub.content || "") })) as T[];
  const issues: SplitBoundaryIssue[] = [];

  for (let index = 0; index < repaired.length - 1; index += 1) {
    const prev = String(repaired[index]?.content || "").trimEnd();
    const next = String(repaired[index + 1]?.content || "").trimStart();
    const issue = findSplitBoundary(prev, next, index);
    if (!issue) continue;
    issues.push(issue);
    if (!issue.repaired || !issue.after) continue;

    const tail = issue.before.split(/\s+/)[0] || "";
    const head = issue.before.split(/\s+/)[1] || "";
    const headPattern = new RegExp(`^${head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([.!?…,:;])?\\s*`, "i");
    const punctuation = next.match(headPattern)?.[1] || "";
    repaired[index] = {
      ...repaired[index]!,
      content: `${prev.slice(0, Math.max(0, prev.length - tail.length))}${issue.after}${punctuation}`.trimEnd(),
    };
    repaired[index + 1] = {
      ...repaired[index + 1]!,
      content: next.replace(headPattern, "").trimStart(),
    };
  }

  return { subchapters: repaired, issues };
}

export function detectResidualSplitArtifacts(text: string): string[] {
  const source = String(text || "");
  const patterns = [
    /\bp\s+er\b/i,
    /\bpar\s+te\b/i,
    /\bun\s+crepa\b/i,
    /\bcome\s+se\s+a\s+fosse\s+successo\b/i,
  ];
  return patterns.map((pattern) => source.match(pattern)?.[0]).filter(Boolean) as string[];
}

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
