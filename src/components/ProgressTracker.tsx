import type { BookProject } from "@/types/book";
import { getBookTotalWords } from "@/types/book";
import { t } from "@/lib/i18n";
import { BarChart3 } from "lucide-react";
import {
  computeProjectProgressPercent,
  computeWordProgressPercent,
  countProjectWords,
} from "@/lib/project-progress";

interface ProgressTrackerProps {
  project: BookProject;
}

export function ProgressTracker({ project }: ProgressTrackerProps) {
  const { config, chapters } = project;
  const totalTargetWords = getBookTotalWords(config);
  const totalWords = countProjectWords(project);
  const completedChapters = chapters.filter((ch) => ch.content && ch.content.length > 50).length;
  const totalChapters = config.numberOfChapters;
  const progressPercent = computeProjectProgressPercent(project);
  const wordPercent = computeWordProgressPercent(project);

  return (
    <div className="mx-2 space-y-2 rounded-lg bg-white/[0.045] px-3 py-2">
      <div className="flex items-center gap-1.5 mb-1">
        <BarChart3 className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Progress</span>
      </div>

      {/* Book progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">{t("chapters")}</span>
          <span className="text-[10px] font-medium text-foreground">{completedChapters}/{totalChapters}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="text-[9px] text-muted-foreground/60 mt-0.5 text-right">{progressPercent}%</div>
      </div>

      {/* Word count */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">Words</span>
          <span className="text-[10px] font-medium text-foreground font-mono">{totalWords.toLocaleString()}/{(totalTargetWords / 1000).toFixed(0)}k</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${wordPercent}%`, backgroundColor: wordPercent > 100 ? 'hsl(var(--warning))' : 'hsl(var(--success))' }} />
        </div>
        <div className="text-[9px] text-muted-foreground/60 mt-0.5 text-right">{wordPercent}%</div>
      </div>
    </div>
  );
}
