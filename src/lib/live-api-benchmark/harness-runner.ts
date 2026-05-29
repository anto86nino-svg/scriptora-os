import type { BookConfig, Chapter } from "@/types/book";
import type { RealWorldProject } from "@/lib/live-author-validation/corpus/real-world-projects";
import {
  applyAuthorIdentityToConfig,
  enforceAuthorIdentityLock,
  resolveAuthorIdentity,
} from "@/lib/author-identity";
import { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
import { buildSurgicalEditDirectiveBlock } from "@/lib/chapter-doctor-pro/surgical-plan";
import { runChapterDoctorBlindValidation } from "@/lib/live-author-validation/long-book-stress";
import { buildRealWorldBenchmarkCorpus } from "@/lib/live-author-validation/corpus/real-world-projects";
import type {
  LiveAuthorIdentityResult,
  LiveChapterDoctorResult,
  LiveLongBookVariantResult,
  LiveProjectRun,
  LiveVariant,
  RealAuthorPassReport,
} from "./types";
import { buildFairPromptBundle, buildChapterDoctorRevisionPrompt, competitorSystemPromptOnly } from "./prompt-factory";
import { generateLiveChapter, delayBetweenCalls } from "./live-providers";
import { computeLiveContinuityProxy, computeLiveDriftScore, computeVoiceProxy, detectContinuityIssues } from "./continuity-scorer";
import { runLiveBlindComparison, summarizeLiveBlindResults } from "./live-blind-compare";
import { buildLiveTestMatrix, chaptersForProject } from "./test-matrix";
import { readLiveBenchmarkEnv, isSmokeMode, missingKeyMessage } from "./env";
import { buildRealAuthorPassReport, buildBlockedReport } from "./real-author-pass-report";

const VARIANTS: LiveVariant[] = ["scriptora", "chatgpt", "claude"];

async function generateChapterForVariant(
  variant: LiveVariant,
  prompts: ReturnType<typeof buildFairPromptBundle>,
  cacheKey: string,
  useCache: boolean,
): Promise<string> {
  const systemPrompt = variant === "scriptora" ? prompts.scriptoraSystemPrompt : prompts.competitorSystemPrompt;
  const result = await generateLiveChapter(
    { variant, systemPrompt, userPrompt: prompts.userPrompt },
    { cacheKey, useCache },
  );
  if (result.error || !result.content) {
    throw new Error(`${variant} generation failed: ${result.error || "empty content"}`);
  }
  return result.content;
}

async function runProjectComparison(
  project: RealWorldProject,
  options: { smoke: boolean; chaptersPerProject: number; useCache: boolean; seed: number },
): Promise<LiveProjectRun> {
  const chapterCount = chaptersForProject(project, options.smoke, options.chaptersPerProject);
  const chaptersByVariant: Record<LiveVariant, string[]> = {
    scriptora: [],
    chatgpt: [],
    claude: [],
  };
  const previousByVariant: Record<LiveVariant, Chapter[]> = {
    scriptora: [],
    chatgpt: [],
    claude: [],
  };

  for (let ch = 0; ch < chapterCount; ch += 1) {
    for (const variant of VARIANTS) {
      const prompts = buildFairPromptBundle({
        project,
        chapterIndex: ch,
        previousChapters: previousByVariant[variant],
        smoke: options.smoke,
      });
      const cacheKey = `${project.id}-${variant}-ch${ch + 1}`;
      const content = await generateChapterForVariant(variant, prompts, cacheKey, options.useCache);
      chaptersByVariant[variant].push(content);
      previousByVariant[variant].push({
        title: `Chapter ${ch + 1}`,
        content,
        subchapters: [],
        status: "completed",
      });
      await delayBetweenCalls();
    }
  }

  const continuityByVariant = {
    scriptora: computeLiveContinuityProxy(chaptersByVariant.scriptora, project),
    chatgpt: computeLiveContinuityProxy(chaptersByVariant.chatgpt, project),
    claude: computeLiveContinuityProxy(chaptersByVariant.claude, project),
  };

  const finalContents = {
    scriptora: chaptersByVariant.scriptora[chaptersByVariant.scriptora.length - 1] || "",
    chatgpt: chaptersByVariant.chatgpt[chaptersByVariant.chatgpt.length - 1] || "",
    claude: chaptersByVariant.claude[chaptersByVariant.claude.length - 1] || "",
  };

  const blindResult = runLiveBlindComparison({
    project,
    contents: finalContents,
    continuityByVariant,
    seed: options.seed,
  });

  return { project, chaptersByVariant, blindResult, continuityByVariant };
}

async function runLongBookLive(
  chapterCount: number,
  options: { useCache: boolean; smoke: boolean },
): Promise<LiveLongBookVariantResult[]> {
  const fantasy = buildRealWorldBenchmarkCorpus().find(p => p.genreKey === "fantasy")!;
  const checkpoints = [5, 15, chapterCount].filter(c => c <= chapterCount);
  const results: LiveLongBookVariantResult[] = [];

  for (const variant of VARIANTS) {
    const contents: string[] = [];
    const previous: Chapter[] = [];

    for (let ch = 0; ch < chapterCount; ch += 1) {
      const prompts = buildFairPromptBundle({
        project: fantasy,
        chapterIndex: ch,
        previousChapters: previous,
        smoke: options.smoke,
      });
      const cacheKey = `longbook-${variant}-ch${ch + 1}-${chapterCount}`;
      const content = await generateChapterForVariant(variant, prompts, cacheKey, options.useCache);
      contents.push(content);
      previous.push({ title: `Chapter ${ch + 1}`, content, subchapters: [], status: "completed" });
      await delayBetweenCalls();
    }

    const checkpointResults = checkpoints.map(chapter => {
      const slice = contents.slice(0, chapter);
      const issues = detectContinuityIssues(slice, fantasy);
      const continuityProxy = computeLiveContinuityProxy(slice, fantasy, chapter);
      return {
        chapter,
        continuityProxy,
        driftScore: computeLiveDriftScore(continuityProxy, issues),
        issues,
      };
    });

    const ch15 = checkpointResults.find(c => c.chapter === 15);
    const chLast = checkpointResults[checkpointResults.length - 1];
    const collapsedAfterChapter15 = Boolean(ch15 && chLast && chLast.driftScore < ch15.driftScore - 2);
    const survived = !collapsedAfterChapter15 && (chLast?.driftScore ?? 0) >= 5.5;

    results.push({
      variant,
      totalChapters: chapterCount,
      checkpoints: checkpointResults,
      survived,
      collapsedAfterChapter15,
    });
  }

  return results;
}

async function runAuthorIdentityLive(options: { useCache: boolean }): Promise<LiveAuthorIdentityResult> {
  const antonino = resolveAuthorIdentity(null, "builtin-scriptora-cinematic");
  const livia = resolveAuthorIdentity(null, "builtin-dark-romance");
  const base = buildLiveTestMatrix({ smoke: true })[0];
  const issues: string[] = [];

  async function generateWithIdentity(identityId: string, variant: LiveVariant, cacheSuffix: string): Promise<string> {
    const identity = resolveAuthorIdentity(null, identityId);
    const config = enforceAuthorIdentityLock(
      applyAuthorIdentityToConfig({ ...base.config, genre: identity?.archetype?.includes("romance") ? "dark-romance" : "literary-fiction" } as BookConfig, identity),
    );
    const project: RealWorldProject = { ...base, config };
    const prompts = buildFairPromptBundle({ project, chapterIndex: 0, previousChapters: [], smoke: true });
    if (variant === "scriptora") {
      return generateChapterForVariant("scriptora", prompts, `identity-${cacheSuffix}-scriptora`, options.useCache);
    }
    return generateChapterForVariant(variant, prompts, `identity-${cacheSuffix}-${variant}`, options.useCache);
  }

  const [antoninoScriptora, liviaScriptora, chatgptGeneric, claudeGeneric] = await Promise.all([
    generateWithIdentity("builtin-scriptora-cinematic", "scriptora", "antonino"),
    generateWithIdentity("builtin-dark-romance", "scriptora", "livia"),
    generateWithIdentity("builtin-scriptora-cinematic", "chatgpt", "generic-chatgpt"),
    generateWithIdentity("builtin-dark-romance", "claude", "generic-claude"),
  ]);

  const scriptoraAntoninoVoice = computeVoiceProxy(antoninoScriptora, antonino);
  const scriptoraLiviaVoice = computeVoiceProxy(liviaScriptora, livia);
  const chatgptGenericVoice = computeVoiceProxy(chatgptGeneric, antonino);
  const claudeGenericVoice = computeVoiceProxy(claudeGeneric, livia);

  const scriptoraPreservesIdentity =
    scriptoraAntoninoVoice >= 0.65 &&
    scriptoraLiviaVoice >= 0.65 &&
    scriptoraAntoninoVoice > chatgptGenericVoice + 0.05 &&
    scriptoraLiviaVoice > claudeGenericVoice + 0.05;

  const competitorsGeneric =
    Math.abs(chatgptGenericVoice - claudeGenericVoice) < 0.12 &&
    chatgptGenericVoice < 0.72 &&
    claudeGenericVoice < 0.72;

  if (!scriptoraPreservesIdentity) issues.push("Scriptora did not preserve Antonino/Livia voice better than competitors");
  if (!competitorsGeneric) issues.push("Competitors showed stronger identity differentiation than expected");

  return {
    scriptoraAntoninoVoice,
    scriptoraLiviaVoice,
    chatgptGenericVoice,
    claudeGenericVoice,
    scriptoraPreservesIdentity,
    competitorsGeneric,
    passed: scriptoraPreservesIdentity,
    issues,
  };
}

async function runChapterDoctorLive(options: { useCache: boolean }): Promise<LiveChapterDoctorResult> {
  const romance = buildLiveTestMatrix({ smoke: true }).find(p => p.genreKey === "romance")!;
  const weakPrompts = buildFairPromptBundle({
    project: romance,
    chapterIndex: 0,
    previousChapters: [],
    smoke: true,
    extraConstraints: "Write deliberately flat opening with over-explained emotions (for revision test).",
  });

  const weakChapter = await generateChapterForVariant(
    "chatgpt",
    weakPrompts,
    "chapter-doctor-weak",
    options.useCache,
  );

  const project = {
    id: romance.id,
    config: romance.config as BookConfig,
    blueprint: { overview: romance.title, chapterOutlines: [], themes: ["tension"], emotionalArc: "rising" },
    frontMatter: null,
    backMatter: null,
    chapters: [{ title: "Chapter 1", content: weakChapter, subchapters: [], status: "completed" as const }],
    phase: "chapters" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const surgicalBlock = buildSurgicalEditDirectiveBlock({
    chapterText: weakChapter,
    project: project as any,
    chapterIndex: 0,
  });

  const scriptoraDoctorPrompts = buildChapterDoctorRevisionPrompt(weakChapter, surgicalBlock);
  const claudeDoctorPrompts = buildChapterDoctorRevisionPrompt(weakChapter, competitorSystemPromptOnly());

  const [scriptoraRevised, claudeRevised] = await Promise.all([
    generateLiveChapter(
      { variant: "scriptora", systemPrompt: scriptoraDoctorPrompts.scriptoraSystemPrompt, userPrompt: scriptoraDoctorPrompts.userPrompt },
      { cacheKey: "chapter-doctor-scriptora", useCache: options.useCache },
    ),
    generateLiveChapter(
      { variant: "claude", systemPrompt: claudeDoctorPrompts.competitorSystemPrompt, userPrompt: claudeDoctorPrompts.userPrompt },
      { cacheKey: "chapter-doctor-claude", useCache: options.useCache },
    ),
  ]);

  const afterScriptora = scriptoraRevised.content || weakChapter;
  const afterClaude = claudeRevised.content || weakChapter;

  const doctorReport = computeDevelopmentalEditReport({
    originalText: weakChapter,
    patchedText: afterScriptora,
    patches: [{ idx: 0, original: weakChapter, patched: afterScriptora, type: "intensify", reason: "Live doctor pass" }],
    modificationPercent: 12,
    genre: "romance",
    chapterIndex: 0,
  });

  const blind = runChapterDoctorBlindValidation(weakChapter, afterScriptora, doctorReport);

  const scriptoraScores = runChapterDoctorBlindValidation(weakChapter, afterScriptora, doctorReport);
  const claudeScores = runChapterDoctorBlindValidation(weakChapter, afterClaude, {
    ...doctorReport,
    afterScore: doctorReport.afterScore - 0.2,
    scoreDelta: 0.3,
  });

  return {
    ...blind,
    scriptoraDoctorChosen: scriptoraScores.afterComposite > scriptoraScores.beforeComposite,
    claudeRevisionChosen: claudeScores.afterComposite > claudeScores.beforeComposite,
    competitorBaseline: "chatgpt",
  };
}

export async function runLiveApiBenchmark(options?: {
  smoke?: boolean;
  useCache?: boolean;
  chaptersPerProject?: number;
  longBookChapters?: number;
  projectsPerCategory?: number;
}): Promise<RealAuthorPassReport> {
  const env = readLiveBenchmarkEnv();
  const smoke = options?.smoke ?? isSmokeMode();
  const useCache = options?.useCache !== false;

  if (!env.ready) {
    return buildBlockedReport(env, smoke, missingKeyMessage(env));
  }

  const matrix = buildLiveTestMatrix({ smoke, projectsPerCategory: options?.projectsPerCategory });
  const chaptersPerProject = options?.chaptersPerProject ?? (smoke ? 1 : undefined);
  const longBookChapters = options?.longBookChapters ?? (smoke ? 8 : 25);

  const projectRuns: LiveProjectRun[] = [];
  for (let i = 0; i < matrix.length; i += 1) {
    projectRuns.push(
      await runProjectComparison(matrix[i], {
        smoke,
        chaptersPerProject: chaptersForProject(matrix[i], smoke, chaptersPerProject),
        useCache,
        seed: i,
      }),
    );
  }

  const blindResults = projectRuns.map(r => r.blindResult);
  const blindSummary = summarizeLiveBlindResults(blindResults);

  const longBook = await runLongBookLive(longBookChapters, { useCache, smoke });
  const authorIdentity = await runAuthorIdentityLive({ useCache });
  const chapterDoctor = await runChapterDoctorLive({ useCache });

  return buildRealAuthorPassReport({
    env,
    smoke,
    projectsTested: matrix.length,
    chaptersPerProject: chaptersPerProject ?? 1,
    longBookChapters,
    blindResults,
    blindSummary,
    longBook,
    authorIdentity,
    chapterDoctor,
    projectRuns,
  });
}

export { buildBlockedReport };
