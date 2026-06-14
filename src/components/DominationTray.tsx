import { useState } from "react";
import { Swords, Loader2, Check, X, AlertCircle, ChevronDown, ChevronUp, ArrowRight, Scissors, Shield } from "lucide-react";
import { useDomination } from "@/contexts/DominationContext";

interface DominationTrayProps {
  currentProjectId?: string;
  onApplyToChapter: (projectId: string, chapterIndex: number, newContent: string) => void;
  onJumpToChapter?: (projectId: string, chapterIndex: number) => void;
}

export function DominationTray({ currentProjectId, onApplyToChapter, onJumpToChapter }: DominationTrayProps) {
  const { jobs, applyJob, dismissJob, runningCount, readyCount } = useDomination();
  const [open, setOpen] = useState(true);
  const list = Object.values(jobs).sort((a, b) => b.startedAt - a.startedAt);

  if (list.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto w-full max-w-[min(340px,calc(100dvw-2rem))] sm:left-auto sm:right-4 sm:mx-0 safe-area-pb bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border-b border-border/40 hover:from-orange-500/15 hover:to-pink-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Scissors className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">AI editor jobs</span>
          {runningCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500 font-semibold">
              {runningCount} running
            </span>
          )}
          {readyCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
              {readyCount} ready
            </span>
          )}
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {open && (
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {list.map(job => {
            const isCurrent = currentProjectId === job.projectId;
            return (
              <div key={job.id} className="p-3 border-b border-border/30 last:border-b-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {job.kind === "patch" ? (
                        <Scissors className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <Swords className="h-3 w-3 text-orange-500 shrink-0" />
                      )}
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                        {job.kind === "patch" ? "Patch" : "Dominate"}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground truncate mt-0.5">
                      Ch.{job.chapterIndex + 1} — {job.chapterTitle}
                    </p>
                    {!isCurrent && (
                      <p className="text-[10px] text-muted-foreground truncate">{job.projectTitle}</p>
                    )}
                  </div>
                  <button onClick={() => dismissJob(job.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {job.status === "running" && (
                  <div className={`flex items-center gap-2 text-[11px] ${job.kind === "patch" ? "text-primary" : "text-orange-500"}`}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{job.kind === "patch" ? "Surgical analysis in corso…" : "Analyzing → rewriting → re-evaluating…"}</span>
                  </div>
                )}

                {job.status === "error" && (
                  <div className="flex items-start gap-2 text-[11px] text-destructive">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="break-words">{job.error}</span>
                  </div>
                )}

                {job.status === "ready" && job.result && job.kind === "dominate" && (
                  <>
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="text-xs font-bold text-muted-foreground">{job.result.passes[0]?.finalScoreBefore?.toFixed(1)}</span>
                      <ArrowRight className="h-3 w-3 text-orange-500" />
                      <span className={`text-base font-black ${job.result.finalScore >= 8.5 ? "text-primary" : "text-orange-500"}`}>
                        {job.result.finalScore?.toFixed(1)}<span className="text-[10px] text-muted-foreground/50">/10</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-1">({job.result.iterationsRun} iter)</span>
                    </div>
                    {job.result.allReverted && (
                      <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-600 dark:text-amber-400">
                        <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-bold">Voice Guard</span>
                          {job.result.voiceProfileUsed && <span className="opacity-70"> [{job.result.voiceProfileUsed}]</span>}
                          : riscrittura scartata ({job.result.revertReason}). Identità autoriale preservata.
                        </span>
                      </div>
                    )}
                    {job.result.voice && !job.result.allReverted && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-md bg-primary/5 border border-primary/20 text-[10px]">
                          <div className="flex items-center gap-1 text-primary font-semibold">
                            <Shield className="h-3 w-3" />
                            Voice {job.result.voice.identityScore?.toFixed(1)}/10
                            {job.result.voiceProfileUsed && (
                              <span className="opacity-60 font-normal">· {job.result.voiceProfileUsed}</span>
                            )}
                          </div>
                          {typeof job.result.rewriteConfidence === "number" && (() => {
                            const c = job.result.rewriteConfidence as number;
                            const tier = c >= 0.75 ? "high" : c >= 0.5 ? "medium" : "low";
                            const cls = tier === "high"
                              ? "bg-primary/15 text-primary border-primary/30"
                              : tier === "medium"
                              ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
                              : "bg-destructive/15 text-destructive border-destructive/30";
                            return (
                              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${cls}`}>
                                {(c * 100).toFixed(0)}% conf
                              </span>
                            );
                          })()}
                        </div>
                        {job.result.voice.voiceVerdict && (
                          <p className="text-[10px] text-muted-foreground italic px-2 truncate" title={job.result.voice.voiceVerdict}>
                            {job.result.voice.voiceVerdict}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {job.status === "ready" && job.result && job.kind === "patch" && (
                  <div className="flex items-center justify-center gap-3 py-1">
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Score</p>
                      <p className={`text-base font-black ${(job.result.evaluation?.score || 0) >= 8 ? "text-primary" : "text-foreground"}`}>
                        {job.result.evaluation?.score?.toFixed(1) || "—"}<span className="text-[10px] text-muted-foreground/50">/10</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Patches</p>
                      <p className="text-base font-black text-foreground">{job.result.patches?.length || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Δ</p>
                      <p className="text-base font-black text-primary">{job.result.modificationPercent}%</p>
                    </div>
                  </div>
                )}

                {job.status === "ready" && (
                  <div className="flex items-center gap-1.5">
                    {!(job.kind === "dominate" && job.result?.allReverted) && (
                      <button
                        onClick={() => applyJob(job.id, (text) => onApplyToChapter(job.projectId, job.chapterIndex, text))}
                        className={`flex-1 inline-flex items-center justify-center gap-1 h-7 rounded-md text-[10px] font-bold text-white hover:opacity-90 transition-all ${
                          job.kind === "patch"
                            ? "bg-primary"
                            : "bg-gradient-to-r from-orange-500 to-pink-500"
                        }`}
                      >
                        <Check className="h-3 w-3" /> Apply
                      </button>
                    )}
                    {onJumpToChapter && (
                      <button
                        onClick={() => onJumpToChapter(job.projectId, job.chapterIndex)}
                        className="h-7 px-2 rounded-md text-[10px] font-semibold bg-card border border-border hover:bg-accent transition-colors"
                      >
                        Open
                      </button>
                    )}
                    <button
                      onClick={() => dismissJob(job.id)}
                      className={`h-7 px-2 rounded-md text-[10px] font-semibold bg-card border border-border hover:bg-accent transition-colors ${
                        job.kind === "dominate" && job.result?.allReverted ? "flex-1" : ""
                      }`}
                    >
                      {job.kind === "dominate" && job.result?.allReverted ? "Chiudi" : "Discard"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
