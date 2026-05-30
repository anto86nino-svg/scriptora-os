import { useMemo } from "react";
import { FunctionGuidedTour } from "@/components/FunctionGuidedTour";
import { useGuidedFlow } from "@/hooks/useGuidedFlow";
import { GUIDED_TOUR_IDS } from "@/lib/guided-tour-events";
import { guidedTourSelector } from "@/lib/guided-tour";
import { t } from "@/lib/i18n";
import type { SectionId } from "@/types/book";

interface GuidedProjectFlowProps {
  projectId: string;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onSelectSection: (section: SectionId) => void;
}

export function GuidedProjectFlow({
  projectId: _projectId,
  sidebarOpen,
  onOpenSidebar,
  onSelectSection,
}: GuidedProjectFlowProps) {
  const { enabled } = useGuidedFlow();

  const steps = useMemo(() => [
    {
      id: "index",
      target: guidedTourSelector("writer-index"),
      title: t("guided_tour_writer_index_title"),
      description: t("guided_tour_writer_index_desc"),
      placement: "right" as const,
      onEnter: () => {
        if (!sidebarOpen) onOpenSidebar();
      },
    },
    {
      id: "blueprint",
      target: guidedTourSelector("writer-blueprint"),
      title: t("guided_step_structure"),
      description: t("guided_step_structure_desc"),
      placement: "right" as const,
      onEnter: () => {
        onOpenSidebar();
        onSelectSection("blueprint");
      },
    },
    {
      id: "chapter",
      target: guidedTourSelector("writer-chapter"),
      title: t("guided_step_chapter"),
      description: t("guided_step_chapter_desc"),
      placement: "right" as const,
      onEnter: () => {
        onOpenSidebar();
        onSelectSection("chapter-0");
      },
    },
    {
      id: "generate",
      target: guidedTourSelector("writer-generate"),
      title: t("guided_step_write"),
      description: t("guided_step_write_desc"),
      placement: "bottom" as const,
      onEnter: () => onSelectSection("chapter-0"),
    },
    {
      id: "complete",
      title: t("guided_tour_finish_title"),
      description: t("guided_tour_finish_desc"),
    },
  ], [onOpenSidebar, onSelectSection, sidebarOpen]);

  return (
    <FunctionGuidedTour
      tourId={GUIDED_TOUR_IDS.writer}
      steps={steps}
      enabled={enabled}
    />
  );
}
