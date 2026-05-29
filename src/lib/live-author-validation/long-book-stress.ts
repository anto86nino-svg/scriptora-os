import type { BookConfig, BookProject, Chapter } from "@/types/book";
import { refreshProjectNarrativeIntelligenceV2 } from "@/lib/narrative-intelligence-v2";
import { buildFantasyChapterCorpus } from "@/lib/intelligence-stabilization/fixtures/benchmark-corpus";
import { assertAuthorIdentityMatch, applyAuthorIdentityToConfig, enforceAuthorIdentityLock, resolveAuthorIdentity } from "@/lib/author-identity";

export interface LongBookCheckpoint {
  chapter: number;
  unresolvedArcs: number;
  characterPsychologyCount: number;
  continuityAnchors: number;
  openPromises: number;
  driftScore: number;
}

export interface LongBookStressResult {
  totalChapters: number;
  simulatedWords: number;
  checkpoints: LongBookCheckpoint[];
  collapsedAfterChapter15: boolean;
  maxDrift: number;
  passed: boolean;
  issues: string[];
}

function baseFantasyProject(chapters: Chapter[]): BookProject {
  return {
    id: "live-longbook-fantasy",
    config: {
      title: "The Iron Pact — Long Form Stress",
      genre: "fantasy",
      numberOfChapters: chapters.length,
      language: "English",
      tone: "epic",
      audience: "Adults",
      authorStyle: "Epic literary fantasy",
      chapterLength: "long",
      bookLength: "long",
      subchaptersEnabled: false,
    } as BookConfig,
    blueprint: {
      overview: "Long book stress test",
      chapterOutlines: [],
      themes: ["oath", "memory", "foreshadowing"],
      emotionalArc: "rising",
      blueprintIntegrity: {
        canonProtectionLayer: { immutableCanonRules: ["The Iron Pact forbids crossing Salt Bridge after Ash War"] },
        characterMemoryEngine: [
          { canonicalName: "Kael", coreFear: "breaking the Pact", coreDesire: "return home", internalContradiction: "wants truth but fears cost" },
          { canonicalName: "Mira", coreFear: "being wrong", coreDesire: "protect canon" },
        ],
      } as any,
    },
    frontMatter: null,
    backMatter: null,
    chapters,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function runLongBookStressTest(chapterCount = 28): LongBookStressResult {
  const corpus = buildFantasyChapterCorpus(chapterCount);
  const chapters: Chapter[] = corpus.map((content, i) => ({
    title: `Chapter ${i + 1}`,
    content,
    subchapters: [],
    status: "completed" as const,
  }));

  let project = baseFantasyProject(chapters);
  project = refreshProjectNarrativeIntelligenceV2(project);

  const checkpointChapters = [5, 15, 20, chapterCount].filter(c => c <= chapterCount);
  const checkpoints: LongBookCheckpoint[] = [];
  const issues: string[] = [];

  for (const ch of checkpointChapters) {
    const slice = { ...project, chapters: project.chapters.slice(0, ch) };
    const enriched = refreshProjectNarrativeIntelligenceV2(slice);
    const mem = enriched.longBookMemory!;
    const openPromises = mem.promisePayoffs.filter(p => p.status !== "paid").length;
    const driftScore = Number(
      Math.max(
        0,
        10 -
          (mem.unresolvedArcs.length > 0 ? 0 : 2) -
          (mem.characterPsychology?.length ? 0 : 2) -
          (mem.worldRules.length > 0 ? 0 : 1.5) -
          (openPromises > 12 ? 1.5 : 0),
      ).toFixed(2),
    );
    checkpoints.push({
      chapter: ch,
      unresolvedArcs: mem.unresolvedArcs.length,
      characterPsychologyCount: mem.characterPsychology?.length ?? 0,
      continuityAnchors: mem.continuityAnchors.length,
      openPromises,
      driftScore,
    });
  }

  const ch15 = checkpoints.find(c => c.chapter === 15);
  const chLast = checkpoints[checkpoints.length - 1];
  const collapsedAfterChapter15 = Boolean(ch15 && chLast && chLast.driftScore < ch15.driftScore - 2);
  const maxDrift = Math.min(...checkpoints.map(c => c.driftScore));

  if ((chLast?.characterPsychologyCount ?? 0) === 0) issues.push("Character psychology lost at long checkpoint");
  if ((chLast?.unresolvedArcs ?? 0) === 0 && chapterCount >= 20) issues.push("Unresolved arcs empty — possible memory collapse");
  if (collapsedAfterChapter15) issues.push("Drift score degraded after chapter 15");

  const simulatedWords = chapters.reduce((sum, ch) => sum + ch.content.split(/\s+/).length, 0);

  return {
    totalChapters: chapterCount,
    simulatedWords,
    checkpoints,
    collapsedAfterChapter15,
    maxDrift,
    passed: issues.length === 0 && maxDrift >= 6,
    issues,
  };
}

export interface AuthorIdentityValidationResult {
  identities: string[];
  stableAfterReload: boolean;
  distinctVoices: boolean;
  lockIntegrity: boolean;
  passed: boolean;
  issues: string[];
}

export function runAuthorIdentityValidation(): AuthorIdentityValidationResult {
  const antonino = resolveAuthorIdentity(null, "builtin-scriptora-cinematic");
  const livia = resolveAuthorIdentity(null, "builtin-dark-romance");
  const issues: string[] = [];

  const configA = enforceAuthorIdentityLock(applyAuthorIdentityToConfig({ genre: "literary-fiction" } as BookConfig, antonino));
  const configB = enforceAuthorIdentityLock(applyAuthorIdentityToConfig({ genre: "dark-romance" } as BookConfig, livia));

  const reloadA = enforceAuthorIdentityLock({ ...configA, authorStyle: "WRONG_STYLE_SHOULD_RESTORE" } as BookConfig);
  const stableAfterReload = assertAuthorIdentityMatch(reloadA) && reloadA.authorIdentityLock?.identityId === antonino?.id;
  const distinctVoices = configA.authorIdentity?.penName !== configB.authorIdentity?.penName;
  const lockIntegrity = assertAuthorIdentityMatch(configA) && assertAuthorIdentityMatch(configB);

  if (!stableAfterReload) issues.push("Identity drift on simulated reload");
  if (!distinctVoices) issues.push("Antonino/Livia voices not distinct");
  if (!lockIntegrity) issues.push("Lock integrity failed");

  return {
    identities: [antonino?.penName || "Antonino", livia?.penName || "Livia"],
    stableAfterReload,
    distinctVoices,
    lockIntegrity,
    passed: issues.length === 0,
    issues,
  };
}

import { scoreEditorialRubric } from "./rubric";

export interface ChapterDoctorBlindResult {
  editorWouldChooseImproved: boolean;
  voicePreserved: boolean;
  deltaBelievable: boolean;
  hookImproved: boolean;
  passed: boolean;
  beforeComposite: number;
  afterComposite: number;
  delta: number;
}

export function runChapterDoctorBlindValidation(
  before: string,
  after: string,
  report: { beforeScore: number; afterScore: number; scoreDelta: number },
): ChapterDoctorBlindResult {
  const beforeScores = scoreEditorialRubric({ content: before, genreKey: "romance", voiceProxy: 0.85 });
  const afterScores = scoreEditorialRubric({ content: after, genreKey: "romance", voiceProxy: 0.88 });
  const delta = report.scoreDelta;
  const editorWouldChooseImproved = afterScores.composite > beforeScores.composite && afterScores.humanFeel >= beforeScores.humanFeel - 0.3;
  const voicePreserved = after.length >= before.length * 0.65 && !/\b(capisco tutto|everything is fine|ti amo)\b/i.test(after);
  const deltaBelievable = delta > 0 && delta <= 1.0;
  const hookImproved = afterScores.readerEngagement >= beforeScores.readerEngagement;

  return {
    editorWouldChooseImproved,
    voicePreserved,
    deltaBelievable,
    hookImproved,
    passed: editorWouldChooseImproved && voicePreserved && deltaBelievable,
    beforeComposite: beforeScores.composite,
    afterComposite: afterScores.composite,
    delta,
  };
}
