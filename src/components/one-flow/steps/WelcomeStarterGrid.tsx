import type { FC } from "react";

interface GuidedStarter {
  id: string;
  label: string;
  promise: string;
}

interface Props {
  starters: GuidedStarter[];
  hidden?: boolean;
  onSelect: (starter: GuidedStarter) => void;
}

const WelcomeStarterGrid: FC<Props> = ({
  starters,
  hidden = false,
  onSelect,
}) => {
  if (hidden) return null;

  return (
    <div className="grid gap-2 md:grid-cols-3">
      {starters.map((starter) => (
        <button
          key={starter.id}
          type="button"
          onClick={() => onSelect(starter)}
          className="rounded-2xl border border-white/12 bg-white/[0.055] p-3 text-left transition-colors hover:border-sky-300/35 hover:bg-sky-400/10"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/70">
            Starter guidato
          </span>

          <span className="mt-2 block text-sm font-bold text-white">
            {starter.label}
          </span>

          <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/58">
            {starter.promise}
          </span>
        </button>
      ))}
    </div>
  );
};

export default WelcomeStarterGrid;
