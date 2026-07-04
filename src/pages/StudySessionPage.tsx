import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Clipboard, ExternalLink, GraduationCap, Image as ImageIcon, Loader2, Plus, RotateCcw, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  analyzeStudyMaterial,
  classifyStudyMaterial,
  readStudyFileDetailed,
  readStudyFiles,
  STUDY_IMAGE_OCR_FALLBACK_COPY,
  STUDY_IMAGE_OCR_HINT,
  type StudyFileReadResult,
  type LiteraryGenreIntent,
  type StudyDifficultyLevel,
  type StudyGoalIntent,
  type StudyIntentSettings,
  type StudyMaterialIntentType,
  type StudySessionResult,
  type StudySubjectIntent,
} from "@/lib/study-session";
import { ScriptoraWorkingState } from "@/components/ui/ScriptoraWorkingState";
import { WORKING_STEP_PRESETS } from "@/lib/scriptora-working-state";
import { generateStudySessionWithAI } from "@/lib/study-ai";
import { createStudyChunkPlan } from "@/lib/study-os/chunk-planner";
import {
  clearCurrentStudyBook,
  createAndSaveStudyBookManifest,
  getCurrentStudyBookChunkId,
  getCurrentStudyBookManifestId,
  getStudyBookManifest,
  readStudyBookChunkResult,
  readStudyBookChunkText,
  saveStudyBookChunkResult,
  setCurrentStudyBookChunkId,
  updateStudyBookChunk,
  type StudyBookManifest,
} from "@/lib/study-os/book-manifest";
import { evaluateStudyAnswerWithAI, type StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import { DEFAULT_STUDY_UX, loadStudyUxState, saveStudyUxState, type FlashcardConfidence } from "@/lib/study-ux";
import { t } from "@/lib/i18n";
import {
  getStudyLearningMetrics,
  getStudyProject,
  listStudyProjects,
  recordStudyQuizAttempt,
  saveStudyProject,
  addStudyProjectBadges,
} from "@/lib/study-project-storage";
import { saveStudyCertificate } from "@/lib/study-certificate-storage";
import { achievementById, evaluateStudyAchievements } from "@/lib/study-achievements";
import { downloadStudyCertificate } from "@/lib/study-certificate";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { StudyMetricsCard } from "@/components/study/StudyMetricsCard";
import { StudySummaryPanel } from "@/components/study/StudySummaryPanel";
import { StudyOralPanel } from "@/components/study/StudyOralPanel";
import { StudyVocabularyPanel } from "@/components/study/StudyVocabularyPanel";
import { StudyFlashcardsPanel } from "@/components/study/StudyFlashcardsPanel";
import { StudyQuizPanel } from "@/components/study/StudyQuizPanel";
import { StudyMaterialsPanel } from "@/components/study/StudyMaterialsPanel";
import { StudyMapPanel } from "@/components/study/StudyMapPanel";
import { StudyProgressPanel } from "@/components/study/StudyProgressPanel";
import { StudyCertificatesPanel } from "@/components/study/StudyCertificatesPanel";
import { StudyCoachPanel } from "@/components/study/StudyCoachPanel";
import {
  attachStudyResult,
  computeStudySourceHash,
  createEmptyStudySession,
  detectStudySourceType,
  getCurrentStudySessionId,
  getFreshStudyResult,
  getStudySession,
  resolveCommittedStudyResult,
  saveStudySession,
  setCurrentStudySessionId,
  updateStudySessionSource,
  type StudySessionRecord,
  type StudySourceType,
} from "@/lib/study-os/session-store";
import { STUDY_USAGE_LIMITS, formatStudyLimitMessage } from "@/lib/study-os/study-limits";
import {
  STUDY_TEXT_NOT_READABLE_MESSAGE,
  STUDY_TEXT_WARNING_MESSAGE,
  canGenerateStudyOutputs,
  evaluateStudyTextQuality,
} from "@/lib/study-os/study-quality-gates";
import {
  buildSessionKernelPlan,
  buildStudyQuizPack,
  classifyStudyInput,
  hasSemanticStudyContent,
  initializeFlashcardDeck,
  loadStudyMemory,
  recordOralEvaluation,
  recordQuizAttempt as recordKernelQuizAttempt,
  resolveRecommendedSummaryLevel,
  saveFlashcardDeck,
  studyModeToSection,
  analyzeStudyGaps,
  selectExamSimQuestions,
  toCertificateInput,
  STUDY_INSUFFICIENT_MESSAGE,
  type RiassuntoProLevel,
  type SpacedFlashcard,
  type StudyKernelPlan,
  type StudyMemorySnapshot,
  type ExamSimReport,
} from "@/lib/study-os";
import { StudyKernelBanner, studyTabHighlightClass } from "@/components/study/StudyKernelBanner";
import { StudyDictionaryPopover } from "@/components/study/StudyDictionaryPopover";
import { StudyDashboardStrip } from "@/components/study/StudyDashboardStrip";
import { StudyExamSimPanel } from "@/components/study/StudyExamSimPanel";
import { StudyPlanPanel } from "@/components/study/StudyPlanPanel";
import { devOnlyDiagnostic, getUserFriendlyError } from "@/lib/user-friendly-error";
import { trackScriptoraEvent } from "@/lib/usage-analytics";

type StudySection = "materials" | "summary" | "quiz" | "flashcards" | "maps" | "exam" | "progress" | "certificates" | "coach";

const STUDY_OUTCOMES = [
  { icon: "✨", title: "Riassunto Soft", desc: "Facile e veloce" },
  { icon: "🧠", title: "Riassunto Pro", desc: "Più profondo e completo" },
  { icon: "📚", title: "Spiegazione semplice", desc: "Come a uno studente" },
  { icon: "📝", title: "Quiz intelligenti", desc: "Verifica attiva" },
  { icon: "🎤", title: "Simulazione interrogazione", desc: "Risposte aperte valutate" },
  { icon: "🧪", title: "Verifica finale", desc: "Modalità esame" },
  { icon: "🗺️", title: "Mappe ed esercizi", desc: "Relazioni, cause ed esempi" },
  { icon: "🏅", title: "Attestati", desc: "Storico e download" },
  { icon: "🎯", title: "Piano studio automatico", desc: "Percorso guidato" },
] as const;

const MATERIAL_TYPE_OPTIONS: Array<{ value: StudyMaterialIntentType; label: string }> = [
  { value: "auto", label: "Altro / rileva automaticamente" },
  { value: "school_notes", label: "Appunti scolastici" },
  { value: "book_manual", label: "Libro / manuale" },
  { value: "university_handout", label: "Dispensa universitaria" },
  { value: "pdf_document", label: "PDF / documento" },
  { value: "narrative_manuscript", label: "Manoscritto / capitolo narrativo" },
  { value: "essay_theme", label: "Saggio / tema" },
  { value: "legal_document", label: "Contratto / documento legale" },
  { value: "image_page", label: "Immagine o foto di una pagina" },
  { value: "other", label: "Altro / rileva automaticamente" },
];

const SUBJECT_OPTIONS: Array<{ value: StudySubjectIntent; label: string }> = [
  { value: "auto", label: "Altro / rileva automaticamente" },
  { value: "italian_literature", label: "Italiano / Letteratura" },
  { value: "history", label: "Storia" },
  { value: "geography", label: "Geografia" },
  { value: "philosophy", label: "Filosofia" },
  { value: "law", label: "Diritto" },
  { value: "economics", label: "Economia" },
  { value: "math", label: "Matematica" },
  { value: "physics", label: "Fisica" },
  { value: "chemistry", label: "Chimica" },
  { value: "biology", label: "Biologia" },
  { value: "medicine", label: "Medicina" },
  { value: "psychology", label: "Psicologia" },
  { value: "computer-science", label: "Informatica" },
  { value: "languages", label: "Inglese / Lingue" },
  { value: "art", label: "Arte" },
  { value: "music", label: "Musica" },
  { value: "other", label: "Altro / rileva automaticamente" },
];

const LITERARY_GENRE_OPTIONS: Array<{ value: LiteraryGenreIntent; label: string }> = [
  { value: "auto", label: "Altro / rileva automaticamente" },
  { value: "literary_fiction", label: "Narrativa / Letteratura" },
  { value: "romance", label: "Romance" },
  { value: "dark_romance", label: "Dark romance" },
  { value: "thriller_mystery", label: "Thriller / Mystery" },
  { value: "fantasy", label: "Fantasy" },
  { value: "horror_gothic", label: "Horror / Gotico" },
  { value: "memoir", label: "Memoir" },
  { value: "narrative_self_help", label: "Self-help narrativo" },
  { value: "poetry", label: "Poesia" },
  { value: "narrative_essay", label: "Saggio narrativo" },
  { value: "other", label: "Altro / rileva automaticamente" },
];

const STUDY_GOAL_OPTIONS: Array<{ value: StudyGoalIntent; label: string }> = [
  { value: "quick_understanding", label: "Capire velocemente" },
  { value: "oral_test", label: "Studiare per interrogazione" },
  { value: "exam_prep", label: "Preparare esame" },
  { value: "complete_summary", label: "Creare riassunto completo" },
  { value: "quiz", label: "Fare quiz" },
  { value: "flashcards", label: "Fare flashcard" },
  { value: "manuscript_analysis", label: "Analizzare manoscritto" },
  { value: "oral_presentation", label: "Preparare esposizione orale" },
];

const DIFFICULTY_LEVEL_OPTIONS: Array<{ value: StudyDifficultyLevel; label: string }> = [
  { value: 1, label: "1. Base — ripasso facile" },
  { value: 2, label: "2. Intermedio — comprensione sicura" },
  { value: 3, label: "3. Buono — verifica scolastica seria" },
  { value: 4, label: "4. Avanzato — interrogazione/esame" },
  { value: 5, label: "5. Commissione d'esame" },
];

const STUDY_FILE_FALLBACK_COPY =
  "Non riesco a leggere automaticamente questo file da qui. Puoi incollare il testo oppure continuare da browser.";

type StudyScannerPageStatus = "reading" | "ready" | "partial" | "failed";

type StudyScannerPage = {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  text: string;
  words: number;
  status: StudyScannerPageStatus;
  warnings: string[];
};

function isStudyImageFile(file: File): boolean {
  return /\.(png|jpe?g|webp|heic|heif)$/i.test(file.name) || file.type.startsWith("image/");
}

function buildScannerText(pages: StudyScannerPage[]): string {
  return pages
    .filter((page) => page.text.trim())
    .map((page, index) => `Pagina ${index + 1}\n\n${page.text.trim()}`)
    .join("\n\n")
    .trim();
}

function scannerPageStatusLabel(status: StudyScannerPageStatus): string {
  if (status === "reading") return "OCR in corso";
  if (status === "ready") return "Testo rilevato";
  if (status === "partial") return "Testo parziale";
  return "Da correggere";
}

const TAB_CONFIG: { id: StudySection; label: string; icon: string }[] = [
  { id: "materials", label: "Materiali", icon: "📎" },
  { id: "summary", label: "Riassunti", icon: "📘" },
  { id: "quiz", label: "Quiz", icon: "📝" },
  { id: "flashcards", label: "Flashcard", icon: "🃏" },
  { id: "maps", label: "Mappe", icon: "🗺️" },
  { id: "exam", label: "Esame", icon: "🎓" },
  { id: "progress", label: "Progressi", icon: "📈" },
  { id: "certificates", label: "Attestati", icon: "🏅" },
  { id: "coach", label: "Coach", icon: "🎯" },
];

function normalizeStudyResultForUI(value: any): StudySessionResult {
  const result = value || {};

  return {
    title: String(result.title || "Sessione Studio"),
    sourceName: String(result.sourceName || "materiale-studio.txt"),
    words: Number(result.words || result.totalWords || 0),
    detectedSubject: String(result.detectedSubject || "Materiale di studio"),
    difficulty: result.difficulty === "soft" || result.difficulty === "pro" ? result.difficulty : "medium",
    classification: result.classification,
    summaries: result.summaries,
    lightSummary: String(result.lightSummary || ""),
    mediumSummary: String(result.mediumSummary || ""),
    proSummary: String(result.proSummary || ""),
    studyNotesPro: String(result.studyNotesPro || ""),
    keyConcepts: Array.isArray(result.keyConcepts) ? result.keyConcepts : [],
    difficultWords: Array.isArray(result.difficultWords) ? result.difficultWords : [],
    flashcards: Array.isArray(result.flashcards) ? result.flashcards : [],
    openQuestions: Array.isArray(result.openQuestions)
      ? result.openQuestions.map((item: any) => ({
          question: String(item?.question || "Domanda aperta non disponibile"),
          answerGuide: String(item?.answerGuide || "Guida risposta non disponibile."),
        }))
      : [],
    quiz: Array.isArray(result.quiz)
      ? result.quiz.map((item: any) => ({
          question: String(item?.question || "Domanda non disponibile"),
          options: Array.isArray(item?.options) ? item.options.map((o: any) => String(o || "")) : [],
          answer: Number.isFinite(Number(item?.answer)) ? Number(item.answer) : 0,
          explanation: String(item?.explanation || "Spiegazione non disponibile."),
          difficulty: item?.difficulty,
          memoryTrick: item?.memoryTrick,
          commonMistake: item?.commonMistake,
          type: item?.type,
          sourceReference: item?.sourceReference,
          testedSkill: item?.testedSkill,
          learningLevel: item?.learningLevel,
        }))
      : [],
    trueFalse: Array.isArray(result.trueFalse) ? result.trueFalse : [],
    exercises: Array.isArray(result.exercises) ? result.exercises : [],
    conceptMap: result.conceptMap,
    learningPackage: result.learningPackage,
    knowledgeMap: Array.isArray(result.knowledgeMap) ? result.knowledgeMap : [],
    adaptiveCoach: result.adaptiveCoach,
    studyMaterialType: result.studyMaterialType,
    studySubject: result.studySubject,
    literaryGenre: result.literaryGenre,
    studyGoal: result.studyGoal,
    difficultyLevel: result.difficultyLevel,
    qualityScores: result.qualityScores,
    sessionMode: result.sessionMode,
    contentType: result.contentType,
    subjectLabel: String(result.subjectLabel || "Materiale di studio"),
    studyMode: String(result.studyMode || "Studio guidato"),
  };
}

function persistStudySession(
  normalized: StudySessionResult,
  text: string,
  name: string,
  projectId?: string,
): string | undefined {
  try {
    const saved = saveStudyProject({
      id: projectId,
      title: normalized.title,
      sourceName: name,
      rawText: text,
      result: normalized,
    });
    return saved.id;
  } catch (error) {
    console.warn("[StudySession] save project failed", error);
    return projectId;
  }
}

function describeStudyFallback(error: unknown): string {
  devOnlyDiagnostic("study-fallback", error);
  return "Ho preparato una sessione di studio completa e utilizzabile. Puoi approfondire o rigenerare quando vuoi.";
}

function humanStudyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/QuotaExceededError|quota|exceeded|Storage/i.test(message)) {
    return "Materiale lungo rilevato. Ho creato sessioni di studio definitive e leggere da aprire, senza perdere il percorso.";
  }
  if (/immagine acquisita|scansione|pdf|docx|epub|formato|testo|ocr|image|decode|non leggibile/i.test(message)) {
    return STUDY_FILE_FALLBACK_COPY;
  }
  return getUserFriendlyError(error, {
    area: "study",
    fallback: "Non sono riuscito a completare l'operazione al primo tentativo. I dati della sessione restano salvati: puoi riprovare o caricare un file diverso.",
  });
}

const STUDY_STORAGE_QUOTA_COPY =
  "Spazio di archiviazione locale insufficiente. Puoi studiare in questa scheda; riapri o libera spazio per salvare la sessione.";

function toastAfterStudyCommit(
  outcome: { result: StudySessionResult; persistedInStore: boolean },
  options: {
    fallbackDescription?: string;
    successDescription?: string;
  } = {},
): void {
  if (!outcome.result) {
    toast.error("Sessione Studio non creata", {
      description: "Non è stato possibile preparare riassunti e quiz.",
    });
    return;
  }
  if (!outcome.persistedInStore) {
    toast.message("Sessione disponibile in questa scheda", {
      description: STUDY_STORAGE_QUOTA_COPY,
    });
    return;
  }
  if (options.fallbackDescription) {
    toast.message("Sessione Studio pronta", { description: options.fallbackDescription });
    return;
  }
  toast.success("Pipeline Study completata", {
    description: options.successDescription || "Riassunti, flashcard e quiz pronti — inizia la verifica.",
  });
}

function mapStoredSourceType(type: string): StudySourceType {
  if (type === "notes") return "manual";
  if (type === "text") return "txt";
  if (type === "epub") return "file";
  if (type === "image") return "image";
  if (type === "pdf" || type === "docx") return type;
  return "file";
}

export default function StudySessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const scannerAppendModeRef = useRef(false);
  const scannerPreviewUrlsRef = useRef<string[]>([]);
  const uxSaved = useMemo(loadStudyUxState, []);
  const initialSession = useMemo(() => createEmptyStudySession({ language: "Italian" }), []);

  const [studySession, setStudySession] = useState<StudySessionRecord>(initialSession);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [rawText, setRawText] = useState("");
  const [sourceName, setSourceName] = useState("testo-incollato.txt");
  const [result, setResult] = useState<StudySessionResult | null>(null);
  const [staleNotice, setStaleNotice] = useState("");
  const [reading, setReading] = useState(false);
  const [workStartedAt, setWorkStartedAt] = useState<number | undefined>();
  const [studyGenerationStatus, setStudyGenerationStatus] = useState("");
  const [readyStudySessionId, setReadyStudySessionId] = useState<string | null>(() => localStorage.getItem("scriptora-last-study-session"));
  const [aiMode, setAiMode] = useState<"idle" | "deepseek" | "local">("idle");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [scannerPages, setScannerPages] = useState<StudyScannerPage[]>([]);
  const [scannerStatus, setScannerStatus] = useState("");
  const [bookManifest, setBookManifest] = useState<StudyBookManifest | null>(null);
  const [activeBookChunkId, setActiveBookChunkId] = useState<string | null>(null);
  const [activeBookChunkText, setActiveBookChunkText] = useState("");
  const studyNoticeTimersRef = useRef<number[]>([]);
  const studyFallbackReasonRef = useRef<string | null>(null);

  const initialActiveSection = useMemo<StudySection>(() => {
    const saved = uxSaved.activeSection;
    if (saved === "questions" || saved === "vocabulary") return "quiz";
    return (TAB_CONFIG.some((tab) => tab.id === saved) ? saved : DEFAULT_STUDY_UX.activeSection) as StudySection;
  }, [uxSaved.activeSection]);
  const [activeSection, setActiveSection] = useState<StudySection>(initialActiveSection);
  const [studyLanguage, setStudyLanguage] = useState<
    "Italian" | "English" | "Spanish" | "French" | "German"
  >("Italian");
  const [studyMaterialType, setStudyMaterialType] = useState<StudyMaterialIntentType>("auto");
  const [studySubject, setStudySubject] = useState<StudySubjectIntent>("auto");
  const [literaryGenre, setLiteraryGenre] = useState<LiteraryGenreIntent>("auto");
  const [studyGoal, setStudyGoal] = useState<StudyGoalIntent>("complete_summary");
  const [difficultyLevel, setDifficultyLevel] = useState<StudyDifficultyLevel>(3);
  const studyIntent = useMemo<StudyIntentSettings>(() => ({
    studyMaterialType,
    studySubject,
    literaryGenre,
    studyGoal,
    difficultyLevel,
  }), [difficultyLevel, literaryGenre, studyGoal, studyMaterialType, studySubject]);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>(uxSaved.quizAnswers || {});
  const [currentQuizIndex, setCurrentQuizIndex] = useState(uxSaved.currentQuizIndex || 0);
  const [quizMode, setQuizMode] = useState<"practice" | "exam">(uxSaved.quizMode || "practice");
  const [quizOrder, setQuizOrder] = useState<number[]>(uxSaved.quizOrder || []);

  const [openAnswers, setOpenAnswers] = useState<Record<number, string>>(uxSaved.openAnswers || {});
  const [openEvaluations, setOpenEvaluations] = useState<Record<number, StudyAnswerEvaluation>>(
    (uxSaved.openEvaluations as Record<number, StudyAnswerEvaluation>) || {}
  );
  const [evaluatingOpenAnswer, setEvaluatingOpenAnswer] = useState<number | null>(null);
  const [flashcardConfidence, setFlashcardConfidence] = useState<Record<number, FlashcardConfidence>>(
    uxSaved.flashcardConfidence || {}
  );
  const [memorySnapshot, setMemorySnapshot] = useState<StudyMemorySnapshot | null>(null);
  const [spacedDeck, setSpacedDeck] = useState<SpacedFlashcard[]>([]);
  const [riassuntoLevel, setRiassuntoLevel] = useState<RiassuntoProLevel>("dettagliato");
  const [examQuizAnswers, setExamQuizAnswers] = useState<Record<number, number>>({});
  const [examLockdownActive, setExamLockdownActive] = useState(false);

  const hasScannerPages = scannerPages.length > 0;
  const wordCount = useMemo(() => rawText.trim().split(/\s+/).filter(Boolean).length, [rawText]);
  const studyInputKind = useMemo(() => classifyStudyInput(rawText), [rawText]);
  const studyChunkPlan = useMemo(() => createStudyChunkPlan(rawText, sourceName), [rawText, sourceName]);
  const sourceTextQuality = useMemo(() => {
    if (!rawText.trim()) return null;
    return evaluateStudyTextQuality(rawText, {
      sourceType: hasScannerPages ? "image" : detectStudySourceType(sourceName),
    });
  }, [hasScannerPages, rawText, sourceName]);
  const sourceQualityBlocksGeneration = Boolean(
    sourceTextQuality?.status === "fail" && (hasScannerPages || studyInputKind.kind === "real_material"),
  );
  const activeBookChunk = useMemo(
    () => bookManifest?.chunks.find((chunk) => chunk.id === activeBookChunkId) || null,
    [activeBookChunkId, bookManifest],
  );
  const currentStudyClassification = useMemo(() => {
    if (!rawText.trim()) return null;
    if (studyInputKind.kind === "topic_only") {
      return analyzeStudyMaterial(rawText, sourceName, studyIntent).classification;
    }
    if (studyInputKind.kind === "real_material") {
      return classifyStudyMaterial(rawText, sourceName, studyIntent);
    }
    return null;
  }, [rawText, sourceName, studyIntent, studyInputKind.kind]);
  const restoreStudyIntent = useCallback((source: any) => {
    const payload = source?.results?.analysis?.result || source?.result || source || {};
    if (payload.studyMaterialType) setStudyMaterialType(payload.studyMaterialType);
    if (payload.studySubject) setStudySubject(payload.studySubject);
    if (payload.literaryGenre) setLiteraryGenre(payload.literaryGenre);
    if (payload.studyGoal || payload.objective) setStudyGoal(payload.studyGoal || payload.objective);
    const storedLevel = Number(payload.difficultyLevel || payload.level);
    if ([1, 2, 3, 4, 5].includes(storedLevel)) setDifficultyLevel(storedLevel as StudyDifficultyLevel);
  }, []);
  const materialReadinessCopy = useMemo(() => {
    if (bookManifest && !activeBookChunkId) {
      return `${bookManifest.totalWords.toLocaleString("it-IT")} parole divise in ${bookManifest.chunks.length} sessioni. Scegli una sessione per iniziare.`;
    }
    if (sourceQualityBlocksGeneration) return STUDY_TEXT_NOT_READABLE_MESSAGE;
    if (sourceTextQuality?.status === "warning" && studyInputKind.kind === "real_material") return STUDY_TEXT_WARNING_MESSAGE;
    if (wordCount < 40 && studyInputKind.kind === "topic_only") {
      return `Argomento rilevato: modalità esplorazione disponibile (${wordCount} parole). Non simulerò una sessione completa.`;
    }
    if (studyInputKind.kind === "insufficient") {
      return `${STUDY_INSUFFICIENT_MESSAGE} Incolla testo, carica un PDF o inserisci un argomento (${wordCount}/40).`;
    }
    if (wordCount < 40) return `${t("study_min_words_hint")} (${wordCount}/40)`;
    if (currentStudyClassification?.contentType === "narrative_fiction") {
      return `Capitolo narrativo pronto per l'analisi. ${wordCount.toLocaleString("it-IT")} parole rilevate.`;
    }
    return `Materiale pronto per l'analisi. ${wordCount.toLocaleString("it-IT")} parole rilevate.`;
  }, [activeBookChunkId, bookManifest, currentStudyClassification?.contentType, sourceQualityBlocksGeneration, sourceTextQuality?.status, studyInputKind.kind, wordCount]);
  const scannerReadyPages = scannerPages.filter((page) => page.words > 0).length;
  const scannerCopy = useMemo(() => {
    if (!hasScannerPages) return "";
    if (reading) return scannerStatus || "Sto leggendo il testo dall'immagine...";
    if (sourceQualityBlocksGeneration) return STUDY_TEXT_NOT_READABLE_MESSAGE;
    if (sourceTextQuality?.status === "warning") return STUDY_TEXT_WARNING_MESSAGE;
    if (wordCount >= 40) return "Testo rilevato. Materiale pronto per l'analisi.";
    if (scannerReadyPages > 0) return "Ho letto parte del testo. Puoi correggerlo prima di continuare.";
    return STUDY_IMAGE_OCR_FALLBACK_COPY;
  }, [hasScannerPages, reading, scannerReadyPages, scannerStatus, sourceQualityBlocksGeneration, sourceTextQuality?.status, wordCount]);
  const canAnalyze = (studyInputKind.kind === "real_material" || studyInputKind.kind === "topic_only") && !reading && !sourceQualityBlocksGeneration;
  const currentSourceHash = useMemo(() => computeStudySourceHash(rawText, sourceName), [rawText, sourceName]);
  const resultFresh = Boolean(result && studySession.results.analysis?.sourceHash === currentSourceHash);

  const kernelPlan = useMemo<StudyKernelPlan | null>(() => buildSessionKernelPlan({
    text: rawText,
    sourceName,
    studySubject,
    studyGoal,
    difficultyLevel,
    intent: studyIntent,
    memory: memorySnapshot,
  }), [rawText, sourceName, studySubject, studyGoal, difficultyLevel, studyIntent, memorySnapshot]);

  useEffect(() => {
    let cancelled = false;
    void loadStudyMemory(studySession.id).then((snapshot) => {
      if (cancelled) return;
      setMemorySnapshot(snapshot);
      if (snapshot?.flashcardDeck?.length) {
        setSpacedDeck(snapshot.flashcardDeck);
      }
    });
    return () => { cancelled = true; };
  }, [studySession.id]);

  const resolveKernelSection = useCallback((text: string, name: string) => {
    const plan = buildSessionKernelPlan({
      text,
      sourceName: name,
      studySubject,
      studyGoal,
      difficultyLevel,
      intent: studyIntent,
      memory: memorySnapshot,
    });
    if (plan) setRiassuntoLevel(plan.summaryLevel);
    return plan ? studyModeToSection(plan.primaryMode) : "summary";
  }, [difficultyLevel, memorySnapshot, studyGoal, studyIntent, studyMaterialType, studySubject]);

  const clearScannerPages = useCallback(() => {
    scannerPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    scannerPreviewUrlsRef.current = [];
    setScannerPages([]);
    setScannerStatus("");
  }, []);

  const clearBookWorkspace = useCallback(() => {
    clearCurrentStudyBook();
    setBookManifest(null);
    setActiveBookChunkId(null);
    setActiveBookChunkText("");
  }, []);

  useEffect(() => () => {
    scannerPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    scannerPreviewUrlsRef.current = [];
  }, []);

  const resetSessionState = useCallback(() => {
    setQuizAnswers({});
    setCurrentQuizIndex(0);
    setQuizMode("practice");
    setQuizOrder([]);
    setOpenAnswers({});
    setOpenEvaluations({});
    setSpacedDeck([]);
    saveStudyUxState({
      quizAnswers: {},
      currentQuizIndex: 0,
      quizMode: "practice",
      quizOrder: [],
      openAnswers: {},
      openEvaluations: {},
    });
  }, []);

  const replaceStudySource = useCallback((
    text: string,
    name = "testo-incollato.txt",
    sourceType?: StudySourceType,
    options: { toastChanged?: boolean } = {},
  ) => {
    const hadResult = Boolean(studySession.results.analysis || result);
    const next = updateStudySessionSource(studySession, { sourceText: text, sourceName: name, sourceType });
    setStudySession(next.session);
    setRawText(next.session.sourceText);
    if (activeBookChunkId) setActiveBookChunkText(next.session.sourceText);
    setSourceName(next.session.sourceName || name);
    setImportWarnings([]);
    if (next.sourceChanged) {
      if (!activeBookChunkId) clearBookWorkspace();
      setResult(null);
      setProjectId(undefined);
      resetSessionState();
      setStaleNotice(hadResult ? "Nuovo materiale rilevato. I risultati precedenti sono stati separati da questa sessione." : "");
      if (options.toastChanged && hadResult) {
        toast.message("Nuovo materiale rilevato", {
          description: "I risultati vecchi non verranno mostrati sopra il nuovo testo.",
        });
      }
    }
  }, [activeBookChunkId, clearBookWorkspace, result, resetSessionState, studySession]);

  const commitStudyResult = useCallback((
    normalized: StudySessionResult,
    text: string,
    name: string,
    baseSession: StudySessionRecord = studySession,
    sourceType?: StudySourceType,
    projectOverride: string | undefined = projectId,
  ): { result: StudySessionResult; persistedInStore: boolean } => {
    const prepared = updateStudySessionSource(baseSession, { sourceText: text, sourceName: name, sourceType }).session;
    const withIntent = {
      ...prepared,
      level: String(difficultyLevel),
      objective: studyGoal,
      studyMaterialType,
      studySubject,
      literaryGenre,
      studyGoal,
      difficultyLevel,
    };
    const enriched = {
      ...normalized,
      studyMaterialType,
      studySubject,
      literaryGenre,
      studyGoal,
      difficultyLevel,
    };
    const stored = attachStudyResult(withIntent, enriched);
    setStudySession(stored);
    setCurrentStudySessionId(stored.id);
    setReadyStudySessionId(stored.id);
    try { localStorage.setItem("scriptora-last-study-session", stored.id); } catch { /* noop */ }
    const nextSection = resolveKernelSection(text, name);
    setActiveSection(nextSection);
    saveStudyUxState({ activeSection: nextSection });
    setRawText(stored.sourceText);
    setSourceName(stored.sourceName || name);
    const committed = resolveCommittedStudyResult(stored, enriched);
    setResult(committed.result);
    setStaleNotice("");
    resetSessionState();
    const id = persistStudySession(enriched, text, name, projectOverride);
    setProjectId(id);
    return committed;
  }, [difficultyLevel, literaryGenre, projectId, resetSessionState, resolveKernelSection, studyGoal, studyMaterialType, studySession, studySubject]);

  const startNewStudySession = useCallback(() => {
    clearScannerPages();
    const next = createEmptyStudySession({ language: studyLanguage });
    setStudySession(next);
    setRawText("");
    setSourceName("testo-incollato.txt");
    setResult(null);
    setProjectId(undefined);
    setStaleNotice("");
    setAiMode("idle");
    setStudyGenerationStatus("");
    setReadyStudySessionId(null);
    clearBookWorkspace();
    try { localStorage.removeItem("scriptora-last-study-session"); } catch { /* noop */ }
    setImportWarnings([]);
    setStudyMaterialType("auto");
    setStudySubject("auto");
    setLiteraryGenre("auto");
    setStudyGoal("complete_summary");
    setDifficultyLevel(3);
    setCurrentStudySessionId(null);
    resetSessionState();
    toast.success("Nuova sessione pulita");
  }, [clearBookWorkspace, clearScannerPages, resetSessionState, studyLanguage]);

  const openBookChunk = useCallback((manifest: StudyBookManifest, chunkId: string, silent = false) => {
    const chunk = manifest.chunks.find((item) => item.id === chunkId);
    if (!chunk) {
      toast.error("Sessione libro non trovata");
      return;
    }

    try {
      const text = readStudyBookChunkText(manifest, chunkId);
      const storedResult = readStudyBookChunkResult(manifest, chunkId);
      const name = `${manifest.sourceName} — ${chunk.title}`;
      const nextSession = updateStudySessionSource(createEmptyStudySession({ language: studyLanguage }), {
        sourceText: text,
        sourceName: name,
        sourceType: manifest.sourceType,
      }).session;

      setBookManifest(manifest);
      setActiveBookChunkId(chunkId);
      setActiveBookChunkText(text);
      setCurrentStudyBookChunkId(chunkId);
      setStudySession(nextSession);
      setCurrentStudySessionId(null);
      setRawText(text);
      setSourceName(name);
      setResult(storedResult);
      setProjectId(undefined);
      setStaleNotice("");
      setImportWarnings([]);
      setAiMode(storedResult ? "local" : "idle");
      setActiveSection(storedResult ? "summary" : "materials");
      resetSessionState();
      if (!silent) {
        toast.message(storedResult ? "Sessione già pronta" : "Sessione selezionata", {
          description: `${chunk.title} · ${chunk.wordCount.toLocaleString("it-IT")} parole`,
        });
      }
    } catch (error) {
      toast.error("Sessione libro non disponibile", {
        description: humanStudyErrorMessage(error),
      });
    }
  }, [resetSessionState, studyLanguage]);

  const createBookManifestFromText = useCallback((text: string, name: string, sourceType: StudySourceType) => {
    const manifest = createAndSaveStudyBookManifest(text, name, sourceType);
    if (!manifest) return null;

    setBookManifest(manifest);
    setActiveBookChunkId(null);
    setActiveBookChunkText("");
    setCurrentStudyBookChunkId(null);
    setRawText("");
    setSourceName(manifest.sourceName);
    setResult(null);
    setProjectId(undefined);
    setStaleNotice("");
    setAiMode("idle");
    setActiveSection("materials");
    resetSessionState();
    toast.success("Libro diviso in sessioni di studio", {
      description: `${manifest.chunks.length} sessioni pronte. Scegli un capitolo: analizzerò solo quello.`,
    });
    return manifest;
  }, [resetSessionState]);

  useEffect(() => {
    const state = location.state as { projectId?: string; sessionId?: string } | null;
    if (state?.sessionId) {
      const session = getStudySession(state.sessionId);
      if (!session) {
        toast.error("Sessione Study non trovata");
        navigate(location.pathname, { replace: true, state: null });
        return;
      }
      setStudySession(session);
      setCurrentStudySessionId(session.id);
      setProjectId(undefined);
      setRawText(session.sourceText);
      setSourceName(session.sourceName || "sessione-studio.txt");
      setResult(getFreshStudyResult(session));
      restoreStudyIntent(session);
      setStaleNotice(getFreshStudyResult(session) ? "" : "Risultati da rigenerare per il materiale di questa sessione.");
      resetSessionState();
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    if (!state?.projectId) {
      const currentBookId = getCurrentStudyBookManifestId();
      const manifest = currentBookId ? getStudyBookManifest(currentBookId) : null;
      if (manifest) {
        const chunkId = getCurrentStudyBookChunkId();
        setBookManifest(manifest);
        if (chunkId && manifest.chunks.some((chunk) => chunk.id === chunkId)) {
          openBookChunk(manifest, chunkId, true);
        } else {
          setActiveBookChunkId(null);
          setActiveBookChunkText("");
          setRawText("");
          setSourceName(manifest.sourceName);
          setResult(null);
          setProjectId(undefined);
          setStaleNotice("");
          setAiMode("idle");
          setActiveSection("materials");
        }
        return;
      }
      const currentId = getCurrentStudySessionId();
      if (!currentId) return;
      const session = getStudySession(currentId);
      if (!session) return;
      const fresh = getFreshStudyResult(session);
      const linkedProject = listStudyProjects().find((project) => project.sourceHash === session.sourceHash);
      setStudySession(session);
      setCurrentStudySessionId(session.id);
      setProjectId(linkedProject?.id);
      setRawText(session.sourceText);
      setSourceName(session.sourceName || "sessione-studio.txt");
      setResult(fresh);
      restoreStudyIntent(session);
      setStaleNotice(fresh ? "" : "Risultati da rigenerare per il materiale di questa sessione.");
      resetSessionState();
      return;
    }
    const project = getStudyProject(state.projectId);
    if (!project) {
      toast.error("Progetto Study non trovato");
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    const text = project.rawText || project.rawTextPreview || "";
    const normalized = normalizeStudyResultForUI(project.result);
    const opened = attachStudyResult(createEmptyStudySession({
      sourceText: text,
      sourceName: project.sourceName,
      sourceType: mapStoredSourceType(project.sourceType),
      language: studyLanguage,
    }), normalized);
    setStudySession(opened);
    setCurrentStudySessionId(opened.id);
    setProjectId(project.id);
    setRawText(text);
    setSourceName(project.sourceName);
    setResult(getFreshStudyResult(opened));
    restoreStudyIntent(normalized);
    setStaleNotice("");
    setActiveSection("quiz");
    resetSessionState();
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, openBookChunk, restoreStudyIntent]);

  const handleExamComplete = useCallback(
    (report: { score: number; mode: "practice" | "exam"; total: number; correct: number; grade10?: number; grade30?: number; judgement?: string }) => {
      if (!projectId) return;
      const updated = recordStudyQuizAttempt(projectId, {
        score: report.score,
        mode: report.mode,
        totalQuestions: report.total,
        correctCount: report.correct,
        grade10: report.grade10,
        grade30: report.grade30,
        judgement: report.judgement,
      });
      if (!updated) return;

      const metrics = getStudyLearningMetrics();
      const badges = evaluateStudyAchievements({
        sessions: metrics.sessions,
        words: updated.rawTextLength,
        latestScore: report.score,
        totalAttempts: updated.quizAttempts.length,
        examCompleted: report.mode === "exam",
      });
      if (badges.length) {
        addStudyProjectBadges(projectId, badges);
        const labels = badges.map((id) => achievementById(id)?.label || id).join(", ");
        toast.success(`Badge sbloccati: ${labels}`);
      }

      if (report.score >= 50) {
        const identity = getSelectedAuthorIdentity();
        const studentName = identity.penName || identity.realName || identity.name || "Studente Scriptora";
        const level =
          report.score >= 90 ? "Advanced" : report.score >= 75 ? "Proficient" : report.score >= 55 ? "Developing" : "Beginner";
        const certificateInput = {
          studentName,
          subject: updated.result.detectedSubject || updated.title,
          date: new Date().toLocaleDateString(),
          score: report.score,
          level,
          grade10: report.grade10,
          grade30: report.grade30,
          judgement: report.judgement,
          sourceProjectId: projectId,
          badges: badges.map((id) => achievementById(id)?.label || id),
        };
        if (report.mode === "exam") {
          saveStudyCertificate(certificateInput);
        }
        toast.success("Verifica completata", {
          description: `Punteggio ${report.score}/100 — scarica il certificato`,
          action: {
            label: "Certificato PDF",
            onClick: () => {
              void downloadStudyCertificate(certificateInput);
            },
          },
        });
      }
    },
    [projectId],
  );

  const handleSectionChange = useCallback((section: StudySection) => {
    setActiveSection(section);
    saveStudyUxState({ activeSection: section });
  }, []);

  const clearStudyNoticeTimers = useCallback(() => {
    studyNoticeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    studyNoticeTimersRef.current = [];
  }, []);

  useEffect(() => clearStudyNoticeTimers, [clearStudyNoticeTimers]);

  const generateStudyResultWithRuntimeGuard = useCallback(
    async (text: string, name: string): Promise<StudySessionResult> => {
      clearStudyNoticeTimers();
      studyFallbackReasonRef.current = null;

      const inputKind = classifyStudyInput(text);
      if (inputKind.kind === "topic_only" || inputKind.kind === "insufficient") {
        setStudyGenerationStatus(
          inputKind.kind === "topic_only"
            ? "Preparo una panoramica esplorativa sull'argomento..."
            : STUDY_INSUFFICIENT_MESSAGE,
        );
        setAiMode("local");
        return normalizeStudyResultForUI(analyzeStudyMaterial(text, name, studyIntent));
      }

      const quality = evaluateStudyTextQuality(text, {
        sourceType: hasScannerPages ? "image" : detectStudySourceType(name),
      });
      if (!canGenerateStudyOutputs(quality)) {
        setStudyGenerationStatus(STUDY_TEXT_NOT_READABLE_MESSAGE);
        setAiMode("idle");
        return normalizeStudyResultForUI(analyzeStudyMaterial(text, name, studyIntent));
      }

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      const isHugeMaterial = wordCount > 60000 || text.length > 320000;
      const isLongMaterial = wordCount > 12000 || text.length > 70000;

      if (isHugeMaterial) {
        setStudyGenerationStatus(`Documento molto lungo rilevato: ${wordCount.toLocaleString("it-IT")} parole. Preparo overview, indice intelligente e piano studio a blocchi...`);
      } else if (isLongMaterial) {
        setStudyGenerationStatus(`Materiale lungo rilevato: ${wordCount.toLocaleString("it-IT")} parole. Preparo un'analisi ottimizzata dei capitoli principali...`);
      } else {
        setStudyGenerationStatus("Sto analizzando il materiale e preparando la sessione...");
      }
      setAiMode("deepseek");

      studyNoticeTimersRef.current = [
        window.setTimeout(
          () => setStudyGenerationStatus("Ci sta mettendo più del previsto. Sto continuando l'analisi..."),
          30_000,
        ),
        window.setTimeout(
          () => setStudyGenerationStatus("Sto preparando una sessione studiabile e completa per questo materiale."),
          90_000,
        ),
      ];

      let fallbackTimer: number | null = null;
      const aiResult = generateStudySessionWithAI({
        text,
        sourceName: name,
        language: studyLanguage,
        intent: studyIntent,
      });
      const safeLocalFallback = new Promise<StudySessionResult>((resolve) => {
        fallbackTimer = window.setTimeout(() => {
          const fallbackWordCount = text.trim().split(/\s+/).filter(Boolean).length;
          const isLongOrHugeFallback = fallbackWordCount > 12000 || text.length > 70000;
          studyFallbackReasonRef.current = isLongOrHugeFallback
            ? "Materiale lungo acquisito. Ho creato sessioni definitive: apri un capitolo o una sezione e studialo con riassunto, quiz e flashcard."
            : "Ho preparato una sessione di studio completa e utilizzabile. Puoi approfondire o rigenerare quando vuoi.";
          setStudyGenerationStatus(studyFallbackReasonRef.current);
          setAiMode("local");
          trackScriptoraEvent({ eventName: "study_fallback_local_used", tool: "study", success: true, errorCategory: "timeout" });
          resolve(normalizeStudyResultForUI(analyzeStudyMaterial(text, name, studyIntent)));
        }, 120_000);
      });

      try {
        return normalizeStudyResultForUI(await Promise.race([aiResult, safeLocalFallback]));
      } finally {
        if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
        clearStudyNoticeTimers();
      }
    },
    [clearStudyNoticeTimers, hasScannerPages, studyIntent, studyLanguage],
  );

  const generateActiveBookChunkAnalysis = useCallback(async () => {
    if (!bookManifest || !activeBookChunk || !rawText.trim()) {
      toast.error("Scegli una sessione del libro", {
        description: "Apri un capitolo o un blocco prima di generare riassunto e quiz.",
      });
      return;
    }
    const quality = evaluateStudyTextQuality(rawText, { sourceType: bookManifest.sourceType });
    if (!canGenerateStudyOutputs(quality)) {
      const failedManifest = updateStudyBookChunk(bookManifest.id, activeBookChunk.id, {
        status: "error",
        errorMessage: STUDY_TEXT_NOT_READABLE_MESSAGE,
      });
      if (failedManifest) setBookManifest(failedManifest);
      setActiveSection("materials");
      toast.error("Testo non leggibile", {
        description: STUDY_TEXT_NOT_READABLE_MESSAGE,
      });
      return;
    }

    setReading(true);
    setWorkStartedAt(Date.now());
    setAiMode("deepseek");
    const manifestId = bookManifest.id;
    const chunkId = activeBookChunk.id;
    const name = `${bookManifest.sourceName} — ${activeBookChunk.title}`;
    const text = rawText;

    try {
      const analyzingManifest = updateStudyBookChunk(manifestId, chunkId, { status: "analyzing", errorMessage: undefined });
      if (analyzingManifest) setBookManifest(analyzingManifest);

      const next = await generateStudyResultWithRuntimeGuard(text, name);
      const normalized = normalizeStudyResultForUI(next);
      commitStudyResult(normalized, text, name, studySession, bookManifest.sourceType, undefined);
      const readyManifest = saveStudyBookChunkResult(manifestId, chunkId, normalized);
      if (readyManifest) setBookManifest(readyManifest);
      toast.success("Sessione del libro pronta", {
        description: `${activeBookChunk.title}: riassunto, quiz e flashcard generati.`,
      });
      trackScriptoraEvent({ eventName: "study_summary_generated", tool: "study", success: true });
      trackScriptoraEvent({ eventName: "study_quiz_generated", tool: "study", success: true });
    } catch (error) {
      devOnlyDiagnostic("study-book-chunk-ai-fallback", error);
      try {
        const local = analyzeStudyMaterial(text, name, studyIntent);
        const normalized = normalizeStudyResultForUI(local);
        commitStudyResult(normalized, text, name, studySession, bookManifest.sourceType, undefined);
        const readyManifest = saveStudyBookChunkResult(manifestId, chunkId, normalized);
        if (readyManifest) setBookManifest(readyManifest);
        setAiMode("local");
        toast.message("Sessione del libro pronta", {
          description: describeStudyFallback(error),
        });
      } catch (fallbackError) {
        const failedManifest = updateStudyBookChunk(manifestId, chunkId, {
          status: "error",
          errorMessage: humanStudyErrorMessage(fallbackError),
        });
        if (failedManifest) setBookManifest(failedManifest);
        toast.error("Sessione libro non creata", {
          description: humanStudyErrorMessage(fallbackError),
        });
      }
    } finally {
      setReading(false);
      setStudyGenerationStatus("");
    }
  }, [
    activeBookChunk,
    bookManifest,
    commitStudyResult,
    generateStudyResultWithRuntimeGuard,
    rawText,
    studyIntent,
    studySession,
  ]);

  const analyze = async () => {
    if (sourceQualityBlocksGeneration) {
      setActiveSection("materials");
      saveStudyUxState({ activeSection: "materials" });
      toast.error("Testo non leggibile", {
        description: STUDY_TEXT_NOT_READABLE_MESSAGE,
        action: {
          label: hasScannerPages ? "Riscatta foto" : "Incolla testo manualmente",
          onClick: () => (hasScannerPages ? openCameraCapture(false) : textAreaRef.current?.focus()),
        },
      });
      return;
    }

    if (bookManifest) {
      if (!activeBookChunkId) {
        toast.message("Scegli una sessione del libro", {
          description: "Il libro è già diviso: apri un capitolo e genererò solo quel blocco.",
        });
        return;
      }
      await generateActiveBookChunkAnalysis();
      return;
    }

    if (studyChunkPlan.shouldUseChunks) {
      try {
        createBookManifestFromText(rawText, sourceName, hasScannerPages ? "image" : detectStudySourceType(sourceName));
      } catch (error) {
        toast.error("Non riesco a dividere il libro", {
          description: humanStudyErrorMessage(error),
        });
      }
      return;
    }

    if (studyInputKind.kind === "insufficient") {
      toast.error(STUDY_INSUFFICIENT_MESSAGE, {
        description: "Incolla almeno 40 parole, carica un PDF o inserisci un argomento esplorabile (es. «Intelligenza Artificiale»).",
      });
      return;
    }

    if (!canAnalyze) {
      toast.error("Materiale troppo breve", { description: "Carica o incolla almeno 40 parole, oppure inserisci un argomento." });
      return;
    }

    setReading(true);
    setWorkStartedAt(Date.now());
    setAiMode("deepseek");

    try {
      const next = await generateStudyResultWithRuntimeGuard(rawText, sourceName);
      const normalized = normalizeStudyResultForUI(next);
      const committed = commitStudyResult(normalized, rawText, sourceName, studySession, hasScannerPages ? "image" : detectStudySourceType(sourceName));
      toastAfterStudyCommit(committed, {
        fallbackDescription: normalized.sessionMode === "topic"
          ? "Modalità esplorazione attiva: nessun quiz o simulazione esame finché non carichi materiale reale."
          : studyFallbackReasonRef.current || undefined,
      });
      trackScriptoraEvent({ eventName: "study_summary_generated", tool: "study", success: true, projectId });
      trackScriptoraEvent({ eventName: "study_quiz_generated", tool: "study", success: true, projectId });
    } catch (error) {
      devOnlyDiagnostic("study-ai-fallback", error);
      try {
        const local = analyzeStudyMaterial(rawText, sourceName, studyIntent);
        const normalized = normalizeStudyResultForUI(local);
        const committed = commitStudyResult(normalized, rawText, sourceName, studySession, hasScannerPages ? "image" : detectStudySourceType(sourceName));
        setAiMode("local");
        trackScriptoraEvent({ eventName: "study_fallback_local_used", tool: "study", success: true, errorCategory: "provider" });
        toastAfterStudyCommit(committed, { fallbackDescription: describeStudyFallback(error) });
      } catch (fallbackError) {
        console.error("[StudySession] local fallback failed", fallbackError);
        toast.error("Sessione Studio non creata", {
          description: humanStudyErrorMessage(fallbackError),
        });
      }
    } finally {
      setReading(false);
      setStudyGenerationStatus("");
    }
  };

  async function evaluateOpenAnswer(index: number, question: string, answerGuide: string) {
    const answer = (openAnswers[index] || "").trim();

    if (answer.split(/\s+/).filter(Boolean).length < 12) {
      toast.error("Risposta troppo breve", { description: "Scrivi almeno 2-3 frasi prima di chiedere la valutazione." });
      return;
    }

    setEvaluatingOpenAnswer(index);

    try {
      const evaluation = await evaluateStudyAnswerWithAI({
        materialTitle: result?.title || sourceName,
        question,
        answerGuide,
        answer,
        language: studyLanguage,
      });

      setOpenEvaluations((prev) => {
        const next = { ...prev, [index]: evaluation };
        saveStudyUxState({ openEvaluations: next });
        return next;
      });
      void recordOralEvaluation(studySession.id, subjectMemoryLabel, {
        questionIndex: index,
        score: evaluation.score,
      }).then(setMemorySnapshot);
      toast.success(`Risposta valutata: ${evaluation.score}/100`);
    } catch (error) {
      toast.error("Valutazione non riuscita", {
        description: "La risposta è salvata. Riprova tra poco o continua con la correzione manuale guidata.",
      });
    } finally {
      setEvaluatingOpenAnswer(null);
    }
  }

  const openStudyInBrowser = useCallback(() => {
    const currentSourceType = hasScannerPages ? "image" : detectStudySourceType(sourceName);
    const current = updateStudySessionSource(studySession, {
      sourceText: rawText,
      sourceName,
      sourceType: currentSourceType,
    }).session;
    const stored = saveStudySession(current);
    setStudySession(stored);
    setCurrentStudySessionId(stored.id);
    window.open("https://scriptora-os.vercel.app/study-session", "_blank", "noopener,noreferrer");
  }, [hasScannerPages, rawText, sourceName, studySession]);

  function openImagePicker(append = false) {
    scannerAppendModeRef.current = append;
    imageInputRef.current?.click();
  }

  function openCameraCapture(append = false) {
    scannerAppendModeRef.current = append;
    if (
      typeof navigator !== "undefined" &&
      !navigator.mediaDevices &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    ) {
      toast.message("Questa funzione richiede il browser completo", {
        description: "Continua da browser collegandoti a Scriptora dal link diretto.",
        action: {
          label: "Continua da browser",
          onClick: openStudyInBrowser,
        },
      });
    }
    cameraInputRef.current?.click();
  }

  function commitScannerSource(pages: StudyScannerPage[], warnings: string[]) {
    const text = buildScannerText(pages);
    const name = pages.length === 1 ? pages[0].fileName : `${pages.length} pagine acquisite`;
    const fileSession = updateStudySessionSource(createEmptyStudySession({ language: studyLanguage }), {
      sourceText: text,
      sourceName: name,
      sourceType: "image",
    }).session;
    setStudySession(fileSession);
    setCurrentStudySessionId(null);
    setRawText(text);
    setSourceName(name);
    setResult(null);
    setProjectId(undefined);
    setStaleNotice("");
    setImportWarnings([...new Set(warnings.filter(Boolean))]);
    resetSessionState();
  }

  async function handleScannerImages(fileList?: FileList | File[] | null, append = false) {
    const files = Array.from(fileList || []).filter(isStudyImageFile);
    if (!files.length) {
      toast.error("Immagine non valida", {
        description: "Carica JPG, PNG, WebP, HEIC o scatta una foto dal dispositivo.",
      });
      return;
    }

    setStudyMaterialType("image_page");
    if (!append) clearScannerPages();

    const basePages = append ? scannerPages : [];
    const incomingPages = files.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      scannerPreviewUrlsRef.current.push(previewUrl);
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        fileName: file.name || `pagina-${basePages.length + index + 1}.jpg`,
        previewUrl,
        text: "",
        words: 0,
        status: "reading" as StudyScannerPageStatus,
        warnings: [STUDY_IMAGE_OCR_HINT],
      };
    });

    let workingPages = [...basePages, ...incomingPages];
    setScannerPages(workingPages);
    commitScannerSource(workingPages, workingPages.flatMap((page) => page.warnings));
    setReading(true);
    setWorkStartedAt(Date.now());
    setAiMode("idle");
    setStudyGenerationStatus("Sto leggendo il testo dall'immagine...");
    setScannerStatus("Sto preparando la foto...");

    try {
      for (const incomingPage of incomingPages) {
        let readResult: StudyFileReadResult | null = null;
        try {
          readResult = await readStudyFileDetailed(incomingPage.file, {
            imageOcr: {
              onStatus: (_status, message) => {
                setScannerStatus(message);
                setStudyGenerationStatus(message);
              },
            },
          });
        } catch (error) {
          readResult = {
            fileName: incomingPage.fileName,
            sourceType: "image",
            text: "",
            warnings: [humanStudyErrorMessage(error), STUDY_IMAGE_OCR_FALLBACK_COPY],
            empty: true,
          };
        }

        const pageQuality = readResult.text.trim()
          ? evaluateStudyTextQuality(readResult.text, { sourceType: "image" })
          : null;
        const words = readResult.text.trim().split(/\s+/).filter(Boolean).length;
        const status: StudyScannerPageStatus = pageQuality?.status === "fail"
          ? "failed"
          : pageQuality?.status === "warning"
            ? "partial"
            : words >= 40 ? "ready" : words > 0 ? "partial" : "failed";
        workingPages = workingPages.map((page) =>
          page.id === incomingPage.id
            ? {
                ...page,
                text: readResult.text,
                words,
                status,
                warnings: pageQuality ? [...readResult.warnings, ...pageQuality.detectedIssues] : readResult.warnings,
              }
            : page,
        );
        setScannerPages(workingPages);
        commitScannerSource(workingPages, workingPages.flatMap((page) => page.warnings));
      }

      const finalText = buildScannerText(workingPages);
      const finalWords = finalText.trim().split(/\s+/).filter(Boolean).length;
      trackScriptoraEvent({
        eventName: "study_material_uploaded",
        tool: "study",
        success: true,
        errorCategory: finalWords > 0 ? undefined : "ocr_unavailable",
      });

      const finalQuality = finalText.trim() ? evaluateStudyTextQuality(finalText, { sourceType: "image" }) : null;
      if (finalQuality?.status === "fail") {
        toast.error("Testo non leggibile", {
          description: STUDY_TEXT_NOT_READABLE_MESSAGE,
          action: {
            label: "Riscatta foto",
            onClick: () => openCameraCapture(false),
          },
        });
      } else if (finalQuality?.status === "warning") {
        toast.message("Testo da ricontrollare", {
          description: STUDY_TEXT_WARNING_MESSAGE,
        });
      } else if (finalWords >= 40) {
        toast.success("Testo rilevato", {
          description: "Materiale pronto per l'analisi.",
        });
      } else if (finalWords > 0) {
        toast.message("OCR parziale", {
          description: "Ho letto parte del testo. Puoi correggerlo prima di continuare.",
        });
      } else {
        toast.message("Immagine acquisita", {
          description: STUDY_IMAGE_OCR_FALLBACK_COPY,
          action: {
            label: "Continua da browser",
            onClick: openStudyInBrowser,
          },
        });
      }
    } finally {
      setReading(false);
      setStudyGenerationStatus("");
      setScannerStatus("");
    }
  }

  async function retryScannerOcr() {
    if (!scannerPages.length) return;
    await handleScannerImages(scannerPages.map((page) => page.file), false);
  }

  const handleFiles = async (fileList?: FileList | File[] | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (files.every(isStudyImageFile)) {
      await handleScannerImages(files, false);
      return;
    }
    clearScannerPages();
    setReading(true);
    setWorkStartedAt(Date.now());
    try {
      const readResult = await readStudyFiles(files);
      trackScriptoraEvent({ eventName: "study_material_uploaded", tool: "study", success: true });
      const text = readResult.text;
      const sourceType = readResult.sourceType === "pdf" || readResult.sourceType === "docx" || readResult.sourceType === "txt" || readResult.sourceType === "image"
        ? readResult.sourceType
        : "file";
      const importQuality = text.trim()
        ? evaluateStudyTextQuality(text, { sourceType })
        : null;
      if (importQuality?.status === "fail") {
        const fileSession = updateStudySessionSource(createEmptyStudySession({ language: studyLanguage }), {
          sourceText: text,
          sourceName: readResult.fileName,
          sourceType,
        }).session;
        const storedManualSession = saveStudySession(fileSession);
        setStudySession(storedManualSession);
        setCurrentStudySessionId(storedManualSession.id);
        setRawText(text);
        setSourceName(readResult.fileName);
        setResult(null);
        setProjectId(undefined);
        setStaleNotice("");
        setImportWarnings([...readResult.warnings, ...importQuality.detectedIssues]);
        setAiMode("idle");
        setActiveSection("materials");
        resetSessionState();
        toast.error("Testo non leggibile", {
          description: STUDY_TEXT_NOT_READABLE_MESSAGE,
          action: {
            label: sourceType === "image" ? "Riscatta foto" : "Incolla testo manualmente",
            onClick: () => (sourceType === "image" ? openCameraCapture(false) : textAreaRef.current?.focus()),
          },
        });
        return;
      }
      if (importQuality?.status === "warning") {
        setImportWarnings([...readResult.warnings, STUDY_TEXT_WARNING_MESSAGE, ...importQuality.detectedIssues]);
      }
      const fileImportWarnings = importQuality?.status === "warning"
        ? [...readResult.warnings, STUDY_TEXT_WARNING_MESSAGE, ...importQuality.detectedIssues]
        : readResult.warnings;

      const bookManifestCandidate = createAndSaveStudyBookManifest(text, readResult.fileName, sourceType);
      if (bookManifestCandidate) {
        const emptyBookSession = updateStudySessionSource(createEmptyStudySession({ language: studyLanguage }), {
          sourceText: "",
          sourceName: readResult.fileName,
          sourceType,
        }).session;
        setStudySession(emptyBookSession);
        setCurrentStudySessionId(null);
        setBookManifest(bookManifestCandidate);
        setActiveBookChunkId(null);
        setActiveBookChunkText("");
        setCurrentStudyBookChunkId(null);
        setRawText("");
        setSourceName(readResult.fileName);
        setResult(null);
        setProjectId(undefined);
        setStaleNotice("");
        setImportWarnings(fileImportWarnings);
        setAiMode("idle");
        setActiveSection("materials");
        resetSessionState();
        toast.success("Libro diviso in sessioni di studio", {
          description: `${bookManifestCandidate.chunks.length} sessioni pronte. Scegli una sessione: analizzerò solo quella.`,
        });
        return;
      }

      const fileSession = updateStudySessionSource(createEmptyStudySession({ language: studyLanguage }), {
        sourceText: text,
        sourceName: readResult.fileName,
        sourceType,
      }).session;
      setStudySession(fileSession);
      setCurrentStudySessionId(null);
      setRawText(text);
      setSourceName(readResult.fileName);
      setResult(null);
      setProjectId(undefined);
      setStaleNotice("");
      setImportWarnings(fileImportWarnings);
      resetSessionState();
      setAiMode("deepseek");

      if (readResult.empty || text.trim().split(/\s+/).filter(Boolean).length < 12) {
        const storedManualSession = saveStudySession(fileSession);
        setStudySession(storedManualSession);
        setCurrentStudySessionId(storedManualSession.id);
        setActiveSection("materials");
        saveStudyUxState({ activeSection: "materials" });
        setAiMode("idle");
        trackScriptoraEvent({
          eventName: "study_fallback_local_used",
          tool: "study",
          success: true,
          errorCategory: readResult.sourceType === "image" ? "ocr_unavailable" : "short_text",
        });
        toast.message(readResult.sourceType === "image" ? "Immagine acquisita" : "Materiale acquisito", {
          description: readResult.sourceType === "image"
            ? STUDY_FILE_FALLBACK_COPY
            : "Serve un testo un po' piu' lungo prima di creare riassunti, quiz e interrogazione.",
          action: readResult.sourceType === "image"
            ? {
                label: "Continua da browser",
                onClick: () => window.open("https://scriptora-os.vercel.app/study-session", "_blank", "noopener,noreferrer"),
              }
            : undefined,
        });
        return;
      }

      try {
        const next = await generateStudyResultWithRuntimeGuard(text, readResult.fileName);
        const normalized = normalizeStudyResultForUI(next);
        const committed = commitStudyResult(normalized, text, readResult.fileName, fileSession, sourceType, undefined);
        toastAfterStudyCommit(committed, {
          fallbackDescription: studyFallbackReasonRef.current || undefined,
          successDescription: `${readResult.fileName} — quiz e verifica pronti.`,
        });
        trackScriptoraEvent({ eventName: "study_summary_generated", tool: "study", success: true });
        trackScriptoraEvent({ eventName: "study_quiz_generated", tool: "study", success: true });
      } catch (error) {
        devOnlyDiagnostic("study-file-ai-fallback", error);
        try {
          const local = analyzeStudyMaterial(text, readResult.fileName, studyIntent);
          const normalized = normalizeStudyResultForUI(local);
          const committed = commitStudyResult(normalized, text, readResult.fileName, fileSession, sourceType, undefined);
          setAiMode("local");
          trackScriptoraEvent({ eventName: "study_fallback_local_used", tool: "study", success: true, errorCategory: "provider" });
          toastAfterStudyCommit(committed, { fallbackDescription: describeStudyFallback(error) });
        } catch (fallbackError) {
          console.error("[StudySession] local file fallback failed", fallbackError);
          toast.error("Sessione Studio non creata", {
            description: humanStudyErrorMessage(fallbackError),
          });
        }
      }
    } catch (error) {
      toast.error("File non leggibile", {
        description: humanStudyErrorMessage(error),
        action: {
          label: "Continua da browser",
          onClick: () => window.open("https://scriptora-os.vercel.app/study-session", "_blank", "noopener,noreferrer"),
        },
      });
    } finally {
      setReading(false);
      setStudyGenerationStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const readyResult = result || studySession.results.analysis?.result || null;
  const hasReadyStudySession = Boolean(readyStudySessionId && readyResult);
  const safeResult = resultFresh ? result : readyResult;
  const safeDifficultWords = safeResult?.difficultWords || [];
  const safeFlashcards = safeResult?.flashcards || [];
  const safeQuiz = safeResult?.quiz || [];
  const safeTrueFalse = safeResult?.trueFalse || [];
  const safeOpenQuestions = safeResult?.openQuestions || [];
  const safeKeyConcepts = safeResult?.keyConcepts || [];
  const safeExercises = safeResult?.exercises || [];
  const safeCombinedQuiz = useMemo(() => [...safeQuiz, ...safeTrueFalse], [safeQuiz, safeTrueFalse]);
  const isTopicSession = safeResult?.sessionMode === "topic";
  const canShowFullStudyTools = Boolean(safeResult && hasSemanticStudyContent(safeResult));
  const visibleTabs = useMemo(() => {
    if (examLockdownActive) return TAB_CONFIG.filter((tab) => tab.id === "exam");
    if (isTopicSession || (safeResult && !canShowFullStudyTools)) {
      return TAB_CONFIG.filter((tab) => ["materials", "summary", "maps", "coach", "progress"].includes(tab.id));
    }
    return TAB_CONFIG;
  }, [canShowFullStudyTools, examLockdownActive, isTopicSession, safeResult]);
  const subjectMemoryLabel = safeResult?.detectedSubject || currentStudyClassification?.subjectLabel || "Materiale di studio";
  const quizPack = useMemo(
    () => (safeResult && kernelPlan ? buildStudyQuizPack(safeResult, kernelPlan) : null),
    [safeResult, kernelPlan],
  );
  const enhancedQuiz = quizPack?.items ?? safeCombinedQuiz;
  const examSimQuiz = useMemo(
    () => (quizPack ? selectExamSimQuestions(quizPack.items, kernelPlan, 12) : enhancedQuiz.slice(0, 12)),
    [quizPack, kernelPlan, enhancedQuiz],
  );
  const studyFolderCards = useMemo(() => {
    if (!safeResult) return [];
    const sourceFailed = safeResult.sourceQuality?.status === "fail";
    const status = sourceFailed ? "Testo non leggibile" : "Pronto";
    return [
      { id: "materials" as const, title: "Materiale originale", desc: "Testo estratto e qualità sorgente", count: `${safeResult.words.toLocaleString("it-IT")} parole`, status },
      { id: "summary" as const, title: "Riassunti", desc: "Breve, completo, interrogazione", count: safeResult.summaries ? `${Object.keys(safeResult.summaries).length} versioni` : "0 versioni", status },
      { id: "maps" as const, title: "Mappe / schemi", desc: "Relazioni e esercizi", count: `${safeExercises.length} esercizi`, status },
      { id: "flashcards" as const, title: "Flashcard", desc: "Ripasso attivo", count: `${safeFlashcards.length} card`, status: sourceFailed ? "Bloccato" : "Pronto" },
      { id: "quiz" as const, title: "Quiz", desc: "Domande e interrogazione", count: `${safeCombinedQuiz.length + safeOpenQuestions.length} domande`, status: sourceFailed ? "Bloccato" : "Pronto" },
      { id: "exam" as const, title: "Verifica finale", desc: "Simulazione e risultati", count: `${examSimQuiz.length} quesiti`, status: sourceFailed ? "Bloccato" : "Da completare" },
      { id: "progress" as const, title: "Progressi", desc: "Preparazione e memoria", count: `${safeResult.studyReadinessScore ?? 0}/100 readiness`, status },
      { id: "certificates" as const, title: "Certificati", desc: "Attestati e risultati", count: "storico", status: "Archivio" },
      { id: "coach" as const, title: "Coach", desc: "Prossimo passo consigliato", count: safeResult.adaptiveCoach?.currentLevel || "piano", status },
    ].filter((card) => visibleTabs.some((tab) => tab.id === card.id));
  }, [examSimQuiz.length, safeCombinedQuiz.length, safeExercises.length, safeFlashcards.length, safeOpenQuestions.length, safeResult, visibleTabs]);
  const recommendedSummaryLevel = resolveRecommendedSummaryLevel(kernelPlan);
  const gapAnalysis = useMemo(
    () => analyzeStudyGaps({ memory: memorySnapshot }),
    [memorySnapshot],
  );

  useEffect(() => {
    if (!safeResult || !kernelPlan || spacedDeck.length > 0 || !canShowFullStudyTools) return;
    setSpacedDeck(initializeFlashcardDeck(safeResult, kernelPlan));
  }, [canShowFullStudyTools, safeResult, kernelPlan, spacedDeck.length]);

  const handleQuizAnswerRecorded = useCallback(async (payload: {
    questionIndex: number;
    question: string;
    selectedIndex: number;
    correctIndex: number;
    correct: boolean;
    topic?: string;
  }) => {
    const snapshot = await recordKernelQuizAttempt(studySession.id, subjectMemoryLabel, {
      questionIndex: payload.questionIndex,
      question: payload.question,
      correct: payload.correct,
      selectedIndex: payload.selectedIndex,
      correctIndex: payload.correctIndex,
      topic: payload.topic,
    });
    setMemorySnapshot(snapshot);
  }, [studySession.id, subjectMemoryLabel]);

  const handleExamCertificate = useCallback(
    (report: ExamSimReport) => {
      const identity = getSelectedAuthorIdentity();
      const studentName = identity.penName || identity.realName || identity.name || "Studente Scriptora";
      const cert = toCertificateInput(
        report,
        studentName,
        safeResult?.detectedSubject || subjectMemoryLabel,
        projectId,
      );
      saveStudyCertificate(cert);
      void downloadStudyCertificate(cert);
      toast.success("Attestato generato", { description: `Punteggio ${report.score}/100` });
    },
    [projectId, safeResult?.detectedSubject, subjectMemoryLabel],
  );

  const handleSpacedDeckChange = useCallback(async (deck: SpacedFlashcard[]) => {
    setSpacedDeck(deck);
    const snapshot = await saveFlashcardDeck(studySession.id, subjectMemoryLabel, deck);
    setMemorySnapshot(snapshot);
  }, [studySession.id, subjectMemoryLabel]);

  const activeStudyWordCount = activeBookChunkId
    ? activeBookChunkText.trim().split(/\s+/).filter(Boolean).length
    : wordCount;
  const primaryStudyActionDisabled = reading || (bookManifest
    ? !activeBookChunkId || activeStudyWordCount < 40
    : studyChunkPlan.shouldUseChunks
      ? wordCount < 40
      : !canAnalyze);
  const primaryStudyActionLabel = reading
    ? "Scriptora sta preparando la sessione..."
    : sourceQualityBlocksGeneration
      ? "Correggi il testo prima di studiare"
    : bookManifest
      ? activeBookChunkId
        ? safeResult
          ? "Rigenera questa sessione"
          : "Genera questa sessione"
        : "Scegli una sessione del libro"
      : studyChunkPlan.shouldUseChunks
        ? "Dividi libro in sessioni"
      : studyInputKind.kind === "topic_only"
        ? "Esplora argomento"
        : "Genera Sessione Studio";

  return (
    <div className="scriptora-ios-screen scriptora-app-surface scriptora-page-scroll scriptora-study-session min-h-[100dvh] overflow-x-clip px-3 py-4 pb-safe sm:px-6 sm:py-5">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/study")}
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Torna alla dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Scriptora Study OS</p>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-200">
                    Study OS Pro · 20 €/mese
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Carica il tuo materiale</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              PDF, EPUB, DOCX, appunti, foto con OCR reale se supportato o testo copiato: Scriptora crea riassunti, quiz, flashcard e simulazioni guidate.
              Study OS Pro usa un abbonamento semplice con limiti equi anti-abuso, non un sistema a crediti complicato.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={startNewStudySession}
              className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
            >
              Nuova sessione
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
            >
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Carica file
            </button>
            <button
              type="button"
              onClick={() => openImagePicker(false)}
              className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
            >
              <Upload className="h-4 w-4" />
              Carica immagine
            </button>
            <button
              type="button"
              onClick={() => openCameraCapture(false)}
              className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
            >
              <Camera className="h-4 w-4" />
              Scatta foto pagina
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.markdown,.docx,.pdf,.epub,.png,.jpg,.jpeg,.webp,.heic,.heif,text/plain,text/markdown,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.heic,.heif,image/png,image/jpeg,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(event) => {
              const append = scannerAppendModeRef.current;
              scannerAppendModeRef.current = false;
              void handleScannerImages(event.target.files, append);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const append = scannerAppendModeRef.current;
              scannerAppendModeRef.current = false;
              void handleScannerImages(event.target.files, append);
            }}
          />
        </header>

        {reading && (
          <div className="mb-4 lg:hidden">
            <ScriptoraWorkingState
              title="Sto trasformando il materiale in studio guidato…"
              tone="study"
              variant="inline"
              compact
              startedAt={workStartedAt}
            />
          </div>
        )}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-2xl sm:p-4">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-foreground">1. Imposta lo studio</h2>
                <p className="text-xs text-muted-foreground">Tipo materiale · materia/genere · obiettivo · livello verifica</p>
              </div>
              <span className="shrink-0 max-w-[42%] truncate rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground sm:max-w-none sm:px-3 sm:text-xs">
                {wordCount.toLocaleString()} parole
              </span>
            </div>

            <div className="mb-3 rounded-2xl border border-white/10 bg-background/45 p-3">
              <p className="text-sm font-semibold text-foreground">Che tipo di materiale stai studiando?</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Tipo materiale
                  <select
                    value={studyMaterialType}
                    onChange={(event) => setStudyMaterialType(event.target.value as StudyMaterialIntentType)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-sm text-foreground"
                  >
                    {MATERIAL_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {studyMaterialType === "narrative_manuscript" ? (
                  <label className="text-xs font-semibold text-muted-foreground">
                    Genere o uso editoriale
                    <select
                      value={literaryGenre}
                      onChange={(event) => setLiteraryGenre(event.target.value as LiteraryGenreIntent)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-sm text-foreground"
                    >
                      {LITERARY_GENRE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="text-xs font-semibold text-muted-foreground">
                    Materia
                    <select
                      value={studySubject}
                      onChange={(event) => setStudySubject(event.target.value as StudySubjectIntent)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-sm text-foreground"
                    >
                      {SUBJECT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-xs font-semibold text-muted-foreground">
                  Obiettivo
                  <select
                    value={studyGoal}
                    onChange={(event) => setStudyGoal(event.target.value as StudyGoalIntent)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-sm text-foreground"
                  >
                    {STUDY_GOAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Quanto deve essere difficile la verifica?
                  <select
                    value={difficultyLevel}
                    onChange={(event) => setDifficultyLevel(Number(event.target.value) as StudyDifficultyLevel)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-sm text-foreground"
                  >
                    {DIFFICULTY_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              {currentStudyClassification && (
                <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-50/85">
                  Rilevamento attuale: {currentStudyClassification.subjectLabel} · {currentStudyClassification.mode} · confidenza {currentStudyClassification.confidence}%
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-foreground">2. Carica o incolla</h2>
                <p className="text-xs text-muted-foreground">PDF · Libro · Dispensa · Appunti · Capitoli · Testi copiati</p>
              </div>
            </div>

            {hasScannerPages && (
              <div className="mb-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-50">
                      <ImageIcon className="h-4 w-4" />
                      Smart Scanner
                    </div>
                    <p className="mt-1 text-xs leading-5 text-emerald-50/80">{scannerCopy}</p>
                  </div>
                  <span className="w-fit rounded-full border border-emerald-200/25 bg-emerald-200/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-50">
                    {scannerReadyPages}/{scannerPages.length} pagine lette
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {scannerPages.map((page, index) => (
                    <div key={page.id} className="overflow-hidden rounded-2xl border border-white/10 bg-background/40">
                      <div className="aspect-[4/3] bg-black/20">
                        <img
                          src={page.previewUrl}
                          alt={`Anteprima pagina ${index + 1}`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="p-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-foreground">Pagina {index + 1}</span>
                          <span className={[
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            page.status === "ready"
                              ? "bg-emerald-300 text-slate-950"
                              : page.status === "partial"
                                ? "bg-amber-300 text-slate-950"
                                : page.status === "reading"
                                  ? "bg-sky-300 text-slate-950"
                                  : "bg-white/10 text-muted-foreground",
                          ].join(" ")}
                          >
                            {scannerPageStatusLabel(page.status)}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{page.words.toLocaleString("it-IT")} parole</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={analyze}
                    disabled={!canAnalyze}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-3 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Analizza
                  </button>
                  <button
                    type="button"
                    onClick={() => textAreaRef.current?.focus()}
                    className="ios-toolbar-button h-10 justify-center px-3 text-xs font-semibold text-emerald-100"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    Correggi testo
                  </button>
                  <button
                    type="button"
                    onClick={() => void retryScannerOcr()}
                    disabled={reading}
                    className="ios-toolbar-button h-10 justify-center px-3 text-xs font-semibold text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Riprova OCR
                  </button>
                  <button
                    type="button"
                    onClick={() => openCameraCapture(false)}
                    className="ios-toolbar-button h-10 justify-center px-3 text-xs font-semibold text-emerald-100"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Riscatta foto
                  </button>
                  <button
                    type="button"
                    onClick={() => openCameraCapture(true)}
                    className="ios-toolbar-button h-10 justify-center px-3 text-xs font-semibold text-emerald-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Aggiungi pagina
                  </button>
                  <button
                    type="button"
                    onClick={openStudyInBrowser}
                    className="ios-toolbar-button h-10 justify-center px-3 text-xs font-semibold text-emerald-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Continua da browser
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={textAreaRef}
              value={rawText}
              onChange={(event) => replaceStudySource(event.target.value, sourceName, "paste", { toastChanged: Boolean(result) })}
              placeholder="Incolla qui capitoli, appunti, dispense o una parte del libro..."
              className="scriptora-text-safe min-h-[240px] w-full min-w-0 max-w-full resize-y overflow-x-hidden rounded-2xl border border-white/10 bg-background/70 p-3 text-sm leading-6 text-foreground outline-none focus:border-emerald-300/40 sm:min-h-[280px] sm:p-4 lg:min-h-[420px]"
            />
            {sourceTextQuality && sourceTextQuality.status !== "pass" && (
              <div className={[
                "mt-3 rounded-2xl border px-3 py-3 text-xs leading-5",
                sourceTextQuality.status === "fail"
                  ? "border-rose-300/30 bg-rose-400/10 text-rose-50"
                  : "border-amber-300/25 bg-amber-300/10 text-amber-50",
              ].join(" ")}
              >
                <p className="font-semibold">
                  {sourceTextQuality.status === "fail" ? "Testo non leggibile" : "Testo da ricontrollare"} · qualità {sourceTextQuality.score}/100
                </p>
                <p className="mt-1">
                  {sourceTextQuality.status === "fail" ? STUDY_TEXT_NOT_READABLE_MESSAGE : STUDY_TEXT_WARNING_MESSAGE}
                </p>
                {sourceTextQuality.detectedIssues.length > 0 && (
                  <p className="mt-2 opacity-85">
                    Problemi rilevati: {sourceTextQuality.detectedIssues.slice(0, 4).join("; ")}.
                  </p>
                )}
                {sourceTextQuality.suspiciousLines.length > 0 && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/10 p-2">
                    <p className="font-semibold">Righe sospette</p>
                    {sourceTextQuality.suspiciousLines.slice(0, 3).map((line) => (
                      <p key={line} className="mt-1 break-words opacity-80">{line}</p>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {hasScannerPages && (
                    <button
                      type="button"
                      onClick={() => openCameraCapture(false)}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950"
                    >
                      Riscatta foto
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openImagePicker(false)}
                    className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-current"
                  >
                    Carica un&apos;altra immagine
                  </button>
                  <button
                    type="button"
                    onClick={() => textAreaRef.current?.focus()}
                    className="rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-current"
                  >
                    Incolla testo manualmente
                  </button>
                </div>
              </div>
            )}
            {studyInputKind.kind === "insufficient" && wordCount > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-3 text-xs leading-5 text-amber-50">
                <p className="font-semibold">{STUDY_INSUFFICIENT_MESSAGE}</p>
                <p className="mt-2 text-amber-50/85">
                  Puoi incollare più testo, caricare un PDF oppure inserire solo un argomento (es. «Intelligenza Artificiale», «DNA», «Rivoluzione Francese») per la modalità esplorazione.
                </p>
              </div>
            )}

            <p className={`mt-2 text-xs leading-5 ${wordCount < 40 ? "text-amber-200/90" : "text-emerald-100/85"}`}>
              {materialReadinessCopy}
            </p>
            {staleNotice && (
              <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
                {staleNotice}
              </div>
            )}
            {importWarnings.length > 0 && (
              <div className="mt-3 rounded-2xl border border-sky-300/25 bg-sky-300/10 px-3 py-2 text-xs leading-5 text-sky-100">
                {importWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            )}

            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-50/85">
              Limiti Study OS Pro: {STUDY_USAGE_LIMITS.monthlySessions} sessioni/mese,
              {" "}{STUDY_USAGE_LIMITS.weeklyMaterials} materiali/settimana,
              {" "}{STUDY_USAGE_LIMITS.monthlyAiOperations} elaborazioni AI/mese.
              {" "}{formatStudyLimitMessage("it", 9, "soft")}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200/80">
                Lingua Studio
              </label>
              <select
                value={studyLanguage}
                onChange={(e) => setStudyLanguage(e.target.value as typeof studyLanguage)}
                className="w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-sm"
              >
                <option value="Italian">🇮🇹 Italiano</option>
                <option value="English">🇬🇧 English</option>
                <option value="Spanish">🇪🇸 Español</option>
                <option value="French">🇫🇷 Français</option>
                <option value="German">🇩🇪 Deutsch</option>
              </select>
            </div>

            {hasReadyStudySession && (
              <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                <p className="text-sm font-bold text-emerald-100">Sessione di studio salvata</p>
                <p className="mt-1 text-xs leading-5 text-emerald-50/75">
                  Riassunto, quiz, flashcard e interrogazione sono pronti. Puoi entrare subito nella sessione o tornare alla dashboard Study OS.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection("summary")}
                    className="rounded-xl border border-emerald-300/25 bg-white/10 px-3 py-2 text-xs font-bold text-emerald-50"
                  >
                    Vai al riassunto
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("quiz")}
                    className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-bold text-slate-950"
                  >
                    Vai alla sessione di studio
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/study")}
                    className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white"
                  >
                    Dashboard Study OS
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={analyze}
              disabled={primaryStudyActionDisabled}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {primaryStudyActionLabel}
            </button>
            {reading && studyGenerationStatus && (
              <p className="mt-2 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                {studyGenerationStatus}
              </p>
            )}

            {reading && (
              <div className="mt-4">
                <ScriptoraWorkingState
                  title="Sto trasformando il materiale in studio guidato…"
                  tone="study"
                  variant="card"
                  startedAt={workStartedAt}
                  steps={[...WORKING_STEP_PRESETS.study]}
                />
              </div>
            )}
          </section>

          <section className="min-w-0 space-y-4">
            {!safeResult ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-5 sm:p-8">
                <div className="mb-6 text-center sm:text-left">
                  {bookManifest && (
                    <div className="mb-5 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-4 text-left">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
                        Libro diviso in sessioni di studio
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        Scegli il capitolo o blocco da studiare
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {bookManifest.totalWords.toLocaleString("it-IT")} parole · {bookManifest.chunks.length} sessioni.
                        Ogni card è indipendente: Scriptora genera riassunto, quiz e flashcard solo per la sessione che apri.
                      </p>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {bookManifest.chunks.map((chunk) => (
                          <button
                            key={chunk.id}
                            type="button"
                            onClick={() => openBookChunk(bookManifest, chunk.id)}
                            className={[
                              "rounded-2xl border px-3 py-3 text-left transition hover:border-amber-200/50 hover:bg-amber-200/10",
                              activeBookChunkId === chunk.id
                                ? "border-amber-200/60 bg-amber-200/15"
                                : "border-white/10 bg-white/[0.05]",
                            ].join(" ")}
                          >
                            <span className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                                {chunk.title}
                              </span>
                              <span className={[
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                chunk.status === "ready"
                                  ? "bg-emerald-300 text-slate-950"
                                  : chunk.status === "analyzing"
                                    ? "bg-sky-300 text-slate-950"
                                    : chunk.status === "error"
                                      ? "bg-rose-300 text-slate-950"
                                      : "bg-white/10 text-muted-foreground",
                              ].join(" ")}
                              >
                                {chunk.status === "ready"
                                  ? "Pronta"
                                  : chunk.status === "analyzing"
                                    ? "In corso"
                                    : chunk.status === "error"
                                      ? "Errore"
                                      : "Da studiare"}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {chunk.wordCount.toLocaleString("it-IT")} parole · {chunk.contentPreview}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {bookManifest && activeBookChunk && !safeResult && (
                    <div className="mb-5 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-left">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
                        Sessione selezionata
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-foreground">{activeBookChunk.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {activeBookChunk.wordCount.toLocaleString("it-IT")} parole caricate. Genero solo questo blocco: le altre sessioni restano da studiare.
                      </p>
                      <button
                        type="button"
                        onClick={() => void generateActiveBookChunkAnalysis()}
                        disabled={reading || activeStudyWordCount < 40}
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        Genera questa sessione
                      </button>
                    </div>
                  )}

                  {!bookManifest && studyChunkPlan.shouldUseChunks && (
                    <div className="mb-5 rounded-3xl border border-amber-300/25 bg-amber-300/10 p-4 text-left">
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">
                        Materiale lungo rilevato
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-foreground">
                        Prima creo sessioni stabili, poi studi una parte alla volta
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {studyChunkPlan.totalWords.toLocaleString("it-IT")} parole · {studyChunkPlan.chunks.length} sessioni previste.
                        Usa il pulsante “Dividi libro in sessioni”: nessuna analisi globale partirà sul documento intero.
                      </p>
                    </div>
                  )}

                  <GraduationCap className="mx-auto mb-3 h-10 w-10 text-emerald-200/70 sm:mx-0" />
                  <h2 className="text-lg font-semibold">2. Scriptora prepara tutto per te</h2>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Dopo l&apos;analisi trovi subito riassunti, quiz, interrogazione e piano di studio — tutto in un unico posto.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STUDY_OUTCOMES.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {item.icon} {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {bookManifest && activeBookChunk && (
                  <div className="rounded-3xl border border-amber-300/25 bg-amber-300/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Sessione libro pronta</p>
                        <h2 className="mt-1 text-lg font-semibold text-foreground">{activeBookChunk.title}</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {activeBookChunk.wordCount.toLocaleString("it-IT")} parole · risultato collegato a questa sessione, non al libro intero.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBookChunkId(null);
                          setActiveBookChunkText("");
                          setCurrentStudyBookChunkId(null);
                          setRawText("");
                          setSourceName(bookManifest.sourceName);
                          setResult(null);
                          setProjectId(undefined);
                          setAiMode("idle");
                          setActiveSection("materials");
                        }}
                        className="ios-toolbar-button h-10 justify-center px-3 text-xs font-semibold text-amber-100"
                      >
                        Torna alle sessioni
                      </button>
                    </div>
                  </div>
                )}

                {isTopicSession && (
                  <div className="rounded-3xl border border-sky-300/25 bg-sky-300/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-200">Modalità esplorazione argomento</p>
                    <h2 className="mt-1 text-lg font-semibold text-foreground">{safeResult?.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Non stai studiando un capitolo reale: Scriptora ti propone panoramica, concetti chiave, mappa e domande esplorative.
                      Per quiz, flashcard e simulazione esame carica almeno 40 parole di materiale vero.
                    </p>
                  </div>
                )}

                <StudyMetricsCard
                  result={safeResult}
                  aiMode={aiMode}
                  quizAnswers={quizAnswers}
                  openEvaluations={openEvaluations}
                  flashcardConfidence={flashcardConfidence}
                />

                <StudyDashboardStrip />

                {kernelPlan && (
                  <StudyKernelBanner
                    plan={kernelPlan}
                    activeSection={activeSection}
                    onNavigate={handleSectionChange}
                    gapAnalysis={gapAnalysis.weakTopics.length || gapAnalysis.strongTopics.length ? gapAnalysis : null}
                  />
                )}

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.20em] text-emerald-200/80">Cartelle sessione</p>
                      <h3 className="text-base font-semibold text-foreground">Scegli cosa studiare adesso</h3>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Readiness {safeResult.studyReadinessScore ?? 0}/100
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {studyFolderCards.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleSectionChange(folder.id)}
                        className={[
                          "rounded-2xl border p-3 text-left transition hover:border-emerald-200/50 hover:bg-emerald-200/10",
                          activeSection === folder.id
                            ? "border-emerald-200/60 bg-emerald-300/15"
                            : "border-white/10 bg-background/35",
                        ].join(" ")}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span>
                            <span className="block text-sm font-semibold text-foreground">{folder.title}</span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{folder.desc}</span>
                          </span>
                          <span className={[
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            folder.status === "Testo non leggibile" || folder.status === "Bloccato"
                              ? "bg-rose-300 text-slate-950"
                              : folder.status === "Da completare"
                                ? "bg-amber-300 text-slate-950"
                                : "bg-emerald-300 text-slate-950",
                          ].join(" ")}
                          >
                            {folder.status}
                          </span>
                        </span>
                        <span className="mt-2 block text-xs font-semibold text-emerald-100/80">{folder.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sticky top-2 z-10 rounded-3xl border border-white/10 bg-background/80 p-2 backdrop-blur-xl">
                  {examLockdownActive && (
                    <p className="mb-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100">
                      Modalità esame attiva — le altre schede sono nascoste fino al termine.
                    </p>
                  )}
                  <div className="flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {(examLockdownActive ? TAB_CONFIG.filter((tab) => tab.id === "exam") : visibleTabs).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSectionChange(tab.id)}
                        className={[
                          "min-h-[44px] shrink-0 snap-start rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                          studyTabHighlightClass(tab.id, activeSection, kernelPlan),
                        ].join(" ")}
                      >
                        {tab.icon} {tab.label}
                        {kernelPlan && studyModeToSection(kernelPlan.primaryMode) === tab.id ? " ★" : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {activeSection === "materials" && (
                  <StudyMaterialsPanel
                    result={safeResult}
                    sourceName={sourceName}
                    rawText={rawText}
                    importWarnings={importWarnings}
                  />
                )}

                {activeSection === "summary" && (
                  <StudySummaryPanel
                    lightSummary={safeResult.lightSummary}
                    mediumSummary={safeResult.mediumSummary}
                    proSummary={safeResult.proSummary}
                    studyNotesPro={safeResult.studyNotesPro}
                    summaries={safeResult.summaries}
                    learningPackage={safeResult.learningPackage}
                    result={safeResult}
                    recommendedLevel={recommendedSummaryLevel}
                    initialLevel={riassuntoLevel}
                    onLevelChange={setRiassuntoLevel}
                    kernelPlan={kernelPlan}
                  />
                )}

                {activeSection === "flashcards" && (
                  <StudyFlashcardsPanel
                    cards={safeFlashcards}
                    initialIndex={uxSaved.currentFlashcardIndex}
                    initialConfidence={flashcardConfidence}
                    initialFlipped={uxSaved.flashcardFlipped}
                    onConfidenceChange={setFlashcardConfidence}
                    spacedDeck={spacedDeck}
                    onSpacedDeckChange={handleSpacedDeckChange}
                  />
                )}

                {activeSection === "quiz" && (
                  <div className="space-y-4">
                    <StudyQuizPanel
                      quiz={enhancedQuiz}
                      keyConcepts={safeKeyConcepts}
                      openQuestions={safeOpenQuestions}
                      flashcardConfidence={flashcardConfidence}
                      openEvaluations={openEvaluations}
                      initialAnswers={quizAnswers}
                      initialIndex={currentQuizIndex}
                      initialMode={quizMode}
                      initialOrder={quizOrder}
                      quizDifficultyTier={kernelPlan?.quizDifficulty}
                      onAnswerRecorded={handleQuizAnswerRecorded}
                      onStateChange={(state) => {
                        setQuizAnswers(state.quizAnswers);
                        setCurrentQuizIndex(state.currentQuizIndex);
                        setQuizMode(state.quizMode);
                        setQuizOrder(state.quizOrder);
                      }}
                      onExamComplete={handleExamComplete}
                    />
                    <StudyOralPanel
                      questions={safeOpenQuestions}
                      openAnswers={openAnswers}
                      openEvaluations={openEvaluations}
                      evaluatingIndex={evaluatingOpenAnswer}
                      currentIndex={uxSaved.currentOralIndex}
                      onAnswerChange={(index, value) => {
                        setOpenAnswers((prev) => {
                          const next = { ...prev, [index]: value };
                          saveStudyUxState({ openAnswers: next });
                          return next;
                        });
                      }}
                      onEvaluate={evaluateOpenAnswer}
                    />
                    <StudyVocabularyPanel
                      words={safeDifficultWords}
                      difficulty={safeResult.difficulty}
                      easierMap={uxSaved.vocabularyEasier}
                      quiz={safeCombinedQuiz}
                      quizAnswers={quizAnswers}
                      openEvaluations={openEvaluations}
                      flashcardConfidence={flashcardConfidence}
                    />
                    {(safeDifficultWords.length > 0 || safeKeyConcepts.length > 0) && (
                      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                        <StudyDictionaryPopover
                          difficultWords={safeDifficultWords}
                          keyConcepts={safeKeyConcepts}
                          kernelPlan={kernelPlan}
                          variant="inline"
                          materialContext={safeResult.lightSummary?.slice(0, 500)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeSection === "maps" && (
                  <StudyMapPanel result={safeResult} kernelPlan={kernelPlan} exercises={safeExercises} />
                )}

                {activeSection === "exam" && (
                  <div className="space-y-4">
                    {kernelPlan?.recommendedModes.includes("exam_sim") && (
                      <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
                        Simulazione esame consigliata dal piano studio — modalità verifica senza aiuti.
                      </div>
                    )}
                    <StudyQuizPanel
                      quiz={examSimQuiz}
                      keyConcepts={safeKeyConcepts}
                      openQuestions={safeOpenQuestions}
                      flashcardConfidence={flashcardConfidence}
                      openEvaluations={openEvaluations}
                      initialAnswers={examQuizAnswers}
                      initialIndex={0}
                      initialMode="exam"
                      initialOrder={[]}
                      quizDifficultyTier={kernelPlan?.quizDifficulty ?? "esame"}
                      proctoredExam
                      onExamSessionActive={(active, lockdown) => setExamLockdownActive(active && lockdown)}
                      onAnswerRecorded={handleQuizAnswerRecorded}
                      onStateChange={(state) => setExamQuizAnswers(state.quizAnswers)}
                      onExamComplete={handleExamComplete}
                    />
                    <StudyExamSimPanel
                      quiz={examSimQuiz}
                      answers={examQuizAnswers}
                      kernelPlan={kernelPlan}
                      memory={memorySnapshot}
                      onRequestCertificate={handleExamCertificate}
                    />
                  </div>
                )}

                {activeSection === "progress" && (
                  <StudyProgressPanel
                    result={safeResult}
                    projectId={projectId}
                    quizAnswers={quizAnswers}
                    openEvaluations={openEvaluations}
                    flashcardConfidence={flashcardConfidence}
                  />
                )}

                {activeSection === "certificates" && (
                  <StudyCertificatesPanel />
                )}

                {activeSection === "coach" && (
                  <div className="space-y-4">
                    <StudyPlanPanel
                      materia={subjectMemoryLabel}
                      kernelPlan={kernelPlan}
                      memory={memorySnapshot}
                    />
                    <StudyCoachPanel
                      result={safeResult}
                      quizAnswers={quizAnswers}
                      openEvaluations={openEvaluations}
                      flashcardConfidence={flashcardConfidence}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

    </div>
  );
}
