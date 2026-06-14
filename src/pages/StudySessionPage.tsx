import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Loader2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { analyzeStudyMaterial, readStudyFile, type StudySessionResult } from "@/lib/study-session";
import { ScriptoraWorkingState } from "@/components/ui/ScriptoraWorkingState";
import { WORKING_STEP_PRESETS } from "@/lib/scriptora-working-state";
import { generateStudySessionWithAI } from "@/lib/study-ai";
import { evaluateStudyAnswerWithAI, type StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import { DEFAULT_STUDY_UX, loadStudyUxState, saveStudyUxState, type FlashcardConfidence } from "@/lib/study-ux";
import { t } from "@/lib/i18n";
import {
  getStudyLearningMetrics,
  getStudyProject,
  recordStudyQuizAttempt,
  saveStudyProject,
  addStudyProjectBadges,
} from "@/lib/study-project-storage";
import { achievementById, evaluateStudyAchievements } from "@/lib/study-achievements";
import { downloadStudyCertificate } from "@/lib/study-certificate";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { StudyMetricsCard } from "@/components/study/StudyMetricsCard";
import { StudySummaryPanel } from "@/components/study/StudySummaryPanel";
import { StudyOralPanel } from "@/components/study/StudyOralPanel";
import { StudyVocabularyPanel } from "@/components/study/StudyVocabularyPanel";
import { StudyFlashcardsPanel } from "@/components/study/StudyFlashcardsPanel";
import { StudyQuizPanel } from "@/components/study/StudyQuizPanel";
import { LazyMollyBrainPanel } from "@/components/molly/LazyMollyBrainPanel";
import type { BookProject } from "@/types/book";

const STORAGE_KEY = "scriptora-study-session-v1";

type StudySection = "summary" | "questions" | "vocabulary" | "flashcards" | "quiz";

const STUDY_OUTCOMES = [
  { icon: "✨", title: "Riassunto Soft", desc: "Facile e veloce" },
  { icon: "🧠", title: "Riassunto Pro", desc: "Più profondo e completo" },
  { icon: "📚", title: "Spiegazione semplice", desc: "Come a uno studente" },
  { icon: "📝", title: "Quiz intelligenti", desc: "Verifica attiva" },
  { icon: "🎤", title: "Simulazione interrogazione", desc: "Risposte aperte valutate" },
  { icon: "🧪", title: "Verifica finale", desc: "Modalità esame" },
  { icon: "🎯", title: "Piano studio automatico", desc: "Percorso guidato" },
] as const;

const TAB_CONFIG: { id: StudySection; label: string; icon: string }[] = [
  { id: "summary", label: "Riassunti", icon: "📘" },
  { id: "questions", label: "Interrogazione", icon: "🎤" },
  { id: "vocabulary", label: "Parole", icon: "📚" },
  { id: "flashcards", label: "Flashcard", icon: "🃏" },
  { id: "quiz", label: "Quiz", icon: "📝" },
];

function normalizeStudyResultForUI(value: any): StudySessionResult {
  const result = value || {};

  return {
    title: String(result.title || "Sessione Studio"),
    sourceName: String(result.sourceName || "materiale-studio.txt"),
    words: Number(result.words || result.totalWords || 0),
    detectedSubject: String(result.detectedSubject || "Materiale di studio"),
    difficulty: result.difficulty === "soft" || result.difficulty === "pro" ? result.difficulty : "medium",
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
  };
}

function saveResult(result: StudySessionResult, rawText: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ result, rawText, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

function loadSaved(): { result: StudySessionResult; rawText: string } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed?.result) return { result: parsed.result, rawText: parsed.rawText || "" };
  } catch {
    /* ignore */
  }
  return null;
}

function persistStudySession(
  normalized: StudySessionResult,
  text: string,
  name: string,
  projectId?: string,
): string {
  const saved = saveStudyProject({
    id: projectId,
    title: normalized.title,
    sourceName: name,
    rawText: text,
    result: normalized,
  });
  return saved.id;
}

export default function StudySessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saved = useMemo(loadSaved, []);
  const uxSaved = useMemo(loadStudyUxState, []);

  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [rawText, setRawText] = useState(saved?.rawText || "");
  const [sourceName, setSourceName] = useState(saved?.result?.sourceName || "testo-incollato.txt");
  const [result, setResult] = useState<StudySessionResult | null>(saved?.result ? normalizeStudyResultForUI(saved.result) : null);
  const [reading, setReading] = useState(false);
  const [workStartedAt, setWorkStartedAt] = useState<number | undefined>();
  const [aiMode, setAiMode] = useState<"idle" | "deepseek" | "local">("idle");

  const [activeSection, setActiveSection] = useState<StudySection>(
    (uxSaved.activeSection as StudySection) || DEFAULT_STUDY_UX.activeSection
  );
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

  useEffect(() => {
    const state = location.state as { projectId?: string } | null;
    if (!state?.projectId) return;
    const project = getStudyProject(state.projectId);
    if (!project) {
      toast.error("Progetto Study non trovato");
      navigate(location.pathname, { replace: true, state: null });
      return;
    }
    const text = project.rawText || project.rawTextPreview || "";
    const normalized = normalizeStudyResultForUI(project.result);
    setProjectId(project.id);
    setRawText(text);
    setSourceName(project.sourceName);
    setResult(normalized);
    saveResult(normalized, text);
    setActiveSection("quiz");
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleExamComplete = useCallback(
    (report: { score: number; mode: "practice" | "exam"; total: number; correct: number }) => {
      if (!projectId) return;
      const updated = recordStudyQuizAttempt(projectId, {
        score: report.score,
        mode: report.mode,
        totalQuestions: report.total,
        correctCount: report.correct,
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
        toast.success("Verifica completata", {
          description: `Punteggio ${report.score}/100 — scarica il certificato`,
          action: {
            label: "Certificato PDF",
            onClick: () => {
              void downloadStudyCertificate({
                studentName,
                subject: updated.result.detectedSubject || updated.title,
                date: new Date().toLocaleDateString(),
                score: report.score,
                level,
                badges: badges.map((id) => achievementById(id)?.label || id),
              });
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

  const handleSectionChange = useCallback((section: StudySection) => {
    setActiveSection(section);
    saveStudyUxState({ activeSection: section });
  }, []);

  const analyze = async () => {
    if (!canAnalyze) {
      toast.error("Materiale troppo breve", { description: "Carica o incolla almeno 40 parole." });
      return;
    }

    setReading(true);
    setWorkStartedAt(Date.now());
    setAiMode("deepseek");

    try {
      const next = await generateStudySessionWithAI({
        text: rawText,
        sourceName,
        language: studyLanguage,
      });
      const normalized = normalizeStudyResultForUI(next);
      setResult(normalized);
      resetSessionState();
      saveResult(normalized, rawText);
      const id = persistStudySession(normalized, rawText, sourceName, projectId);
      setProjectId(id);
      setActiveSection("quiz");
      saveStudyUxState({ activeSection: "quiz" });
      toast.success("Pipeline Study completata", {
        description: "Riassunti, flashcard e quiz pronti — inizia la verifica.",
      });
    } catch (error) {
      console.warn("[StudySession] DeepSeek fallback locale", error);
      const local = analyzeStudyMaterial(rawText, sourceName);
      const normalized = normalizeStudyResultForUI(local);
      setResult(normalized);
      resetSessionState();
      saveResult(normalized, rawText);
      const id = persistStudySession(normalized, rawText, sourceName, projectId);
      setProjectId(id);
      setActiveSection("quiz");
      saveStudyUxState({ activeSection: "quiz" });
      setAiMode("local");
      toast.warning("AI non disponibile: uso analisi locale", {
        description: error instanceof Error ? error.message.slice(0, 120) : "Fallback locale attivato.",
      });
    } finally {
      setReading(false);
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
        description: error instanceof Error ? error.message.slice(0, 120) : "Riprova tra poco.",
      });
    } finally {
      setEvaluatingOpenAnswer(null);
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return;
    setReading(true);
    setWorkStartedAt(Date.now());
    try {
      const text = await readStudyFile(file);
      setRawText(text);
      setSourceName(file.name);
      setAiMode("deepseek");

      try {
        const next = await generateStudySessionWithAI({
          text,
          sourceName: file.name,
          language: studyLanguage,
        });
        const normalized = normalizeStudyResultForUI(next);
        setResult(normalized);
        resetSessionState();
        saveResult(normalized, text);
        const id = persistStudySession(normalized, text, file.name, projectId);
        setProjectId(id);
        setActiveSection("quiz");
        saveStudyUxState({ activeSection: "quiz" });
        toast.success("Pipeline Study completata", { description: `${file.name} — quiz e verifica pronti.` });
      } catch (error) {
        console.warn("[StudySession] DeepSeek file fallback locale", error);
        const local = analyzeStudyMaterial(text, file.name);
        const normalized = normalizeStudyResultForUI(local);
        setResult(normalized);
        resetSessionState();
        saveResult(normalized, text);
        const id = persistStudySession(normalized, text, file.name, projectId);
        setProjectId(id);
        setActiveSection("quiz");
        saveStudyUxState({ activeSection: "quiz" });
        setAiMode("local");
        toast.warning("AI non disponibile: analisi locale attivata", {
          description: error instanceof Error ? error.message.slice(0, 120) : file.name,
        });
      }
    } catch (error) {
      toast.error("File non leggibile", { description: error instanceof Error ? error.message : "Formato non supportato." });
    } finally {
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const safeResult = result;
  const safeDifficultWords = safeResult?.difficultWords || [];
  const safeFlashcards = safeResult?.flashcards || [];
  const safeQuiz = safeResult?.quiz || [];
  const safeOpenQuestions = safeResult?.openQuestions || [];
  const safeKeyConcepts = safeResult?.keyConcepts || [];

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
                    Beta Study Mode
                  </span>
                </div>
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Carica il tuo materiale</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              PDF, libro, dispensa, appunti, capitoli o testi copiati — Scriptora crea riassunti, quiz e simulazioni in pochi secondi.
              Alcune azioni Study consumano crediti; in beta le funzioni base restano accessibili con il saldo del tuo account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
          >
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Carica file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
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
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Incolla qui capitoli, appunti, dispense o una parte del libro..."
              className="scriptora-text-safe min-h-[240px] w-full min-w-0 max-w-full resize-y overflow-x-hidden rounded-2xl border border-white/10 bg-background/70 p-3 text-sm leading-6 text-foreground outline-none focus:border-emerald-300/40 sm:min-h-[280px] sm:p-4 lg:min-h-[420px]"
            />
            <p className={`mt-2 text-xs leading-5 ${wordCount < 40 ? "text-amber-200/90" : "text-muted-foreground"}`}>
              {t("study_min_words_hint")} ({wordCount}/40)
            </p>

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

                {activeSection === "summary" && (
                  <StudySummaryPanel
                    lightSummary={safeResult.lightSummary}
                    mediumSummary={safeResult.mediumSummary}
                    proSummary={safeResult.proSummary}
                    studyNotesPro={safeResult.studyNotesPro}
                  />
                )}

                {activeSection === "questions" && (
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
                )}

                {activeSection === "vocabulary" && (
                  <StudyVocabularyPanel
                    words={safeDifficultWords}
                    difficulty={safeResult.difficulty}
                    easierMap={uxSaved.vocabularyEasier}
                    quiz={safeQuiz}
                    quizAnswers={quizAnswers}
                    openEvaluations={openEvaluations}
                    flashcardConfidence={flashcardConfidence}
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
                  <StudyQuizPanel
                    quiz={safeQuiz}
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
          onApplyChapterContent={(_chapterIdx, content) => setRawText(content)}
          onApplyStudyText={setRawText}
        />
      )}
    </div>
  );
}
