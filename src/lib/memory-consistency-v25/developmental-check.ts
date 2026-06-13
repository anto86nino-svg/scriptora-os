import type { BookProject, Chapter } from "@/types/book";
import type { DevelopmentalMemoryIssue, DevelopmentalMemoryReport } from "./types";
import { buildMemoryConsistencyV25Snapshot } from "./extractor";
import { hasUnjustifiedEmotionalReset } from "./emotional-continuity";
import { relationshipPairAppearsInChapter } from "./relationship-memory";
import { chapterCorpus } from "./utils";

const INSTANT_RECONCILIATION = /\b(tutto\s+perdonato|all\s+forgiven|best\s+friends|migliori\s+amici|come\s+se\s+nulla|as\s+if\s+nothing)\b/i;
const VOICE_RESET = /\b(therap(?:y|ist)|capisco\s+perfettamente|i\s+completely\s+understand|emotional\s+clarity)\b/i;

function pushIssue(
  issues: DevelopmentalMemoryIssue[],
  issue: DevelopmentalMemoryIssue,
): void {
  if (issues.some((existing) => existing.id === issue.id)) return;
  issues.push(issue);
}

export function runDevelopmentalMemoryCheck(input: {
  project: BookProject;
  chapterIndex: number;
  chapterText?: string;
}): DevelopmentalMemoryReport {
  const issues: DevelopmentalMemoryIssue[] = [];
  const chapters = input.project.chapters.slice(0, input.chapterIndex + 1);
  const snapshot = buildMemoryConsistencyV25Snapshot({
    config: input.project.config,
    blueprint: input.project.blueprint,
    chapters,
    existing: input.project.longBookMemory?.memoryConsistencyV25,
    psychology: input.project.longBookMemory?.characterPsychology,
    characterStates: input.project.longBookMemory?.characterStates,
  });

  const currentChapter = chapters[input.chapterIndex];
  const currentText = input.chapterText || chapterCorpus(currentChapter);
  const previousChapter = chapters[input.chapterIndex - 1];
  const previousText = previousChapter ? chapterCorpus(previousChapter) : "";

  if (/\b(i\s+love\s+you|ti\s+amo)\b/i.test(currentText) && previousText && CONFLICT_IN_PREVIOUS(previousText)) {
    pushIssue(issues, {
      id: "emotion-love-too-soon",
      severity: "warning",
      category: "emotion",
      message: "⚠ Dichiarazione affettiva troppo presto dopo un conflitto recente.",
      surgicalFix: "Ritarda vulnerabilità esplicita finché il costo emotivo del conflitto è ancora visibile.",
    });
  }

  for (const character of snapshot.characterMemories) {
    if (!currentText.toLowerCase().includes(character.name.toLowerCase())) continue;
    if (character.loveResistance === "high" && /\b(ti\s+amo|i\s+love\s+you|vulnerable\s+confession)\b/i.test(currentText)) {
      pushIssue(issues, {
        id: `char-voice-${character.name}`,
        severity: "warning",
        category: "character",
        message: `⚠ ${character.name}: alta resistenza emotiva ma il capitolo mostra apertura rapida.`,
        surgicalFix: `Reintroduci ${character.stressPattern} e ${character.speechStyle} prima di qualsiasi vulnerabilità.`,
      });
    }
    if (VOICE_RESET.test(currentText)) {
      pushIssue(issues, {
        id: `char-therapy-${character.name}`,
        severity: "critical",
        category: "character",
        message: `⚠ ${character.name}: tono da terapista / chiarezza emotiva artificiale.`,
        surgicalFix: `Sostituisci dichiarazioni esplicite con gesti, silenzi e ${character.recurringTics[0] || "tic comportamentali"} già stabiliti.`,
      });
    }
  }

  if (previousText && CONFLICT_IN_PREVIOUS(previousText) && INSTANT_RECONCILIATION.test(currentText)) {
    pushIssue(issues, {
      id: "rel-reset-generic",
      severity: "critical",
      category: "relationship",
      message: "⚠ Relazione: conflitto precedente evaporato senza lavoro emotivo.",
      surgicalFix: "Mantieni attrito residuo, silenzi, o domande non risolte prima di ogni riconciliazione.",
    });
  }

  for (const relationship of snapshot.relationships) {
    if (!relationshipPairAppearsInChapter(relationship, currentText)) continue;
    if (relationship.conflictLevel === "high" && previousText && CONFLICT_IN_PREVIOUS(previousText) && INSTANT_RECONCILIATION.test(currentText)) {
      pushIssue(issues, {
        id: `rel-reset-${relationship.characterA}-${relationship.characterB}`,
        severity: "critical",
        category: "relationship",
        message: `⚠ Relazione ${relationship.pair}: conflitto evaporato senza lavoro emotivo.`,
        surgicalFix: "Mantieni attrito residuo, silenzi, o domande non risolte prima di ogni riconciliazione.",
      });
    }
    if (relationship.trust < 35 && /\b(si\s+fidano|they\s+trust\s+each\s+other|totale\s+fiducia)\b/i.test(currentText)) {
      pushIssue(issues, {
        id: `rel-trust-${relationship.pair}`,
        severity: "warning",
        category: "relationship",
        message: `⚠ ${relationship.pair}: fiducia troppo alta rispetto alla memoria (${relationship.trust}%).`,
        surgicalFix: "Mostra prove, esitazione o controllo prima di aumentare la fiducia.",
      });
    }
  }

  const currentBeat = snapshot.emotionalContinuity.at(-1);
  const previousBeat = snapshot.emotionalContinuity.at(-2);
  if (currentBeat && hasUnjustifiedEmotionalReset(previousBeat, currentBeat, currentText)) {
    pushIssue(issues, {
      id: "emotion-reset",
      severity: "critical",
      category: "emotion",
      message: "⚠ Reset emotivo: il personaggio sembra guarito senza giustificazione.",
      surgicalFix: "Riporta paura, vergogna o costo emotivo residuo dal capitolo precedente.",
    });
  }

  if (snapshot.tensionMemory.slowBurnActive && /\b(finalmente\s+insieme|finally\s+together|happy\s+ending)\b/i.test(currentText)) {
    pushIssue(issues, {
      id: "tension-reset",
      severity: "warning",
      category: "tension",
      message: "⚠ Tensione slow-burn risolta troppo presto.",
      surgicalFix: "Mantieni attrito, distanza o ambivalenza finché la struttura non lo permette.",
    });
  }

  const overduePromises = snapshot.storyPromises.filter((item) => item.urgency === "high" && item.status === "open");
  if (overduePromises.length >= 3 && input.chapterIndex >= Math.floor(input.project.config.numberOfChapters * 0.55)) {
    pushIssue(issues, {
      id: "payoff-forgotten",
      severity: "warning",
      category: "payoff",
      message: `⚠ ${overduePromises.length} promesse/misteri ad alta urgenza ancora aperti.`,
      surgicalFix: `Richiama almeno uno: ${overduePromises[0].description.slice(0, 90)}…`,
    });
  }

  for (const callback of snapshot.callbacks.slice(0, 3)) {
    if (callback.chapterIntroduced < input.chapterIndex && callback.type === "object") {
      const objectMentioned = /\b(chiave|key|lettera|letter|anello|ring)\b/i.test(currentText);
      if (!objectMentioned && input.chapterIndex - callback.chapterIntroduced >= 4) {
        pushIssue(issues, {
          id: `callback-${callback.detail}`,
          severity: "warning",
          category: "payoff",
          message: `⚠ Payoff dimenticato: ${callback.detail} non richiamato da Ch${callback.chapterIntroduced}.`,
          surgicalFix: callback.suggestedReuse,
        });
        break;
      }
    }
  }

  const penalty = issues.reduce((sum, issue) => sum + (issue.severity === "critical" ? 14 : 7), 0);
  const score = Math.max(0, 100 - penalty);

  return { issues, score };
}

function CONFLICT_IN_PREVIOUS(text: string): boolean {
  return /\b(litig|argu(?:ed|ment)?|fight|fought|tradit|betray(?:ed|al)?|rupture|non\s+parlano)\b/i.test(text);
}

export function formatDevelopmentalMemoryIssues(report: DevelopmentalMemoryReport): string[] {
  return report.issues.map((issue) => issue.message);
}
