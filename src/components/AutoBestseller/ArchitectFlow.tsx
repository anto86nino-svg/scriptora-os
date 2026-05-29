import { Check, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  ArchitectPhaseId,
  AutoBestsellerArchitectResult,
} from "@/lib/auto-bestseller-architect";
import { ARCHITECT_PHASE_LABELS } from "@/lib/auto-bestseller-architect";

const PHASE_ORDER: ArchitectPhaseId[] = [
  "idea-intelligence",
  "market-positioning",
  "title-positioning",
  "blueprint-architect",
  "handoff-ready",
];

interface Props {
  running: boolean;
  activePhase: ArchitectPhaseId | null;
  phaseMessage: string;
  result: AutoBestsellerArchitectResult | null;
  error: string | null;
  onOpenWriterRoom: () => void;
  onRetry: () => void;
  onSelectTitle: (index: number) => void;
  selectedTitleIndex: number;
}

export function ArchitectFlow({
  running,
  activePhase,
  phaseMessage,
  result,
  error,
  onOpenWriterRoom,
  onRetry,
  onSelectTitle,
  selectedTitleIndex,
}: Props) {
  const activeIndex = activePhase ? PHASE_ORDER.indexOf(activePhase) : -1;

  if (error && !running) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
        <p className="text-sm font-semibold text-rose-600">Blueprint preparation failed</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">AI Developmental Architect</p>
            <p className="text-xs text-muted-foreground">{phaseMessage || "Preparing…"}</p>
          </div>
        </div>
        <div className="space-y-2">
          {PHASE_ORDER.map((phase, index) => {
            const done = activeIndex > index;
            const active = activePhase === phase;
            return (
              <div
                key={phase}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : done
                      ? "border-border/40 bg-muted/20 text-muted-foreground"
                      : "border-border/30 bg-background/40 text-muted-foreground/70"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  done ? "bg-emerald-500/15 text-emerald-600" : active ? "bg-primary/15 text-primary" : "bg-muted"
                }`}>
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span>{ARCHITECT_PHASE_LABELS[phase]}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-10 text-center space-y-3">
        <Sparkles className="mx-auto h-8 w-8 text-primary/70" />
        <p className="text-sm font-medium text-foreground">Market-aware narrative architecture</p>
        <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
          Enter your idea and build a commercially informed blueprint — then open the writing room with full context preserved.
        </p>
      </div>
    );
  }

  const selected = result.titleConcepts[selectedTitleIndex] || result.titleConcepts[0];
  const { ideaIntelligence, marketPositioning, blueprint, checklist } = result;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Commercially informed blueprint</p>
            <h2 className="mt-1 text-xl font-bold text-foreground">{selected?.title}</h2>
            {selected?.subtitle && (
              <p className="text-sm text-muted-foreground">{selected.subtitle}</p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0">{ideaIntelligence.genre}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{selected?.rationale}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Idea intelligence</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Subgenre</span><p className="font-medium">{ideaIntelligence.subgenre}</p></div>
            <div><span className="text-muted-foreground">Confidence</span><p className="font-medium">{Math.round(ideaIntelligence.confidence * 100)}%</p></div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{ideaIntelligence.readerExpectation}</p>
          <p className="text-xs text-foreground/80">{ideaIntelligence.emotionalCategory}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market positioning</p>
          <p className="text-xs leading-relaxed"><span className="font-semibold text-foreground">Audience: </span>{marketPositioning.audienceProfile}</p>
          <p className="text-xs leading-relaxed"><span className="font-semibold text-foreground">Promise: </span>{marketPositioning.emotionalPromise}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{marketPositioning.commercialPositioning}</p>
          <p className="text-xs">
            Hook strength: <span className="font-semibold">{marketPositioning.hookStrength}/100</span>
            {" · "}
            {marketPositioning.hookExplanation}
          </p>
        </div>
      </div>

      {result.titleConcepts.length > 1 && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title concepts</p>
          {result.titleConcepts.map((concept, index) => (
            <button
              key={`${concept.title}-${index}`}
              type="button"
              onClick={() => onSelectTitle(index)}
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                selectedTitleIndex === index ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/30"
              }`}
            >
              <p className="font-semibold text-foreground">{concept.title}</p>
              {concept.subtitle && <p className="text-muted-foreground">{concept.subtitle}</p>}
            </button>
          ))}
        </div>
      )}

      {marketPositioning.readerRisks.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/15 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reader risk warnings</p>
          {marketPositioning.readerRisks.map((risk, i) => (
            <p key={i} className={`text-xs ${
              risk.severity === "high" ? "text-rose-600" : risk.severity === "medium" ? "text-amber-700" : "text-muted-foreground"
            }`}>
              {risk.message}
            </p>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Narrative architecture</p>
        <p className="text-xs leading-relaxed text-foreground/90 line-clamp-4">{blueprint.overview}</p>
        <p className="text-xs text-muted-foreground">
          {blueprint.chapterOutlines.length} chapters · {blueprint.themes.slice(0, 3).join(" · ") || "Themes mapped"}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">Your book is ready to write</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["Market analyzed", checklist.marketAnalyzed],
            ["Blueprint created", checklist.blueprintCreated],
            ["Emotional architecture prepared", checklist.emotionalArchitecturePrepared],
            ["Writing memory initialized", checklist.writingMemoryInitialized],
          ].map(([label, ok]) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <Check className={`h-4 w-4 ${ok ? "text-emerald-600" : "text-muted-foreground"}`} />
              <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </div>
          ))}
        </div>
        <Button className="w-full sm:w-auto" size="lg" onClick={onOpenWriterRoom}>
          Apri stanza di scrittura
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Opens Writer Room with blueprint, genre intelligence, author identity, and story memory — no context reset.
        </p>
      </div>
    </div>
  );
}
