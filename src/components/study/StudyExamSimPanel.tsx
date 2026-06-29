import { useMemo } from "react";
import { AlertTriangle, Award, CheckCircle2 } from "lucide-react";
import type { EnhancedQuizItem } from "@/lib/study-os/study-quiz-engine";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  buildExamSimReport,
  EXAM_CERTIFICATE_THRESHOLD,
  type ExamSimReport,
} from "@/lib/study-os/study-exam-simulation";
import { StudyGapPanel } from "@/components/study/StudyGapPanel";
import { analyzeStudyGaps } from "@/lib/study-os/study-gap-analysis";
import type { StudyMemorySnapshot } from "@/lib/study-os/study-memory";

interface StudyExamSimPanelProps {
  quiz: EnhancedQuizItem[];
  answers: Record<number, number>;
  kernelPlan?: StudyKernelPlan | null;
  memory?: StudyMemorySnapshot | null;
  onRequestCertificate?: (report: ExamSimReport) => void;
}

export function StudyExamSimPanel({
  quiz,
  answers,
  kernelPlan,
  memory,
  onRequestCertificate,
}: StudyExamSimPanelProps) {
  const answeredCount = Object.keys(answers).length;
  const isComplete = quiz.length > 0 && answeredCount >= quiz.length;

  const report = useMemo(
    () =>
      isComplete
        ? buildExamSimReport({
            quiz,
            answers,
            kernelPlan,
            priorAttempts: memory?.quizAttempts,
          })
        : null,
    [isComplete, quiz, answers, kernelPlan, memory?.quizAttempts],
  );

  const gaps = useMemo(
    () =>
      report
        ? analyzeStudyGaps({
            memory,
            examScore: report.score,
            quizAttempts: memory?.quizAttempts,
          })
        : null,
    [report, memory],
  );

  if (!isComplete || !report) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
        Completa tutte le domande per vedere voto, lacune e attestato.
        {quiz.length > 0 && ` (${answeredCount}/${quiz.length})`}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={[
        "rounded-2xl border p-4",
        report.passed ? "border-emerald-300/30 bg-emerald-400/10" : "border-amber-300/30 bg-amber-400/10",
      ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2">
          {report.passed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-200" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-200" />
          )}
          <h3 className="text-base font-semibold text-foreground">
            Risultato simulazione esame
          </h3>
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground">
          {report.score}/100 · {report.grade10}/10 · {report.grade30}/30
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{report.judgement}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {report.correct}/{report.total} risposte corrette
        </p>

        {report.certificateEligible && onRequestCertificate && (
          <button
            type="button"
            onClick={() => onRequestCertificate(report)}
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950"
          >
            <Award className="h-4 w-4" />
            Scarica attestato (≥{EXAM_CERTIFICATE_THRESHOLD}%)
          </button>
        )}
      </div>

      {gaps && <StudyGapPanel gaps={gaps} />}

      {report.errors.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-200/90">Errori</p>
          <ul className="mt-2 space-y-2">
            {report.errors.slice(0, 5).map((err, i) => (
              <li key={i} className="text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-foreground">{err.topic}: </span>
                {err.suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.suggestions.length > 0 && (
        <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-3 text-xs text-sky-100">
          <p className="font-semibold">Suggerimenti</p>
          <ul className="mt-1 space-y-0.5">
            {report.suggestions.map((s) => (
              <li key={s}>→ {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
