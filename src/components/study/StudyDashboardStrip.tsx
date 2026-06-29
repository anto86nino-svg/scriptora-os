import { useEffect, useState } from "react";
import { Bell, BookOpen, Clock, Layers, Target, TrendingUp, Trophy } from "lucide-react";
import { loadStudyDashboardStats, type StudyDashboardStats } from "@/lib/study-os/study-dashboard";
import {
  loadPersistedReminderBadgeCount,
  persistReminderBadgeCount,
  requestStudyNotificationPermission,
} from "@/lib/study-os/study-reminders";

export function StudyDashboardStrip() {
  const [stats, setStats] = useState<StudyDashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadStudyDashboardStats().then((data) => {
      if (!cancelled) {
        setStats(data);
        persistReminderBadgeCount(data.reviewsDue);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (!stats || stats.sessionsCount === 0) return null;

  const badgeCount = stats.reviewsDue || loadPersistedReminderBadgeCount();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/80">
          I tuoi progressi
        </p>
        {badgeCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-100">
            <Bell className="h-3 w-3" />
            {badgeCount} ripasso{badgeCount === 1 ? "" : "i"} in scadenza
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={Clock} label="Ore studiate" value={`${stats.hoursStudied}h`} />
        <Stat icon={Target} label="Quiz fatti" value={String(stats.quizzesCompleted)} />
        <Stat icon={Layers} label="Flashcard" value={String(stats.flashcardsMemorized)} />
        <Stat icon={Trophy} label="Accuratezza" value={`${stats.avgQuizAccuracy}%`} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat icon={TrendingUp} label="Retention FC" value={`${stats.flashcardRetention}%`} />
        {stats.accuracyTrend.length > 1 && (
          <div className="col-span-2 rounded-xl border border-white/8 bg-background/40 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trend quiz</p>
            <div className="mt-2 flex h-8 items-end gap-1">
              {stats.accuracyTrend.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-emerald-400/50"
                  style={{ height: `${Math.max(12, value)}%` }}
                  title={`${value}%`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {stats.subjects.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          {stats.subjects.slice(0, 5).map((subject) => (
            <span
              key={subject}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {subject}
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => void requestStudyNotificationPermission()}
        className="mt-2 text-[10px] font-semibold text-emerald-200/70 underline-offset-2 hover:underline"
      >
        Attiva promemoria browser (opzionale)
      </button>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-background/40 p-2.5">
      <Icon className="h-3.5 w-3.5 text-emerald-300/80" />
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
