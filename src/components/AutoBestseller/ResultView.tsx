import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { AutoBestsellerResult } from "@/services/autoBestsellerService";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

interface Props {
  result: AutoBestsellerResult;
  onSaveAsProject?: (r: AutoBestsellerResult) => void;
}

export function ResultView({ result, onSaveAsProject }: Props) {
  const avgVoice = result.pipeline?.avgVoiceConfidence ?? 0;

  return (
    <Card className="max-w-full overflow-hidden border-border/60 bg-card/95">
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-xl truncate">{result.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{result.subtitle}</p>
          </div>
          <StatusBadge status={result.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ScoreCard label="Final Score" value={result.finalScore} icon={<Star className="h-4 w-4" />} />
          <ScoreCard label="Market Score" value={result.marketScore} icon={<Sparkles className="h-4 w-4" />} />
          <ScoreCard label="Voice Confidence" value={avgVoice * 10} suffix="/10" icon={<BookOpen className="h-4 w-4" />} />
        </div>

        {result.blueprint?.overview && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overview</p>
            <p className="mt-1 text-sm">{result.blueprint.overview}</p>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Chapters ({result.chapters.length})</h3>
            {onSaveAsProject && (
              <Button size="sm" variant="outline" onClick={() => onSaveAsProject(result)}>
                Save as Project
              </Button>
            )}
          </div>
          <ScrollArea className="h-[min(420px,60dvh)] rounded-md border border-border/60 sm:h-[420px]">
            <ul className="divide-y divide-border/60">
              {result.chapters.map((ch, i) => (
                <li key={`stable-${i}`} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {formatChapterDisplayTitle(i, ch.title, {
                          summary: result.blueprint?.chapterOutlines?.[i]?.summary,
                          totalChapters: result.chapters.length,
                          language: "Italian",
                        })}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                        {ch.content?.slice(0, 280) || "(no content)"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {typeof ch.finalScore === "number" && (
                        <Badge variant="outline" className={cn("text-xs", scoreColor(ch.finalScore))}>
                          {ch.finalScore.toFixed(1)}/10
                        </Badge>
                      )}
                      {typeof ch.rewriteConfidence === "number" && (
                        <span className="text-[10px] text-muted-foreground">
                          voice {Math.round(ch.rewriteConfidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: AutoBestsellerResult["status"] }) {
  if (status === "ready_for_kdp") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Ready for KDP
      </Badge>
    );
  }
  if (status === "needs_revision") {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Needs Revision
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/15 text-destructive border-0">
      <XCircle className="mr-1 h-3.5 w-3.5" /> Failed
    </Badge>
  );
}

function ScoreCard({ label, value, suffix = "/10", icon }: { label: string; value: number; suffix?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-card p-3">
      <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", scoreColor(value))}>
        {value.toFixed(1)}<span className="text-sm text-muted-foreground">{suffix}</span>
      </p>
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 7.5) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}
