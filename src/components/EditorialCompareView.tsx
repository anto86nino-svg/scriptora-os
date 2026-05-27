import { ArrowRight, X } from "lucide-react";

interface Props {
  originalText: string;
  patchedText: string;
  beforeScore?: number | null;
  afterScore?: number | null;
  scoreDelta?: number | null;
  onApply: () => void;
  onClose: () => void;
}

export default function EditorialCompareView({
  originalText,
  patchedText,
  beforeScore,
  afterScore,
  scoreDelta,
  onApply,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[99999] bg-background overflow-hidden p-3">

<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.12),transparent_45%)] pointer-events-none" />

<div className="relative z-10 flex flex-col h-screen">

      {/* HEADER */}
      <div className="border-b border-border/40 bg-card/95 backdrop-blur-xl px-6 py-4 shrink-0 rounded-2xl border border-border/50 mb-3">
        <div className="flex items-center justify-between">

          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-black">
              Editorial Review
            </p>

            <h1 className="text-3xl font-black tracking-tight text-foreground mt-1">
              Prima vs Dopo
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Scriptora Editorial Intelligence — confronta le revisioni prima dell'applicazione
            </p>
          </div>

          <button
            onClick={onClose}
            className="h-11 px-5 rounded-xl border border-border hover:bg-accent transition inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Torna indietro
          </button>
        </div>

        {/* SCORE */}
        <div className="mt-5 flex items-center gap-3">
          <span className="text-2xl font-black text-muted-foreground">
            {beforeScore?.toFixed(1)}
          </span>

          <ArrowRight className="h-5 w-5 text-primary" />

          <span className="text-4xl font-black text-primary">
            {afterScore?.toFixed(1)}
          </span>

          {scoreDelta !== null && (
            <span className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
              +{scoreDelta?.toFixed(1)} miglioramento
            </span>
          )}
        </div>
      </div>

      {/* SPLIT SCREEN */}
      <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden">

        {/* PRIMA */}
        <div className="overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl">
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4 z-20">
            <p className="text-xs uppercase tracking-[0.25em] font-black text-rose-500">
              Prima
            </p>

            <p className="text-sm text-muted-foreground">
              Draft originale
            </p>
          </div>

          <div className="p-8 whitespace-pre-wrap leading-8 text-[15px] text-foreground/75">
            {originalText}
          </div>
        </div>

        {/* DOPO */}
        <div className="overflow-y-auto rounded-2xl border border-primary/15 bg-primary/[0.03] backdrop-blur-2xl shadow-2xl">
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4 z-20">
            <p className="text-xs uppercase tracking-[0.25em] font-black text-emerald-500">
              Dopo
            </p>

            <p className="text-sm text-muted-foreground">
              Versione migliorata da Scriptora
            </p>
          </div>

          <div className="p-8 whitespace-pre-wrap leading-8 text-[15px] text-foreground">
            {patchedText}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border border-border/50 bg-card/95 backdrop-blur-xl px-5 py-4 shrink-0 rounded-2xl mt-3">
        <div className="flex items-center justify-end gap-3">

          <button
            onClick={onClose}
            className="h-12 px-6 rounded-xl border border-border hover:bg-accent transition font-semibold"
          >
            Scarta
          </button>

          <button
            onClick={onApply}
            className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-black hover:opacity-90 transition"
          >
            ✦ Applica revisione editoriale
          </button>

        </div>
      </div>
    </div>
  );
}
