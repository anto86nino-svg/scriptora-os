import { useMemo, useState } from "react";
import { Calendar, ListChecks } from "lucide-react";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import type { StudyMemorySnapshot } from "@/lib/study-os/study-memory";
import { buildStudyPlan, getStudyPlanModeLabel } from "@/lib/study-os/study-plan";

interface StudyPlanPanelProps {
  materia: string;
  kernelPlan?: StudyKernelPlan | null;
  memory?: StudyMemorySnapshot | null;
}

export function StudyPlanPanel({ materia, kernelPlan, memory }: StudyPlanPanelProps) {
  const defaultExam = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, []);

  const [examDate, setExamDate] = useState(defaultExam);
  const [minutesPerDay, setMinutesPerDay] = useState(45);

  const plan = useMemo(
    () =>
      buildStudyPlan({
        materia,
        examDate: new Date(examDate),
        minutesPerDay,
        kernelPlan,
        memory,
      }),
    [materia, examDate, minutesPerDay, kernelPlan, memory],
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-emerald-200" />
        <h3 className="font-semibold">Piano di studio</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Calendario semplice con priorità e ripassi — basato sul kernel e sulla memoria studio.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Materia
          <input
            type="text"
            value={materia}
            readOnly
            className="mt-1 w-full rounded-xl border border-white/10 bg-background/50 px-3 py-2.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Data esame
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-white/10 bg-background/70 px-3 py-2.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Minuti/giorno
          <select
            value={minutesPerDay}
            onChange={(e) => setMinutesPerDay(Number(e.target.value))}
            className="mt-1 w-full min-h-[44px] rounded-xl border border-white/10 bg-background/70 px-3 py-2.5 text-sm text-foreground"
          >
            <option value={20}>20 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-xs text-emerald-100/80">
        {plan.daysRemaining} giorni · {plan.totalSessions} sessioni · ~{plan.totalMinutes} min totali
      </p>

      <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {plan.sessions.slice(0, 14).map((session) => (
          <div
            key={session.id}
            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-background/45 p-3"
          >
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200/80" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-foreground">{session.dayLabel}</span>
                <span className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  session.priority === "alta" ? "bg-rose-300/20 text-rose-100" : "bg-white/10 text-muted-foreground",
                ].join(" ")}
                >
                  {session.priority}
                </span>
                {session.isReview && (
                  <span className="rounded-full bg-sky-300/15 px-2 py-0.5 text-[10px] font-bold text-sky-100">
                    Ripasso
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm font-medium text-foreground/90">{session.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {getStudyPlanModeLabel(session.mode)} · {session.minutes} min
                {session.topics.length ? ` · ${session.topics.slice(0, 2).join(", ")}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      {plan.reviewSchedule.length > 0 && (
        <div className="mt-3 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-[11px] text-sky-100">
          <span className="font-semibold">Ripassi programmati: </span>
          {plan.reviewSchedule.slice(0, 3).join(" · ")}
        </div>
      )}
    </div>
  );
}
