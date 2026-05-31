import { Sparkles } from "lucide-react";
import { t, tt } from "@/lib/i18n";
import type { GatewayInsight } from "@/lib/immersive/gateway-state";

interface GatewayIntelligenceRailProps {
  insights: GatewayInsight[];
}

export function GatewayIntelligenceRail({ insights }: GatewayIntelligenceRailProps) {
  return (
    <section className="scriptora-gateway-panel scriptora-gateway-intel" aria-label={t("gw_intel_title")}>
      <div className="scriptora-gateway-panel__head">
        <Sparkles className="h-4 w-4 text-violet-300" aria-hidden />
        <h2>{t("gw_intel_title")}</h2>
      </div>
      <ul className="scriptora-gateway-intel__list">
        {insights.map((insight) => (
          <li key={insight.id} className="scriptora-gateway-intel__item">
            {insight.vars ? tt(insight.messageKey, insight.vars) : t(insight.messageKey)}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface GatewayDailyGoalCardProps {
  current: number;
  goal: number;
  percent: number;
}

export function GatewayDailyGoalCard({ current, goal, percent }: GatewayDailyGoalCardProps) {
  return (
    <section className="scriptora-gateway-panel scriptora-gateway-goal" aria-label={t("gw_goal_title")}>
      <div className="scriptora-gateway-panel__head">
        <h2>{t("gw_goal_title")}</h2>
        <span className="scriptora-gateway-goal__target">{goal.toLocaleString()} {t("gw_words")}</span>
      </div>
      <p className="scriptora-gateway-goal__progress">
        {current.toLocaleString()} / {goal.toLocaleString()} {t("gw_goal_completed")}
      </p>
      <div className="scriptora-gateway-goal__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="scriptora-gateway-goal__fill" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

interface GatewayActivityTimelineProps {
  items: Array<{ id: string; messageKey: string; vars?: Record<string, string | number> }>;
}

export function GatewayActivityTimeline({ items }: GatewayActivityTimelineProps) {
  if (items.length === 0) return null;

  return (
    <section className="scriptora-gateway-panel scriptora-gateway-activity" aria-label={t("gw_activity_title")}>
      <div className="scriptora-gateway-panel__head">
        <h2>{t("gw_activity_title")}</h2>
      </div>
      <ul className="scriptora-gateway-activity__list">
        {items.map((item) => (
          <li key={item.id} className="scriptora-gateway-activity__item">
            <span className="scriptora-gateway-activity__dot" aria-hidden />
            <span>{item.vars ? tt(item.messageKey, item.vars) : t(item.messageKey)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
