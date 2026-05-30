import { useMemo } from "react";
import { FunctionGuidedTour } from "@/components/FunctionGuidedTour";
import { useGuidedFlow } from "@/hooks/useGuidedFlow";
import { guidedTourSelector } from "@/lib/guided-tour";
import { t } from "@/lib/i18n";

export function DashboardGuidedFlow() {
  const { enabled } = useGuidedFlow();

  const steps = useMemo(() => [
    {
      id: "identity",
      target: guidedTourSelector("dashboard-author"),
      title: t("guided_dashboard_step_identity"),
      description: t("guided_dashboard_step_identity_desc"),
      placement: "bottom" as const,
    },
    {
      id: "launch",
      target: guidedTourSelector("dashboard-launch"),
      title: t("guided_dashboard_step_launch"),
      description: t("guided_dashboard_step_launch_desc"),
      placement: "bottom" as const,
    },
    {
      id: "writer",
      target: guidedTourSelector("dashboard-writer"),
      title: t("guided_dashboard_step_writer"),
      description: t("guided_dashboard_step_writer_desc"),
      placement: "top" as const,
    },
    {
      id: "export",
      target: guidedTourSelector("dashboard-export"),
      title: t("guided_dashboard_step_publish"),
      description: t("guided_dashboard_step_publish_desc"),
      placement: "top" as const,
    },
    {
      id: "complete",
      title: t("guided_tour_finish_title"),
      description: t("guided_tour_finish_desc"),
    },
  ], []);

  return (
    <FunctionGuidedTour
      tourId="dashboard"
      steps={steps}
      enabled={enabled}
    />
  );
}
