import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { BookProject, SectionId } from "@/types/book";
import { MollySprite } from "@/components/molly/MollySprite";
import { isMobileDevice } from "@/lib/mobile-performance";
import {
  analyzeMollyBrain,
  executeMollyQuickAction,
  isMollyBrainOsEnabled,
  mollyMemoryAcknowledgement,
  recordMollyActionAccepted,
  recordMollyActionRejected,
  type MollyAppContext,
  type MollyBrainInsight,
  type MollyBrainMood,
  type MollyQuickActionId,
} from "@/lib/molly-brain";

interface MollyBrainPanelProps {
  project: BookProject;
  activeSection: SectionId | null;
  appContext?: MollyAppContext;
  studyText?: string;
  voiceFeedback?: string;
  onApplyChapterContent: (chapterIndex: number, content: string, subIndex?: number | null) => void;
  onApplyStudyText?: (content: string) => void;
}

function resolveTarget(
  project: BookProject,
  activeSection: SectionId | null,
): { chapterIndex: number; subIndex: number | null; content: string } | null {
  if (!activeSection) return null;
  const chMatch = activeSection.match(/^chapter-(\d+)$/);
  if (chMatch) {
    const idx = parseInt(chMatch[1], 10);
    const content = project.chapters[idx]?.content || "";
    return content.trim() ? { chapterIndex: idx, subIndex: null, content } : null;
  }
  const subMatch = activeSection.match(/^chapter-(\d+)-sub-(\d+)$/);
  if (subMatch) {
    const ci = parseInt(subMatch[1], 10);
    const si = parseInt(subMatch[2], 10);
    const content = project.chapters[ci]?.subchapters?.[si]?.content || "";
    return content.trim() ? { chapterIndex: ci, subIndex: si, content } : null;
  }
  return null;
}

const MOOD_VISUAL: Record<MollyBrainMood, "idle" | "play" | "eat" | "sleep"> = {
  sleeping: "sleep",
  observing: "idle",
  writing: "idle",
  analyzing: "eat",
  worried: "idle",
  happy: "play",
};

export function MollyBrainPanel({
  project,
  activeSection,
  appContext = "writing",
  studyText,
  voiceFeedback,
  onApplyChapterContent,
  onApplyStudyText,
}: MollyBrainPanelProps) {
  const [enabled, setEnabled] = useState(isMollyBrainOsEnabled);
  const [collapsed, setCollapsed] = useState(true);
  const [insight, setInsight] = useState<MollyBrainInsight | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState<MollyQuickActionId | null>(null);
  const [ack, setAck] = useState<string | null>(null);
  const lastInsightIdRef = useRef<string | null>(null);

  useEffect(() => {
    const sync = () => setEnabled(isMollyBrainOsEnabled());
    window.addEventListener("scriptora-molly-brain-os-change", sync);
    return () => window.removeEventListener("scriptora-molly-brain-os-change", sync);
  }, []);

  const target = useMemo(
    () => resolveTarget(project, activeSection),
    [project, activeSection],
  );

  const canAnalyze = appContext === "study"
    ? Boolean(studyText?.trim())
    : Boolean(target?.content);

  const runAnalyze = useCallback(() => {
    if (!enabled || !canAnalyze) {
      toast.message("Apri un capitolo con testo prima di analizzare.");
      return;
    }
    setAnalyzing(true);
    try {
      const next = analyzeMollyBrain({
        project,
        activeSection,
        appContext,
        studyText,
        voiceFeedback,
      });
      if (next && next.id !== lastInsightIdRef.current) {
        setInsight(next);
        lastInsightIdRef.current = next.id;
        setAck(null);
        setCollapsed(false);
      } else if (!next) {
        setInsight(null);
        toast.message("Molly non ha trovato suggerimenti per questa sezione.");
      }
    } finally {
      setAnalyzing(false);
    }
  }, [enabled, canAnalyze, project, activeSection, appContext, studyText, voiceFeedback]);

  const handleDismiss = () => {
    if (insight?.actions[0]) {
      recordMollyActionRejected(insight.actions[0].id);
    }
    setInsight(null);
    lastInsightIdRef.current = null;
    setCollapsed(true);
  };

  const handleAction = async (actionId: MollyQuickActionId) => {
    setApplying(actionId);
    try {
      if (appContext === "study" && studyText?.trim() && onApplyStudyText) {
        const result = executeMollyQuickAction(actionId, {
          project,
          chapterIndex: 0,
          text: studyText,
        });
        if (!result.changed) {
          toast.message("Molly non ha trovato modifiche sicure da applicare.");
          return;
        }
        onApplyStudyText(result.text);
        const memory = recordMollyActionAccepted(actionId, result.memoryNote);
        setAck(mollyMemoryAcknowledgement(memory) || "Patch applicata allo studio.");
        setInsight(null);
        toast.success("Molly ha aggiornato il materiale.");
        return;
      }

      if (!target) return;
      const result = executeMollyQuickAction(actionId, {
        project,
        chapterIndex: target.chapterIndex,
        subIndex: target.subIndex,
        text: target.content,
      });

      if (!result.changed) {
        toast.message("Molly non ha trovato modifiche sicure da applicare.");
        return;
      }

      onApplyChapterContent(target.chapterIndex, result.text, target.subIndex);
      const memory = recordMollyActionAccepted(actionId, result.memoryNote);
      setAck(mollyMemoryAcknowledgement(memory) || `Patch applicata (~${result.changePercent.toFixed(1)}% modificato).`);
      setInsight(null);
      lastInsightIdRef.current = null;
      toast.success("Molly ha aggiornato il capitolo.");
      setCollapsed(true);
    } finally {
      setApplying(null);
    }
  };

  if (!enabled) return null;

  const mood: MollyBrainMood = analyzing ? "analyzing" : insight?.mood || "observing";
  const hasTip = Boolean(insight);
  const mobile = isMobileDevice();

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => (hasTip ? setCollapsed(false) : void runAnalyze())}
        className={`molly-brain-fab fixed z-[68] flex items-center justify-center rounded-full border border-white/15 bg-slate-950/95 shadow-lg transition ${hasTip ? "molly-brain-fab--alert" : ""}`}
        aria-label={hasTip ? "Apri suggerimento Molly" : "Analizza con Molly"}
        title={hasTip ? "Suggerimento Molly" : "Analizza capitolo"}
      >
        <MollySprite visual={MOOD_VISUAL[mood]} mood="calm" size={mobile ? 32 : 36} />
        {hasTip && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-sky-400 ring-2 ring-slate-950" />
        )}
      </button>
    );
  }

  return (
    <div className="molly-brain-panel fixed z-[68] w-[min(92vw,340px)]">
      <div className="overflow-hidden rounded-2xl border border-white/12 bg-slate-950/96 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <MollySprite visual={MOOD_VISUAL[mood]} mood="calm" size={32} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/80">Molly</p>
              <p className="text-[11px] text-white/65">
                {analyzing ? "Analisi…" : insight ? "Suggerimento pronto" : "Assistente editoriale"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Riduci Molly"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-3 py-3">
          {analyzing ? (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisi in corso…
            </div>
          ) : insight ? (
            <div className="space-y-3">
              <p className="whitespace-pre-line text-sm leading-6 text-white/90">{insight.comic}</p>
              <div className="flex flex-wrap gap-2">
                {insight.actions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={!!applying}
                    onClick={() => void handleAction(action.id)}
                    className="rounded-xl border border-emerald-300/30 bg-emerald-300/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/25 disabled:opacity-50"
                  >
                    {applying === action.id ? <Loader2 className="inline h-3 w-3 animate-spin" /> : action.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-white/55 hover:bg-white/5"
                >
                  Ignora
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/60">
                Analisi su richiesta — niente monitoraggio in background. Un suggerimento utile alla volta.
              </p>
              <button
                type="button"
                onClick={() => void runAnalyze()}
                disabled={!canAnalyze || analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Analizza sezione
              </button>
            </div>
          )}

          {ack && (
            <p className="mt-3 rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
              {ack}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
