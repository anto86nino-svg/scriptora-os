import { Sparkles, Target, Palette, Type, Layout, Headphones, TrendingUp } from "lucide-react";
import {
  READINESS_TIER_LABELS,
  type AudiobookAdaptationPrep,
  type CoverDirectionSuggestions,
  type CoverReadinessResult,
  type CoverTemplateFamily,
} from "@/lib/cover-studio";

interface Props {
  direction: CoverDirectionSuggestions;
  readiness: CoverReadinessResult;
  audiobookPrep: AudiobookAdaptationPrep;
  matchedFamily: CoverTemplateFamily | null;
  onApplyFamily?: (family: CoverTemplateFamily) => void;
}

const TIER_STYLES: Record<CoverReadinessResult["tier"], string> = {
  weak: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  developing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  strong: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  "highly-competitive": "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
};

export function CoverStudioIntelligencePanel({
  direction,
  readiness,
  audiobookPrep,
  matchedFamily,
  onApplyFamily,
}: Props) {
  return (
    <div className="space-y-4 xl:space-y-5">
      <section className="rounded-2xl border border-border/70 bg-card/55 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)] xl:p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary">Commercial cover readiness</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{readiness.score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
          </div>
          <span className={`rounded-xl border px-2.5 py-1 text-[11px] font-semibold ${TIER_STYLES[readiness.tier]}`}>
            {READINESS_TIER_LABELS[readiness.tier]}
          </span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{readiness.summary}</p>
        <ul className="mt-3 space-y-2">
          {readiness.factors.map((factor) => (
            <li key={factor.id} className="rounded-xl border border-border/60 bg-background/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-foreground">{factor.label}</span>
                <span className="text-muted-foreground">{factor.score}/{factor.maxScore}</span>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{factor.explanation}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/55 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)] xl:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Cover direction</p>
        </div>
        <p className="text-xs text-muted-foreground">Visual positioning for <span className="font-medium text-foreground">{direction.genreLabel}</span></p>

        <div className="mt-3 space-y-3 text-xs">
          <DirectionRow icon={Target} label="Mood" value={direction.mood.join(" · ")} />
          <DirectionRow icon={Type} label="Typography" value={direction.typography} />
          <DirectionRow icon={Layout} label="Composition" value={direction.composition} />
          <DirectionRow icon={Palette} label="Palette" value={direction.palette.join(" / ")} />
          <DirectionRow icon={TrendingUp} label="Positioning" value={direction.positioning} />
        </div>

        {direction.bookTokIntensity && (
          <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-400/8 px-3 py-2">
            <p className="text-[11px] font-semibold text-violet-200">BookTok intensity: {direction.bookTokIntensity}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{direction.bookTokNote}</p>
          </div>
        )}
      </section>

      {matchedFamily && onApplyFamily && (
        <section className="rounded-2xl border border-primary/20 bg-primary/8 p-4 xl:p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary">Suggested template family</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{matchedFamily.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{matchedFamily.tagline}</p>
          <button
            type="button"
            onClick={() => onApplyFamily(matchedFamily)}
            className="mt-3 w-full rounded-xl border border-primary/35 bg-primary/12 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/18"
          >
            Apply {matchedFamily.label} direction
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-background/35 p-4 xl:p-5">
        <div className="mb-2 flex items-center gap-2">
          <Headphones className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Audiobook-ready prep</p>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">{audiobookPrep.squareSafeCrop.note}</p>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{audiobookPrep.titleSafeZone.note}</p>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{audiobookPrep.typographySpacingSafe}</p>
        <p className="mt-2 text-[10px] text-muted-foreground/80">Foundation only — no audiobook export in V1.</p>
      </section>
    </div>
  );
}

function DirectionRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
        <Icon className="h-3 w-3 text-primary" />
        {label}
      </div>
      <p className="mt-0.5 pl-[18px] leading-5 text-muted-foreground">{value}</p>
    </div>
  );
}
