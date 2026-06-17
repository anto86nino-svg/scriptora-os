import type { GuidedInterviewState } from "./types";
import type { BookPromises } from "./forge-evolution-types";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function pushUnique(list: string[], value?: string): void {
  const v = clean(value);
  if (!v || v.length < 8) return;
  const norm = v.toLowerCase();
  if (list.some((x) => x.toLowerCase() === norm)) return;
  list.push(v);
}

export function createEmptyBookPromises(): BookPromises {
  return { scene: [], character: [], emotional: [], relationship: [], plot: [] };
}

export function buildBookPromisesFromState(state: GuidedInterviewState): BookPromises {
  const promises = state.bookPromises ? structuredClone(state.bookPromises) : createEmptyBookPromises();
  const ex = state.extracted ?? {};

  pushUnique(promises.emotional, ex.emotionalTone);
  pushUnique(promises.emotional, ex.readerTransformation);
  pushUnique(promises.plot, ex.centralConflict);
  pushUnique(promises.plot, ex.promise);
  pushUnique(promises.scene, ex.setting);

  for (const character of state.characters ?? []) {
    pushUnique(promises.character, character.arc);
    pushUnique(promises.character, character.desire);
    pushUnique(promises.relationship, character.contradiction);
    pushUnique(promises.relationship, character.obsession);
  }

  for (const decision of state.narrativeDecisions ?? []) {
    pushUnique(promises.plot, decision.impact);
    pushUnique(promises.plot, decision.answer);
  }

  return promises;
}

function duplicateRatio(items: string[]): number {
  if (items.length < 2) return 0;
  const seen = new Set<string>();
  let dupes = 0;
  for (const item of items) {
    const key = item.toLowerCase().slice(0, 48);
    if (seen.has(key)) dupes += 1;
    seen.add(key);
  }
  return dupes / items.length;
}

export function detectRepetitionIssues(promises: BookPromises): string[] {
  const issues: string[] = [];
  const layers: Array<[string, string[]]> = [
    ["scene", promises.scene],
    ["character", promises.character],
    ["emotional", promises.emotional],
    ["relationship", promises.relationship],
    ["plot", promises.plot],
  ];

  for (const [name, items] of layers) {
    if (duplicateRatio(items) > 0.35) {
      issues.push(`Promesse ${name} ripetitive`);
    }
  }

  const plotNorm = promises.plot.map((p) => p.toLowerCase());
  const repeatedArc = plotNorm.filter((p, i) => plotNorm.indexOf(p) !== i);
  if (repeatedArc.length > 0) issues.push("Archi narrativi duplicati");

  return issues;
}

export function isRepetitionClear(state: GuidedInterviewState): boolean {
  return detectRepetitionIssues(buildBookPromisesFromState(state)).length === 0;
}
