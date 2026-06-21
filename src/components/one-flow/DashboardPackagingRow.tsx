import { memo, useCallback, useMemo } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, ListChecks, XCircle } from "lucide-react";
import { PaywallGuard } from "@/components/PaywallGuard";
import {
  buildDashboardPackagingActions,
  safeExecuteDashboardAction,
  type DashboardActionContext,
  type DashboardHomeAction,
} from "@/lib/one-flow/dashboard-home-actions";
import {
  buildPublishingReadinessAudit,
  type PublishingPlanPriority,
  type PublishingReadinessStatus,
  type PublishingStep,
} from "@/lib/one-flow/publishing-readiness";
import { t } from "@/lib/i18n";

type Props = {
  projectTitle?: string;
  context: DashboardActionContext;
};

function DashboardPackagingRowInner({ projectTitle, context }: Props) {
  const actions = useMemo(() => buildDashboardPackagingActions(context), [context]);
  const actionById = useMemo(
    () => new Map(actions.map((action) => [action.id, action])),
    [actions],
  );
  const audit = useMemo(
    () => buildPublishingReadinessAudit(context.activeProject),
    [context.activeProject],
  );

  const handleAction = useCallback(
    (action: DashboardHomeAction) => {
      safeExecuteDashboardAction(action, context, "packaging");
    },
    [context],
  );

  const handleActionId = useCallback(
    (actionId: string) => {
      const action = actionById.get(actionId);
      if (action) handleAction(action);
    },
    [actionById, handleAction],
  );

  if (actions.length === 0 || !audit) return null;

  return (
    <section className="mb-4 sm:mb-6" aria-labelledby="packaging-center-pro-title">
      <div className="rounded-2xl border border-amber-300/20 bg-black/28 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/58">
              Packaging Center Pro · {projectTitle || audit.projectTitle || t("untitled")}
            </p>
            <h2 id="packaging-center-pro-title" className="text-lg font-black text-white">
              Publishing Cockpit
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
              Titolo, keyword, mercato, cover, KDP ed export lavorano come un solo percorso verso la pubblicazione.
            </p>
          </div>

          <div className="min-w-[180px] rounded-xl border border-amber-300/20 bg-amber-400/[0.055] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                <Gauge className="h-3.5 w-3.5 text-amber-200" />
                Readiness
              </span>
              <StatusPill status={audit.status} />
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-black leading-none text-white tabular-nums">{audit.score}</span>
              <span className="pb-1 text-xs font-semibold text-white/40">/100</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${audit.status === "READY" ? "bg-emerald-400" : audit.status === "WARNING" ? "bg-amber-400" : "bg-rose-400"}`}
                style={{ width: `${audit.score}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/45">
              {audit.completedSteps}/{audit.totalSteps} passi pronti · {audit.signals.manuscriptWords.toLocaleString("it-IT")} parole
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-7">
          {audit.steps.map((step, index) => (
            <PublishingStepTile
              key={step.id}
              step={step}
              index={index}
              action={actionById.get(step.toolActionId)}
              onAction={handleAction}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-xl border border-amber-300/20 bg-white/[0.035] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-xs font-black text-white">
                <ListChecks className="h-4 w-4 text-amber-200" />
                One Click Publish Plan
              </p>
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                Cosa manca per pubblicare
              </span>
            </div>
            {audit.plan.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {audit.plan.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-lg border border-white/10 bg-black/22 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-white">{item.problem}</p>
                      <PriorityPill priority={item.priority} />
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/50">{item.impact}</p>
                    <button
                      type="button"
                      onClick={() => handleActionId(item.targetActionId)}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-100/80 hover:text-amber-50"
                    >
                      {item.action}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs leading-relaxed text-emerald-50/85">
                Nessun blocco editoriale-commerciale rilevato dai dati disponibili. Verifica proof KDP e metadati finali prima dell'upload.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-300/20 bg-white/[0.035] p-3">
            <p className="text-xs font-black text-white">Segnali reali letti</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <Signal label="Capitoli" value={`${audit.signals.completedChapters}/${audit.signals.totalChapters}`} />
              <Signal label="Cover" value={audit.signals.hasCover ? "Salvata" : "Assente"} />
              <Signal label="Cover file" value={audit.signals.hasCoverComposition ? "Editabile" : "No"} />
              <Signal label="KDP" value={audit.signals.hasKdpPackaging ? "Packaging" : "Da fare"} />
              <Signal label="Radar" value={audit.signals.hasRadarSnapshot ? "Snapshot" : "Da fare"} />
              <Signal label="Export" value={audit.steps.find((step) => step.id === "export")?.status || "WARNING"} />
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublishingStepTile({
  step,
  index,
  action,
  onAction,
}: {
  step: PublishingStep;
  index: number;
  action?: DashboardHomeAction;
  onAction: (action: DashboardHomeAction) => void;
}) {
  const open = action ? () => onAction(action) : undefined;
  const body = (
    <button
      type="button"
      onClick={open}
      disabled={!action}
      className="group flex h-full min-h-[148px] w-full flex-col justify-between rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-default disabled:hover:translate-y-0"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70">
            {index + 1}
          </span>
          <StatusIcon status={step.status} />
        </div>
        <p className="mt-2 text-sm font-black text-white">{step.label}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/45">{step.summary}</p>
      </div>
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-white/40">
          <span>{step.score}/100</span>
          <span>{step.status}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${step.status === "READY" ? "bg-emerald-400" : step.status === "WARNING" ? "bg-amber-400" : "bg-rose-400"}`}
            style={{ width: `${step.score}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-white/35 group-hover:text-white/60">
          Apri <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </button>
  );

  return action?.feature ? (
    <PaywallGuard feature={action.feature} compact>
      {body}
    </PaywallGuard>
  ) : body;
}

function StatusPill({ status }: { status: PublishingReadinessStatus }) {
  const cls =
    status === "READY"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
      : status === "WARNING"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
        : "border-rose-300/30 bg-rose-400/10 text-rose-100";
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${cls}`}>{status}</span>;
}

function PriorityPill({ priority }: { priority: PublishingPlanPriority }) {
  const cls =
    priority === "CRITICAL"
      ? "border-rose-300/30 bg-rose-400/10 text-rose-100"
      : priority === "HIGH"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
        : "border-cyan-300/30 bg-cyan-400/10 text-cyan-100";
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${cls}`}>{priority}</span>;
}

function StatusIcon({ status }: { status: PublishingReadinessStatus }) {
  if (status === "READY") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (status === "WARNING") return <AlertTriangle className="h-4 w-4 text-amber-300" />;
  return <XCircle className="h-4 w-4 text-rose-300" />;
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-2">
      <dt className="text-white/35">{label}</dt>
      <dd className="mt-0.5 font-bold text-white/80">{value}</dd>
    </div>
  );
}

export const DashboardPackagingRow = memo(DashboardPackagingRowInner);
