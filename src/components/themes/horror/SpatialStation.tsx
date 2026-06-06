import React from "react";

interface StationAction {
  label: string;
  onClick: () => void;
}

interface SpatialStationProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actions?: StationAction[];
}

export function SpatialStation({
  title,
  description,
  icon,
  actions = [],
}: SpatialStationProps) {
  return (
    <div className="w-full rounded-2xl border border-zinc-900/80 bg-[#09090B]/90 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300 hover:border-red-950/30 hover:bg-[#0E0E12]/95">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-black/40 text-zinc-300">
          {icon}
        </div>

        <div>
          <h3 className="font-serif text-sm tracking-wide text-zinc-100">
            {title}
          </h3>

          <p className="text-[11px] text-zinc-500">
            {description}
          </p>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-[11px] uppercase tracking-wider text-zinc-300 transition-all hover:border-red-900/40 hover:text-white"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
