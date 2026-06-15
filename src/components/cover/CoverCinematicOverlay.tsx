import { getCinematicStepLabel } from "@/lib/cover-studio/cover-cinematic-generate";
import { cn } from "@/lib/utils";

type Props = {
  stepId: string;
  progress: number;
  italianUi?: boolean;
};

export function CoverCinematicOverlay({ stepId, progress, italianUi = true }: Props) {
  if (stepId === "done") return null;

  return (
    <div className="cover-cinematic-overlay absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/72 backdrop-blur-md">
      <div className="cover-cinematic-overlay-inner mx-4 max-w-sm text-center">
        <div className="cover-cinematic-scanline mb-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 via-sky-400/90 to-violet-400/90 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="cover-cinematic-step text-sm font-medium tracking-wide text-sky-100/95">
          {getCinematicStepLabel(stepId, italianUi)}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/45">
          Cover Studio Pro
        </p>
      </div>
    </div>
  );
}
