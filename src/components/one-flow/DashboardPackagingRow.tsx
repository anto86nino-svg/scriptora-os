import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Gauge, ListChecks, Loader2, XCircle } from "lucide-react";
import { PaywallGuard } from "@/components/PaywallGuard";
import {
  buildDashboardPackagingActions,
  safeExecuteDashboardAction,
  type DashboardActionContext,
  type DashboardHomeAction,
} from "@/lib/one-flow/dashboard-home-actions";
import type {
  PublishingPlanPriority,
  PublishingReadinessAudit,
  PublishingReadinessStatus,
  PublishingStep,
} from "@/lib/one-flow/publishing-readiness";
import {
  getPublishingFlowNext,
  getToolRoute,
  PUBLISHING_FLOW_ORDER,
  resolvePublishingFlowToolId,
} from "@/lib/one-flow/tool-registry";
import { t } from "@/lib/i18n";

type Props = {
  projectTitle?: string;
  context: DashboardActionContext;
};

function DashboardPackagingRowInner({ projectTitle, context }: Props) {
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [audit, setAudit] = useState<PublishingReadinessAudit | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const actions = useMemo(() => buildDashboardPackagingActions(context), [context]);
  const actionById = useMemo(
    () => new Map(actions.map((action) => [action.id, action])),
    [actions],
  );

  useEffect(() => {
    if (!context.hasActiveBook || !auditExpanded) return;
    let cancelled = false;
    setAuditLoading(true);
    void import("@/lib/one-flow/publishing-readiness")
      .then(({ buildPublishingReadinessAudit }) => {
        if (cancelled) return;
        setAudit(buildPublishingReadinessAudit(context.activeProject));
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auditExpanded, context.activeProject, context.hasActiveBook]);

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

  const nextStep = useMemo(() => {
    if (!audit) return null;
    const pending = audit.steps.find((step) => step.status !== "READY");
    if (!pending) return null;
    const action = actionById.get(pending.toolActionId);
    if (!action) return null;
    const toolId = PUBLISHING_FLOW_ORDER.find((id) => {
      const route = getToolRoute(id);
      return action.route === route;
    });
    const nextRoute = toolId ? getPublishingFlowNext(toolId) : undefined;
    return {
      label: pending.label,
      action,
      nextRoute,
      nextToolId: nextRoute ? resolvePublishingFlowToolId(nextRoute) : undefined,
    };
  }, [actionById, audit]);

  if (!context.hasActiveBook) {
    return (
      <section className="mb-4 sm:mb-6" aria-labelledby="packaging-center-empty-title">
        <div className="rounded-2xl border border-amber-300/20 bg-black/28 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26)]">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/58">
            Mercato e pubblicazione
          </p>
          <h2 id="packaging-center-empty-title" className="text-lg font-black text-white">
            Packaging Center
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
            Titolo, keyword, radar, cover, KDP ed export si attivano sul libro selezionato.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => context.openTool("projects")}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 hover:bg-amber-200"
            >
              <BookOpen className="h-4 w-4" />
              Scegli un libro
            </button>
            <button
              type="button"
              onClick={() => context.onNavigate(getToolRoute("publishing"))}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-white/80 hover:bg-white/[0.10]"
            >
              Publishing Center
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4 sm:mb-6" aria-labelledby="packaging-center-pro-title">
      <div className="rounded-2xl border border-amber-300/20 bg-black/28 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.26)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200/58">
              Packaging Center Pro · {projectTitle || t("untitled")}
            </p>
            <h2 id="packaging-center-pro-title" className="text-lg font-black text-white">
              Mercato e pubblicazione
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55">
              Titolo, keyword, mercato, cover, KDP ed export lavorano come un solo percorso verso la pubblicazione.
            </p>
          </div>

          {auditExpanded && audit ? (
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
          ) : (
            <div className="min-w-[180px] rounded-xl border border-amber-300/20 bg-amber-400/[0.055] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Readiness audit</p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                Apri il pannello per calcolare readiness, checklist e piano pubblicazione.
              </p>
              <button
                type="button"
                onClick={() => setAuditExpanded(true)}
                className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 text-xs font-bold text-amber-50 hover:bg-amber-400/15"
              >
                {auditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gauge className="h-3.5 w-3.5" />}
                Apri readiness
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <PackagingActionChip key={action.id} action={action} onAction={handleAction} />
          ))}
        </div>

        {nextStep && auditExpanded && (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-white/[0.035] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black text-white">Prossimo passo</p>
                <p className="mt-1 text-[11px] text-white/50">
                  Completa <span className="font-semibold text-white/75">{nextStep.label}</span>
                  {nextStep.nextToolId ? ` · poi ${getToolRoute(nextStep.nextToolId)}` : ""}
                </p>
              </div>
              <PaywallGuard feature={nextStep.action.feature} compact>
                <button
                  type="button"
                  onClick={() => handleAction(nextStep.action)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 hover:bg-amber-200"
                >
                  Vai a {nextStep.label}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </PaywallGuard>
            </div>
          </div>
        )}

        {auditExpanded && auditLoading && !audit && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-amber-200" />
            Calcolo readiness e checklist…
          </div>
        )}

        {auditExpanded && audit && (
          <>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
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
          </>
        )}
      </div>
    </section>
  );
}

function PackagingActionChip({
  action,
  onAction,
}: {
  action: DashboardHomeAction;
  onAction: (action: DashboardHomeAction) => void;
}) {
  const body = (
    <button
      type="button"
      onClick={() => onAction(action)}
      className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs font-bold text-white transition-all hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span>{action.label}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/40" />
    </button>
  );

  return action.feature ? (
    <PaywallGuard feature={action.feature} compact>
      {body}
    </PaywallGuard>
  ) : body;
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
