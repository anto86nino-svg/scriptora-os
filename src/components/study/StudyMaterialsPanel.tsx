import { AlertTriangle, FileText } from "lucide-react";
import { countStudyWords, type StudySessionResult } from "@/lib/study-session";

interface StudyMaterialsPanelProps {
  result: StudySessionResult;
  sourceName: string;
  rawText: string;
  importWarnings?: string[];
}

export function StudyMaterialsPanel({
  result,
  sourceName,
  rawText,
  importWarnings = [],
}: StudyMaterialsPanelProps) {
  const classification = result.classification;
  const words = result.words || countStudyWords(rawText);
  const confidence = classification?.confidence ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-200" />
              <h3 className="font-semibold">Materiale attivo</h3>
            </div>
            <p className="mt-2 truncate text-sm text-muted-foreground">{sourceName || result.sourceName}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 px-3 py-2 text-sm">
            <span className="font-bold text-emerald-100">{words.toLocaleString()}</span>
            <span className="ml-1 text-muted-foreground">parole</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Materia</p>
            <p className="mt-1 text-sm font-bold text-foreground">{classification?.label || result.detectedSubject}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Confidenza</p>
            <p className="mt-1 text-sm font-bold text-foreground">{confidence ? `${confidence}%` : "Non classificata"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Tempo stimato</p>
            <p className="mt-1 text-sm font-bold text-foreground">{classification?.estimatedStudyMinutes || Math.max(8, Math.round(words / 160))} min</p>
          </div>
        </div>

        {classification && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Segnali usati</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {classification.signals.map((signal) => (
                  <li key={signal}>- {signal}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Strategia adattiva</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {classification.strategy.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {importWarnings.length > 0 && (
        <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4">
          <div className="flex items-center gap-2 text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-semibold">Avvisi importazione</h3>
          </div>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-50/90">
            {importWarnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
