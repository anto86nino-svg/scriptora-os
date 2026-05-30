import { useMemo } from "react";
import { FunctionGuidedTour } from "@/components/FunctionGuidedTour";
import { useGuidedFlow } from "@/hooks/useGuidedFlow";
import { guidedTourSelector } from "@/lib/guided-tour";
import { t } from "@/lib/i18n";

interface NewBookGuidedFlowProps {
  open: boolean;
}

export function NewBookGuidedFlow({ open }: NewBookGuidedFlowProps) {
  const { enabled } = useGuidedFlow();

  const steps = useMemo(() => [
    {
      id: "title",
      target: guidedTourSelector("newbook-title"),
      title: t("guided_newbook_step_title"),
      description: t("guided_newbook_step_title_desc"),
      placement: "bottom" as const,
    },
    {
      id: "structure",
      target: guidedTourSelector("newbook-structure"),
      title: t("guided_newbook_step_structure"),
      description: t("guided_newbook_step_structure_desc"),
      placement: "bottom" as const,
    },
    {
      id: "style",
      target: guidedTourSelector("newbook-style"),
      title: t("guided_newbook_step_style"),
      description: t("guided_newbook_step_style_desc"),
      placement: "bottom" as const,
    },
    {
      id: "create",
      target: guidedTourSelector("newbook-create"),
      title: t("guided_newbook_step_create"),
      description: t("guided_newbook_step_create_desc"),
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
      tourId="newbook"
      steps={steps}
      enabled={enabled}
      activeWhen={open}
    />
  );
}
