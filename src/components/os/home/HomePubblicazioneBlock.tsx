import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Gauge, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import {
  buildDashboardPackagingActions,
  safeExecuteDashboardAction,
} from "@/lib/one-flow/dashboard-home-actions";
import type { PublishingReadinessAudit, PublishingReadinessStatus } from "@/lib/one-flow/publishing-readiness";
import { OS_HOUSE_PATHS } from "@/lib/os/os-house-registry";
import { PUBLISHING_FLOW_ORDER, getToolRoute, resolvePublishingFlowToolId } from "@/lib/one-flow/tool-registry";

type Props = {
  projectTitle?: string;
  context: DashboardActionContext;
};

export const HomePubblicazioneBlock = forwardRef<HTMLElement, Props>(function HomePubblicazioneBlock(
  { projectTitle, context },
  ref,
) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [audit, setAudit] = useState<PublishingReadinessAudit | null>(null);
  const [loading, setLoading] = useState(false);

  const actions = useMemo(() => buildDashboardPackagingActions(context), [context]);
  const actionById = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions]);

  useEffect(() => {
    if (!expanded || !context.hasActiveBook) return;
    let cancelled = false;
    setLoading(true);
    void import("@/lib/one-flow/publishing-readiness")
      .then(({ buildPublishingReadinessAudit }) => {
        if (cancelled) return;
        setAudit(buildPublishingReadinessAudit(context.activeProject));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, context.activeProject, context.hasActiveBook]);

  const nextStep = useMemo(() => {
    if (!audit) return null;
    const pending = audit.steps.find((step) => step.status !== "READY");
    if (!pending) return null;
    const action = actionById.get(pending.toolActionId);
    if (!action) return null;
    const toolId = PUBLISHING_FLOW_ORDER.find((id) => action.route === getToolRoute(id));
    const nextRoute = toolId ? getToolRoute(toolId) : undefined;
    return {
      label: pending.label,
      action,
      nextToolId: nextRoute ? resolvePublishingFlowToolId(nextRoute) : undefined,
    };
  }, [actionById, audit]);

  const handleNextStep = useCallback(() => {
    if (!nextStep) return;
    safeExecuteDashboardAction(nextStep.action, context, "packaging");
  }, [context, nextStep]);

  return (
    <section
      ref={ref}
      aria-labelledby="home-pubblicazione-title"
      className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.07)] sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/65">Pubblicazione</p>
          <h2 id="home-pubblicazione-title" className="mt-1 text-xl font-black text-slate-950">
            Pubblicazione / Export
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {context.hasActiveBook
              ? `Readiness per ${projectTitle || "il libro attivo"}`
              : "Seleziona un libro per calcolare il readiness packaging."}
          </p>
        </div>

        {expanded && audit ? (
          <div className="min-w-[160px] rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Readiness</span>
              <StatusPill status={audit.status} />
            </div>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="text-3xl font-black text-slate-950 tabular-nums">{audit.score}</span>
              <span className="pb-0.5 text-xs text-slate-400">%</span>
            </div>
          </div>
        ) : null}
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={!context.hasActiveBook}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Gauge className="h-4 w-4" />
          Controlla readiness
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          {loading && !audit ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              Calcolo readiness…
            </div>
          ) : null}

          {audit ? (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${
                    audit.status === "READY"
                      ? "bg-emerald-400"
                      : audit.status === "WARNING"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                  }`}
                  style={{ width: `${audit.score}%` }}
                />
              </div>
              {nextStep ? (
                <div className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Prossimo passo</p>
                    <p className="text-sm text-slate-500">{nextStep.label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white hover:bg-emerald-950"
                  >
                    Vai
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-emerald-700">Tutti i passi packaging risultano pronti.</p>
              )}
            </>
          ) : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate(OS_HOUSE_PATHS.pubblicazione)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-950"
      >
        Apri Pubblicazione / Export
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </section>
  );
});

function StatusPill({ status }: { status: PublishingReadinessStatus }) {
  if (status === "READY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Pronto
      </span>
    );
  }
  if (status === "WARNING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
        <AlertTriangle className="h-3 w-3" />
        Attenzione
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
      <XCircle className="h-3 w-3" />
      Bloccato
    </span>
  );
}
