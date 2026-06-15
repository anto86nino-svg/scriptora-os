import { FORGE_PRESETS, type ForgePreset } from "@/lib/scriptora-forge/forge-presets";

type ScriptoraForgePanelProps = {
  onSelectPreset: (preset: ForgePreset) => void;
};

export function ScriptoraForgePanel({ onSelectPreset }: ScriptoraForgePanelProps) {
  return (
    <section className="ios-panel mb-5 overflow-hidden border-white/12 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-sky-950/30 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300/80">
            Scriptora Forge
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
            Cosa vuoi scrivere?
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/62">
            Scegli un tipo di libro. Scriptora prepara struttura, tono, sezioni e regole di scrittura senza farti attraversare una giungla di opzioni.
          </p>
        </div>
        <span className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100 sm:inline-flex">
          Preset rapidi
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {FORGE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className="group min-h-[118px] rounded-2xl border border-white/12 bg-white/[0.045] p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-400/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl" aria-hidden>
                {preset.icon}
              </span>
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/45">
                {preset.family}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-black text-white">{preset.label}</h3>
            <p className="mt-1 text-[11px] leading-4 text-white/56">{preset.subtitle}</p>
            <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-sky-100/60">{preset.promise}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
