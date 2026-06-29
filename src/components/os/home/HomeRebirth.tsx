import type { ReactNode, RefObject } from "react";
import type { BookProject } from "@/types/book";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import { HomeContinuaBlock } from "@/components/os/home/HomeContinuaBlock";
import { HomeLibriBlock } from "@/components/os/home/HomeLibriBlock";
import { HomeCreaBlock } from "@/components/os/home/HomeCreaBlock";
import { HomePubblicazioneBlock } from "@/components/os/home/HomePubblicazioneBlock";
import { HomeHousesNav } from "@/components/os/home/HomeHousesNav";

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
  onCreatePreset: (presetId: string) => void;
  onCreateFormat: (formatId: "workbook" | "memoir") => void;
  onOpenStudy: () => void;
  ideaBookSlot?: ReactNode;
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
  onCreatePreset,
  onCreateFormat,
  onOpenStudy,
  ideaBookSlot,
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
        <HomeCreaBlock
          onCreatePreset={onCreatePreset}
          onCreateFormat={onCreateFormat}
          onOpenStudy={onOpenStudy}
        />
      </div>

      {ideaBookSlot ? <div className="rounded-[1.5rem] bg-white/[0.02] p-1">{ideaBookSlot}</div> : null}

      <HomePubblicazioneBlock
        ref={packagingAnchorRef}
        projectTitle={lastProject?.config?.title}
        context={dashboardActionContext}
      />

      <HomeHousesNav />
    </div>
  );
}
