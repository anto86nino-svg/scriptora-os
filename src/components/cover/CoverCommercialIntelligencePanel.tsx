import { AlertTriangle, Check } from "lucide-react";
import type { CoverCommercialIntelligence } from "@/lib/cover-studio/cover-commercial-intelligence";
import { Badge } from "@/components/ui/badge";

type Props = {
  intel: CoverCommercialIntelligence;
  italianUi?: boolean;
};

const METRIC_LABELS: Array<{
  key: keyof Pick<
    CoverCommercialIntelligence,
    "genreFit" | "thumbnailReadability" | "titleVisibility" | "contrast" | "bookTokImpact" | "commercialClarity"
  >;
  it: string;
  en: string;
}> = [
  { key: "genreFit", it: "Genre Fit", en: "Genre Fit" },
  { key: "thumbnailReadability", it: "Miniatura", en: "Thumbnail" },
  { key: "titleVisibility", it: "Titolo", en: "Title" },
  { key: "contrast", it: "Contrasto", en: "Contrast" },
  { key: "bookTokImpact", it: "BookTok", en: "BookTok" },
  { key: "commercialClarity", it: "Chiarezza", en: "Clarity" },
];

export function CoverCommercialIntelligencePanel({ intel, italianUi = true }: Props) {
  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
            {italianUi ? "Commercial Intelligence" : "Commercial Intelligence"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {italianUi ? "Prontezza commerciale copertina" : "Cover commercial readiness"}
          </p>
        </div>
        <span className="text-3xl font-bold tabular-nums text-primary">{intel.overallScore}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {METRIC_LABELS.map(({ key, it, en }) => (
          <div key={key} className="rounded-xl border border-border/60 bg-background/40 px-2.5 py-2">
            <span className="text-muted-foreground">{italianUi ? it : en}</span>
            <span className="float-right font-bold tabular-nums">{intel[key]}</span>
          </div>
        ))}
      </div>

      <Badge variant="outline" className="text-[10px]">
        {italianUi ? "Score 0–100 · suggerimenti live" : "Score 0–100 · live suggestions"}
      </Badge>

      {intel.strengths.map((s) => (
        <p key={s} className="flex items-center gap-1 text-primary">
          <Check className="h-3 w-3 shrink-0" />
          {s}
        </p>
      ))}
      {intel.suggestions.map((s) => (
        <p key={s} className="flex items-start gap-1 text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
          {s}
        </p>
      ))}
    </div>
  );
}
