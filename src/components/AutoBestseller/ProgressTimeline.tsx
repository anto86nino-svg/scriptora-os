import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Circle, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChapterProgress, RetryEvent, StageState } from "@/services/autoBestsellerService";

interface Props {
  stages: StageState[];
  retries: RetryEvent[];
  chapters: ChapterProgress[];
  isRunning: boolean;
}

export function ProgressTimeline({ stages, retries, chapters, isRunning }: Props) {
  const activeRef = useRef<HTMLLIElement | null>(null);

  // auto-scroll active step into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [stages, chapters.length]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pipeline Progress</span>
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {stages.map((s) => {
            const active = s.status === "running";
            return (
              <li
                key={s.id}
                ref={active ? activeRef : null}
                className={cn(
                  "flex items-start gap-3 rounded-md border border-transparent p-3 transition-colors",
                  active && "border-primary/40 bg-primary/5",
                  s.status === "done" && "opacity-90",
                )}
              >
                <StageIcon status={s.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{s.label}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.detail && <p className="text-sm text-muted-foreground truncate">{s.detail}</p>}
                  {s.id === "chapters" && chapters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {chapters.map((c) => (
                        <span
                          key={c.index}
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs",
                            c.phase === "done"
                              ? c.score && c.score >= 7
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground",
                          )}
                          title={`Ch ${c.index + 1}: ${c.title} • ${c.phase}${c.score ? ` • ${c.score}/10` : ""}`}
                        >
                          Ch{c.index + 1}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {retries.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <RefreshCw className="h-4 w-4" /> Retries triggered
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {retries.map((r, i) => (
                <li key={`stable-${i}`}>Attempt #{r.attempt}: {r.reason}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StageIcon({ status }: { status: StageState["status"] }) {
  if (status === "running") return <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" />;
  if (status === "done") return <Check className="mt-0.5 h-5 w-5 text-emerald-500" />;
  if (status === "error") return <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />;
  return <Circle className="mt-0.5 h-5 w-5 text-muted-foreground/50" />;
}

function StatusBadge({ status }: { status: StageState["status"] }) {
  const variantMap: Record<StageState["status"], { label: string; cls: string }> = {
    pending: { label: "pending", cls: "bg-muted text-muted-foreground" },
    running: { label: "running", cls: "bg-primary/10 text-primary" },
    done: { label: "done", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    error: { label: "needs attention", cls: "bg-muted text-muted-foreground" },
  };
  const v = variantMap[status];
  return <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", v.cls, "border-0")}>{v.label}</Badge>;
}
