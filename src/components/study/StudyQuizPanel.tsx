import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, GraduationCap, Lightbulb, Loader2, Lock, MessageCircle, RotateCcw, Trophy } from "lucide-react";
import { explainStudyQuizError, type StudyErrorTutorResult } from "@/lib/study-ai";
import type { OpenStudyQuestion, QuizQuestion } from "@/lib/study-session";
import type { QuizDifficultyTier } from "@/lib/study-os/study-intelligence-kernel";
import { formatExamCountdown, shouldAutoSubmitExam } from "@/lib/study-os/study-exam-simulation";
import {
  buildQuizFeedback,
  buildQuizPerformanceReport,
  clearStudyUxQuizState,
  computeUserPerformanceLevel,
  inferQuizDifficulty,
  pickAdaptiveNextIndex,
  saveStudyUxState,
  shuffleIndices,
  type UserPerformanceLevel,
} from "@/lib/study-ux";

interface StudyQuizPanelProps {
  quiz: QuizQuestion[];
  keyConcepts: string[];
  openQuestions?: OpenStudyQuestion[];
  flashcardConfidence?: Record<number, string>;
  openEvaluations?: Record<number, { score?: number }>;
  initialAnswers?: Record<number, number>;
  initialIndex?: number;
  initialMode?: "practice" | "exam";
  initialOrder?: number[];
  onStateChange?: (state: {
    quizAnswers: Record<number, number>;
    currentQuizIndex: number;
    quizMode: "practice" | "exam";
    quizOrder: number[];
  }) => void;
  onExamComplete?: (report: {
    score: number;
    mode: "practice" | "exam";
    total: number;
    correct: number;
    grade10?: number;
    grade30?: number;
    judgement?: string;
  }) => void;
  quizDifficultyTier?: QuizDifficultyTier;
  onAnswerRecorded?: (payload: {
    questionIndex: number;
    question: string;
    selectedIndex: number;
    correctIndex: number;
    correct: boolean;
    topic?: string;
  }) => void;
  /** Called when proctored exam session starts/ends (for tab lockdown) */
  onExamSessionActive?: (active: boolean, lockdown: boolean) => void;
  proctoredExam?: boolean;
}

const EXAM_TIME_OPTIONS = [
  { label: "Senza timer", sec: null },
  { label: "5 min", sec: 300 },
  { label: "10 min", sec: 600 },
  { label: "15 min", sec: 900 },
];

const LEARNING_LEVEL_LABELS: Record<string, string> = {
  memory: "Memoria",
  understanding: "Comprensione",
  application: "Applicazione",
  exam: "Esame",
  professor: "Professore",
};

export function StudyQuizPanel({
  quiz,
  keyConcepts,
  openQuestions = [],
  flashcardConfidence = {},
  openEvaluations = {},
  initialAnswers = {},
  initialIndex = 0,
  initialMode = "practice",
  initialOrder = [],
  onStateChange,
  onExamComplete,
  quizDifficultyTier,
  onAnswerRecorded,
  onExamSessionActive,
  proctoredExam = false,
}: StudyQuizPanelProps) {
  const [quizMode, setQuizMode] = useState<"practice" | "exam">(initialMode);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>(initialAnswers);
  const [quizOrder, setQuizOrder] = useState<number[]>(
    initialOrder.length === quiz.length ? initialOrder : Array.from({ length: quiz.length }, (_, i) => i)
  );
  const [orderPosition, setOrderPosition] = useState(() => {
    if (!initialOrder.length) return Math.min(initialIndex, Math.max(0, quiz.length - 1));
    const pos = initialOrder.indexOf(initialIndex);
    return pos >= 0 ? pos : 0;
  });
  const [examTimeLimitSec, setExamTimeLimitSec] = useState<number | null>(null);
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null);
  const [examElapsed, setExamElapsed] = useState(0);
  const [examForceComplete, setExamForceComplete] = useState(false);
  const [examLockdown, setExamLockdown] = useState(proctoredExam);
  const [showExamSetup, setShowExamSetup] = useState(initialMode === "exam");
  const [showFeedback, setShowFeedback] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorResult, setTutorResult] = useState<StudyErrorTutorResult | null>(null);
  const completionKeyRef = useRef("");

  const performance = useMemo<UserPerformanceLevel>(
    () => computeUserPerformanceLevel({
      quiz,
      quizAnswers,
      openEvaluations,
      flashcardConfidence: flashcardConfidence as Record<number, "unknown" | "almost" | "known">,
    }),
    [quiz, quizAnswers, openEvaluations, flashcardConfidence]
  );

  const total = quiz.length;
  const answeredCount = Object.keys(quizAnswers).length;
  const isComplete = total > 0 && (answeredCount === total || examForceComplete);
  const currentQuestionIndex = quizOrder[orderPosition] ?? 0;
  const q = quiz[currentQuestionIndex];
  const selected = quizAnswers[currentQuestionIndex];
  const answered = selected !== undefined;
  const feedback = answered && q ? buildQuizFeedback(q, selected, performance) : null;

  const report = useMemo(
    () => (isComplete ? buildQuizPerformanceReport(quiz, quizAnswers, keyConcepts, openQuestions) : null),
    [isComplete, quiz, quizAnswers, keyConcepts, openQuestions]
  );

  useEffect(() => {
    onStateChange?.({ quizAnswers, currentQuizIndex: currentQuestionIndex, quizMode, quizOrder });
    saveStudyUxState({ quizAnswers, currentQuizIndex: currentQuestionIndex, quizMode, quizOrder });
  }, [quizAnswers, currentQuestionIndex, quizMode, quizOrder, onStateChange]);

  useEffect(() => {
    if (isComplete && report) {
      const completionKey = `${quizMode}:${report.score}:${Object.entries(quizAnswers).sort().map(([idx, ans]) => `${idx}:${ans}`).join("|")}`;
      if (completionKeyRef.current === completionKey) return;
      completionKeyRef.current = completionKey;
      onExamComplete?.({
        score: report.score,
        mode: quizMode,
        total: quiz.length,
        correct: Object.entries(quizAnswers).filter(([idx, ans]) => quiz[Number(idx)]?.answer === ans).length,
        grade10: report.grade10,
        grade30: report.grade30,
        judgement: report.judgement,
      });
      return;
    }
    completionKeyRef.current = "";
  }, [isComplete, report, quizMode, quiz, quizAnswers, onExamComplete]);

  useEffect(() => {
    if (answered) {
      setShowFeedback(false);
      setTutorResult(null);
      const id = requestAnimationFrame(() => setShowFeedback(true));
      return () => cancelAnimationFrame(id);
    }
    setShowFeedback(false);
  }, [answered, currentQuestionIndex]);

  useEffect(() => {
    if (quizMode !== "exam" || !examStartedAt || !examTimeLimitSec) return;
    const id = window.setInterval(() => {
      setExamElapsed(Math.floor((Date.now() - examStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [quizMode, examStartedAt, examTimeLimitSec]);

  const timeRemaining = examTimeLimitSec ? Math.max(0, examTimeLimitSec - examElapsed) : null;

  useEffect(() => {
    if (quizMode !== "exam" || examForceComplete || !examTimeLimitSec) return;
    if (shouldAutoSubmitExam(examElapsed, examTimeLimitSec)) {
      setExamForceComplete(true);
      onExamSessionActive?.(false, false);
    }
  }, [quizMode, examElapsed, examTimeLimitSec, examForceComplete, onExamSessionActive]);

  useEffect(() => {
    if (quizMode === "exam" && examStartedAt) {
      onExamSessionActive?.(true, examLockdown);
    } else if (quizMode !== "exam" || isComplete) {
      onExamSessionActive?.(false, false);
    }
  }, [quizMode, examStartedAt, examLockdown, isComplete, onExamSessionActive]);

  function startExamMode(limitSec: number | null) {
    setQuizMode("exam");
    setQuizOrder(shuffleIndices(total));
    setOrderPosition(0);
    setQuizAnswers({});
    setExamTimeLimitSec(limitSec);
    setExamStartedAt(Date.now());
    setExamElapsed(0);
    setExamForceComplete(false);
    setShowExamSetup(false);
  }

  function resetQuiz() {
    setQuizAnswers({});
    setOrderPosition(0);
    setQuizOrder(Array.from({ length: total }, (_, i) => i));
    setQuizMode("practice");
    setExamStartedAt(null);
    setExamTimeLimitSec(null);
    setExamElapsed(0);
    setExamForceComplete(false);
    setShowExamSetup(false);
    onExamSessionActive?.(false, false);
    clearStudyUxQuizState();
  }

  function handleAnswer(optionIndex: number) {
    if (answered || !q) return;
    setQuizAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
    onAnswerRecorded?.({
      questionIndex: currentQuestionIndex,
      question: q.question,
      selectedIndex: optionIndex,
      correctIndex: q.answer,
      correct: q.answer === optionIndex,
      topic: q.testedSkill || q.sourceReference,
    });
  }

  function goNext() {
    if (orderPosition < total - 1) {
      if (quizMode === "practice") {
        const adaptiveIdx = pickAdaptiveNextIndex(quiz, quizOrder, { ...quizAnswers }, currentQuestionIndex, performance);
        const adaptivePos = quizOrder.indexOf(adaptiveIdx);
        if (adaptivePos > orderPosition) {
          setOrderPosition(adaptivePos);
          return;
        }
      }
      setOrderPosition(orderPosition + 1);
    }
  }

  if (total === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessun quiz disponibile. Rigenera l&apos;analisi.
      </p>
    );
  }

  const adaptiveLabel =
    performance === "struggling" ? "Modalità supporto" : performance === "advanced" ? "Sfida avanzata" : "Ritmo bilanciato";
  const quizInteractionReady = quizMode !== "exam" || Boolean(examStartedAt);

  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">
            {quizMode === "exam" ? "🎓 Simula verifica reale" : "Quiz interattivo premium"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {quizMode === "exam"
              ? "Esame reale: niente aiuti fino alla fine."
              : `${adaptiveLabel} — Scriptora adatta la difficoltà a te.${quizDifficultyTier ? ` Livello kernel: ${quizDifficultyTier}.` : ""}`}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/50 px-4 py-2 text-sm">
          {isComplete ? (
            <span className="font-bold text-emerald-200">Completato ✓</span>
          ) : (
            <>
              <span className="text-muted-foreground">Progresso: </span>
              <span className="font-bold text-emerald-200">{answeredCount}/{total}</span>
            </>
          )}
        </div>
      </div>

      {quizMode === "practice" && !isComplete && (
        <button
          type="button"
          onClick={() => setShowExamSetup(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100"
        >
          <GraduationCap className="h-3.5 w-3.5" />
          🎓 Simula verifica reale
        </button>
      )}

      {showExamSetup && !examStartedAt && (
        <div className="study-fade-in mt-3 rounded-2xl border border-white/10 bg-background/45 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Timer opzionale</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAM_TIME_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => startExamMode(opt.sec)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={examLockdown}
              onChange={(e) => setExamLockdown(e.target.checked)}
              className="rounded border-white/20"
            />
            <Lock className="h-3.5 w-3.5" />
            Modalità lockdown — nascondi le altre schede durante l&apos;esame
          </label>
        </div>
      )}

      {quizMode === "exam" && examStartedAt && timeRemaining !== null && (
        <div className={[
          "mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
          timeRemaining <= 60 ? "border-rose-300/40 bg-rose-400/15 text-rose-100" : "border-amber-300/30 bg-amber-400/10 text-amber-100",
        ].join(" ")}
        >
          <Clock className="h-3.5 w-3.5" />
          {examForceComplete ? "Tempo scaduto — invio automatico" : formatExamCountdown(timeRemaining)}
        </div>
      )}

      {isComplete && report && (
        <div className="study-fade-in mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-200" />
            <h4 className="text-base font-bold text-emerald-100">🎓 Study Performance</h4>
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            <p className="text-2xl font-bold text-emerald-100">Score: {report.score}/100</p>
            <p className="text-sm text-emerald-100/90">
              Voto: <span className="font-bold">{report.grade10}/10 · {report.grade30}/30</span>
            </p>
            <p className="text-sm text-emerald-100/90">
              Giudizio: <span className="font-bold">{report.judgement}</span>
            </p>
            <p className="text-sm text-emerald-100/90">
              Confidenza: <span className="font-bold">{report.confidence}</span>
            </p>
            <p className="text-sm text-emerald-100/90">
              Probabilita superamento: <span className="font-bold">{report.passProbability}%</span>
            </p>
          </div>

          {report.strongAreas.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Aree forti</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {report.strongAreas.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {report.weakAreas.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/80">Aree deboli</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {report.weakAreas.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {report.likelyOralQuestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Domande orali probabili</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {report.likelyOralQuestions.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {report.areasToReview.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Aree da ripassare</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {report.areasToReview.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-emerald-100">
            <span className="font-semibold">Prossimo passo: </span>{report.suggestedNextStep}
          </p>
          <p className="mt-2 text-xs text-emerald-100/80">
            Tempo di ripasso consigliato: {report.reviewMinutes} minuti.
          </p>
        </div>
      )}

      {q && quizInteractionReady && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-background/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
              {orderPosition + 1}/{total}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {inferQuizDifficulty(q, performance)}
            </span>
            {q.learningLevel && (
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-100">
                {LEARNING_LEVEL_LABELS[q.learningLevel] || q.learningLevel}
              </span>
            )}
          </div>

          <p className="mt-4 text-base font-semibold leading-7">{q.question}</p>

          {performance === "struggling" && !answered && quizMode === "practice" && (
            <div className="study-fade-in mt-2 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-100/90">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Suggerimento: leggi tutte le opzioni prima di scegliere — elimina quelle chiaramente fuori tema.
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {(q.options || []).map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const isCorrect = q.answer === optionIndex;
              const showCorrect = answered && isCorrect && quizMode === "practice";
              const showWrong = answered && isSelected && !isCorrect && quizMode === "practice";

              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => handleAnswer(optionIndex)}
                  disabled={answered}
                  className={[
                    "study-option rounded-2xl border px-3 py-3 text-left text-sm leading-5",
                    showCorrect ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                      : showWrong ? "border-rose-300/40 bg-rose-400/10 text-rose-100"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                    answered ? "cursor-default" : "",
                  ].join(" ")}
                >
                  <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {feedback && quizMode === "practice" && (
            <div className={`study-fade-in mt-4 rounded-2xl border p-3 ${showFeedback ? "opacity-100" : "opacity-0"} ${feedback.isCorrect ? "border-emerald-300/25 bg-emerald-400/10" : "border-rose-300/25 bg-rose-400/10"}`}>
              <p className="text-sm font-bold">{feedback.headline}</p>
              <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                <p><span className="font-semibold text-foreground/90">Perché: </span>{feedback.why}</p>
                <p><span className="font-semibold text-foreground/90">🧠 Memory trick: </span>{feedback.memoryTrick}</p>
                <p><span className="font-semibold text-foreground/90">⚠ Confusione: </span>{feedback.commonConfusion}</p>
              </div>
              {!feedback.isCorrect && q && (
                <button
                  type="button"
                  disabled={tutorLoading}
                  onClick={async () => {
                    setTutorLoading(true);
                    try {
                      const result = await explainStudyQuizError({
                        question: q.question,
                        options: q.options,
                        correctIndex: q.answer,
                        selectedIndex: selected ?? -1,
                        explanation: q.explanation,
                      });
                      setTutorResult(result);
                    } finally {
                      setTutorLoading(false);
                    }
                  }}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-sky-400/25 bg-sky-400/10 text-xs font-semibold text-sky-100"
                >
                  {tutorLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  Spiegami gli errori
                </button>
              )}
              {tutorResult && (
                <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-400/8 p-3 text-sm text-muted-foreground">
                  <p><span className="font-semibold text-sky-100">Risposta corretta: </span>{tutorResult.correctAnswer}</p>
                  <p className="mt-2"><span className="font-semibold text-sky-100">Perché hai sbagliato: </span>{tutorResult.whyWrong}</p>
                  <p className="mt-2"><span className="font-semibold text-sky-100">Ripasso suggerito: </span>{tutorResult.reviewTip}</p>
                </div>
              )}
            </div>
          )}

          {answered && quizMode === "exam" && (
            <p className="mt-3 text-xs text-muted-foreground">Risposta registrata.</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderPosition(Math.max(0, orderPosition - 1))}
              disabled={orderPosition === 0}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground disabled:opacity-40"
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={orderPosition >= total - 1}
              className="h-11 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:opacity-40"
            >
              Avanti
            </button>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="study-progress h-full rounded-full bg-emerald-300"
              style={{ width: `${((orderPosition + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={resetQuiz}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground"
      >
        <RotateCcw className="h-4 w-4" />
        Rifai il quiz
      </button>
    </div>
  );
}
