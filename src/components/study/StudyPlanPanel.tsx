import type { StudyPlanPack } from "@/lib/study-os";
import { sanitizeStudyText } from "@/lib/study-ux";

const PRIORITY_COLOR = {
  high: "text-rose-200 border-rose-300/25 bg-rose-400/10",
  medium: "text-amber-100 border-amber-300/25 bg-amber-400/10",
  low: "text-emerald-100 border-emerald-300/25 bg-emerald-400/10",
};

export function StudyPlanPanel({ plan, checklist }: { plan: StudyPlanPack; checklist?: string[] }) {
  return (
    <div className="space-y-4">
      <div className="study-card-enter rounded-3xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="font-semibold">📅 Piano di studio</h3>
        <div className="mt-3 space-y-2">
          {plan.priorityOrder.map((item) => (
            <div key={item.title} className="rounded-xl border border-white/10 bg-background/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_COLOR[item.priority]}`}>
                  {item.priority} · {item.minutes} min
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{sanitizeStudyText(item.action)}</p>
            </div>
          ))}
        </div>
      </div>

      <ListBlock title="Piano giornaliero" items={plan.dailyPlan} />
      <ListBlock title="Ripasso attivo" items={plan.activeRecallTasks} />
      <ListBlock title="Calendario revisioni" items={plan.revisionSchedule} />
      <ListBlock title="Strategia esame" items={plan.examStrategy} />

      {checklist?.length ? (
        <div className="study-card-enter rounded-2xl border border-emerald-300/20 bg-emerald-400/8 p-4">
          <p className="text-sm font-semibold text-emerald-100">✅ Checklist ripasso finale</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span>□</span>
                <span>{sanitizeStudyText(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="study-card-enter rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-emerald-300/70">•</span>
            <span>{sanitizeStudyText(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
