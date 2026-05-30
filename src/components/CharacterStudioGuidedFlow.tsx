import { useMemo } from "react";
import { FunctionGuidedTour } from "@/components/FunctionGuidedTour";
import { useGuidedFlow } from "@/hooks/useGuidedFlow";
import { guidedTourSelector } from "@/lib/guided-tour";
import { t } from "@/lib/i18n";

interface CharacterStudioGuidedFlowProps {
  open: boolean;
  onFocusIdea: () => void;
  onFocusSetup: () => void;
}

export function CharacterStudioGuidedFlow({
  open,
  onFocusIdea,
  onFocusSetup,
}: CharacterStudioGuidedFlowProps) {
  const { enabled } = useGuidedFlow();

  const steps = useMemo(() => [
    {
      id: "idea",
      target: guidedTourSelector("character-idea"),
      title: t("guided_character_step_idea"),
      description: t("guided_character_step_idea_desc"),
      placement: "bottom" as const,
      onEnter: onFocusIdea,
    },
    {
      id: "setup",
      target: guidedTourSelector("character-setup"),
      title: t("guided_character_step_setup"),
      description: t("guided_character_step_setup_desc"),
      placement: "top" as const,
      onEnter: onFocusSetup,
    },
    {
      id: "generate",
      target: guidedTourSelector("character-generate"),
      title: t("guided_character_step_generate"),
      description: t("guided_character_step_generate_desc"),
      placement: "top" as const,
    },
    {
      id: "link",
      target: guidedTourSelector("character-link"),
      title: t("guided_character_step_link"),
      description: t("guided_character_step_link_desc"),
      placement: "top" as const,
    },
    {
      id: "complete",
      title: t("guided_tour_finish_title"),
      description: t("guided_tour_finish_desc"),
    },
  ], [onFocusIdea, onFocusSetup]);

  return (
    <FunctionGuidedTour
      tourId="character-studio"
      steps={steps}
      enabled={enabled}
      activeWhen={open}
    />
  );
}
