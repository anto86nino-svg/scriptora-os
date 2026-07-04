export {
  adaptPlanWithMemory,
  buildStudyIntelligencePlan,
  buildSubjectProfile,
  classifyStudySubject,
  resolveStudyIntent,
  type KernelFlashcardType,
  type KernelQuizType,
  type QuizDifficultyTier,
  type RiassuntoProLevel,
  type StudyKernelInput,
  type StudyKernelPlan,
  type StudyLearningStyle,
  type StudyMode,
  type StudySubjectProfile,
} from "@/lib/study-os/study-intelligence-kernel";

export {
  buildRiassuntoPro,
  getRiassuntoProLevelLabel,
  RIASSUNTO_PRO_LEVELS,
  type RiassuntoProSection,
} from "@/lib/study-os/riassunti-pro";

export {
  buildStudyQuizPack,
  filterQuizByTier,
  type EnhancedQuizItem,
  type StudyQuizPack,
} from "@/lib/study-os/study-quiz-engine";

export {
  computeSm2Review,
  confidenceToSm2Quality,
  getDueFlashcards,
  initializeFlashcardDeck,
  recordFlashcardReview,
  type FlashcardReviewResult,
  type SpacedFlashcard,
} from "@/lib/study-os/study-flashcards";

export {
  getStudyMemoryAdaptation,
  listStudyMemorySessions,
  loadStudyMemory,
  recordOralEvaluation,
  recordQuizAttempt,
  saveFlashcardDeck,
  saveStudyMemory,
  type StudyMemoryAdaptation,
  type StudyMemorySnapshot,
  type StudyOralScore,
  type StudyQuizAttempt,
} from "@/lib/study-os/study-memory";

export {
  buildSessionKernelPlan,
  isPrimaryModeSection,
  isRecommendedModeSection,
  resolveRecommendedSummaryLevel,
  studyModeToSection,
  studySectionToMode,
  STUDY_MODE_LABELS,
  type BuildSessionPlanInput,
  type StudySessionSection,
} from "@/lib/study-os/study-session-wiring";

export {
  estimateStudyOsCostModel,
  formatStudyLimitMessage,
  STUDY_OS_PRO_PLAN,
  STUDY_USAGE_LIMITS,
  type StudyCostModel,
  type StudyOsPlan,
  type StudyUsageLimits,
} from "@/lib/study-os/study-limits";
export {
  aggregateDashboardStats,
  loadStudyDashboardStats,
  type StudyDashboardStats,
} from "@/lib/study-os/study-dashboard";

export {
  buildDictionaryIndex,
  findTermsInText,
  formatDictionaryLookup,
  listDictionaryTerms,
  lookupDictionaryTerm,
  lookupDictionaryWithAI,
  type DictionaryAiLookupFn,
  type DictionaryEntry,
  type DictionaryExplainMode,
  type DictionaryLookupResult,
} from "@/lib/study-os/study-dictionary";

export {
  buildStudyConceptMap,
  getConceptMapLevelLabel,
  layoutConceptMapSvg,
  type ConceptMapEdge,
  type ConceptMapLevel,
  type ConceptMapNode,
  type StudyConceptMapData,
} from "@/lib/study-os/study-concept-map";

export {
  buildExamSimReport,
  EXAM_CERTIFICATE_THRESHOLD,
  EXAM_PASS_THRESHOLD,
  formatExamCountdown,
  resolveExamTimedOut,
  selectExamSimQuestions,
  shouldAutoSubmitExam,
  toCertificateInput,
  type ExamSimError,
  type ExamSimReport,
} from "@/lib/study-os/study-exam-simulation";

export {
  analyzeStudyGaps,
  gapRiskLabel,
  type GapAnalysisInput,
  type GapAnalysisResult,
} from "@/lib/study-os/study-gap-analysis";

export {
  buildStudyPlan,
  getStudyPlanModeLabel,
  type StudyPlanInput,
  type StudyPlanResult,
  type StudyPlanSession,
} from "@/lib/study-os/study-plan";

export {
  computeStudySourceHash,
  type StudySessionRecord,
} from "@/lib/study-os/session-store";

export {
  computeStudyReminders,
  countDueReminders,
  getNextSm2ReviewDue,
  getReminderBadgeCount,
  loadPersistedReminderBadgeCount,
  persistReminderBadgeCount,
  requestStudyNotificationPermission,
  showStudyReminderNotification,
  type StudyReminder,
} from "@/lib/study-os/study-reminders";

export {
  computeMaterialReadiness,
  computeStudentPreparation,
  computeStudyReadinessBreakdown,
  type StudyReadinessBreakdown,
  type StudentActivityInput,
} from "@/lib/study-os/study-readiness";

export {
  extractStudyKeywords,
  isBannedStudyConcept,
  STUDY_DIDACTIC_STOP_WORDS,
} from "@/lib/study-os/study-keywords";

export {
  buildStudyTermDefinition,
  hasSchoolDefinition,
  isRealStudyDefinition,
} from "@/lib/study-os/study-vocabulary";

export {
  composeStudySummaries,
  ensureComposedSummary,
  isExtractiveSummaryDefect,
} from "@/lib/study-os/study-summary-composer";

export {
  extractStudyTopic,
  isBannedStudyTopic,
  replaceBannedTopicPhrases,
  sanitizeStudyTopic,
} from "@/lib/study-os/study-topic-extract";

export {
  buildSyntheticHistoryCauses,
  buildSyntheticHistoryKeyPoints,
  buildSyntheticHistoryTimeline,
  countCauseConsequenceItems,
  countTimelineEvents,
} from "@/lib/study-os/study-history-outputs";

export {
  getDictionaryAdvancedHeadline,
  getDictionaryAdvancedLabel,
  getSummaryModeLabels,
  getUniversitySummaryTitle,
  type SummaryModeLabel,
} from "@/lib/study-os/study-summary-labels";

export {
  evaluateKeywordQuality,
  evaluateStudyTextQuality,
  evaluateSummaryQuality,
  hasStudyPlaceholderText,
  hasVocabularyTemplateText,
  summaryExtractivityRatio,
  STUDY_TEXT_READY_MESSAGE,
  type StudyTextSourceKind,
} from "@/lib/study-os/study-quality-gates";

export {
  buildInsufficientStudySession,
  buildTopicModeSession,
  classifyStudyInput,
  hasMinimumStudyMaterial,
  hasSemanticStudyContent,
  isFullStudySession,
  isTopicOnlyInput,
  STUDY_INSUFFICIENT_MESSAGE,
  STUDY_MIN_FULL_SESSION_WORDS,
  type StudyInputClassification,
  type StudyInputKind,
  type StudySessionMode,
} from "@/lib/study-os/study-topic-mode";
