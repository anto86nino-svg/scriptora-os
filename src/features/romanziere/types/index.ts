import type { ChunkProgress } from "@/lib/generation-types";
import type { BookProject } from "@/types/book";

export interface RomanziereModePageProps {
  project: BookProject | null;
  activeChapterIndex: number | null;
  generatingSet: Set<string>;
  chunkProgress: Record<string, ChunkProgress>;
  onSelectChapter: (index: number) => void;
  onGenerateChapter: (index: number) => void | Promise<void>;
  onCancelGeneration: (key?: string) => void;
  onExit: () => void;
  onDashboard: () => void;
}
