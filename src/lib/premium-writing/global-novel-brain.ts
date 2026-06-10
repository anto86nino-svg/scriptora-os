import type { Chapter } from "@/types/book";

export interface NovelPacingReport {
  escalationScore: number;
  repetitionRisk: number;
  revelationBalance: number;
  issues: string[];
}

const CONFLICT_SIGNALS = /\b(ma|però|litig|conflitt|trad|minacc|pericolo|but|however|fight|threat|danger)\b/i;
const REVELATION_SIGNALS = /\b(scoprì|rivel|segret|capì che|realized|discovered|revealed|secret)\b/i;
const STALL_SIGNALS = /\b(pensò|si chiese|ricordò|felt|wondered|remembered)\b/gi;

function chapterSignalDensity(text: string, pattern: RegExp): number {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const hits = (text.match(pattern) || []).length;
  return hits / words;
}

export function analyzeNovelPacing(chapters: Chapter[]): NovelPacingReport {
  const issues: string[] = [];
  if (!chapters.length) {
    return { escalationScore: 70, repetitionRisk: 0, revelationBalance: 70, issues };
  }

  const densities = chapters.map((ch) => {
    const text = ch.content || "";
    return {
      conflict: chapterSignalDensity(text, CONFLICT_SIGNALS),
      revelation: chapterSignalDensity(text, REVELATION_SIGNALS),
      stall: chapterSignalDensity(text, STALL_SIGNALS),
    };
  });

  let repetitionRisk = 0;
  for (let i = 1; i < densities.length; i++) {
    const prev = densities[i - 1];
    const curr = densities[i];
    if (prev.stall > 0.02 && curr.stall > 0.02 && prev.conflict < 0.015 && curr.conflict < 0.015) {
      repetitionRisk += 1;
      issues.push(`stall_run:chapters_${i}-${i + 1}`);
    }
  }

  const escalationScore = Math.round(
    Math.max(35, Math.min(92, 50 + densities.slice(-3).reduce((s, d) => s + d.conflict * 400, 0))),
  );
  const revelationBalance = Math.round(
    Math.max(30, Math.min(90, 55 + densities.reduce((s, d) => s + d.revelation * 200, 0) / densities.length)),
  );

  if (repetitionRisk >= 2) issues.push("three_chapter_same_energy");
  if (escalationScore < 50) issues.push("flat_escalation");
  if (revelationBalance < 45) issues.push("revelation_drought");

  return { escalationScore, repetitionRisk, revelationBalance, issues };
}

export function buildGlobalNovelBrainBlock(previousChapters: Chapter[], chapterIndex: number): string {
  const report = analyzeNovelPacing(previousChapters);
  if (!previousChapters.length) return "";

  const recentTitles = previousChapters
    .slice(-3)
    .map((c, i) => `Cap ${previousChapters.length - 2 + i}: ${c.title || "—"}`)
    .join("\n");

  const directives: string[] = [];
  if (report.issues.includes("three_chapter_same_energy") || report.repetitionRisk >= 2) {
    directives.push("Last chapters repeated the same emotional energy — SHIFT mode: new external event or reversal required.");
  }
  if (report.issues.includes("flat_escalation")) {
    directives.push("Global escalation is flat — raise stakes, deadline, or irreversible choice in this chapter.");
  }
  if (report.issues.includes("revelation_drought")) {
    directives.push("Too few revelations lately — plant a clue, partial reveal, or consequence from a prior secret.");
  }
  if (!directives.length) {
    directives.push("Maintain rhythm: alternate tension peaks with brief breath, never three passive chapters in a row.");
  }

  return `
GLOBAL NOVEL BRAIN (MANDATORY):
You are writing chapter ${chapterIndex + 1} of a complete novel — not an isolated episode.

RECENT ARC:
${recentTitles}

PACING SCORES: escalation=${report.escalationScore}, revelation=${report.revelationBalance}, stall-risk=${report.repetitionRisk}

DIRECTIVES FOR THIS CHAPTER:
${directives.map((d) => `- ${d}`).join("\n")}
`.trim();
}
