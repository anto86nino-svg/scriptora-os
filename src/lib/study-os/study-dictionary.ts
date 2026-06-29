import type { DifficultWord } from "@/lib/study-session";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";

export type DictionaryExplainMode = "bambino" | "universitario";

export interface DictionaryEntry {
  term: string;
  semplice: string;
  tecnica: string;
  esempio: string;
  sinonimi: string[];
  collegamenti: string[];
  commonMistake?: string;
  memoryTrick?: string;
  source: "material" | "kernel";
}

export interface DictionaryLookupResult {
  entry: DictionaryEntry;
  mode: DictionaryExplainMode;
  headline: string;
  body: string;
  source?: "material" | "kernel" | "local" | "ai";
}

export type DictionaryAiLookupFn = (input: {
  term: string;
  mode: DictionaryExplainMode;
  local: DictionaryLookupResult;
  context?: string;
}) => Promise<{ body: string; headline?: string; source: "ai" | "local" }>;

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

/** Build dictionary index from material difficultWords and kernel key concepts. */
export function buildDictionaryIndex(
  difficultWords: DifficultWord[],
  keyConcepts: string[] = [],
  kernelPlan?: StudyKernelPlan | null,
): Map<string, DictionaryEntry> {
  const index = new Map<string, DictionaryEntry>();

  for (const item of difficultWords) {
    const term = item.word.trim();
    if (!term) continue;
    index.set(normalizeTerm(term), {
      term,
      semplice: item.simple || item.school || term,
      tecnica: item.technical || item.advanced || item.precise || item.simple || term,
      esempio: item.example || item.newExample || `Esempio con "${term}" nel materiale studiato.`,
      sinonimi: item.synonyms ?? [],
      collegamenti: item.connections ?? [],
      commonMistake: item.commonMistake,
      memoryTrick: item.memoryTrick,
      source: "material",
    });
  }

  const kernelTerms = [
    ...keyConcepts,
    ...(kernelPlan?.classification.strategy ?? []).slice(0, 4),
  ].filter(Boolean);

  for (const raw of kernelTerms) {
    const term = String(raw).trim();
    if (!term || index.has(normalizeTerm(term))) continue;
    index.set(normalizeTerm(term), {
      term,
      semplice: `Concetto chiave: ${term}. È uno dei nuclei del materiale che stai studiando.`,
      tecnica: `Termine centrale nel contesto di ${kernelPlan?.classification.subjectLabel ?? "questa materia"}: richiede definizione precisa e collegamento agli altri concetti.`,
      esempio: `Nel testo compare come punto da collegare a ${kernelPlan?.classification.label ?? "il tema principale"}.`,
      sinonimi: [],
      collegamenti: keyConcepts.filter((c) => c !== term).slice(0, 3),
      source: "kernel",
    });
  }

  return index;
}

export function listDictionaryTerms(index: Map<string, DictionaryEntry>): DictionaryEntry[] {
  return Array.from(index.values()).sort((a, b) => a.term.localeCompare(b.term, "it"));
}

export function lookupDictionaryTerm(
  index: Map<string, DictionaryEntry>,
  term: string,
  mode: DictionaryExplainMode = "bambino",
): DictionaryLookupResult | null {
  const entry = index.get(normalizeTerm(term));
  if (!entry) return null;
  return formatDictionaryLookup(entry, mode);
}

/** Explain a term in the selected mode — "bambino" ≈ 10 anni, "universitario" = accademico. */
export function formatDictionaryLookup(entry: DictionaryEntry, mode: DictionaryExplainMode): DictionaryLookupResult {
  if (mode === "bambino") {
    return {
      entry,
      mode,
      headline: `Spiegamelo come se avessi 10 anni`,
      body: [
        entry.semplice,
        entry.esempio ? `Per esempio: ${entry.esempio}` : "",
        entry.memoryTrick ? `Trucco: ${entry.memoryTrick}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }

  return {
    entry,
    mode,
    headline: "Spiegamelo da universitario",
    body: [
      entry.tecnica,
      entry.esempio ? `Esempio applicativo: ${entry.esempio}` : "",
      entry.sinonimi.length ? `Sinonimi / varianti: ${entry.sinonimi.join(", ")}` : "",
      entry.collegamenti.length ? `Collegamenti: ${entry.collegamenti.join(" · ")}` : "",
      entry.commonMistake ? `Errore comune: ${entry.commonMistake}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/** Extract clickable terms from a text block using the dictionary index. */
export function findTermsInText(text: string, index: Map<string, DictionaryEntry>): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const entry of index.values()) {
    if (lower.includes(normalizeTerm(entry.term))) {
      found.push(entry.term);
    }
  }
  return found.slice(0, 12);
}

/**
 * Lookup with optional AI enhancement — falls back to local definitions when offline or AI unavailable.
 */
export async function lookupDictionaryWithAI(
  index: Map<string, DictionaryEntry>,
  term: string,
  mode: DictionaryExplainMode = "bambino",
  options?: {
    aiLookup?: DictionaryAiLookupFn;
    context?: string;
    preferAi?: boolean;
  },
): Promise<DictionaryLookupResult | null> {
  const local = lookupDictionaryTerm(index, term, mode);
  if (!local) return null;

  const preferAi = options?.preferAi !== false;
  if (!preferAi || !options?.aiLookup) {
    return { ...local, source: local.entry.source === "kernel" ? "kernel" : "local" };
  }

  try {
    const enhanced = await options.aiLookup({
      term,
      mode,
      local,
      context: options.context,
    });
    if (enhanced.source === "ai" && enhanced.body.trim()) {
      return {
        ...local,
        headline: enhanced.headline || local.headline,
        body: enhanced.body,
        source: "ai",
      };
    }
  } catch {
    /* fallback below */
  }

  return { ...local, source: local.entry.source === "kernel" ? "kernel" : "local" };
}
