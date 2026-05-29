import type { BookConfig, BookProject, Chapter } from "@/types/book";
import { refreshProjectNarrativeIntelligenceV2 } from "@/lib/narrative-intelligence-v2";
import type { RealWorldProject } from "@/lib/live-author-validation/corpus/real-world-projects";
import type { AuthorIdentity } from "@/lib/author-identity";
import { buildAuthorIdentityFingerprint } from "@/lib/author-identity";

function chaptersFromContent(contents: string[]): Chapter[] {
  return contents.map((content, i) => ({
    title: `Chapter ${i + 1}`,
    content,
    subchapters: [],
    status: "completed" as const,
  }));
}

function baseProject(config: Partial<BookConfig>, chapters: Chapter[]): BookProject {
  return {
    id: "live-benchmark",
    config: {
      title: config.title || "Live Benchmark",
      genre: config.genre || "fiction",
      numberOfChapters: chapters.length,
      language: config.language || "English",
      tone: config.tone || "literary",
      audience: "Adults",
      authorStyle: "Literary commercial",
      chapterLength: "medium",
      bookLength: "long",
      subchaptersEnabled: false,
      ...config,
    } as BookConfig,
    blueprint: {
      overview: config.title || "Live benchmark",
      chapterOutlines: [],
      themes: ["continuity", "memory"],
      emotionalArc: "rising",
    },
    frontMatter: null,
    backMatter: null,
    chapters,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function computeLiveContinuityProxy(
  contents: string[],
  project: RealWorldProject,
  checkpointChapter?: number,
): number {
  if (!contents.length) return 0.35;
  const slice = checkpointChapter ? contents.slice(0, checkpointChapter) : contents;
  const chapters = chaptersFromContent(slice);
  const enriched = refreshProjectNarrativeIntelligenceV2(
    baseProject({ ...project.config, title: project.title, numberOfChapters: project.chapterCount }, chapters),
  );
  const mem = enriched.longBookMemory;
  if (!mem) return 0.45;

  let score = 0.45;
  if (mem.characterStates?.length) score += 0.08;
  if (mem.unresolvedArcs?.length) score += 0.1;
  if (mem.worldRules?.length) score += 0.08;
  if (mem.continuityAnchors.length >= 2) score += 0.1;
  if ((mem.characterPsychology?.length ?? 0) >= 1) score += 0.1;

  const openPromises = mem.promisePayoffs.filter(p => p.status !== "paid").length;
  if (openPromises > 0 && openPromises <= 12) score += 0.05;
  if (openPromises > 20) score -= 0.1;

  const combined = slice.join("\n");
  const repeatedPhrasePenalty = /I am not running anymore|this changed everything|everything is fine now/gi.test(combined)
    ? 0.08
    : 0;

  return Number(Math.max(0.2, Math.min(0.98, score - repeatedPhrasePenalty)).toFixed(3));
}

export function computeLiveDriftScore(continuityProxy: number, issues: string[]): number {
  const penalty = issues.length * 0.6;
  return Number(Math.max(0, Math.min(10, continuityProxy * 10 - penalty)).toFixed(2));
}

export function computeVoiceProxy(content: string, identity?: AuthorIdentity | null): number {
  if (!identity) return 0.55;
  const text = content.toLowerCase();
  let score = 0.55;

  const fingerprint = buildAuthorIdentityFingerprint(identity).toLowerCase();
  const tokens = fingerprint.split(/\W+/).filter(t => t.length > 4);
  const hits = tokens.filter(t => text.includes(t)).length;
  score += Math.min(0.2, hits * 0.03);

  if (identity.signatureMoves) {
    const moves = identity.signatureMoves.split(/[,;|]/).map(s => s.trim().toLowerCase()).filter(Boolean);
    const moveHits = moves.filter(m => m.length > 5 && text.includes(m.slice(0, Math.min(20, m.length)))).length;
    score += Math.min(0.15, moveHits * 0.05);
  }

  if (identity.forbiddenMoves) {
    const forbidden = identity.forbiddenMoves.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    for (const f of forbidden) {
      if (f.length > 4 && text.includes(f.toLowerCase())) score -= 0.12;
    }
  }

  if (/\b(as an ai|in conclusion|it is important to note)\b/i.test(content)) score -= 0.15;

  return Number(Math.max(0.25, Math.min(0.98, score)).toFixed(3));
}

export function detectContinuityIssues(contents: string[], project: RealWorldProject): string[] {
  const issues: string[] = [];
  if (contents.length >= 15) {
    const early = computeLiveContinuityProxy(contents.slice(0, 8), project);
    const late = computeLiveContinuityProxy(contents, project);
    if (late < early - 0.15) issues.push("Continuity proxy degraded after chapter 15");
  }

  const combined = contents.join("\n");
  if (/Salt Bridge|Iron Pact/i.test(project.title) || project.genreKey === "fantasy") {
    if (contents.length >= 10 && !/pact|oath|bridge|canon/i.test(combined.slice(-4000))) {
      issues.push("Fantasy canon anchors missing in late chapters");
    }
  }

  if (project.genreKey === "horticultural" && /believe in yourself|inner journey|manifest/i.test(combined)) {
    issues.push("Practical guide drifted into self-help tone");
  }

  return issues;
}
