import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, GraduationCap, Loader2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { analyzeStudyMaterial, readStudyFile, type StudySessionResult } from "@/lib/study-session";
import { generateStudySessionWithAI } from "@/lib/study-ai";
import { evaluateStudyAnswerWithAI, type StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import { DEFAULT_STUDY_UX, loadStudyUxState, saveStudyUxState, type FlashcardConfidence } from "@/lib/study-ux";
import { t } from "@/lib/i18n";
import { StudyMetricsCard } from "@/components/study/StudyMetricsCard";
import { StudySummaryPanel } from "@/components/study/StudySummaryPanel";
import { StudyOralPanel } from "@/components/study/StudyOralPanel";
import { StudyVocabularyPanel } from "@/components/study/StudyVocabularyPanel";
import { StudyFlashcardsPanel } from "@/components/study/StudyFlashcardsPanel";
import { StudyQuizPanel } from "@/components/study/StudyQuizPanel";

const STORAGE_KEY = "scriptora-study-session-v1";

type StudySection = "summary" | "questions" | "vocabulary" | "flashcards" | "quiz";

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

export default function StudySessionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saved = useMemo(loadSaved, []);
  const uxSaved = useMemo(loadStudyUxState, []);

  const [rawText, setRawText] = useState(saved?.rawText || "");
  const [sourceName, setSourceName] = useState(saved?.result?.sourceName || "testo-incollato.txt");
  const [result, setResult] = useState<StudySessionResult | null>(saved?.result ? normalizeStudyResultForUI(saved.result) : null);
  const [reading, setReading] = useState(false);
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
      toast.success("Sessione Studio generata", { description: "Scriptora ha creato riassunti, parole difficili, flashcard e quiz." });
    } catch (error) {
      console.warn("[StudySession] DeepSeek fallback locale", error);
      const local = analyzeStudyMaterial(rawText, sourceName);
      const normalized = normalizeStudyResultForUI(local);
      setResult(normalized);
      resetSessionState();
      saveResult(normalized, rawText);
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
        toast.success("Materiale analizzato da Scriptora", { description: file.name });
      } catch (error) {
        console.warn("[StudySession] DeepSeek file fallback locale", error);
        const local = analyzeStudyMaterial(text, file.name);
        const normalized = normalizeStudyResultForUI(local);
        setResult(normalized);
        resetSessionState();
        saveResult(normalized, text);
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
    <div className="scriptora-ios-screen scriptora-app-surface min-h-screen px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Scriptora Study OS</p>
                <h1 className="text-2xl font-semibold text-foreground">Sessione Studio</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Il tuo tutor privato per interrogazioni, verifiche e ripasso — non solo un generatore di testo.
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

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Materiale da studiare</h2>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT e Markdown supportati.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-muted-foreground">
                {wordCount.toLocaleString()} parole
              </span>
            </div>

            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Incolla qui capitoli, appunti, dispense o una parte del libro..."
              className="min-h-[320px] w-full resize-y rounded-2xl border border-white/10 bg-background/70 p-4 text-sm leading-6 text-foreground outline-none focus:border-emerald-300/40 lg:min-h-[420px]"
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
              disabled={!canAnalyze}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {reading ? "Scriptora sta preparando la sessione..." : "Genera Sessione Studio"}
            </button>
          </section>

          <section className="space-y-4">
            {!safeResult ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
                <GraduationCap className="mb-4 h-10 w-10 text-emerald-200/70" />
                <h2 className="text-lg font-semibold">Nessuna sessione generata</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Carica un file o incolla un testo. Scriptora preparerà riassunti, interrogazione, vocabolario, flashcard e quiz.
                </p>
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
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
