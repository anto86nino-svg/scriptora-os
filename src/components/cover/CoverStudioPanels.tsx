import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CoverStudioPackage } from "@/lib/cover-studio";
import { Check, AlertTriangle, ImagePlus, Download } from "lucide-react";

interface Props {
  pkg: CoverStudioPackage;
  italianUi: boolean;
  selectedTemplateId: string;
  onSelectVariant: (templateIndex: number, templateId: string) => void;
  onSaveProject?: () => void;
  onOpenExport?: () => void;
  saved: boolean;
}

export function CoverStudioPanels({
  pkg,
  italianUi,
  selectedTemplateId,
  onSelectVariant,
  onSaveProject,
  onOpenExport,
  saved,
}: Props) {
  const score = pkg.score;
  const readiness = pkg.readiness;

  const metrics = [
    [italianUi ? "Genere" : "Genre fit", score.genreFit],
    [italianUi ? "Titolo" : "Title read", score.titleReadability],
    [italianUi ? "Miniatura" : "Thumbnail", score.thumbnailReadability],
    [italianUi ? "Contrasto" : "Contrast", score.contrast],
    [italianUi ? "Tipografia" : "Typography", score.typography],
    [italianUi ? "Mercato" : "Market fit", score.marketFit],
    [italianUi ? "KDP" : "KDP ready", score.kdpReadiness],
    [italianUi ? "BookTok" : "BookTok", score.booktokPotential],
  ] as const;

  return (
    <Tabs defaultValue="templates" className="cover-studio-war-room w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
        <TabsTrigger value="templates" className="text-xs">{italianUi ? "Template" : "Templates"}</TabsTrigger>
        <TabsTrigger value="score" className="text-xs">Score</TabsTrigger>
        <TabsTrigger value="readiness" className="text-xs">{italianUi ? "Readiness" : "Readiness"}</TabsTrigger>
        <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
      </TabsList>

      <TabsContent value="templates" className="space-y-2 text-xs mt-3">
        <p className="text-muted-foreground leading-relaxed">{pkg.brief.visualPromise}</p>
        <div className="grid grid-cols-1 gap-2">
          {pkg.variants.map((v) => (
            <button
              key={v.templateId}
              type="button"
              onClick={() => onSelectVariant(v.templateIndex, v.templateId)}
              className={`rounded-xl border p-2.5 text-left transition ${
                selectedTemplateId === v.templateId
                  ? "border-primary bg-primary/10"
                  : "border-border/70 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{v.label}</span>
                <Badge variant="outline" className="text-[10px]">{v.score}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{v.description}</p>
            </button>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="score" className="space-y-2 text-xs mt-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Cover Score</span>
          <Badge>{score.finalScore}/100</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(([label, val]) => (
            <div key={label} className="rounded-lg border border-border/60 px-2 py-1.5">
              <span className="text-muted-foreground">{label}</span>
              <span className="float-right font-bold tabular-nums">{val}</span>
            </div>
          ))}
        </div>
        {score.strengths.length > 0 && (
          <ul className="space-y-0.5 text-primary">
            {score.strengths.map((s) => <li key={s}>✓ {s}</li>)}
          </ul>
        )}
        {score.weaknesses.length > 0 && (
          <ul className="space-y-0.5 text-destructive">
            {score.weaknesses.map((w) => <li key={w}>✗ {w}</li>)}
          </ul>
        )}
        {score.improvements.length > 0 && (
          <ul className="space-y-0.5 text-muted-foreground">
            {score.improvements.map((i) => <li key={i}>→ {i}</li>)}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="readiness" className="space-y-2 text-xs mt-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            [italianUi ? "Titolo" : "Title", readiness.hasTitle],
            [italianUi ? "Autore" : "Author", readiness.hasAuthor],
            [italianUi ? "Salvata" : "Saved", readiness.hasSavedCover],
            ["KDP", readiness.kdpReady],
          ].map(([label, ok]) => (
            <Badge key={String(label)} variant={ok ? "default" : "secondary"} className="text-[10px]">
              {ok ? <Check className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
              {label}
            </Badge>
          ))}
        </div>
        {readiness.warnings.map((w) => (
          <p key={w} className="text-amber-600 dark:text-amber-400">⚠ {w}</p>
        ))}
        <ul className="space-y-0.5 text-muted-foreground">
          {readiness.nextActions.map((a) => <li key={a}>→ {a}</li>)}
        </ul>
      </TabsContent>

      <TabsContent value="export" className="space-y-2 text-xs mt-3">
        <p className="text-muted-foreground">{pkg.honestyDetail}</p>
        <Badge variant="outline">{pkg.honestyLabel}</Badge>
        {saved && (
          <p className="text-primary flex items-center gap-1">
            <Check className="h-3.5 w-3.5" />
            {italianUi ? "Cover salvata nel progetto" : "Cover saved to project"}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {onSaveProject && (
            <Button size="sm" variant="outline" onClick={onSaveProject}>
              <ImagePlus className="h-3.5 w-3.5 mr-1" />
              {italianUi ? "Salva nel progetto" : "Save to project"}
            </Button>
          )}
          {onOpenExport && (
            <Button size="sm" variant="ghost" onClick={onOpenExport}>
              <Download className="h-3.5 w-3.5 mr-1" />
              {italianUi ? "Apri Export" : "Open Export"}
            </Button>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
