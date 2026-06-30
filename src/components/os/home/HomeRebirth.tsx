import type { RefObject } from "react";
import type { BookProject } from "@/types/book";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import type { HomeCreaChip } from "@/components/os/home/HomeCreaBlock";
import { HomeContinuaBlock } from "@/components/os/home/HomeContinuaBlock";
import { HomeLibriBlock } from "@/components/os/home/HomeLibriBlock";
import { HomeCreaBlock } from "@/components/os/home/HomeCreaBlock";
import { HomePubblicazioneBlock } from "@/components/os/home/HomePubblicazioneBlock";

export type HomeRebirthProps = {
  lastProject: BookProject | null | undefined;
  progressPercent: number;
  projects: BookProject[];
  dashboardActionContext: DashboardActionContext;
  packagingAnchorRef: RefObject<HTMLElement | null>;
  onContinue: () => void;
  onContinueProject: (projectId: string) => void;
  onNewBook: () => void;
  onMyBooks: () => void;
  onStartOneFlow: (idea: string, genreHint?: HomeCreaChip) => void;
};

export function HomeRebirth({
  lastProject,
  progressPercent,
  projects,
  dashboardActionContext,
  packagingAnchorRef,
  onContinue,
  onContinueProject,
  onNewBook,
  onMyBooks,
  onStartOneFlow,
}: HomeRebirthProps) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <HomeContinuaBlock
        project={lastProject}
        progressPercent={progressPercent}
        onContinue={onContinue}
        onNewBook={onNewBook}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeLibriBlock
          projects={projects}
          onOpenLibrary={onMyBooks}
          onContinueProject={onContinueProject}
        />
        <HomeCreaBlock onStartOneFlow={onStartOneFlow} />
      </div>

      <HomePubblicazioneBlock
        ref={packagingAnchorRef}
        projectTitle={lastProject?.config?.title}
        context={dashboardActionContext}
      />
    </div>
  );
}
