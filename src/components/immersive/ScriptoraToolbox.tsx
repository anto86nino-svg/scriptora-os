import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { PaywallGuard } from "@/components/PaywallGuard";
import type { FeatureKey } from "@/lib/subscription";
import { t } from "@/lib/i18n";

export type ToolboxCard = {
  group: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  iconBg: string;
  action: () => void;
  feature?: FeatureKey;
  tag?: string;
  tourTarget?: string;
  emphasis?: boolean;
};

type ScriptoraToolboxProps = {
  open: boolean;
  onClose: () => void;
  cardGroups: { id: string; title: string; desc: string }[];
  cards: ToolboxCard[];
};

export function ScriptoraToolbox({ open, onClose, cardGroups, cards }: ScriptoraToolboxProps) {
  if (!open) return null;

  return (
    <div className="scriptora-modal-overlay fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scriptora-toolbox-title"
        className="scriptora-modal-panel relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-slate-950 pb-safe sm:max-h-[85vh] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              {t("nw_toolbox_label")}
            </p>
            <h2 id="scriptora-toolbox-title" className="mt-1 text-lg font-semibold text-white">
              {t("nw_toolbox_title")}
            </h2>
            <p className="mt-1 text-xs text-white/50">{t("nw_toolbox_desc")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="space-y-6">
            {cardGroups.map((group) => {
              const groupCards = cards.filter((card) => card.group === group.id);
              if (!groupCards.length) return null;
              return (
                <div key={group.id}>
                  <h3 className="text-sm font-medium text-white/85">{group.title}</h3>
                  <p className="mt-0.5 text-[11px] text-white/42">{group.desc}</p>
                  <ul className="mt-3 space-y-2">
                    {groupCards.map((card) => {
                      const Icon = card.icon;
                      const row = (
                        <button
                          type="button"
                          key={card.title}
                          data-guided-tour={card.tourTarget}
                          onClick={() => {
                            card.action();
                            onClose();
                          }}
                          className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/16 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                        >
                          <span className={`ios-icon ${card.iconBg} flex h-9 w-9 shrink-0 items-center justify-center rounded-lg`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-white">{card.title}</span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-white/48">{card.desc}</span>
                          </span>
                        </button>
                      );
                      return card.feature ? (
                        <li key={card.title}>
                          <PaywallGuard feature={card.feature} compact>
                            {row}
                          </PaywallGuard>
                        </li>
                      ) : (
                        <li key={card.title}>{row}</li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
