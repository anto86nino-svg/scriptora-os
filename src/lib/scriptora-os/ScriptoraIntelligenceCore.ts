import { computeBookEditorialDashboard, type BookEditorialDashboard } from "@/lib/editorial-dashboard-pro";
import { analyzeExportPreflight, countExportWords, type ExportPreflightReport } from "@/lib/export-quality-engine";
import { buildLongBookMemoryWithPsychology } from "@/lib/narrative-intelligence-v2";
import {
  buildNarrativeMemoryCore,
  generateSupremeMemoryReport,
  type NarrativeMemoryCoreSnapshot,
  type SupremeMemoryReport,
} from "@/lib/narrative-memory-core";
import {
  analyzeManuscriptPublishingIntel,
  type ManuscriptPublishingIntel,
} from "@/lib/publishing-intelligence";
import { isProjectComplete } from "@/lib/project-status";
import { getBookTotalWords, type AuthorIdentity, type BookProject, type Chapter } from "@/types/book";

export type EditorialGrade =
  | "Draft"
  | "Promising"
  | "Strong"
  | "Publication-Ready"
  | "Needs Deep Edit";

export type ScriptoraPlanAwareness = "free" | "beta" | "pro" | "premium" | string;

export interface ScriptoraCreditStatus {
  availableCredits?: number;
  simulated?: boolean;
}

export interface BookMemoryProSnapshot {
  core: NarrativeMemoryCoreSnapshot;
  report: SupremeMemoryReport;
  canonFacts: string[];
  characterStates: Array<{
    name: string;
    role?: string;
    emotionalState: string;
    wound: string;
    contradiction?: string;
    lastSeenChapter?: number;
  }>;
  unresolvedThreads: string[];
  alreadyUsedBeats: string[];
  styleGuide: {
    language: string;
    genre: string;
    tone: string;
    authorStyle: string;
  };
  continuityWarnings: string[];
  contradictionRisks: string[];
  nextNarrativePromises: string[];
  avoidRepeating: string[];
}

export interface BookDoctorChapterReport {
  chapter: number;
  title: string;
  score: number;
  issueCount: number;
  readerDropRisk: boolean;
  repeatedBeatRisk: boolean;
  tension: number | null;
}

export interface SurgicalFixRecommendation {
  severity: "low" | "medium" | "high" | "critical";
  problemType: string;
  chapter?: number;
  whyItMatters: string;
  intervention: string;
  automaticSafe: boolean;
}

export interface BookDoctorProReport {
  dataStatus: "ready" | "insufficient-manuscript";
  overallScore: number | null;
  editorialGrade: EditorialGrade;
  topStrengths: string[];
  topRisks: string[];
  criticalIssues: string[];
  chapterReports: BookDoctorChapterReport[];
  characterNotes: string[];
  pacingMap: Array<{ chapter: number; value: number }>;
  tensionMap: Array<{ chapter: number; value: number }>;
  readerDropRisk: number | null;
  commercialReadability: number | null;
  genreFitScore: number | null;
  recommendedNextActions: SurgicalFixRecommendation[];
  surgicalFixPlan: SurgicalFixRecommendation[];
  kdpPositioningNotes: string[];
}

export interface AutonomousEditorialPlan {
  executiveSummary: string;
  preserveAtAllCosts: string[];
  topFiveCriticalFixes: SurgicalFixRecommendation[];
  chapterByChapterPlan: SurgicalFixRecommendation[];
  characterArcPlan: string[];
  pacingPlan: string[];
  commercialPlan: string[];
  suggestedEditingOrder: string[];
  estimatedImpactScore: number | null;
  readinessAfterFixes: number | null;
}

export interface KdpReadinessSnapshot {
  dataStatus: "ready" | "insufficient-manuscript";
  score: number | null;
  titleFitScore: number | null;
  subtitleFitScore: number | null;
  blurbFitScore: number | null;
  categoryFitScore: number | null;
  keywordFitScore: number | null;
  coverBriefFitScore: number | null;
  commercialPromiseClarity: number | null;
  manuscriptMarketAlignment: number | null;
  recommendedFixes: string[];
  metadataChecklist: Array<{ id: string; ok: boolean }>;
}

export interface NextBestAction {
  labelKey: string;
  reasonKey: string;
  ctaKey: string;
  priority: "low" | "medium" | "high";
  targetArea: "editor" | "diagnostics" | "cover" | "kdp" | "export";
  actionType: "route";
  route: string;
  chapterIndex?: number;
  blockedReason?: string;
  creditCost?: number;
}

export interface ScriptoraIntelligenceSnapshot {
  dataStatus: "ready" | "insufficient-manuscript";
  bookHealthScore: number | null;
  publicationReadinessScore: number;
  editorialGrade: EditorialGrade;
  nextBestAction: NextBestAction;
  bookDoctorSummary: BookDoctorProReport;
  chapterRiskMap: BookDoctorChapterReport[];
  characterMemory: BookMemoryProSnapshot["characterStates"];
  continuityWarnings: string[];
  repetitionWarnings: string[];
  kdpReadiness: KdpReadinessSnapshot;
  exportReadiness: ExportPreflightReport;
  creditWarnings: string[];
  recommendedWorkflow: string[];
  lockedActions: string[];
  bookMemory: BookMemoryProSnapshot;
  editorialPlan: AutonomousEditorialPlan;
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isRealTitle(value?: string): boolean {
  const title = String(value || "").trim().toLowerCase();
  return !!title && title !== "untitled" && title !== "senza titolo";
}

function chapterText(chapter: Chapter): string {
  const subchapters = (chapter.subchapters || []).map((sub) => sub.content).join("\n\n");
  return `${chapter.content || ""}\n\n${subchapters}`.trim();
}

function chaptersWithText(project: BookProject): Array<{ chapter: Chapter; index: number; text: string }> {
  return (project.chapters || [])
    .map((chapter, index) => ({ chapter, index, text: chapterText(chapter) }))
    .filter((item) => item.text.length >= 40);
}

function fullManuscript(project: BookProject): string {
  return chaptersWithText(project).map((item) => item.text).join("\n\n");
}

function repeatedEmotionalBeats(project: BookProject): string[] {
  const manuscript = fullManuscript(project).toLowerCase();
  const beatPatterns: Array<[string, RegExp]> = [
    ["fear confession", /\b(?:ho paura|i(?:'|’)m afraid|sono terrorizzat[oa]|scared of losing)\b/g],
    ["loss confession", /\b(?:non voglio perderti|don(?:'|’)t want to lose you)\b/g],
    ["one day at a time promise", /\b(?:un giorno alla volta|one day at a time)\b/g],
    ["tearful embrace", /\b(?:abbracci[òoa]|held (?:him|her)|tra le lacrime|through tears)\b/g],
    ["intimate breakfast", /\b(?:colazione|breakfast)\b/g],
    ["feeling at home", /\b(?:mi sento a casa|felt like home|feel at home)\b/g],
  ];

  return beatPatterns
    .filter(([, pattern]) => (manuscript.match(pattern) || []).length >= 2)
    .map(([label]) => label);
}

function editorialGrade(score: number | null, issueCount: number): EditorialGrade {
  if (score == null) return "Draft";
  if (issueCount >= 4 || score < 48) return "Needs Deep Edit";
  if (score >= 82 && issueCount <= 1) return "Publication-Ready";
  if (score >= 70) return "Strong";
  if (score >= 56) return "Promising";
  return "Draft";
}

export function buildBookMemory(project: BookProject): BookMemoryProSnapshot {
  const longBookMemory = buildLongBookMemoryWithPsychology({
    config: project.config,
    blueprint: project.blueprint,
    chapters: project.chapters,
    existingMemory: project.longBookMemory,
  });
  const core = buildNarrativeMemoryCore({
    config: project.config,
    blueprint: project.blueprint,
    chapters: project.chapters,
  });
  const report = generateSupremeMemoryReport(core);
  const usedBeats = repeatedEmotionalBeats(project);

  const canonFacts = [
    ...longBookMemory.worldRules.map((item) => item.rule),
    ...longBookMemory.continuityAnchors,
  ].filter(Boolean);
  const unresolvedThreads = [
    ...longBookMemory.unresolvedArcs.map((item) => item.description),
    ...core.incompleteArcs,
  ].filter(Boolean);
  const contradictionRisks = core.items
    .filter((item) => item.status === "BROKEN")
    .map((item) => item.label);

  return {
    core,
    report,
    canonFacts: Array.from(new Set(canonFacts)).slice(0, 20),
    characterStates: longBookMemory.characterStates.map((character) => {
      const psychology = longBookMemory.characterPsychology?.find(
        (profile) => profile.name.toLowerCase() === character.name.toLowerCase(),
      );
      return {
        name: character.name,
        role: character.role,
        emotionalState: character.emotionalState,
        wound: psychology?.woundLabel || character.traumaState,
        contradiction: psychology?.contradiction,
        lastSeenChapter: character.lastSeenChapter,
      };
    }),
    unresolvedThreads: Array.from(new Set(unresolvedThreads)).slice(0, 16),
    alreadyUsedBeats: usedBeats,
    styleGuide: {
      language: project.config.language,
      genre: project.config.genre,
      tone: project.config.tone,
      authorStyle: project.config.authorStyle,
    },
    continuityWarnings: report.warnings,
    contradictionRisks,
    nextNarrativePromises: core.items
      .filter((item) => item.status === "OPEN" || item.status === "ACTIVE")
      .map((item) => item.label)
      .slice(0, 8),
    avoidRepeating: usedBeats,
  };
}

function publishingIntelFor(project: BookProject): ManuscriptPublishingIntel | null {
  const chapters = chaptersWithText(project);
  const manuscript = chapters.map((item) => item.text).join("\n\n");
  if (manuscript.split(/\s+/).filter(Boolean).length < 80) return null;
  return analyzeManuscriptPublishingIntel({
    fullText: manuscript,
    chapters: chapters.map((item) => ({
      title: item.chapter.title || `Chapter ${item.index + 1}`,
      content: item.text,
    })),
    genre: project.config.genre,
    language: project.config.language,
  });
}

export function analyzeKdpReadiness(input: {
  project: BookProject;
  publishingIntel: ManuscriptPublishingIntel | null;
  hasCover: boolean;
}): KdpReadinessSnapshot {
  const { project, publishingIntel, hasCover } = input;
  const title = project.config.title?.trim();
  const subtitle = project.config.subtitle?.trim();
  const hasCategory = !!project.config.category?.trim();
  const hasSubcategory = !!project.config.subcategory?.trim();
  const hasAuthor = !!(
    project.config.authorIdentity?.penName ||
    project.config.authorName ||
    project.config.author
  );
  const hasManuscript = !!publishingIntel;

  const metadataChecklist = [
    { id: "title", ok: isRealTitle(title) },
    { id: "subtitle", ok: !!subtitle },
    { id: "category", ok: hasCategory },
    { id: "subcategory", ok: hasSubcategory },
    { id: "author", ok: hasAuthor },
    { id: "cover", ok: hasCover },
  ];

  if (!hasManuscript) {
    return {
      dataStatus: "insufficient-manuscript",
      score: null,
      titleFitScore: null,
      subtitleFitScore: null,
      blurbFitScore: null,
      categoryFitScore: null,
      keywordFitScore: null,
      coverBriefFitScore: hasCover ? 100 : null,
      commercialPromiseClarity: null,
      manuscriptMarketAlignment: null,
      recommendedFixes: ["Complete at least one manuscript section before measuring market alignment."],
      metadataChecklist,
    };
  }

  const market = publishingIntel.marketReadiness.score;
  const hook = publishingIntel.hook.chapterOneScore;
  const categoryFit = hasCategory && hasSubcategory ? 82 : hasCategory ? 64 : 38;
  const titleFit = isRealTitle(title)
    ? clamp100((hook + market) / 2)
    : 20;
  const subtitleFit = subtitle ? clamp100((titleFit + market) / 2) : 30;
  const coverFit = hasCover ? 82 : 32;
  const score = clamp100(
    titleFit * 0.22 +
    subtitleFit * 0.14 +
    categoryFit * 0.16 +
    hook * 0.18 +
    market * 0.2 +
    coverFit * 0.1,
  );

  const recommendedFixes: string[] = [];
  if (!metadataChecklist[0].ok) recommendedFixes.push("Choose a real title aligned with the manuscript promise.");
  if (!subtitle) recommendedFixes.push("Add a subtitle or tagline that sharpens the reader promise.");
  if (!hasCategory || !hasSubcategory) recommendedFixes.push("Complete category positioning before publication.");
  if (!hasCover) recommendedFixes.push("Create a cover direction that matches the manuscript genre.");
  if (!publishingIntel.genreExpectation.aligned) recommendedFixes.push(publishingIntel.genreExpectation.message);

  return {
    dataStatus: "ready",
    score,
    titleFitScore: titleFit,
    subtitleFitScore: subtitleFit,
    blurbFitScore: null,
    categoryFitScore: categoryFit,
    keywordFitScore: null,
    coverBriefFitScore: coverFit,
    commercialPromiseClarity: hook,
    manuscriptMarketAlignment: market,
    recommendedFixes,
    metadataChecklist,
  };
}

function chapterRiskReports(
  project: BookProject,
  dashboard: BookEditorialDashboard | null,
): BookDoctorChapterReport[] {
  const populated = chaptersWithText(project);
  return populated.map(({ chapter, index }) => {
    const chapterNumber = index + 1;
    const warnings = dashboard?.warnings.filter((warning) => warning.chapter === chapterNumber) || [];
    const heat = dashboard?.emotionalHeatmap.find((point) => point.chapter === chapterNumber);
    const tension = dashboard?.tensionCurve.find((point) => point.chapter === chapterNumber);
    const score = clamp100(
      (heat ? heat.intensity * 10 : 58) * 0.55 +
      (tension ? tension.tension * 100 : 58) * 0.45 -
      warnings.length * 7,
    );
    return {
      chapter: chapterNumber,
      title: chapter.title || `Chapter ${chapterNumber}`,
      score,
      issueCount: warnings.length,
      readerDropRisk: !!dashboard?.dropRiskChapters.includes(chapterNumber),
      repeatedBeatRisk: warnings.some((warning) => warning.code === "emotional-repetition"),
      tension: tension ? clamp100(tension.tension * 100) : null,
    };
  });
}

export function analyzeBookDoctorPro(input: {
  project: BookProject;
  bookMemory: BookMemoryProSnapshot;
  publishingIntel: ManuscriptPublishingIntel | null;
}): BookDoctorProReport {
  const { project, bookMemory, publishingIntel } = input;
  const dashboard = computeBookEditorialDashboard(project);
  const chapterReports = chapterRiskReports(project, dashboard);

  if (!publishingIntel) {
    return {
      dataStatus: "insufficient-manuscript",
      overallScore: null,
      editorialGrade: "Draft",
      topStrengths: [],
      topRisks: [],
      criticalIssues: [],
      chapterReports,
      characterNotes: bookMemory.characterStates.map((character) => `${character.name}: ${character.emotionalState}`),
      pacingMap: [],
      tensionMap: [],
      readerDropRisk: null,
      commercialReadability: null,
      genreFitScore: null,
      recommendedNextActions: [],
      surgicalFixPlan: [],
      kdpPositioningNotes: [],
    };
  }

  const memoryScore = bookMemory.report.narrativeHealth;
  const commercial = dashboard?.commercial.composite ?? publishingIntel.marketReadiness.score;
  const overallScore = clamp100(
    publishingIntel.marketReadiness.score * 0.42 +
    memoryScore * 0.28 +
    commercial * 0.3,
  );
  const highRisk = dashboard?.warnings.filter((warning) => warning.severity === "high") || [];
  const repeated = dashboard?.warnings.filter((warning) => warning.code === "emotional-repetition") || [];
  const criticalIssues = [
    ...bookMemory.contradictionRisks.map((risk) => `Continuity: ${risk}`),
    ...highRisk.map((risk) => `Chapter ${risk.chapter}: ${risk.message}`),
  ];
  const topRisks = [
    ...bookMemory.continuityWarnings,
    ...(dashboard?.warnings.map((warning) => `Chapter ${warning.chapter}: ${warning.message}`) || []),
    ...publishingIntel.dropRiskMap.map((risk) => `Chapter ${risk.chapter}: ${risk.message}`),
  ];
  const topStrengths = [
    ...(publishingIntel.hook.chapterOneScore >= 65 ? ["Opening carries clear reader pull."] : []),
    ...(publishingIntel.marketReadiness.score >= 65 ? ["Commercial readability is aligned with the manuscript."] : []),
    ...(memoryScore >= 75 ? ["Narrative memory remains coherent across indexed chapters."] : []),
    ...(dashboard?.commercial.sceneTension && dashboard.commercial.sceneTension >= 60
      ? ["Scene tension sustains forward movement."]
      : []),
  ];
  const surgicalFixPlan: SurgicalFixRecommendation[] = [
    ...highRisk.map((risk) => ({
      severity: "critical" as const,
      problemType: risk.code,
      chapter: risk.chapter,
      whyItMatters: risk.message,
      intervention: "Open Chapter Doctor and review a surgical edit before applying any text change.",
      automaticSafe: false,
    })),
    ...repeated.map((risk) => ({
      severity: "high" as const,
      problemType: "repeated-emotional-beat",
      chapter: risk.chapter,
      whyItMatters: risk.message,
      intervention: "Keep the strongest beat and replace repetition with a consequence or choice.",
      automaticSafe: false,
    })),
  ].slice(0, 8);

  return {
    dataStatus: "ready",
    overallScore,
    editorialGrade: editorialGrade(overallScore, criticalIssues.length),
    topStrengths,
    topRisks: Array.from(new Set(topRisks)).slice(0, 8),
    criticalIssues: Array.from(new Set(criticalIssues)).slice(0, 6),
    chapterReports,
    characterNotes: bookMemory.characterStates.map((character) =>
      `${character.name}: ${character.emotionalState}${character.contradiction ? ` · ${character.contradiction}` : ""}`,
    ),
    pacingMap: dashboard?.commercial
      ? chapterReports.map((report) => ({ chapter: report.chapter, value: report.score }))
      : [],
    tensionMap: dashboard?.tensionCurve.map((point) => ({
      chapter: point.chapter,
      value: clamp100(point.tension * 100),
    })) || [],
    readerDropRisk: publishingIntel.dropRiskMap.length,
    commercialReadability: publishingIntel.marketReadiness.score,
    genreFitScore: publishingIntel.genreExpectation.aligned ? 82 : 52,
    recommendedNextActions: surgicalFixPlan,
    surgicalFixPlan,
    kdpPositioningNotes: [
      publishingIntel.hook.explanation,
      publishingIntel.genreExpectation.message,
    ],
  };
}

export function generateAutonomousEditorialPlan(input: {
  bookDoctorReport: BookDoctorProReport;
  bookMemory: BookMemoryProSnapshot;
}): AutonomousEditorialPlan {
  const { bookDoctorReport, bookMemory } = input;
  const fixes = bookDoctorReport.surgicalFixPlan;
  return {
    executiveSummary:
      bookDoctorReport.dataStatus === "ready"
        ? `${fixes.length} priority editorial intervention(s) detected from the current manuscript.`
        : "Write or import manuscript pages before Scriptora can build a reliable editorial plan.",
    preserveAtAllCosts: [
      ...bookDoctorReport.topStrengths,
      ...bookMemory.canonFacts.slice(0, 3),
    ].slice(0, 5),
    topFiveCriticalFixes: fixes.slice(0, 5),
    chapterByChapterPlan: fixes,
    characterArcPlan: bookMemory.characterStates.map((character) =>
      `${character.name}: preserve ${character.emotionalState} continuity${character.contradiction ? ` and the contradiction "${character.contradiction}"` : ""}.`,
    ),
    pacingPlan: bookDoctorReport.topRisks.filter((risk) => /chapter|pacing|momentum|drop/i.test(risk)).slice(0, 5),
    commercialPlan: bookDoctorReport.kdpPositioningNotes,
    suggestedEditingOrder: fixes.map((fix) =>
      fix.chapter ? `Chapter ${fix.chapter}: ${fix.problemType}` : fix.problemType,
    ),
    estimatedImpactScore: fixes.length ? Math.min(18, fixes.length * 3) : 0,
    readinessAfterFixes:
      bookDoctorReport.overallScore == null
        ? null
        : clamp100(bookDoctorReport.overallScore + Math.min(18, fixes.length * 3)),
  };
}

export function getNextBestAction(input: {
  project: BookProject;
  bookDoctorReport: BookDoctorProReport;
  kdpReadiness: KdpReadinessSnapshot;
  exportReadiness: ExportPreflightReport;
  hasCover: boolean;
}): NextBestAction {
  const { project, bookDoctorReport, kdpReadiness, exportReadiness, hasCover } = input;
  const populated = chaptersWithText(project);

  if (!isRealTitle(project.config.title)) {
    return {
      labelKey: "os_core_action_title",
      reasonKey: "os_core_reason_title",
      ctaKey: "os_core_cta_open_editor",
      priority: "high",
      targetArea: "editor",
      actionType: "route",
      route: "/app?open=book-title",
    };
  }
  if (!project.blueprint?.overview?.trim()) {
    return {
      labelKey: "os_core_action_blueprint",
      reasonKey: "os_core_reason_blueprint",
      ctaKey: "os_core_cta_open_editor",
      priority: "high",
      targetArea: "editor",
      actionType: "route",
      route: "/app",
    };
  }
  if (populated.length === 0) {
    return {
      labelKey: "os_core_action_first_chapter",
      reasonKey: "os_core_reason_first_chapter",
      ctaKey: "os_core_cta_write",
      priority: "high",
      targetArea: "editor",
      actionType: "route",
      route: "/app",
      chapterIndex: 0,
    };
  }

  const highestRisk = bookDoctorReport.chapterReports.find(
    (chapter) => chapter.readerDropRisk || chapter.repeatedBeatRisk || chapter.issueCount >= 2,
  );
  if (highestRisk) {
    return {
      labelKey: "os_core_action_fix_chapter",
      reasonKey: "os_core_reason_fix_chapter",
      ctaKey: "os_core_cta_open_doctor",
      priority: "high",
      targetArea: "diagnostics",
      actionType: "route",
      route: "/app",
      chapterIndex: Math.max(0, highestRisk.chapter - 1),
    };
  }

  if (!isProjectComplete(project)) {
    const nextIndex = Math.min(populated.length, Math.max(0, project.config.numberOfChapters - 1));
    return {
      labelKey: "os_core_action_continue",
      reasonKey: "os_core_reason_continue",
      ctaKey: "os_core_cta_write",
      priority: "high",
      targetArea: "editor",
      actionType: "route",
      route: "/app",
      chapterIndex: nextIndex,
    };
  }
  if (!hasCover) {
    return {
      labelKey: "os_core_action_cover",
      reasonKey: "os_core_reason_cover",
      ctaKey: "os_core_cta_cover",
      priority: "high",
      targetArea: "cover",
      actionType: "route",
      route: "/dashboard?open=cover-studio",
    };
  }
  if ((kdpReadiness.score ?? 0) < 70) {
    return {
      labelKey: "os_core_action_kdp",
      reasonKey: "os_core_reason_kdp",
      ctaKey: "os_core_cta_kdp",
      priority: "medium",
      targetArea: "kdp",
      actionType: "route",
      route: "/kdp-launch",
    };
  }
  return {
    labelKey: "os_core_action_export",
    reasonKey: exportReadiness.score >= 75 ? "os_core_reason_export_ready" : "os_core_reason_export_review",
    ctaKey: "os_core_cta_export",
    priority: exportReadiness.score >= 75 ? "medium" : "high",
    targetArea: "export",
    actionType: "route",
    route: "/dashboard?open=export-studio",
  };
}

export function buildScriptoraIntelligenceSnapshot(input: {
  project: BookProject;
  chapters?: Chapter[];
  manuscript?: string;
  authorIdentity?: AuthorIdentity | null;
  plan?: ScriptoraPlanAwareness;
  creditStatus?: ScriptoraCreditStatus | null;
  kdpData?: unknown;
  exportStatus?: unknown;
  coverStatus?: boolean;
}): ScriptoraIntelligenceSnapshot {
  const project = input.project;
  const hasCover = !!input.coverStatus;
  const bookMemory = buildBookMemory(project);
  const publishingIntel = publishingIntelFor(project);
  const exportReadiness = analyzeExportPreflight(project, { hasCover });
  const kdpReadiness = analyzeKdpReadiness({ project, publishingIntel, hasCover });
  const bookDoctorSummary = analyzeBookDoctorPro({ project, bookMemory, publishingIntel });
  const editorialPlan = generateAutonomousEditorialPlan({ bookDoctorReport: bookDoctorSummary, bookMemory });
  const nextBestAction = getNextBestAction({
    project,
    bookDoctorReport: bookDoctorSummary,
    kdpReadiness,
    exportReadiness,
    hasCover,
  });
  const targetWords = getBookTotalWords(project.config);
  const manuscriptWords = countExportWords(project);
  const publicationReadinessScore = clamp100(
    exportReadiness.score * 0.7 +
    (targetWords > 0 ? Math.min(100, (manuscriptWords / targetWords) * 100) : 0) * 0.3,
  );
  const creditWarnings: string[] = [];
  if (input.creditStatus?.simulated) creditWarnings.push("DEV simulated credits active.");
  if (
    typeof input.creditStatus?.availableCredits === "number" &&
    input.creditStatus.availableCredits < 20
  ) {
    creditWarnings.push("Credit balance is low for advanced editorial actions.");
  }
  const lockedActions = input.plan === "free"
    ? ["advanced-export", "advanced-editorial-actions", "kdp-publishing"]
    : [];

  return {
    dataStatus: bookDoctorSummary.dataStatus,
    bookHealthScore: bookDoctorSummary.overallScore,
    publicationReadinessScore,
    editorialGrade: bookDoctorSummary.editorialGrade,
    nextBestAction,
    bookDoctorSummary,
    chapterRiskMap: bookDoctorSummary.chapterReports,
    characterMemory: bookMemory.characterStates,
    continuityWarnings: bookMemory.continuityWarnings,
    repetitionWarnings: bookMemory.avoidRepeating,
    kdpReadiness,
    exportReadiness,
    creditWarnings,
    recommendedWorkflow: [
      nextBestAction.targetArea,
      ...(hasCover ? [] : ["cover"]),
      ...(kdpReadiness.score != null && kdpReadiness.score < 70 ? ["kdp"] : []),
      "export",
    ].filter((step, index, items) => items.indexOf(step) === index),
    lockedActions,
    bookMemory,
    editorialPlan,
  };
}
