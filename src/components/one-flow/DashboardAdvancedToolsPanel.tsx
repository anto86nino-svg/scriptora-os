import { memo, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ClipboardCheck,
  FileWarning,
  Layers3,
  ScanLine,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import { PaywallGuard } from "@/components/PaywallGuard";
import {
  buildDashboardAdvancedActions,
  safeExecuteDashboardAction,
  type DashboardActionContext,
  type DashboardHomeAction,
} from "@/lib/one-flow/dashboard-home-actions";
import {
  buildAdvancedToolsAudit,
  type AdvancedAuditScore,
  type AdvancedAuditSeverity,
  type AdvancedAuditWarning,
  type AdvancedRepairPlanItem,
} from "@/lib/advanced-tools-audit";
import { t } from "@/lib/i18n";

type Props = {
  context: DashboardActionContext;
};

const GROUP_LABELS: Record<DashboardHomeAction["group"], string> = {
  optimization: "Ottimizzazione & mercato",
  writer: "Strumenti scrittura",
  system: "Sistema",
};

const GROUP_ORDER = ["optimization", "writer", "system"] as const;

const SCORE_META: Record<string, { label: string; icon: any }> = {
  bookHealth: { label: "Book Health Check", icon: BookOpenCheck },
  canonIntegrity: { label: "Canon Integrity", icon: ShieldCheck },
  subchapterIntegrity: { label: "Subchapter Auditor", icon: Layers3 },
  duplicateSceneRisk: { label: "Duplicate Scene", icon: ScanLine },
  bestsellerReadiness: { label: "Bestseller Readiness", icon: Sparkles },
  exportReadiness: { label: "Export Readiness", icon: ClipboardCheck },
};

const SEVERITY_STYLE: Record<AdvancedAuditSeverity, string> = {
  CRITICAL: "border-red-400/35 bg-red-500/10 text-red-100",
  HIGH: "border-orange-300/35 bg-orange-500/10 text-orange-100",
  MEDIUM: "border-amber-300/35 bg-amber-500/10 text-amber-100",
  LOW: "border-sky-300/30 bg-sky-500/10 text-sky-100",
};

function statusClass(score: AdvancedAuditScore): string {
  if (score.status === "premium") return "border-emerald-300/30 bg-emerald-500/10 text-emerald-100";
  if (score.status === "ready") return "border-sky-300/30 bg-sky-500/10 text-sky-100";
  if (score.status === "warning") return "border-amber-300/30 bg-amber-500/10 text-amber-100";
  return "border-red-300/35 bg-red-500/10 text-red-100";
}

function issueCount(items: Record<string, AdvancedAuditWarning[]>): number {
  return Object.values(items).reduce((sum, group) => sum + group.length, 0);
}

function findRepairAction(
  item: AdvancedRepairPlanItem,
  actions: DashboardHomeAction[],
): DashboardHomeAction | undefined {
  const blob = `${item.id} ${item.intervention} ${item.evidence}`.toLowerCase();
  if (/cover|copertina/.test(blob)) return actions.find((action) => action.id === "cover-studio");
  if (/export|kdp|front matter|back matter|titolo|autore/.test(blob)) return actions.find((action) => action.id === "export-studio" || action.id === "kdp-launch");
  if (/personaggi|canon|character/.test(blob)) return actions.find((action) => action.id === "character-studio");
  if (/duplic|capitolo|sottocapitoli|hook|generic|manuscript/.test(blob)) return actions.find((action) => action.id === "manuscript-lab");
  return actions.find((action) => action.id === "manuscript-lab") || actions[0];
}

function DashboardAdvancedToolsPanelInner({ context }: Props) {
  const actions = useMemo(() => buildDashboardAdvancedActions(context), [context]);
  const audit = useMemo(() => buildAdvancedToolsAudit(context.activeProject), [context.activeProject]);
  const groups = useMemo(
    () => GROUP_ORDER.filter((group) => actions.some((action) => action.group === group)),
    [actions],
  );
  const actionsByGroup = useMemo(() => {
    const map = new Map<DashboardHomeAction["group"], DashboardHomeAction[]>();
    for (const group of groups) {
      map.set(group, actions.filter((action) => action.group === group));
    }
    return map;
  }, [actions, groups]);

  const handleAction = useCallback(
    (action: DashboardHomeAction) => {
      safeExecuteDashboardAction(action, context, "advanced-tools");
    },
    [context],
  );

  if (actions.length === 0) return null;

  return (
    <section className="scriptora-advanced-tools-panel mb-8 space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Strumenti avanzati</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white">
              {audit ? audit.projectTitle : "Nessun libro attivo"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/62">
              {audit
                ? `${issueCount(audit.warnings)} warning reali rilevati sul manoscritto, blueprint, canon, cover ed export.`
                : "Apri o crea un libro per attivare la console editoriale."}
            </p>
          </div>
          {audit && (
            <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/70">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              Audit dati reali
            </div>
          )}
        </div>

        {!audit && (
          <div className="mt-4 flex flex-wrap gap-2">
            {context.onContinue && (
              <button
                type="button"
                onClick={context.onContinue}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <BookOpenCheck className="h-4 w-4" />
                Apri ultimo libro
              </button>
            )}
            <button
              type="button"
              onClick={context.onNewBook}
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/85"
            >
              <Sparkles className="h-4 w-4" />
              Book Forge
            </button>
          </div>
        )}
      </div>

      {audit && (
        <>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(audit.scores).map(([key, score]) => {
              const meta = SCORE_META[key] || { label: score.label, icon: FileWarning };
              const Icon = meta.icon;
              return (
                <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/35 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05]">
                        <Icon className="h-4 w-4 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{meta.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-white/55">{score.evidence}</p>
                      </div>
                    </div>
                    <span className={`rounded-lg border px-2 py-1 text-xs font-black tabular-nums ${statusClass(score)}`}>
                      {score.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Siren className="h-4 w-4 text-orange-300" />
                Problemi rilevati
              </h3>
              <div className="mt-3 space-y-2">
                {Object.values(audit.warnings).flat().slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${SEVERITY_STYLE[item.severity]}`}>
                        {item.severity}
                      </span>
                      <p className="text-xs font-bold text-white">{item.title}</p>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-white/58">{item.evidence}</p>
                  </div>
                ))}
                {Object.values(audit.warnings).flat().length === 0 && (
                  <p className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    Nessun miglioramento operativo significativo rilevato: il libro e' in fascia professionale per questi controlli locali.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <ClipboardCheck className="h-4 w-4 text-sky-300" />
                One-Click Repair Plan
              </h3>
              <div className="mt-3 space-y-2">
                {audit.repairPlan.map((item) => {
                  const action = findRepairAction(item, actions);
                  return (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-black ${SEVERITY_STYLE[item.priority]}`}>
                              {item.priority}
                            </span>
                            <span className="text-[10px] font-semibold text-white/45">Rischio {item.risk}</span>
                            <span className="text-[10px] font-semibold text-white/45">{item.creditCost}</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-white">{item.intervention}</p>
                          <p className="mt-1 text-[11px] leading-4 text-white/55">{item.evidence}</p>
                        </div>
                        {action && (
                          action.feature ? (
                            <PaywallGuard feature={action.feature} compact>
                              <RepairActionButton onClick={() => handleAction(action)} />
                            </PaywallGuard>
                          ) : (
                            <RepairActionButton onClick={() => handleAction(action)} />
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
                {audit.repairPlan.length === 0 && (
                  <p className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    Nessun intervento consigliato dai controlli locali.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChapterEvidencePanel
              title="Capitoli deboli"
              icon={AlertTriangle}
              rows={audit.weakChapters}
              empty="Nessun capitolo chiaramente debole nei controlli locali."
            />
            <ChapterEvidencePanel
              title="Capitoli forti"
              icon={BadgeCheck}
              rows={audit.strongChapters}
              empty="Nessun capitolo ancora abbastanza sviluppato da classificare come forte."
            />
          </div>
        </>
      )}

      {groups.map((group) => {
        const groupActions = actionsByGroup.get(group) || [];
        return (
          <div key={group}>
            <h3 className="mb-2 text-xs font-semibold text-white/72">{GROUP_LABELS[group]}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groupActions.map((action) => {
                const button = (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action)}
                    className="group flex min-h-[108px] w-full flex-col items-start justify-between rounded-2xl border border-white/12 bg-slate-950/35 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/22 hover:bg-white/[0.08]"
                  >
                    <span className="text-sm font-bold text-white">{action.label}</span>
                    <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/58">{action.description}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/40 group-hover:text-white/70">
                      {t("open_studio")}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                );

                return action.feature ? (
                  <PaywallGuard key={action.id} feature={action.feature} compact>
                    {button}
                  </PaywallGuard>
                ) : (
                  <div key={action.id}>{button}</div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export const DashboardAdvancedToolsPanel = memo(DashboardAdvancedToolsPanelInner);

function ChapterEvidencePanel({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: any;
  rows: Array<{ index: number; title: string; evidence: string }>;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={`${title}-${row.index}`} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-bold text-white">
              Cap. {row.index + 1} · {row.title}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-white/56">{row.evidence}</p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-white/56">{empty}</p>}
      </div>
    </div>
  );
}

function RepairActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 text-[11px] font-bold text-white/80 hover:bg-white/[0.1]"
    >
      Apri tool
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
