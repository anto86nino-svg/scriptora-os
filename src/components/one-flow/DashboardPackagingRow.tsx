import { memo, useCallback, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { PaywallGuard } from "@/components/PaywallGuard";
import {
  buildDashboardPackagingActions,
  safeExecuteDashboardAction,
  type DashboardActionContext,
  type DashboardHomeAction,
} from "@/lib/one-flow/dashboard-home-actions";
import { t } from "@/lib/i18n";

type Props = {
  projectTitle?: string;
  context: DashboardActionContext;
};

function DashboardPackagingRowInner({ projectTitle, context }: Props) {
  const actions = useMemo(() => buildDashboardPackagingActions(context), [context]);

  const handleAction = useCallback(
    (action: DashboardHomeAction) => {
      safeExecuteDashboardAction(action, context, "packaging");
    },
    [context],
  );

  if (actions.length === 0) return null;

  return (
    <section className="mb-4 sm:mb-6">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        Packaging Center · {projectTitle || t("untitled")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const tile = (
            <button
              key={action.id}
              type="button"
              onClick={() => handleAction(action)}
              className="scriptora-action-tile group rounded-xl p-3 text-left opacity-95 transition-all hover:-translate-y-0.5"
            >
              <p className="text-xs font-bold text-white">{action.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-white/50">{action.description}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white/40 group-hover:text-white/65">
                Apri <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          );

          return action.feature ? (
            <PaywallGuard key={action.id} feature={action.feature} compact>
              {tile}
            </PaywallGuard>
          ) : (
            <div key={action.id}>{tile}</div>
          );
        })}
      </div>
    </section>
  );
}

export const DashboardPackagingRow = memo(DashboardPackagingRowInner);
