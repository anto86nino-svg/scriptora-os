import type { BookProject } from "@/types/book";
import { cloneMemoryGraph } from "./memory-graph";
import { computeStoryDebt } from "./selectors/story-debt";
import type { CanonDriftIssue, CanonDriftReport, MemoryGraphSnapshot } from "./types";

export type CanonDriftAnalyzerInput = {
  chapterIndex?: number;
  draftText?: string;
  project?: BookProject;
};

export function analyzeCanonDrift(
  snapshot: MemoryGraphSnapshot,
  input: CanonDriftAnalyzerInput = {},
): CanonDriftReport {
  const issues: CanonDriftIssue[] = [];
  const text = (input.draftText ?? "").toLowerCase();
  const chapterIndex = input.chapterIndex;

  for (const character of snapshot.characters) {
    if (!character.name || character.name.length < 3) continue;
    if (text && !text.includes(character.name.toLowerCase()) && chapterIndex != null) {
      if (character.lastUpdatedChapter != null && chapterIndex - character.lastUpdatedChapter > 4) {
        issues.push({
          id: `char-absent-${character.id}`,
          severity: "warning",
          category: "character",
          message: `${character.name} non compare da diversi capitoli — rischio drift.`,
          chapterIndex,
        });
      }
    }
  }

  for (const promise of snapshot.promises) {
    if (promise.status === "open" && promise.importance === "critical") {
      if (chapterIndex != null && chapterIndex - promise.introducedIn > 8) {
        issues.push({
          id: `promise-stale-${promise.id}`,
          severity: "warning",
          category: "promise",
          message: `Promessa critica ancora aperta: «${promise.label}».`,
          chapterIndex,
          suggestedFix: "Riprendi o chiudi la promessa nei prossimi capitoli.",
        });
      }
    }
    if (promise.status === "broken") {
      issues.push({
        id: `promise-broken-${promise.id}`,
        severity: "critical",
        category: "promise",
        message: `Promessa spezzata: «${promise.label}».`,
        chapterIndex,
      });
    }
  }

  for (const mystery of snapshot.mysteries) {
    if (mystery.status === "open" && chapterIndex != null && chapterIndex - mystery.introducedIn > 10) {
      issues.push({
        id: `mystery-stale-${mystery.id}`,
        severity: "warning",
        category: "mystery",
        message: `Mistero non risolto: «${mystery.label}».`,
        chapterIndex,
      });
    }
  }

  for (const foreshadow of snapshot.foreshadows) {
    if (foreshadow.status === "seeded" && chapterIndex != null && chapterIndex - foreshadow.introducedIn > 12) {
      issues.push({
        id: `foreshadow-unpaid-${foreshadow.id}`,
        severity: "info",
        category: "foreshadow",
        message: `Foreshadowing senza payoff: «${foreshadow.seed}».`,
        chapterIndex,
      });
    }
  }

  if (input.project?.config?.characterBibleText && text) {
    const bible = input.project.config.characterBibleText.toLowerCase();
    const names = snapshot.characters.map((c) => c.name.toLowerCase()).filter((n) => n.length >= 3);
    for (const name of names) {
      if (bible.includes(name) && !text.includes(name) && names.some((n) => n !== name && text.includes(n))) {
        issues.push({
          id: `name-drift-${name}`,
          severity: "warning",
          category: "character",
          message: `Possibile incoerenza nomi nel capitolo rispetto al cast atteso.`,
          chapterIndex,
        });
        break;
      }
    }
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const driftScore = Math.min(100, criticalCount * 25 + warningCount * 8);

  const status =
    criticalCount > 0 ? "critical" : warningCount > 0 ? "canon_warning" : "clean";

  return { issues, driftScore, status };
}

export function validateMemoryGraph(snapshot: MemoryGraphSnapshot): CanonDriftReport {
  const working = cloneMemoryGraph(snapshot);
  working.storyDebt = computeStoryDebt(working);
  return analyzeCanonDrift(working, {});
}

/** CanonDriftAnalyzer — public alias per architectural spec */
export const CanonDriftAnalyzer = {
  analyze: analyzeCanonDrift,
  validate: validateMemoryGraph,
};

export function mapDriftToGenerationStatus(
  drift: CanonDriftReport,
  hasContent: boolean,
): "completed" | "completed_with_warning" | "recovered_partial" | "canon_warning" | "failed_empty" {
  if (!hasContent) return "failed_empty";
  if (drift.status === "critical") return "canon_warning";
  if (drift.status === "canon_warning") return "completed_with_warning";
  return "completed";
}
