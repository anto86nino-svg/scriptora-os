import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, GraduationCap, Loader2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { analyzeStudyMaterial, readStudyFiles, type StudySessionResult } from "@/lib/study-session";
import { ScriptoraWorkingState } from "@/components/ui/ScriptoraWorkingState";
import { WORKING_STEP_PRESETS } from "@/lib/scriptora-working-state";
import { generateStudySessionWithAI } from "@/lib/study-ai";
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
import { LazyMollyBrainPanel } from "@/components/molly/LazyMollyBrainPanel";
import type { BookProject } from "@/types/book";
import {
  attachStudyResult,
  computeStudySourceHash,
  createEmptyStudySession,
  detectStudySourceType,
  getCurrentStudySessionId,
  getFreshStudyResult,
  getStudySession,
  setCurrentStudySessionId,
  updateStudySessionSource,
  type StudySessionRecord,
  type StudySourceType,
} from "@/lib/study-os/session-store";
import { STUDY_USAGE_LIMITS, formatStudyLimitMessage } from "@/lib/study-os/study-limits";

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
        }))
      : [],
    trueFalse: Array.isArray(result.trueFalse) ? result.trueFalse : [],
    exercises: Array.isArray(result.exercises) ? result.exercises : [],
    conceptMap: result.conceptMap,
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
  const message = error instanceof Error ? error.message : "";
  if (/failed to fetch|network|motore ai|raggiungibile|cors/i.test(message)) {
    return "Il motore AI non è raggiungibile: ho preparato una sessione locale.";
  }
  if (/timeout|abort|tempo/i.test(message)) {
    return "Il motore AI sta impiegando troppo tempo: ho preparato una sessione locale.";
  }
  return "Ho preparato una sessione locale utilizzabile. Puoi rigenerarla quando vuoi.";
}

function humanStudyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/ocr|immagine|scansione|pdf|docx|epub|formato|testo/i.test(message)) {
    return message.slice(0, 180);
  }
  return "Non sono riuscito a completare l'operazione al primo tentativo. I dati della sessione restano salvati: puoi riprovare con un testo piu' breve o caricare un file diverso.";
}

function mapStoredSourceType(type: string): StudySourceType {
  if (type === "notes") return "manual";
  if (type === "text") return "txt";
  if (type === "epub") return "file";
  if (type === "pdf" || type === "docx") return type;
  return "file";
}

export default function StudySessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
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
  const [aiMode, setAiMode] = useState<"idle" | "deepseek" | "local">("idle");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
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

  const wordCount = useMemo(() => rawText.trim().split(/\s+/).filter(Boolean).length, [rawText]);
  const canAnalyze = wordCount >= 40 && !reading;
  const currentSourceHash = useMemo(() => computeStudySourceHash(rawText, sourceName), [rawText, sourceName]);
  const resultFresh = Boolean(result && studySession.results.analysis?.sourceHash === currentSourceHash);

  const resetSessionState = useCallback(() => {
    setQuizAnswers({});
    setCurrentQuizIndex(0);
    setQuizMode("practice");
    setQuizOrder([]);
    setOpenAnswers({});
    setOpenEvaluations({});
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
    setSourceName(next.session.sourceName || name);
    setImportWarnings([]);
    if (next.sourceChanged) {
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
  }, [result, resetSessionState, studySession]);

  const commitStudyResult = useCallback((
    normalized: StudySessionResult,
    text: string,
    name: string,
    baseSession: StudySessionRecord = studySession,
    sourceType?: StudySourceType,
    projectOverride: string | undefined = projectId,
  ) => {
    const prepared = updateStudySessionSource(baseSession, { sourceText: text, sourceName: name, sourceType }).session;
    const stored = attachStudyResult(prepared, normalized);
    setStudySession(stored);
    setCurrentStudySessionId(stored.id);
    setRawText(stored.sourceText);
    setSourceName(stored.sourceName || name);
    setResult(getFreshStudyResult(stored));
    setStaleNotice("");
    resetSessionState();
    const id = persistStudySession(normalized, text, name, projectOverride);
    setProjectId(id);
    return stored;
  }, [projectId, resetSessionState, studySession]);

  const startNewStudySession = useCallback(() => {
    const next = createEmptyStudySession({ language: studyLanguage });
    setStudySession(next);
    setRawText("");
    setSourceName("testo-incollato.txt");
    setResult(null);
    setProjectId(undefined);
    setStaleNotice("");
    setAiMode("idle");
    setStudyGenerationStatus("");
    setImportWarnings([]);
    setCurrentStudySessionId(null);
    resetSessionState();
    toast.success("Nuova sessione pulita");
  }, [resetSessionState, studyLanguage]);

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
      setStaleNotice(getFreshStudyResult(session) ? "" : "Risultati da rigenerare per il materiale di questa sessione.");
      resetSessionState();
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    if (!state?.projectId) {
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
    setStaleNotice("");
    setActiveSection("quiz");
    resetSessionState();
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

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

  const studyBrainProject = useMemo<BookProject>(
    () =>
      ({
        id: "study-session",
        config: {
          title: result?.title || sourceName,
          genre: "self-help",
          subcategory: "Study",
          language: studyLanguage,
          category: "Non Fiction",
          tone: "clear",
          numberOfChapters: 1,
          chapterLength: "medium",
          bookLength: "short",
        },
        blueprint: { overview: "", emotionalArc: "", chapterOutlines: [{ title: "Studio", summary: "" }] },
        chapters: [{ title: "Materiale", content: rawText, status: "done", subchapters: [] }],
        frontMatter: null,
        backMatter: null,
        phase: "writing",
        messages: [],
        updatedAt: new Date().toISOString(),
      }) as BookProject,
    [rawText, result?.title, sourceName, studyLanguage],
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
      setStudyGenerationStatus("Sto analizzando il materiale e preparando la sessione...");
      setAiMode("deepseek");

      studyNoticeTimersRef.current = [
        window.setTimeout(
          () => setStudyGenerationStatus("Ci sta mettendo più del previsto. Sto continuando l'analisi..."),
          30_000,
        ),
        window.setTimeout(
          () => setStudyGenerationStatus("Sto preparando una versione locale se l'AI non risponde."),
          90_000,
        ),
      ];

      let fallbackTimer: number | null = null;
      const aiResult = generateStudySessionWithAI({
        text,
        sourceName: name,
        language: studyLanguage,
      });
      const safeLocalFallback = new Promise<StudySessionResult>((resolve) => {
        fallbackTimer = window.setTimeout(() => {
          studyFallbackReasonRef.current = "L'AI non ha risposto in tempo, ho creato una sessione locale sicura.";
          setStudyGenerationStatus(studyFallbackReasonRef.current);
          setAiMode("local");
          resolve(normalizeStudyResultForUI(analyzeStudyMaterial(text, name)));
        }, 120_000);
      });

      try {
        return normalizeStudyResultForUI(await Promise.race([aiResult, safeLocalFallback]));
      } finally {
        if (fallbackTimer != null) window.clearTimeout(fallbackTimer);
        clearStudyNoticeTimers();
      }
    },
    [clearStudyNoticeTimers, studyLanguage],
  );

  const analyze = async () => {
    if (!canAnalyze) {
      toast.error("Materiale troppo breve", { description: "Carica o incolla almeno 40 parole." });
      return;
    }

    setReading(true);
    setWorkStartedAt(Date.now());
    setAiMode("deepseek");

    try {
      const next = await generateStudyResultWithRuntimeGuard(rawText, sourceName);
      const normalized = normalizeStudyResultForUI(next);
      commitStudyResult(normalized, rawText, sourceName, studySession, detectStudySourceType(sourceName));
      setActiveSection("quiz");
      saveStudyUxState({ activeSection: "quiz" });
      if (studyFallbackReasonRef.current) {
        toast.warning("Sessione locale pronta", {
          description: studyFallbackReasonRef.current,
        });
      } else {
        toast.success("Pipeline Study completata", {
          description: "Riassunti, flashcard e quiz pronti — inizia la verifica.",
        });
      }
    } catch (error) {
      console.warn("[StudySession] DeepSeek fallback locale", error);
      try {
        const local = analyzeStudyMaterial(rawText, sourceName);
        const normalized = normalizeStudyResultForUI(local);
        commitStudyResult(normalized, rawText, sourceName, studySession, detectStudySourceType(sourceName));
        setActiveSection("quiz");
        saveStudyUxState({ activeSection: "quiz" });
        setAiMode("local");
        toast.warning("AI non disponibile: uso analisi locale", {
          description: describeStudyFallback(error),
        });
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
      toast.success(`Risposta valutata: ${evaluation.score}/100`);
    } catch (error) {
      toast.error("Valutazione non riuscita", {
        description: "La risposta è salvata. Riprova tra poco o continua con la correzione manuale guidata.",
      });
    } finally {
      setEvaluatingOpenAnswer(null);
    }
  }

  const handleFiles = async (fileList?: FileList | File[] | null) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setReading(true);
    setWorkStartedAt(Date.now());
    try {
      const readResult = await readStudyFiles(files);
      const text = readResult.text;
      const sourceType = readResult.sourceType === "pdf" || readResult.sourceType === "docx" || readResult.sourceType === "txt"
        ? readResult.sourceType
        : "file";
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
      setImportWarnings(readResult.warnings);
      resetSessionState();
      setAiMode("deepseek");

      try {
        const next = await generateStudyResultWithRuntimeGuard(text, readResult.fileName);
        const normalized = normalizeStudyResultForUI(next);
        commitStudyResult(normalized, text, readResult.fileName, fileSession, sourceType, undefined);
        setActiveSection("quiz");
        saveStudyUxState({ activeSection: "quiz" });
        if (studyFallbackReasonRef.current) {
          toast.warning("Sessione locale pronta", {
            description: studyFallbackReasonRef.current,
          });
        } else {
          toast.success("Pipeline Study completata", { description: `${readResult.fileName} — quiz e verifica pronti.` });
        }
      } catch (error) {
        console.warn("[StudySession] DeepSeek file fallback locale", error);
        try {
          const local = analyzeStudyMaterial(text, readResult.fileName);
          const normalized = normalizeStudyResultForUI(local);
          commitStudyResult(normalized, text, readResult.fileName, fileSession, sourceType, undefined);
          setActiveSection("quiz");
          saveStudyUxState({ activeSection: "quiz" });
          setAiMode("local");
          toast.warning("AI non disponibile: analisi locale attivata", {
            description: describeStudyFallback(error),
          });
        } catch (fallbackError) {
          console.error("[StudySession] local file fallback failed", fallbackError);
          toast.error("Sessione Studio non creata", {
            description: humanStudyErrorMessage(fallbackError),
          });
        }
      }
    } catch (error) {
      toast.error("File non leggibile", { description: humanStudyErrorMessage(error) });
    } finally {
      setReading(false);
      setStudyGenerationStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const safeResult = resultFresh ? result : null;
  const safeDifficultWords = safeResult?.difficultWords || [];
  const safeFlashcards = safeResult?.flashcards || [];
  const safeQuiz = safeResult?.quiz || [];
  const safeTrueFalse = safeResult?.trueFalse || [];
  const safeOpenQuestions = safeResult?.openQuestions || [];
  const safeKeyConcepts = safeResult?.keyConcepts || [];
  const safeExercises = safeResult?.exercises || [];
  const safeCombinedQuiz = useMemo(() => [...safeQuiz, ...safeTrueFalse], [safeQuiz, safeTrueFalse]);

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
              onClick={() => cameraInputRef.current?.click()}
              className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
            >
              <Camera className="h-4 w-4" />
              Scatta foto
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.markdown,.docx,.pdf,.epub,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
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
                <h2 className="font-semibold text-foreground">1. Carica o incolla</h2>
                <p className="text-xs text-muted-foreground">PDF · Libro · Dispensa · Appunti · Capitoli · Testi copiati</p>
              </div>
              <span className="shrink-0 max-w-[42%] truncate rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground sm:max-w-none sm:px-3 sm:text-xs">
                {wordCount.toLocaleString()} parole
              </span>
            </div>

            <textarea
              value={rawText}
              onChange={(event) => replaceStudySource(event.target.value, sourceName, "paste", { toastChanged: Boolean(result) })}
              placeholder="Incolla qui capitoli, appunti, dispense o una parte del libro..."
              className="scriptora-text-safe min-h-[240px] w-full min-w-0 max-w-full resize-y overflow-x-hidden rounded-2xl border border-white/10 bg-background/70 p-3 text-sm leading-6 text-foreground outline-none focus:border-emerald-300/40 sm:min-h-[280px] sm:p-4 lg:min-h-[420px]"
            />
            <p className={`mt-2 text-xs leading-5 ${wordCount < 40 ? "text-amber-200/90" : "text-muted-foreground"}`}>
              {t("study_min_words_hint")} ({wordCount}/40)
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

            <button
              type="button"
              onClick={analyze}
              disabled={!canAnalyze || reading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {reading ? "Scriptora sta preparando la sessione..." : "Genera Sessione Studio"}
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
                <StudyMetricsCard
                  result={safeResult}
                  aiMode={aiMode}
                  quizAnswers={quizAnswers}
                  openEvaluations={openEvaluations}
                  flashcardConfidence={flashcardConfidence}
                />

                <div className="sticky top-2 z-10 rounded-3xl border border-white/10 bg-background/80 p-2 backdrop-blur-xl">
                  <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {TAB_CONFIG.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSectionChange(tab.id)}
                        className={[
                          "shrink-0 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                          activeSection === tab.id
                            ? "bg-emerald-300 text-slate-950"
                            : "border border-white/10 bg-white/[0.04] text-muted-foreground",
                        ].join(" ")}
                      >
                        {tab.icon} {tab.label}
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
                  />
                )}

                {activeSection === "flashcards" && (
                  <StudyFlashcardsPanel
                    cards={safeFlashcards}
                    initialIndex={uxSaved.currentFlashcardIndex}
                    initialConfidence={flashcardConfidence}
                    initialFlipped={uxSaved.flashcardFlipped}
                    onConfidenceChange={setFlashcardConfidence}
                  />
                )}

                {activeSection === "quiz" && (
                  <div className="space-y-4">
                    <StudyQuizPanel
                      quiz={safeCombinedQuiz}
                      keyConcepts={safeKeyConcepts}
                      openQuestions={safeOpenQuestions}
                      flashcardConfidence={flashcardConfidence}
                      openEvaluations={openEvaluations}
                      initialAnswers={quizAnswers}
                      initialIndex={currentQuizIndex}
                      initialMode={quizMode}
                      initialOrder={quizOrder}
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
                  </div>
                )}

                {activeSection === "maps" && (
                  <StudyMapPanel conceptMap={safeResult.conceptMap} exercises={safeExercises} />
                )}

                {activeSection === "exam" && (
                  <StudyQuizPanel
                    quiz={safeCombinedQuiz}
                    keyConcepts={safeKeyConcepts}
                    openQuestions={safeOpenQuestions}
                    flashcardConfidence={flashcardConfidence}
                    openEvaluations={openEvaluations}
                    initialAnswers={{}}
                    initialIndex={0}
                    initialMode="exam"
                    initialOrder={[]}
                    onExamComplete={handleExamComplete}
                  />
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
                  <StudyCoachPanel
                    result={safeResult}
                    quizAnswers={quizAnswers}
                    openEvaluations={openEvaluations}
                    flashcardConfidence={flashcardConfidence}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {rawText.trim().length >= 120 && (
        <LazyMollyBrainPanel
          project={studyBrainProject}
          activeSection="chapter-0"
          appContext="study"
          studyText={rawText}
          onApplyChapterContent={(_chapterIdx, content) =>
            replaceStudySource(content, sourceName, "paste", { toastChanged: Boolean(result) })
          }
          onApplyStudyText={(content) =>
            replaceStudySource(content, sourceName, "paste", { toastChanged: Boolean(result) })
          }
        />
      )}
    </div>
  );
}
