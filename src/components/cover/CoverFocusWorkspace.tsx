import type { ReactNode } from "react";
import { Download, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CoverPreviewStage } from "@/components/cover/CoverPreviewStage";
import { CoverCinematicOverlay } from "@/components/cover/CoverCinematicOverlay";
import { CoverFloatingPanel } from "@/components/cover/CoverFloatingPanel";
import { CoverFocusToolbar } from "@/components/cover/CoverFocusToolbar";
import { CoverCommercialIntelligencePanel } from "@/components/cover/CoverCommercialIntelligencePanel";
import { COVER_VIEW_MODES, type CoverViewMode } from "@/lib/cover-studio/cover-view-modes";
import type { CoverCommercialIntelligence } from "@/lib/cover-studio/cover-commercial-intelligence";
import type { CoverFocusPanelId, CoverTextHighlight } from "@/lib/cover-studio/cover-focus-types";
import type { CoverComposition } from "@/lib/cover-studio/cover-layers";
import type { CoverSpecRects } from "@/lib/cover-studio/cover-view-modes";

type CoverMode = "epub" | "kdp" | "lulu" | "custom";

type Props = {
  composition: CoverComposition;
  onCompositionChange: (next: CoverComposition) => void;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  italianUi: boolean;
  spec: CoverSpecRects & { label: string; exportNote: string };
  cinematicStep: string | null;
  cinematicProgress: number;
  highlightLayerType: CoverTextHighlight;
  isMobileStudio: boolean;
  activeFocusPanel: CoverFocusPanelId | null;
  onToggleFocusPanel: (id: CoverFocusPanelId) => void;
  focusPanelTitle: string;
  onCloseFocusPanel: () => void;
  focusStudioTab: ReturnType<typeof import("@/lib/cover-studio/cover-focus-types").mapFocusPanelToStudioTab>;
  commercialIntel: CoverCommercialIntelligence;
  mode: CoverMode;
  onModeChange: (mode: CoverMode) => void;
  studioProPanel: ReactNode;
  formatPanel: ReactNode;
  marketplacePanel: ReactNode;
  showPrimaryAction: boolean;
  primaryActionLabel: string;
  onUseForEpub: () => void;
  onDownload: () => void;
  onSaveToProject?: () => void;
  projectId?: string;
};

export function CoverFocusWorkspace({
  composition,
  onCompositionChange,
  selectedLayerId,
  onSelectLayer,
  canvasRef,
  italianUi,
  spec,
  cinematicStep,
  cinematicProgress,
  highlightLayerType,
  isMobileStudio,
  activeFocusPanel,
  onToggleFocusPanel,
  focusPanelTitle,
  onCloseFocusPanel,
  focusStudioTab,
  commercialIntel,
  mode,
  onModeChange,
  studioProPanel,
  formatPanel,
  marketplacePanel,
  showPrimaryAction,
  primaryActionLabel,
  onUseForEpub,
  onDownload,
  onSaveToProject,
  projectId,
}: Props) {
  return (
    <div className="scriptora-cover-studio-workspace cover-focus-workspace relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="cover-focus-stage relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="cover-focus-spec-chip pointer-events-none absolute left-4 top-3 z-20 hidden items-center gap-2 rounded-full border border-white/10 bg-background/50 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-xl lg:flex">
          <span className="font-medium text-foreground">{spec.label}</span>
          <span>
            {spec.width}×{spec.height}px
          </span>
        </div>

        <div className="cover-focus-score-chip absolute right-4 top-3 z-20 hidden items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 backdrop-blur-xl lg:flex">
          <span className="text-[10px] text-muted-foreground">{italianUi ? "Score commerciale" : "Commercial score"}</span>
          <Badge variant="secondary" className="tabular-nums text-[10px]">
            {commercialIntel.overallScore}
          </Badge>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-1 pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-1 sm:px-3 lg:px-8 lg:pb-20 lg:pt-4">
          {isMobileStudio && (
            <div className="mb-1.5 flex w-full max-w-full shrink-0 flex-wrap items-center justify-center gap-1 overflow-x-auto">
              {COVER_VIEW_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onCompositionChange({
                      ...composition,
                      viewMode: m.id as CoverViewMode,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold transition ${
                    (composition.viewMode ?? "front") === m.id
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/50 text-muted-foreground"
                  }`}
                >
                  {italianUi ? m.labelIt : m.labelEn}
                </button>
              ))}
              {(
                [
                  ["epub", "Ebook"],
                  ["kdp", "KDP"],
                  ["lulu", "Lulu"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                    mode === value ? "border-primary bg-primary/15 text-primary" : "border-border/50 text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="cover-focus-canvas-frame relative flex h-full w-full min-h-0 flex-1 items-center justify-center rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-black/55 via-background/15 to-primary/10 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_32px_100px_rgba(0,0,0,0.55)] sm:p-2 lg:rounded-[2rem] lg:p-4">
            {cinematicStep && cinematicStep !== "done" && (
              <CoverCinematicOverlay stepId={cinematicStep} progress={cinematicProgress} italianUi={italianUi} />
            )}
            <CoverPreviewStage
              composition={composition}
              selectedLayerId={selectedLayerId}
              onSelectLayer={onSelectLayer}
              onCompositionChange={onCompositionChange}
              canvasRef={canvasRef}
              italianUi={italianUi}
              spec={spec}
              viewMode={composition.viewMode ?? "front"}
              activePanel={composition.activePanel ?? "front"}
              onActivePanelChange={(panel) => onCompositionChange({ ...composition, activePanel: panel })}
              highlightLayerType={highlightLayerType}
              canvasClassName="rounded-xl shadow-2xl ring-1 ring-white/15 lg:rounded-2xl"
            />
          </div>

          <div className="mt-1.5 flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
            <span>{italianUi ? "Miniatura" : "Thumbnail"}</span>
            <Badge variant="outline" className="text-[10px] tabular-nums">
              {commercialIntel.thumbnailReadability}/100
            </Badge>
            {isMobileStudio && (
              <span className="text-muted-foreground/70">
                · {spec.label}
              </span>
            )}
          </div>
        </div>

        <CoverFocusToolbar
          activePanel={activeFocusPanel}
          onSelectPanel={onToggleFocusPanel}
          italianUi={italianUi}
          isMobile={isMobileStudio}
          score={commercialIntel.overallScore}
        />
      </div>

      <CoverFloatingPanel
        open={activeFocusPanel !== null && activeFocusPanel !== "export"}
        title={focusPanelTitle}
        onClose={onCloseFocusPanel}
        isMobile={isMobileStudio}
      >
        {activeFocusPanel === "format" && formatPanel}
        {activeFocusPanel === "marketplace" && marketplacePanel}
        {activeFocusPanel === "readiness" && (
          <div className="space-y-4">
            <CoverCommercialIntelligencePanel intel={commercialIntel} italianUi={italianUi} />
            {studioProPanel}
          </div>
        )}
        {focusStudioTab && activeFocusPanel !== "readiness" && activeFocusPanel !== "format" && activeFocusPanel !== "marketplace" && (
          studioProPanel
        )}
      </CoverFloatingPanel>

      <CoverFloatingPanel
        open={activeFocusPanel === "export"}
        title={italianUi ? "Export" : "Export"}
        onClose={onCloseFocusPanel}
        isMobile={isMobileStudio}
      >
        <div className="space-y-2">
          {showPrimaryAction && (
            <button
              type="button"
              onClick={onUseForEpub}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-3 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              <ImagePlus className="h-4 w-4" />
              {primaryActionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3.5 text-sm font-semibold"
          >
            <Download className="h-4 w-4" />
            {italianUi ? "Scarica PNG" : "Download PNG"}
          </button>
          {projectId && onSaveToProject && (
            <button
              type="button"
              onClick={onSaveToProject}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-3.5 text-sm font-semibold text-primary"
            >
              <ImagePlus className="h-4 w-4" />
              {italianUi ? "Salva progetto" : "Save project"}
            </button>
          )}
        </div>
      </CoverFloatingPanel>
    </div>
  );
}
