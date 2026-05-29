import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getGenreProfile, resolveGenreKey } from "@/lib/genre-intelligence";
import { Loader2, Stethoscope, CheckCircle2, AlertTriangle, Wrench, X, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDomination } from "@/contexts/DominationContext";
import type { BookProject } from "@/types/book";
import { getCurrentUserId } from "@/services/storageService";
import { t } from "@/lib/i18n";

interface AutoFixRule {
  triggers: string[];
  label: string;
  directive: string;
}

interface Props {
  chapterTitle: string;
  chapterText: string;
  genre: string;
  subcategory?: string;
  language?: string;
  /** Optional: enables the "Applica Auto-Fix" CTA that triggers the dominate loop with directives. */
  project?: BookProject;
  chapterIndex?: number;
}

interface CoachReport {
  genreFitScore: number;
  works: string[];
  breaks: string[];
  missing: string[];
  excess: string[];
  fixes: { issue: string; where: string; suggestion: string }[];
  verdict: string;
  autoFixRules?: AutoFixRule[];
  autoFixPromptBlock?: string;
}

export function GenreCoachPanel({
  chapterTitle,
  chapterText,
  genre,
  subcategory,
  language = "Italian",
  project,
  chapterIndex,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CoachReport | null>(null);
  const [open, setOpen] = useState(false);
  const { startDominate } = useDomination();

  const runCoach = async () => {
    if (!chapterText || chapterText.length < 100) {
      toast.error("Capitolo troppo corto per l'analisi");
      return;
    }
    setLoading(true);
    try {
      const p = getGenreProfile(genre, subcategory);
      const payload = {
        chapterTitle,
        chapterText,
        language,
        genreProfile: {
          key: resolveGenreKey(genre, subcategory),
          tone: p.tone,
          pacing: p.pacing,
          readerPromise: p.readerPromise,
          hookTypes: p.hookTypes,
          dos: p.dos,
          donts: p.donts,
          chapterEnding: p.chapterEnding,
        },
        projectId: project?.id || null,
        userId: getCurrentUserId(),
      };
      const { data, error } = await supabase.functions.invoke("genre-coach", { body: payload });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setReport(data as CoachReport);
      setOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Analisi fallita");
    } finally {
      setLoading(false);
    }
  };

  const applyAutoFix = () => {
    if (!project || chapterIndex === undefined || !report?.autoFixPromptBlock) return;
    startDominate(project, chapterIndex, { genreAutoFixBlock: report.autoFixPromptBlock });
    toast.success("Auto-Fix avviato in background — riscrittura mirata, max 15%");
  };

  const canApplyAutoFix =
    !!project && chapterIndex !== undefined && (report?.autoFixRules?.length || 0) > 0;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={runCoach}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-3 py-2 text-sm disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
        {t("genre_coach_label")}
      </button>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{t("genre_coach_helper")}</p>

      {open && report && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-4 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScoreBadge score={report.genreFitScore} />
              <span className="text-muted-foreground italic">{report.verdict}</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <Section icon={<CheckCircle2 className="h-4 w-4 text-primary" />} title="Cosa funziona" items={report.works} />
          <Section icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} title="Cosa non funziona" items={report.breaks} />
          <Section icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} title="Cosa manca" items={report.missing} />
          <Section icon={<AlertTriangle className="h-4 w-4 text-destructive" />} title="Cosa è troppo" items={report.excess} />

          {report.fixes?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-medium text-foreground mb-2">
                <Wrench className="h-4 w-4 text-primary" />
                Fix mirati ({report.fixes.length})
              </div>
              <ul className="space-y-2">
                {report.fixes.map((f, i) => (
                  <li key={`stable-${i}`} className="rounded border border-border/60 bg-muted/30 p-2.5">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
                      <span className="font-semibold text-foreground/80">{f.where}</span>
                      <span>·</span>
                      <span>{f.issue}</span>
                    </div>
                    <div className="text-foreground/90">{f.suggestion}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.autoFixRules && report.autoFixRules.length > 0 && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Genre Auto-Fix attivabili ({report.autoFixRules.length})
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-auto">
                  cap riscrittura: 15%
                </span>
              </div>
              <ul className="space-y-1.5">
                {report.autoFixRules.map((r, i) => (
                  <li key={`stable-${i}`} className="text-xs text-foreground/85">
                    <span className="font-semibold text-primary">[{r.label}]</span>{" "}
                    <span className="text-foreground/70">{r.directive}</span>
                  </li>
                ))}
              </ul>
              {canApplyAutoFix && (
                <button
                  type="button"
                  onClick={applyAutoFix}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-2 text-sm font-medium mt-1"
                >
                  <Zap className="h-4 w-4" />
                  Applica Auto-Fix di genere
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 font-medium text-foreground mb-1.5">{icon}{title}</div>
      <ul className="space-y-1 ml-6 list-disc text-foreground/85">
        {items.map((it, i) => <li key={`stable-${i}`}>{it}</li>)}
      </ul>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 90 ? "bg-primary/15 text-primary border-primary/30"
    : score >= 70 ? "bg-secondary text-secondary-foreground border-border"
    : score >= 50 ? "bg-muted text-muted-foreground border-border"
    : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", tone)}>
      Genre fit: {score}/100
    </span>
  );
}
