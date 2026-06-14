import { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, Loader2, RefreshCw, Save, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KdpNarrativeFlow } from "@/lib/kdp/narrative-flow";
import type { KdpLaunchStatus } from "@/lib/kdp/kdp-launch-session";

interface InputCheck {
  label: string;
  ok: boolean;
}

interface Props {
  italianUi: boolean;
  status: KdpLaunchStatus;
  error?: string | null;
  result: KdpNarrativeFlow | null;
  inputs: InputCheck[];
  elapsedSec?: number;
  onGenerate: () => void;
  onRetry: () => void;
  onBackToAnalysis: () => void;
  onSaveToProject: () => void;
  onGoBlueprint: () => void;
  onRegenerate: () => void;
}

export function KdpNarrativeFlowPanel({
  italianUi,
  status,
  error,
  result,
  inputs,
  elapsedSec = 0,
  onGenerate,
  onRetry,
  onBackToAnalysis,
  onSaveToProject,
  onGoBlueprint,
  onRegenerate,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status, result]);

  useEffect(() => {
    if (autoStarted || result || status === "running") return;
    const ready = inputs[0]?.ok && inputs[1]?.ok;
    if (ready && status === "idle") {
      setAutoStarted(true);
      onGenerate();
    }
  }, [autoStarted, inputs, onGenerate, result, status]);

  const copy = italianUi
    ? {
        title: "Flusso narrativo KDP",
        state: "Stato",
        running: "Sto trasformando analisi e posizionamento in una struttura narrativa vendibile…",
        inputs: "Input usati",
        created: "Flusso narrativo creato",
        hook: "Hook iniziale",
        promise: "Promessa centrale",
        chapters: "Progressione capitoli",
        peaks: "Picchi emotivi/commerciali",
        finale: "Finale/payoff",
        strengthen: "Punti da rafforzare prima della pubblicazione",
        save: "Salva nel progetto",
        blueprint: "Vai al Blueprint",
        regen: "Rigenera",
        retry: "Riprova",
        backAnalysis: "Torna all'analisi",
        errorTitle: "Non sono riuscito a creare il flusso narrativo.",
        errorHint: "La configurazione e l'analisi sono state salvate.",
        generate: "Crea flusso narrativo",
        interrupted: "La generazione precedente sembra essersi interrotta. Puoi riprovare senza perdere configurazione e analisi.",
      }
    : {
        title: "KDP narrative flow",
        state: "Status",
        running: "Turning analysis and positioning into a sellable narrative structure…",
        inputs: "Inputs used",
        created: "Narrative flow created",
        hook: "Opening hook",
        promise: "Central promise",
        chapters: "Chapter progression",
        peaks: "Emotional/commercial peaks",
        finale: "Finale/payoff",
        strengthen: "Strengthen before publishing",
        save: "Save to project",
        blueprint: "Go to Blueprint",
        regen: "Regenerate",
        retry: "Retry",
        backAnalysis: "Back to analysis",
        errorTitle: "Could not create the narrative flow.",
        errorHint: "Configuration and analysis were saved.",
        generate: "Create narrative flow",
        interrupted: "The previous generation seems interrupted. Retry without losing config and analysis.",
      };

  const showError = status === "error" && !result;
  const showRunning = status === "running";
  const showDone = Boolean(result) && status === "done";

  return (
    <Card
      ref={panelRef}
      className="scriptora-kdp-narrative-flow min-w-0 max-w-full overflow-x-hidden border-primary/30"
    >
      <CardHeader className="min-w-0">
        <CardTitle className="flex flex-wrap items-center gap-2 break-words">
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          {copy.title}
          {showRunning && <Badge variant="secondary" className="text-[10px]">{copy.state}: running</Badge>}
          {showDone && <Badge variant="default" className="text-[10px]">✓ done</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 break-words pb-safe">
        {showError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0 space-y-2">
                <p className="font-semibold">{copy.errorTitle}</p>
                <p className="text-muted-foreground">{copy.errorHint}</p>
                {error && <p className="text-xs text-destructive/90">{error}</p>}
                {error?.includes("interrotta") && (
                  <p className="text-xs text-muted-foreground">{copy.interrupted}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={onRetry}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {copy.retry}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onBackToAnalysis}>
                    {copy.backAnalysis}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {(showRunning || (!result && status === "idle" && !showError)) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium">{copy.running}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{elapsedSec > 0 ? `${elapsedSec}s` : "…"}</span>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{copy.inputs}</p>
          <ul className="space-y-1 text-sm">
            {inputs.map((item) => (
              <li key={item.label} className="flex items-start gap-2 break-words">
                {item.ok
                  ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  : <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />}
                <span className={item.ok ? "" : "text-muted-foreground"}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {!result && !showRunning && !showError && (
          <div className="flex justify-end">
            <Button onClick={onGenerate}>
              <Sparkles className="mr-2 h-4 w-4" />
              {copy.generate}
            </Button>
          </div>
        )}

        {showDone && result && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-primary">{copy.created}</p>
            <Section title={`1. ${copy.hook}`} body={result.initialHook} />
            <Section title={`2. ${copy.promise}`} body={result.centralPromise} />
            <Section title={`3. ${copy.chapters}`} list={result.chapterProgression} />
            <Section title={`4. ${copy.peaks}`} list={result.emotionalPeaks} />
            <Section title={`5. ${copy.finale}`} body={result.finalePayoff} />
            <Section title={`6. ${copy.strengthen}`} list={result.strengthenBeforePublish} />
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button variant="outline" onClick={onSaveToProject}>
                <Save className="mr-2 h-4 w-4" />
                {copy.save}
              </Button>
              <Button onClick={onGoBlueprint}>{copy.blueprint}</Button>
              <Button variant="secondary" onClick={onRegenerate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {copy.regen}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, body, list }: { title: string; body?: string; list?: string[] }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/50 p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {body && <p className="text-sm leading-relaxed break-words">{body}</p>}
      {list && (
        <ul className="space-y-1 text-sm leading-relaxed">
          {list.map((item, i) => (
            <li key={`nf-${i}`} className="break-words">• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
