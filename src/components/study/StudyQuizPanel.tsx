import { useEffect, useMemo, useState } from "react";
import { Clock, GraduationCap, RotateCcw, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/lib/study-session";
import {
  buildQuizFeedback,
  buildQuizPerformanceReport,
  clearStudyUxQuizState,
  inferQuizDifficulty,
  pickAdaptiveNextIndex,
  saveStudyUxState,
  shuffleIndices,
} from "@/lib/study-ux";

interface StudyQuizPanelProps {
  quiz: QuizQuestion[];
  keyConcepts: string[];
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
}

const EXAM_TIME_OPTIONS = [
  { label: "Senza timer", sec: null },
  { label: "5 min", sec: 300 },
  { label: "10 min", sec: 600 },
  { label: "15 min", sec: 900 },
];

export function StudyQuizPanel({
  quiz,
  keyConcepts,
  initialAnswers = {},
  initialIndex = 0,
  initialMode = "practice",
  initialOrder = [],
  onStateChange,
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
  const [showExamSetup, setShowExamSetup] = useState(false);

  const safeQuiz = quiz;
  const total = safeQuiz.length;
  const answeredCount = Object.keys(quizAnswers).length;
  const isComplete = total > 0 && answeredCount === total;
  const currentQuestionIndex = quizOrder[orderPosition] ?? 0;
  const q = safeQuiz[currentQuestionIndex];
  const selected = quizAnswers[currentQuestionIndex];
  const answered = selected !== undefined;
  const feedback = answered && q ? buildQuizFeedback(q, selected) : null;

  const performance = useMemo(
    () => (isComplete ? buildQuizPerformanceReport(safeQuiz, quizAnswers, keyConcepts) : null),
    [isComplete, safeQuiz, quizAnswers, keyConcepts]
  );

  useEffect(() => {
    onStateChange?.({ quizAnswers, currentQuizIndex: currentQuestionIndex, quizMode, quizOrder });
    saveStudyUxState({ quizAnswers, currentQuizIndex: currentQuestionIndex, quizMode, quizOrder });
  }, [quizAnswers, currentQuestionIndex, quizMode, quizOrder, onStateChange]);

  useEffect(() => {
    if (quizMode !== "exam" || !examStartedAt || !examTimeLimitSec) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - examStartedAt) / 1000);
      setExamElapsed(elapsed);
      if (elapsed >= examTimeLimitSec) return;
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [quizMode, examStartedAt, examTimeLimitSec]);

  const timeRemaining = examTimeLimitSec
    ? Math.max(0, examTimeLimitSec - examElapsed)
    : null;

  function startExamMode(limitSec: number | null) {
    const order = shuffleIndices(total);
    setQuizMode("exam");
    setQuizOrder(order);
    setOrderPosition(0);
    setQuizAnswers({});
    setExamTimeLimitSec(limitSec);
    setExamStartedAt(Date.now());
    setExamElapsed(0);
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
    setShowExamSetup(false);
    clearStudyUxQuizState();
  }

  function handleAnswer(optionIndex: number) {
    if (answered) return;
    setQuizAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  }

  function goNext() {
    if (orderPosition < total - 1) {
      const nextPos = orderPosition + 1;
      if (quizMode === "practice" && !quizAnswers[quizOrder[nextPos]]) {
        const adaptiveIdx = pickAdaptiveNextIndex(safeQuiz, quizOrder, { ...quizAnswers }, currentQuestionIndex);
        const adaptivePos = quizOrder.indexOf(adaptiveIdx);
        if (adaptivePos > orderPosition) {
          setOrderPosition(adaptivePos);
          return;
        }
      }
      setOrderPosition(nextPos);
    }
  }

  function goPrev() {
    if (orderPosition > 0) setOrderPosition(orderPosition - 1);
  }

  if (total === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessun quiz disponibile in questa sessione. Rigenera l&apos;analisi per creare domande a risposta multipla.
      </p>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold">
            {quizMode === "exam" ? "🎓 Simula verifica reale" : "Quiz interattivo premium"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {quizMode === "exam"
              ? "Modalità esame: niente suggerimenti finché non completi. Timer opzionale."
              : "Impara mentre rispondi — ogni errore diventa una lezione."}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background/50 px-4 py-2 text-sm">
          {isComplete ? (
            <span className="font-bold text-emerald-200">Completato ✓</span>
          ) : (
            <>
              <span className="text-muted-foreground">Progresso: </span>
              <span className="font-bold text-emerald-200">
                {answeredCount}/{total} completate
              </span>
            </>
          )}
        </div>
      </div>

      {quizMode === "practice" && !isComplete && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowExamSetup(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/20"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            🎓 Simula verifica reale
          </button>
        </div>
      )}

      {showExamSetup && !examStartedAt && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-background/45 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Scegli durata (opzionale) e inizia</p>
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
        </div>
      )}

      {quizMode === "exam" && examStartedAt && timeRemaining !== null && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100">
          <Clock className="h-3.5 w-3.5" />
          {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, "0")} rimanenti
        </div>
      )}

      {isComplete && performance && (
        <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-200" />
            <h4 className="text-base font-bold text-emerald-100">🎓 Study Performance</h4>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-100">Score: {performance.score}/100</p>

          {performance.strongAreas.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Aree forti</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {performance.strongAreas.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {performance.needsReview.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/80">Da ripassare</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {performance.needsReview.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          {performance.suggestedReview.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Ripasso suggerito</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {performance.suggestedReview.map((line, i) => <li key={i}>• {line}</li>)}
              </ul>
            </div>
          )}

          <p className="mt-3 text-sm text-emerald-100/90">
            Prestazione orale stimata: <span className="font-bold">{performance.estimatedOral}</span>
          </p>
        </div>
      )}

      {q && (!isComplete || orderPosition < total) && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-background/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
              Domanda {orderPosition + 1}/{total}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {inferQuizDifficulty(q)}
            </span>
          </div>

          <p className="mt-4 text-base font-semibold leading-7">{q.question}</p>

          <div className="mt-4 grid gap-2">
            {(Array.isArray(q.options) ? q.options : []).map((option, optionIndex) => {
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
                    "rounded-2xl border px-3 py-3 text-left text-sm leading-5 transition",
                    showCorrect
                      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                      : showWrong
                        ? "border-rose-300/40 bg-rose-400/10 text-rose-100"
                        : isSelected && quizMode === "practice"
                          ? "border-white/25 bg-white/10 text-foreground"
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
            <div className={`mt-4 rounded-2xl border p-3 ${feedback.isCorrect ? "border-emerald-300/25 bg-emerald-400/10" : "border-rose-300/25 bg-rose-400/10"}`}>
              <p className="text-sm font-bold">{feedback.headline}</p>
              <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                <p><span className="font-semibold text-foreground/90">Perché: </span>{feedback.why}</p>
                <p><span className="font-semibold text-foreground/90">🧠 Ricorda: </span>{feedback.remember}</p>
                <p><span className="font-semibold text-foreground/90">⚠ Confusione comune: </span>{feedback.commonConfusion}</p>
              </div>
            </div>
          )}

          {answered && quizMode === "exam" && (
            <p className="mt-3 text-xs text-muted-foreground">Risposta registrata. Spiegazione disponibile al termine.</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={orderPosition === 0}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 hover:text-foreground"
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={orderPosition >= total - 1}
              className="h-11 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-200"
            >
              Avanti
            </button>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-emerald-300 transition-all"
              style={{ width: `${((orderPosition + 1) / Math.max(1, total)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isComplete && quizMode === "exam" && q && (
        <div className="mt-4 space-y-3">
          {quizOrder.map((qi, pos) => {
            const question = safeQuiz[qi];
            const ans = quizAnswers[qi];
            if (!question || ans === undefined) return null;
            const fb = buildQuizFeedback(question, ans);
            return (
              <div key={qi} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                <p className="text-xs font-semibold text-muted-foreground">Domanda {pos + 1}</p>
                <p className="mt-1 text-sm font-semibold">{question.question}</p>
                <p className={`mt-2 text-sm font-bold ${fb.isCorrect ? "text-emerald-200" : "text-rose-200"}`}>
                  {fb.headline}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{fb.why}</p>
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={resetQuiz}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <RotateCcw className="h-4 w-4" />
        Rifai il quiz
      </button>
    </div>
  );
}
