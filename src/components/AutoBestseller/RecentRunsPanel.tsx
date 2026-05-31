import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Eye, RotateCw, Layers, Trash2 } from "lucide-react";
import { fetchRecentRuns, AutoBestsellerResult, AutoBestsellerInput } from "@/services/autoBestsellerService";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RunRow {
  id: string;
  input: AutoBestsellerInput;
  result: AutoBestsellerResult | Record<string, never>;
  status: string;
  final_score: number | null;
  market_score: number | null;
  created_at: string;
}

interface Props {
  refreshKey?: number;
  onOpenResult: (result: AutoBestsellerResult) => void;
  onOpenRunning?: (runId: string, input: AutoBestsellerInput) => void;
  onRegenerate: (input: AutoBestsellerInput) => void;
  onUseAsBase: (input: AutoBestsellerInput) => void;
}

export function RecentRunsPanel({ refreshKey, onOpenResult, onOpenRunning, onRegenerate, onUseAsBase }: Props) {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchRecentRuns(20);
    setRows((data as unknown as RunRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const remove = async (id: string) => {
    await supabase.from("auto_bestseller_runs").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">Recent Runs</CardTitle>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="p-2">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            {loading ? "Loading..." : "No runs yet."}
          </p>
        ) : (
          <ScrollArea className="h-[360px]">
            <ul className="space-y-1.5">
              {rows.map((row) => {
                const r = (row.result || {}) as Partial<AutoBestsellerResult>;
                const title = r.title || row.input?.idea?.slice(0, 60) || "Untitled run";
                const hasResult = !!r.title && !!r.chapters?.length;
                const isRunning = row.status === "running";
                const canOpen = hasResult || isRunning;
                return (
                  <li
                    key={row.id}
                    className="group rounded-md border border-border/50 bg-card/50 p-2.5 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <StatusDot status={row.status} />
                          {typeof row.final_score === "number" && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              F {row.final_score.toFixed(1)}
                            </Badge>
                          )}
                          {typeof row.market_score === "number" && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              M {row.market_score.toFixed(1)}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(row.created_at)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => remove(row.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title="Delete run"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        disabled={!canOpen}
                        onClick={() => {
                          if (isRunning && onOpenRunning) {
                            onOpenRunning(row.id, row.input);
                          } else if (hasResult) {
                            onOpenResult(r as AutoBestsellerResult);
                          }
                        }}
                      >
                        <Eye className="mr-1 h-3 w-3" /> {isRunning ? "Live" : "Open"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => onRegenerate(row.input)}
                      >
                        <RotateCw className="mr-1 h-3 w-3" /> Regenerate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => onUseAsBase(row.input)}
                      >
                        <Layers className="mr-1 h-3 w-3" /> Use as base
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    ready_for_kdp: { color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", label: "Ready" },
    needs_revision: { color: "bg-amber-500/15 text-amber-700 dark:text-amber-400", label: "Revision" },
    failed: { color: "bg-muted text-muted-foreground", label: "Paused" },
    running: { color: "bg-blue-500/15 text-blue-700 dark:text-blue-400", label: "Running" },
  };
  const cfg = map[status] || { color: "bg-muted text-muted-foreground", label: status };
  return <Badge className={cn("h-5 border-0 px-1.5 text-[10px]", cfg.color)}>{cfg.label}</Badge>;
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}
