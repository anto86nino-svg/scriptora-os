import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  FileCheck2,
  HeartPulse,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { t, tt } from "@/lib/i18n";
import {
  buildScriptoraIntelligenceSnapshot,
  type ScriptoraPlanAwareness,
} from "@/lib/scriptora-os/ScriptoraIntelligenceCore";
import type { BookProject } from "@/types/book";

interface EditorialOSCommandCenterProps {
  project: BookProject;
  hasCover: boolean;
  plan?: ScriptoraPlanAwareness;
  compact?: boolean;
  className?: string;
}

function scoreLabel(value: number | null): string {
  return value == null ? "—" : `${value}`;
}

function scoreTone(value: number | null): string {
  if (value == null) return "text-white/45";
  if (value >= 78) return "text-emerald-300";
  if (value >= 60) return "text-sky-300";
  if (value >= 45) return "text-amber-300";
  return "text-rose-300";
}

export function EditorialOSCommandCenter({
  project,
  hasCover,
  plan,
  compact = false,
  className = "",
}: EditorialOSCommandCenterProps) {
  const navigate = useNavigate();
  const snapshot = useMemo(
    () => buildScriptoraIntelligenceSnapshot({ project, coverStatus: hasCover, plan }),
    [project, hasCover, plan],
  );
  const next = snapshot.nextBestAction;

  const runNextAction = () => {
    try {
      sessionStorage.setItem("nexora-open-project", project.id);
      if (next.chapterIndex != null) {
        sessionStorage.setItem("nexora-open-section", `chapter-${next.chapterIndex}`);
      }
    } catch {
      /* session storage may be unavailable in private browsing */
    }
    navigate(next.route);
  };

  const metrics = [
    {
      label: t("os_core_health"),
      value: scoreLabel(snapshot.bookHealthScore),
      suffix: "/100",
      icon: HeartPulse,
      tone: scoreTone(snapshot.bookHealthScore),
    },
    {
      label: t("os_core_publication"),
      value: scoreLabel(snapshot.publicationReadinessScore),
      suffix: "/100",
      icon: FileCheck2,
      tone: scoreTone(snapshot.publicationReadinessScore),
    },
    {
      label: t("os_core_kdp"),
      value: scoreLabel(snapshot.kdpReadiness.score),
      suffix: snapshot.kdpReadiness.score == null ? "" : "/100",
      icon: Target,
      tone: scoreTone(snapshot.kdpReadiness.score),
    },
  ];

  return (
    <section
      className={`ios-panel overflow-hidden border border-fuchsia-300/15 bg-black/35 shadow-[0_22px_70px_rgba(15,8,35,0.28)] backdrop-blur-xl ${className}`}
      aria-label={t("os_core_title")}
    >
      <div className={compact ? "p-3.5" : "p-4 sm:p-5"}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-200/80">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("os_core_title")}
            </div>
            <h2 className={`mt-1 font-semibold text-white ${compact ? "text-sm" : "text-base"}`}>
              {t("os_core_heading")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {snapshot.dataStatus === "ready"
                ? t("os_core_ready_desc")
                : t("os_core_empty_desc")}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1 text-[10px] font-semibold text-white/65">
            {snapshot.editorialGrade}
          </span>
        </div>

        <div className={`mt-4 grid gap-2 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-lg border border-white/10 bg-white/[0.045] p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-white/45">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-200/70" aria-hidden />
                  <span className="truncate">{metric.label}</span>
                </div>
                <p className={`mt-1 text-lg font-bold tabular-nums ${metric.tone}`}>
                  {metric.value}
                  <span className="ml-0.5 text-[10px] font-medium text-white/35">{metric.suffix}</span>
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.055] p-3">
          <div className="flex items-start gap-2">
            <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-100/70">
                {t("os_core_next")}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">{tt(next.labelKey)}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">{tt(next.reasonKey)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={runNextAction}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-50 sm:w-auto"
          >
            {tt(next.ctaKey)}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {!compact && (
          <details className="group mt-3 rounded-lg border border-white/10 bg-white/[0.035]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-white/70">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-fuchsia-200/80" aria-hidden />
                {t("os_core_details")}
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-3">
              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-white/40">{t("os_core_memory")}</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {snapshot.bookMemory.report.narrativeHealth}/100
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/48">
                  {tt("os_core_memory_desc", { count: snapshot.continuityWarnings.length })}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-white/40">{t("os_core_risks")}</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {snapshot.chapterRiskMap.filter((chapter) => chapter.issueCount > 0).length}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/48">
                  {tt("os_core_risks_desc", { count: snapshot.repetitionWarnings.length })}
                </p>
              </div>
              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-white/40">{t("os_core_export")}</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {snapshot.exportReadiness.score}/100
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] leading-relaxed text-white/48">
                  <BookOpenCheck className="h-3 w-3" aria-hidden />
                  {snapshot.exportReadiness.labelText}
                </p>
              </div>
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
