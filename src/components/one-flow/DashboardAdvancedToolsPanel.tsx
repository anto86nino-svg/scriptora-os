import { ArrowRight } from "lucide-react";
import { PaywallGuard } from "@/components/PaywallGuard";
import {
  buildDashboardAdvancedActions,
  executeDashboardAction,
  type DashboardActionContext,
  type DashboardHomeAction,
} from "@/lib/one-flow/dashboard-home-actions";
import { t } from "@/lib/i18n";

type Props = {
  context: DashboardActionContext;
};

const GROUP_LABELS: Record<DashboardHomeAction["group"], string> = {
  optimization: "Ottimizzazione & mercato",
  writer: "Strumenti scrittura",
  system: "Sistema",
};

export function DashboardAdvancedToolsPanel({ context }: Props) {
  const actions = buildDashboardAdvancedActions(context);
  const groups = (["optimization", "writer", "system"] as const).filter((group) =>
    actions.some((action) => action.group === group),
  );

  if (actions.length === 0) return null;

  return (
    <section className="mb-8 space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Strumenti avanzati</p>
        <p className="mt-1 text-sm text-white/62">
          Ogni strumento apre una schermata dedicata — la Dashboard resta compatta.
        </p>
      </div>

      {groups.map((group) => {
        const groupActions = actions.filter((action) => action.group === group);
        return (
          <div key={group}>
            <h3 className="mb-2 text-xs font-semibold text-white/72">{GROUP_LABELS[group]}</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {groupActions.map((action) => {
                const button = (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => executeDashboardAction(action, context)}
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
