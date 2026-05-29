import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { detectBookIntelligence } from "@/lib/book-intelligence";
import { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
import { refreshProjectNarrativeIntelligenceV2 } from "@/lib/narrative-intelligence-v2";
import { buildCharacterPsychologyProfiles } from "@/lib/narrative-intelligence-v2/character-psychology";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import {
  applyAuthorIdentityToConfig,
  enforceAuthorIdentityLock,
  resolveAuthorIdentity,
  assertAuthorIdentityMatch,
} from "@/lib/author-identity";
import type { BookConfig, BookProject, Chapter } from "@/types/book";
import {
  calibrateChapterDoctorDelta,
  calibrateChapterQualityScore,
  assertScoreInTier,
  assertScoreSpread,
  tierFromCalibratedScore,
  countCalibrationPenaltySignals,
} from "./score-calibration";
import {
  FIXTURE_BUSINESS_STRONG,
  FIXTURE_CHAPTER_DOCTOR_AFTER,
  FIXTURE_CHAPTER_DOCTOR_BEFORE,
  FIXTURE_DARK_ROMANCE_FAIL,
  FIXTURE_DARK_ROMANCE_STRONG,
  FIXTURE_HORTICULTURAL_CONTAMINATED,
  FIXTURE_HORTICULTURAL_STRONG,
  FIXTURE_MEMOIR_AI_POETRY,
  FIXTURE_MEMOIR_STRONG,
  FIXTURE_SELF_HELP_FLUFF,
  FIXTURE_SELF_HELP_STRONG,
  FIXTURE_THRILLER_FLAT,
  FIXTURE_THRILLER_STRONG,
  buildFantasyChapterCorpus,
} from "./fixtures/benchmark-corpus";

export type TortureCategory =
  | "fiction-dark-romance"
  | "fiction-thriller"
  | "fiction-fantasy-memory"
  | "fiction-memoir"
  | "nonfiction-self-help"
  | "nonfiction-business"
  | "nonfiction-horticultural"
  | "score-calibration"
  | "reader-emotion"
  | "author-identity"
  | "chapter-doctor";

export interface TortureAssertion {
  id: string;
  passed: boolean;
  message: string;
  severity: "critical" | "warning" | "info";
}

export interface TortureBenchmarkResult {
  id: string;
  category: TortureCategory;
  label: string;
  passed: boolean;
  assertions: TortureAssertion[];
  scores?: Record<string, number>;
}

function baseConfig(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Torture Test",
    subtitle: "",
    language: "English",
    genre: "literary-fiction",
    category: "Fiction",
    chapterLength: "medium",
    numberOfChapters: 12,
    tone: "literary",
    audience: "Adults",
    authorStyle: "Cinematic",
    bookLength: "medium",
    subchaptersEnabled: false,
    ...overrides,
  } as BookConfig;
}

function evaluateCalibrated(content: string, config: BookConfig, chapterIndex = 0) {
  const corpus = content.repeat(6);
  const editorial = analyzeNovel(corpus);
  const bestseller = evaluateBestsellerChapter({
    content: corpus,
    chapterIndex,
    genre: config.genre,
    bookIntelligence: config.bookIntelligence,
  });
  return calibrateChapterQualityScore({
    dialogueHumanity: editorial.dialogueHumanityScore,
    subtext: editorial.subtextScore,
    characterDepth: editorial.characterConsistencyScore,
    pacing: editorial.pacingConsistencyScore,
    emotionalRealism: editorial.emotionalRedundancyScore,
    bestsellerOverall: bestseller.scores.overall,
    warningCount: editorial.warnings.length,
    riskCount: bestseller.risks.length,
    penaltySignals: countCalibrationPenaltySignals(corpus),
  });
}

function assert(id: string, condition: boolean, message: string, severity: TortureAssertion["severity"] = "critical"): TortureAssertion {
  return { id, passed: condition, message, severity };
}

export function runDarkRomanceBenchmark(): TortureBenchmarkResult {
  const config = baseConfig({
    genre: "dark-romance",
    bookIntelligence: {
      layers: { writingBrainId: "dark-romance-brain", domain: "fiction" },
    } as any,
  });

  const strong = evaluateCalibrated(FIXTURE_DARK_ROMANCE_STRONG, config);
  const fail = evaluateCalibrated(FIXTURE_DARK_ROMANCE_FAIL, config);
  const profiles = buildCharacterPsychologyProfiles({
    config: {
      ...config,
      characters: [{ name: "Elena", role: "lead", traumaProfile: "abandonment" }],
    } as any,
    blueprint: null,
    chapters: [{ title: "1", content: FIXTURE_DARK_ROMANCE_FAIL, subchapters: [] }],
  });

  const readerStrong = simulateReaderEmotion({
    content: FIXTURE_DARK_ROMANCE_STRONG.repeat(8),
    chapterIndex: 2,
    config,
  });

  const assertions = [
    assert("dr-score-spread", assertScoreSpread([strong.calibrated, fail.calibrated], 0.6), `Strong (${strong.calibrated}) must beat fail (${fail.calibrated}) by ≥0.6`),
    assert("dr-fail-not-elite", fail.calibrated < 8.5, `Instant resolution text must not score bestseller (${fail.calibrated})`),
    assert("dr-psychology-wound", profiles[0]?.coreWound !== "unknown" || profiles[0]?.fear.length > 0, "Character psychology must infer wound/fear"),
    assert("dr-psychology-violation", profiles[0]?.behavioralDirectives.some(d => /premature|friction|perfect/i.test(d)) ?? false, "Psychology must flag premature resolution"),
    assert("dr-reader-tension", readerStrong.emotionalTension >= readerStrong.emotionalPayoff * 0.5, "Romance: tension should not be dwarfed by payoff"),
    assert("dr-no-therapy", !/\b(i understand now|everything is fine)\b/i.test(FIXTURE_DARK_ROMANCE_STRONG), "Strong fixture avoids therapy resolution language"),
  ];

  return {
    id: "fiction-dark-romance",
    category: "fiction-dark-romance",
    label: "Dark Romance",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { strong: strong.calibrated, fail: fail.calibrated },
  };
}

export function runThrillerBenchmark(): TortureBenchmarkResult {
  const config = baseConfig({
    genre: "thriller",
    bookIntelligence: { layers: { writingBrainId: "thriller-brain", domain: "fiction" } } as any,
  });

  const strong = evaluateCalibrated(FIXTURE_THRILLER_STRONG, config);
  const flat = evaluateCalibrated(FIXTURE_THRILLER_FLAT, config);
  const readerFlat = simulateReaderEmotion({ content: FIXTURE_THRILLER_FLAT.repeat(10), chapterIndex: 1, config });
  const readerStrong = simulateReaderEmotion({ content: FIXTURE_THRILLER_STRONG.repeat(8), chapterIndex: 1, config });

  const assertions = [
    assert("th-score-order", strong.calibrated > flat.calibrated, `Thriller strong (${strong.calibrated}) > flat (${flat.calibrated})`),
    assert("th-boredom-detect", readerFlat.boredomRisk >= readerStrong.boredomRisk, "Flat thriller should show higher boredom risk"),
    assert("th-curiosity", readerStrong.curiosity > readerFlat.curiosity, "Strong thriller should score higher curiosity"),
    assert("th-hook-tier", tierFromCalibratedScore(flat.calibrated) === "weak" || flat.calibrated < 7.0, "Flat opening should not score strong tier"),
  ];

  return {
    id: "fiction-thriller",
    category: "fiction-thriller",
    label: "Thriller / Crime",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { strong: strong.calibrated, flat: flat.calibrated },
  };
}

export function runFantasyMemoryBenchmark(): TortureBenchmarkResult {
  const chapters: Chapter[] = buildFantasyChapterCorpus(22).map((content, i) => ({
    title: `Chapter ${i + 1}`,
    content,
    subchapters: [],
  }));

  const project: BookProject = {
    id: "torture-fantasy",
    config: baseConfig({ genre: "fantasy", numberOfChapters: 24 }),
    blueprint: {
      overview: "Fantasy canon test",
      chapterOutlines: [],
      themes: ["oath", "memory"],
      emotionalArc: "rising",
      blueprintIntegrity: {
        canonProtectionLayer: { immutableCanonRules: ["The Iron Pact forbids crossing Salt Bridge"] },
        characterMemoryEngine: [{ canonicalName: "Kael", coreFear: "breaking the Pact", coreDesire: "return home" }],
      } as any,
    },
    frontMatter: null,
    backMatter: null,
    chapters,
    phase: "chapters",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const enriched = refreshProjectNarrativeIntelligenceV2(project);
  const memory = enriched.longBookMemory!;

  const assertions = [
    assert("fm-chapters-indexed", memory.chaptersIndexed >= 20, `Memory must index 20+ chapters (got ${memory.chaptersIndexed})`),
    assert("fm-unresolved", memory.unresolvedArcs.length > 0, "Must retain unresolved arcs"),
    assert("fm-character", memory.characterStates.some(c => /kael/i.test(c.name)), "Character states must persist Kael"),
    assert("fm-psychology", (memory.characterPsychology?.length ?? 0) > 0, "Character psychology must populate"),
    assert("fm-world-rules", memory.worldRules.some(r => /pact|bridge/i.test(r.rule)), "World rules must survive"),
    assert("fm-foreshadow", memory.foreshadowing.length > 0 || memory.continuityAnchors.length > 0, "Foreshadow or continuity anchors required"),
  ];

  return {
    id: "fiction-fantasy-memory",
    category: "fiction-fantasy-memory",
    label: "Fantasy 20+ Chapter Memory",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { chaptersIndexed: memory.chaptersIndexed },
  };
}

export function runMemoirBenchmark(): TortureBenchmarkResult {
  const config = baseConfig({ genre: "memoir" });
  const strong = evaluateCalibrated(FIXTURE_MEMOIR_STRONG, config);
  const aiPoetry = evaluateCalibrated(FIXTURE_MEMOIR_AI_POETRY, config);
  const strongEdit = analyzeNovel(FIXTURE_MEMOIR_STRONG.repeat(4));
  const aiEdit = analyzeNovel(FIXTURE_MEMOIR_AI_POETRY.repeat(4));

  const assertions = [
    assert("mem-score-spread", strong.calibrated > aiPoetry.calibrated, `Authentic (${strong.calibrated}) > AI poetry (${aiPoetry.calibrated})`),
    assert("mem-warnings", aiEdit.warnings.length >= strongEdit.warnings.length, "AI poetry should trigger equal or more editorial warnings"),
    assert("mem-no-universe", !/universe|profound wave|journey and love is the answer/i.test(FIXTURE_MEMOIR_STRONG), "Strong memoir avoids generic AI poetry"),
  ];

  return {
    id: "fiction-memoir",
    category: "fiction-memoir",
    label: "Memoir / Emotional Fiction",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { strong: strong.calibrated, aiPoetry: aiPoetry.calibrated },
  };
}

export function runSelfHelpBenchmark(): TortureBenchmarkResult {
  const config = baseConfig({ genre: "self-help", bookIntelligence: { layers: { writingBrainId: "self-help-brain", domain: "nonfiction" } } as any });
  const strong = evaluateCalibrated(FIXTURE_SELF_HELP_STRONG, config);
  const fluff = evaluateCalibrated(FIXTURE_SELF_HELP_FLUFF, config);

  const assertions = [
    assert("sh-score-order", strong.calibrated >= fluff.calibrated, `Practical (${strong.calibrated}) should beat fluff (${fluff.calibrated})`),
    assert("sh-fluff-tier", tierFromCalibratedScore(fluff.calibrated) !== "bestseller-potential", "Motivational fluff must not hit bestseller tier"),
    assert("sh-framework", /framework|track|friction|environment/i.test(FIXTURE_SELF_HELP_STRONG), "Strong fixture uses practical structure"),
  ];

  return {
    id: "nonfiction-self-help",
    category: "nonfiction-self-help",
    label: "Self-help",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { strong: strong.calibrated, fluff: fluff.calibrated },
  };
}

export function runBusinessBenchmark(): TortureBenchmarkResult {
  const config = baseConfig({ genre: "business", bookIntelligence: { layers: { writingBrainId: "business-brain", domain: "nonfiction" } } as any });
  const score = evaluateCalibrated(FIXTURE_BUSINESS_STRONG, config);
  const editorial = analyzeNovel(FIXTURE_BUSINESS_STRONG.repeat(3));

  const assertions = [
    assert("biz-framework", /framework|pricing|example/i.test(FIXTURE_BUSINESS_STRONG), "Business fixture has framework"),
    assert("biz-no-therapy", !/\b(healing journey|inner child|self-love journey)\b/i.test(FIXTURE_BUSINESS_STRONG), "No therapy-style contamination"),
    assert("biz-score-realistic", score.calibrated <= 9.0, `Business strong should not auto-inflate to elite (${score.calibrated})`),
    assert("biz-warnings-low", editorial.warnings.length < 8, "Clean business prose should not flood false warnings"),
  ];

  return {
    id: "nonfiction-business",
    category: "nonfiction-business",
    label: "Business",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { strong: score.calibrated },
  };
}

export function runHorticulturalBenchmark(): TortureBenchmarkResult {
  const config = baseConfig({
    genre: "gardening",
    title: "Manuale coltivazione pomodoro",
    bookIntelligence: { layers: { writingBrainId: "horticultural-guide-brain", domain: "nonfiction" } } as any,
  });

  const detection = detectBookIntelligence({
    title: config.title,
    genre: config.genre,
    idea: "Guida pratica alla coltivazione del pomodoro passo passo",
  });

  const practical = evaluateCalibrated(FIXTURE_HORTICULTURAL_STRONG, config);
  const contaminated = evaluateCalibrated(FIXTURE_HORTICULTURAL_CONTAMINATED, config);
  const readerPractical = simulateReaderEmotion({ content: FIXTURE_HORTICULTURAL_STRONG.repeat(6), chapterIndex: 0, config });
  const readerContaminated = simulateReaderEmotion({ content: FIXTURE_HORTICULTURAL_CONTAMINATED.repeat(6), chapterIndex: 0, config });

  const assertions = [
    assert("hort-brain", detection.layers.writingBrainId === "horticultural-guide-brain", `Must detect horticultural brain (got ${detection.layers.writingBrainId})`),
    assert("hort-not-selfhelp", detection.resolvedGenre !== "self-help", "Tomato manual must NOT resolve to self-help"),
    assert("hort-practical-wins", practical.calibrated >= contaminated.calibrated, `Practical (${practical.calibrated}) ≥ contaminated (${contaminated.calibrated})`),
    assert("hort-no-motivation", !/\b(unlock your|inner growth|abundance comes when we believe)\b/i.test(FIXTURE_HORTICULTURAL_STRONG), "Practical guide avoids motivational contamination"),
    assert("hort-utility-note", Boolean(readerPractical.genreAdjustedNote?.match(/Utility/i)), "Reader simulator applies utility lens"),
    assert("hort-scene-purpose", analyzeChapterScenePurpose({ content: FIXTURE_HORTICULTURAL_STRONG, chapterIndex: 0, config }).scenes.some(s => s.primaryPurpose === "instruction" || s.purposes.includes("instruction")), "Scene purpose detects instruction"),
  ];

  return {
    id: "nonfiction-horticultural",
    category: "nonfiction-horticultural",
    label: "Horticultural Guide (Tomato)",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { practical: practical.calibrated, contaminated: contaminated.calibrated },
  };
}

export function runScoreCalibrationBenchmark(): TortureBenchmarkResult {
  const samples = [
    evaluateCalibrated(FIXTURE_DARK_ROMANCE_FAIL, baseConfig({ genre: "dark-romance" })),
    evaluateCalibrated(FIXTURE_THRILLER_FLAT, baseConfig({ genre: "thriller" })),
    evaluateCalibrated(FIXTURE_SELF_HELP_FLUFF, baseConfig({ genre: "self-help" })),
    evaluateCalibrated(FIXTURE_DARK_ROMANCE_STRONG, baseConfig({ genre: "dark-romance", bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } } as any })),
  ];

  const calibrated = samples.map(s => s.calibrated);
  const allBelowTen = calibrated.every(s => s <= 9.5);
  const spreadOk = assertScoreSpread(calibrated, 0.5);
  const weakInBand = assertScoreInTier(calibrated[0], "weak") || assertScoreInTier(calibrated[0], "developing");
  const noClusterAboveNine = calibrated.filter(s => s >= 8.9).length <= 1;

  const assertions = [
    assert("cal-no-ten", allBelowTen, "No sample should raw-inflate above 9.5"),
    assert("cal-spread", spreadOk, `Score spread must be ≥0.5 (range ${Math.min(...calibrated)}–${Math.max(...calibrated)})`),
    assert("cal-weak-band", weakInBand, `Weak text should land weak/developing (${calibrated[0]})`),
    assert("cal-no-cluster", noClusterAboveNine, "Must not cluster multiple samples at 8.9+"),
  ];

  return {
    id: "score-calibration",
    category: "score-calibration",
    label: "Score Distribution Calibration",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: Object.fromEntries(samples.map((s, i) => [`sample${i}`, s.calibrated])),
  };
}

export function runReaderEmotionValidation(): TortureBenchmarkResult {
  const romance = simulateReaderEmotion({
    content: FIXTURE_DARK_ROMANCE_STRONG.repeat(10),
    chapterIndex: 3,
    config: baseConfig({ genre: "dark-romance", bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } } as any }),
  });
  const thriller = simulateReaderEmotion({
    content: FIXTURE_THRILLER_STRONG.repeat(10),
    chapterIndex: 3,
    config: baseConfig({ genre: "thriller", bookIntelligence: { layers: { writingBrainId: "thriller-brain", domain: "fiction" } } as any }),
  });
  const utility = simulateReaderEmotion({
    content: FIXTURE_HORTICULTURAL_STRONG.repeat(8),
    chapterIndex: 1,
    config: baseConfig({ genre: "gardening", bookIntelligence: { layers: { writingBrainId: "horticultural-guide-brain", domain: "nonfiction" } } as any }),
  });

  const assertions = [
    assert("re-bounded", [romance, thriller, utility].every(r => r.curiosity <= 100 && r.boredomRisk <= 100), "All reader scores bounded 0–100"),
    assert("re-romance-yearning", romance.emotionalTension >= 40, "Romance: tension signal present"),
    assert("re-thriller-curiosity", thriller.curiosity >= romance.curiosity * 0.85, "Thriller: curiosity competitive with romance on strong text"),
    assert("re-utility-lens", utility.genreAdjustedNote?.includes("Utility"), "Utility genre note applied"),
    assert("re-why-proof", romance.whySummary.length > 0 && romance.whySummary.every(w => w.length > 10), "Why summary must be proof-based strings"),
  ];

  return {
    id: "reader-emotion",
    category: "reader-emotion",
    label: "Reader Emotion Validation",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { romanceTension: romance.emotionalTension, thrillerCuriosity: thriller.curiosity },
  };
}

export function runAuthorIdentityStressTest(): TortureBenchmarkResult {
  const antonino = resolveAuthorIdentity(null, "builtin-scriptora-cinematic");
  const livia = resolveAuthorIdentity(null, "builtin-dark-romance");

  const configA = applyAuthorIdentityToConfig(baseConfig(), antonino);
  const configB = applyAuthorIdentityToConfig(baseConfig({ genre: "dark-romance" }), livia);
  const reLockedA = enforceAuthorIdentityLock(configA);
  const reLockedB = enforceAuthorIdentityLock(configB);

  const assertions = [
    assert("ai-antonino-lock", reLockedA.authorIdentityLock?.identityId === antonino?.id, "Antonino identity lock persists on config"),
    assert("ai-livia-lock", reLockedB.authorIdentityLock?.identityId === livia?.id, "Livia identity lock persists on config"),
    assert("ai-livia-distinct", reLockedA.authorIdentityLock?.penName !== reLockedB.authorIdentityLock?.penName, "Identities remain distinct"),
    assert("ai-match", assertAuthorIdentityMatch(reLockedA) && assertAuthorIdentityMatch(reLockedB), "Lock matches embedded identity"),
    assert("ai-forbidden-diff", antonino?.forbiddenMoves !== livia?.forbiddenMoves, "Identities carry distinct forbidden moves"),
  ];

  return {
    id: "author-identity",
    category: "author-identity",
    label: "Author Identity Lock Stress",
    passed: assertions.every(a => a.passed),
    assertions,
  };
}

export function runChapterDoctorRealityTest(): TortureBenchmarkResult {
  const config = baseConfig({ genre: "romance", language: "Italian" });
  const beforeEdit = analyzeNovel(FIXTURE_CHAPTER_DOCTOR_BEFORE);
  const afterEdit = analyzeNovel(FIXTURE_CHAPTER_DOCTOR_AFTER);
  const beforeCal = calibrateChapterQualityScore({
    dialogueHumanity: beforeEdit.dialogueHumanityScore,
    subtext: beforeEdit.subtextScore,
    characterDepth: beforeEdit.characterConsistencyScore,
    pacing: beforeEdit.pacingConsistencyScore,
    emotionalRealism: beforeEdit.emotionalRedundancyScore,
    bestsellerOverall: evaluateBestsellerChapter({ content: FIXTURE_CHAPTER_DOCTOR_BEFORE.repeat(4), chapterIndex: 0, genre: "romance" }).scores.overall,
    warningCount: beforeEdit.warnings.length,
  });

  const report = computeDevelopmentalEditReport({
    originalText: FIXTURE_CHAPTER_DOCTOR_BEFORE,
    patchedText: FIXTURE_CHAPTER_DOCTOR_AFTER,
    patches: [{ idx: 0, original: FIXTURE_CHAPTER_DOCTOR_BEFORE, patched: FIXTURE_CHAPTER_DOCTOR_AFTER, type: "intensify", reason: "Reduced emotional exposition" }],
    modificationPercent: 12,
    genre: "romance",
    chapterIndex: 0,
  });

  const calibratedDelta = calibrateChapterDoctorDelta({
    beforeCalibrated: beforeCal.calibrated,
    rawAfterCalibrated: report.afterScore,
    patchCount: 1,
    modificationPercent: 12,
    positiveMetricCount: [
      afterEdit.dialogueHumanityScore > beforeEdit.dialogueHumanityScore,
      afterEdit.subtextScore > beforeEdit.subtextScore,
    ].filter(Boolean).length,
    warningDelta: Math.max(0, beforeEdit.warnings.length - afterEdit.warnings.length),
  });

  const assertions = [
    assert("cd-improves", report.afterScore > report.beforeScore, `Doctor after (${report.afterScore}) > before (${report.beforeScore})`),
    assert("cd-delta-believable", report.scoreDelta <= 1.0, `Delta must be ≤1.0 for surgical patch (${report.scoreDelta})`),
    assert("cd-not-elite-jump", report.afterScore < 9.2 || beforeCal.calibrated >= 8.8, "Mediocre chapter must not jump to elite after patch"),
    assert("cd-calibrated-cap", calibratedDelta.scoreDelta <= 0.85, `Calibrated delta capped (${calibratedDelta.scoreDelta})`),
    assert("cd-voice-length", FIXTURE_CHAPTER_DOCTOR_AFTER.length >= FIXTURE_CHAPTER_DOCTOR_BEFORE.length * 0.7, "Patch preserves substantial voice/material"),
    assert("cd-no-perfect", !/\b(capisco tutto|tutto risolto|ti amo)\b/i.test(FIXTURE_CHAPTER_DOCTOR_AFTER), "Fixed version avoids instant resolution"),
  ];

  return {
    id: "chapter-doctor",
    category: "chapter-doctor",
    label: "Chapter Doctor Reality Test",
    passed: assertions.every(a => a.passed),
    assertions,
    scores: { before: report.beforeScore, after: report.afterScore, delta: report.scoreDelta },
  };
}

export function runFullTortureSuite(): TortureBenchmarkResult[] {
  return [
    runDarkRomanceBenchmark(),
    runThrillerBenchmark(),
    runFantasyMemoryBenchmark(),
    runMemoirBenchmark(),
    runSelfHelpBenchmark(),
    runBusinessBenchmark(),
    runHorticulturalBenchmark(),
    runScoreCalibrationBenchmark(),
    runReaderEmotionValidation(),
    runAuthorIdentityStressTest(),
    runChapterDoctorRealityTest(),
  ];
}
