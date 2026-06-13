import type { BookConfig, BookProject, Chapter } from "@/types/book";
import { buildMemoryConsistencyV25Snapshot } from "@/lib/memory-consistency-v25";
import { scoreEmotionalRepetition } from "@/lib/premium-writing/narrative-beat-engine";
import type { LongFormStabilityReport } from "./types";

function chapter(n: number, content: string): Chapter {
  return { title: `Chapter ${n}`, content, subchapters: [] };
}

export function buildLongFormSimulationCorpus(config: BookConfig, chapterCount = 15): Chapter[] {
  const chapters: Chapter[] = [];
  for (let index = 0; index < chapterCount; index += 1) {
    const n = index + 1;
    if (index === 0) {
      chapters.push(chapter(n, `Nora found the key in the cathedral. She lied to Elia about it.
"Not tonight," she said, avoiding his eyes.`));
      continue;
    }
    if (index % 4 === 0) {
      chapters.push(chapter(n, `Nora and Elia fought after the betrayal resurfaced.
Trust broke again, but desire remained under the silence.`));
      continue;
    }
    if (index % 3 === 0) {
      chapters.push(chapter(n, `The faceless statue had moved. Nora touched her wrist before answering.
A message waited: WHO TOOK THE KEY?`));
      continue;
    }
    chapters.push(chapter(n, `Elia watched Nora without speaking. The distance between them stayed deliberate.
She still had not explained the drawer.`));
  }
  return chapters;
}

export function evaluateLongFormStability(
  config: BookConfig,
  chapters: Chapter[],
): LongFormStabilityReport {
  const memory = buildMemoryConsistencyV25Snapshot({
    config: {
      ...config,
      characters: config.characters?.length
        ? config.characters
        : [
            { name: "Nora", role: "protagonist", relationships: "with Elia" },
            { name: "Elia", role: "lead", relationships: "with Nora" },
          ],
    },
    blueprint: {
      overview: "Long form baseline",
      themes: ["trust", "mystery"],
      emotionalArc: "resistance",
      chapterOutlines: chapters.map((ch, i) => ({ title: ch.title, summary: `Beat ${i + 1}` })),
    },
    chapters,
  });

  const corpus = chapters.map((ch) => ch.content).join("\n\n");
  const repeatedBeat = chapters.reduce((sum, ch, index) => {
    if (index === 0) return sum;
    return sum + (scoreEmotionalRepetition(ch.content, chapters[index - 1].content) < 45 ? 1 : 0);
  }, 0);

  const issues: string[] = [];
  let characterDriftRisk = 20;
  let relationshipResetRisk = 20;
  let pacingCollapseRisk = 25;
  let forgottenPromiseRisk = 20;
  let styleInstabilityRisk = 18;

  if (memory.characterMemories.length < 2) {
    characterDriftRisk += 25;
    issues.push("Character memory thin across long form");
  }
  if (memory.storyPromises.filter((item) => item.status === "open").length >= 8) {
    forgottenPromiseRisk += 30;
    issues.push("Too many open promises unresolved");
  }
  if (repeatedBeat >= Math.floor(chapters.length * 0.35)) {
    pacingCollapseRisk += 28;
    issues.push("Repeated emotional beats across chapters");
  }
  if (memory.emotionalContinuity.filter((beat) => beat.regressionRisk).length >= 3) {
    relationshipResetRisk += 24;
    issues.push("Emotional regression risk detected");
  }
  if (/\b(therap|capisco perfettamente|everything was fine)\b/i.test(corpus)) {
    styleInstabilityRisk += 20;
    issues.push("Therapy speech or flat resolution leaked into long form");
  }

  const stable =
    characterDriftRisk < 45 &&
    relationshipResetRisk < 45 &&
    pacingCollapseRisk < 50 &&
    repeatedBeat < Math.floor(chapters.length * 0.4) &&
    forgottenPromiseRisk < 50;

  return {
    chaptersSimulated: chapters.length,
    characterDriftRisk,
    relationshipResetRisk,
    pacingCollapseRisk,
    repeatedBeatRisk: repeatedBeat * 8,
    forgottenPromiseRisk,
    styleInstabilityRisk,
    stable,
    issues,
  };
}

export function evaluateProjectLongFormStability(project: BookProject): LongFormStabilityReport {
  return evaluateLongFormStability(project.config, project.chapters);
}
