import { useEffect, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import type { OpenStudyQuestion } from "@/lib/study-session";
import type { StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import { buildOralFollowUp, saveStudyUxState } from "@/lib/study-ux";

interface StudyOralPanelProps {
  questions: OpenStudyQuestion[];
  openAnswers: Record<number, string>;
  openEvaluations: Record<number, StudyAnswerEvaluation>;
  evaluatingIndex: number | null;
  currentIndex?: number;
  onAnswerChange: (index: number, value: string) => void;
  onEvaluate: (index: number, question: string, answerGuide: string) => void;
  onIndexChange?: (index: number) => void;
}

export function StudyOralPanel({
  questions,
  openAnswers,
  openEvaluations,
  evaluatingIndex,
  currentIndex = 0,
  onAnswerChange,
  onEvaluate,
  onIndexChange,
}: StudyOralPanelProps) {
  const [oralIndex, setOralIndex] = useState(Math.min(currentIndex, Math.max(0, questions.length - 1)));

  useEffect(() => {
    onIndexChange?.(oralIndex);
    saveStudyUxState({ currentOralIndex: oralIndex });
  }, [oralIndex, onIndexChange]);

  if (questions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessuna domanda aperta disponibile. Rigenera l&apos;analisi per creare domande da interrogazione.
      </p>
    );
  }

  const item = questions[oralIndex];
  const evaluation = openEvaluations[oralIndex];
  const isEvaluating = evaluatingIndex === oralIndex;
  const followUp = evaluation ? buildOralFollowUp(item.question, evaluation) : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">🎤 Oral Training</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Una domanda alla volta — come un vero professore all&apos;interrogazione.
          </p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
          Domanda {oralIndex + 1}/{questions.length}
        </span>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-background/45 p-4">
        <p className="text-base font-semibold leading-7">{item.question}</p>

        <textarea
          value={openAnswers[oralIndex] || ""}
          onChange={(e) => onAnswerChange(oralIndex, e.target.value)}
          placeholder="Scrivi la tua risposta come se fossi all'interrogazione..."
          className="mt-4 min-h-[140px] w-full resize-y rounded-2xl border border-white/10 bg-background/70 p-3 text-sm leading-6 text-foreground outline-none focus:border-emerald-300/40"
        />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled
            title="Prossimamente"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-muted-foreground opacity-60"
          >
            <Mic className="h-4 w-4" />
            🎙 Risposta vocale
          </button>
          <button
            type="button"
            onClick={() => void onEvaluate(oralIndex, item.question, item.answerGuide)}
            disabled={isEvaluating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scriptora valuta...
              </>
            ) : (
              "✍ Valuta risposta scritta"
            )}
          </button>
        </div>

        {evaluation && (
          <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-emerald-100">Valutazione tutor</p>
              <span className="rounded-full bg-background/60 px-3 py-1 text-xs font-bold text-emerald-100">
                {evaluation.score}/100 · {evaluation.level}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Punti forti</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {(evaluation.strengths || []).map((line, i) => <li key={i}>• {line}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/80">Concetti mancanti</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {(evaluation.missing || []).map((line, i) => <li key={i}>• {line}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Risposta migliorata</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{evaluation.improvedAnswer}</p>
            </div>

            {followUp && (
              <div className="mt-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">Follow-up del tutor</p>
                <p className="mt-2 text-sm leading-6 text-amber-100/90">{followUp}</p>
              </div>
            )}

            <p className="mt-3 text-sm leading-6 text-emerald-100/85">{evaluation.advice}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOralIndex((v) => Math.max(0, v - 1))}
          disabled={oralIndex === 0}
          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground disabled:opacity-40 hover:text-foreground"
        >
          ← Precedente
        </button>
        <button
          type="button"
          onClick={() => setOralIndex((v) => Math.min(questions.length - 1, v + 1))}
          disabled={oralIndex >= questions.length - 1}
          className="h-11 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:opacity-40 hover:bg-emerald-200"
        >
          Prossima →
        </button>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOralIndex(i)}
            className={[
              "h-2 min-w-[2rem] flex-1 rounded-full transition",
              i === oralIndex ? "bg-emerald-300" : openEvaluations[i] ? "bg-emerald-400/40" : "bg-white/10",
            ].join(" ")}
            aria-label={`Domanda ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
