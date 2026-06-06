import React from "react";
import {
  Feather,
  Skull,
  LibraryBig,
  Sparkles,
  BookMarked,
} from "lucide-react";

import { ManuscriptAltar } from "./ManuscriptAltar";
import { SpatialStation } from "./SpatialStation";

interface HorrorRoomLayoutProps {
  projectTitle: string;
  authorName: string;
  wordCount: number;
  targetWordCount: number;
  currentChapterName: string;
  textPreview: string;

  onContinueWriting: () => void;
  onOpenKDP: () => void;
  onOpenAnalyzer: () => void;
  onOpenCoverStudio: () => void;
  onOpenExport: () => void;
  onOpenCharacterStudio: () => void;
}

export function HorrorRoomLayout({
  projectTitle,
  authorName,
  wordCount,
  targetWordCount,
  currentChapterName,
  textPreview,
  onContinueWriting,
  onOpenKDP,
  onOpenAnalyzer,
  onOpenCoverStudio,
  onOpenExport,
  onOpenCharacterStudio,
}: HorrorRoomLayoutProps) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#050507] text-white">

      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,0,0,0.10),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-soft-light">
        <div className="h-full w-full bg-[url('/noise.png')]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1700px] flex-col gap-10 px-4 pb-20 pt-6 md:px-8 lg:px-10">

        {/* Top Oracle */}
        <div className="mx-auto w-full max-w-md">
          <SpatialStation
            title="Market Oracle"
            description="Domina nicchie, KDP e impulso commerciale."
            icon={<Sparkles className="h-5 w-5" />}
            actions={[
              {
                label: "Apri KDP",
                onClick: onOpenKDP,
              },
            ]}
          />
        </div>

        {/* Main Chamber */}
        <div className="grid gap-7 lg:grid-cols-[1fr_1.6fr_1fr] lg:items-center">

          {/* LEFT */}
          <div className="space-y-7 order-2 lg:order-1">
            <SpatialStation
              title="Writing Chamber"
              description="Continua il manoscritto, riscrivi e scolpisci il capitolo."
              icon={<Feather className="h-5 w-5" />}
              actions={[
                {
                  label: "Scrivi",
                  onClick: onContinueWriting,
                },
              ]}
            />
          </div>

          {/* CENTER BOOK */}
          <div className="order-1 lg:order-2 lg:scale-[1.03]">
            <ManuscriptAltar
              projectTitle={projectTitle}
              authorName={authorName}
              wordCount={wordCount}
              targetWordCount={targetWordCount}
              currentChapterName={currentChapterName}
              textPreview={textPreview}
              onContinue={onContinueWriting}
            />
          </div>

          {/* RIGHT */}
          <div className="space-y-7 order-3">
            <SpatialStation
              title="Cursed Archive"
              description="Diagnostica editoriale, tensione, pacing e subtext."
              icon={<Skull className="h-5 w-5" />}
              actions={[
                {
                  label: "Analizza",
                  onClick: onOpenAnalyzer,
                },
              ]}
            />
          </div>
        </div>

        {/* Bottom Chamber */}
        <div className="grid gap-7 lg:grid-cols-2">

          <SpatialStation
            title="Character Lab"
            description="Esplora relazioni, ferite, desideri e archi emotivi."
            icon={<BookMarked className="h-5 w-5" />}
            actions={[
              {
                label: "Personaggi",
                onClick: onOpenCharacterStudio,
              },
            ]}
          />

          <SpatialStation
            title="Final Seal"
            description="Copertina, export e preparazione finale."
            icon={<LibraryBig className="h-5 w-5" />}
            actions={[
              {
                label: "Cover Studio",
                onClick: onOpenCoverStudio,
              },
              {
                label: "Export",
                onClick: onOpenExport,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
