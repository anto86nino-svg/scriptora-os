import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Mic } from "lucide-react";
import type { OpenStudyQuestion } from "@/lib/study-session";
import type { StudyAnswerEvaluation } from "@/lib/study-answer-evaluator";
import { buildOralFollowUps, saveStudyUxState } from "@/lib/study-ux";

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
  const [followUpStep, setFollowUpStep] = useState<Record<number, number>>({});
  const [followUpReplies, setFollowUpReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    onIndexChange?.(oralIndex);
    saveStudyUxState({ currentOralIndex: oralIndex, oralFollowUpStep: followUpStep });
  }, [oralIndex, followUpStep, onIndexChange]);

  if (questions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-background/45 p-3 text-sm text-muted-foreground">
        Nessuna domanda aperta disponibile.
      </p>
    );
  }

  const item = questions[oralIndex];
  const evaluation = openEvaluations[oralIndex];
  const isEvaluating = evaluatingIndex === oralIndex;
  const currentStep = followUpStep[oralIndex] ?? 0;

  const followUps = useMemo(
    () => (evaluation ? buildOralFollowUps(item.question, openAnswers[oralIndex] || "", evaluation) : []),
    [evaluation, item.question, openAnswers, oralIndex]
  );

  const activeFollowUp = followUps[currentStep];

  return (
    <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">🎤 Oral Training</h3>
          <p className="mt-1 text-xs text-muted-foreground">Tutor conversazionale — non solo correzione statica.</p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-muted-foreground">
          {oralIndex + 1}/{questions.length}
        </span>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-background/45 p-4">
        <p className="text-base font-semibold leading-7">{item.question}</p>

        <textarea
          value={openAnswers[oralIndex] || ""}
          onChange={(e) => onAnswerChange(oralIndex, e.target.value)}
          placeholder="Rispondi come se il professore ti stesse guardando..."
          className="mt-4 min-h-[140px] w-full resize-y rounded-2xl border border-white/10 bg-background/70 p-3 text-sm leading-6 outline-none focus:border-emerald-300/40"
        />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button type="button" disabled title="Prossimamente" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-semibold text-muted-foreground opacity-60">
            <Mic className="h-4 w-4" /> 🎙 Voce
          </button>
          <button
            type="button"
            onClick={() => { setFollowUpStep((p) => ({ ...p, [oralIndex]: 0 })); void onEvaluate(oralIndex, item.question, item.answerGuide); }}
            disabled={isEvaluating}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:opacity-60"
          >
            {isEvaluating ? <><Loader2 className="h-4 w-4 animate-spin" /> Valuto...</> : "✍ Valuta risposta"}
          </button>
        </div>

        {evaluation && (
          <div className="study-fade-in mt-4 space-y-3">
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-200/80">Da migliorare</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {(evaluation.missing || []).map((line, i) => <li key={i}>• {line}</li>)}
                  </ul>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Risposta migliorata</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{evaluation.improvedAnswer}</p>
              </div>
            </div>

            {activeFollowUp && (
              <div className="study-fade-in rounded-2xl border border-amber-300/25 bg-amber-400/10 p-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-amber-200" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                    Follow-up {currentStep + 1}/{followUps.length}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-amber-100/95">{activeFollowUp.prompt}</p>

                <textarea
                  value={followUpReplies[`${oralIndex}-${currentStep}`] || ""}
                  onChange={(e) => setFollowUpReplies((p) => ({ ...p, [`${oralIndex}-${currentStep}`]: e.target.value }))}
                  placeholder="Rispondi al follow-up del tutor..."
                  className="mt-3 min-h-[80px] w-full resize-y rounded-xl border border-white/10 bg-background/70 p-2 text-sm outline-none focus:border-amber-300/40"
                />

                {currentStep < followUps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setFollowUpStep((p) => ({ ...p, [oralIndex]: currentStep + 1 }))}
                    className="mt-2 rounded-xl bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-100"
                  >
                    Prossima domanda del tutor →
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-amber-100/70">Ottimo lavoro — passa alla prossima domanda principale.</p>
                )}
              </div>
            )}

            <p className="text-sm leading-6 text-emerald-100/85">{evaluation.advice}</p>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOralIndex((v) => Math.max(0, v - 1))} disabled={oralIndex === 0} className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground disabled:opacity-40">
          ← Precedente
        </button>
        <button type="button" onClick={() => setOralIndex((v) => Math.min(questions.length - 1, v + 1))} disabled={oralIndex >= questions.length - 1} className="h-11 rounded-2xl bg-emerald-300 text-sm font-bold text-slate-950 disabled:opacity-40">
          Prossima →
        </button>
      </div>

      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOralIndex(i)}
            className={`h-2 min-w-[2rem] flex-1 rounded-full transition-colors duration-200 ${i === oralIndex ? "bg-emerald-300" : openEvaluations[i] ? "bg-emerald-400/40" : "bg-white/10"}`}
            aria-label={`Domanda ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
