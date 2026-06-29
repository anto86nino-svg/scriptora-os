import { ArrowRight } from "lucide-react";
import type { OsHouseToolCard } from "@/lib/os/os-house-registry";
import { PaywallGuard } from "@/components/PaywallGuard";

type Props = {
  tools: OsHouseToolCard[];
  onOpenTool: (tool: OsHouseToolCard) => void;
};

export function OsHouseGrid({ tools, onOpenTool }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const card = (
          <button
            type="button"
            onClick={() => onOpenTool(tool)}
            className="group flex h-full flex-col rounded-2xl border border-white/8 bg-white/[0.04] p-4 text-left transition hover:border-white/14 hover:bg-white/[0.07]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white/85">
              <Icon className="h-5 w-5" />
            </span>
            <span className="mt-3 text-base font-bold text-white">{tool.label}</span>
            <span className="mt-1 flex-1 text-sm leading-5 text-white/55">{tool.description}</span>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-white/45 group-hover:text-white/75">
              Apri
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </button>
        );

        return tool.feature ? (
          <PaywallGuard key={tool.id} feature={tool.feature as any} compact>
            {card}
          </PaywallGuard>
        ) : (
          <div key={tool.id}>{card}</div>
        );
      })}
    </div>
  );
}
