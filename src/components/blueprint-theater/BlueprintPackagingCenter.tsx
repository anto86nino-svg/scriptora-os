import { useState } from "react";
import { Package, Store, Tags, TrendingUp, Sparkles, FileDown, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  keywords?: string[];
  categories?: string[];
  onTitleChange?: (v: string) => void;
  onSubtitleChange?: (v: string) => void;
  onCover?: () => void;
  onKdp?: () => void;
  onRadar?: () => void;
  onKeywordGold?: () => void;
  onTitleIntel?: () => void;
  onExport?: () => void;
  onMarket?: () => void;
  italianUi?: boolean;
  defaultOpen?: boolean;
};

export function BlueprintPackagingCenter({
  title,
  subtitle,
  keywords = [],
  categories = [],
  onTitleChange,
  onSubtitleChange,
  onCover,
  onKdp,
  onRadar,
  onKeywordGold,
  onTitleIntel,
  onExport,
  onMarket,
  italianUi = true,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="blueprint-packaging glass-premium rounded-[1.75rem] border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left sm:px-5"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-300" />
          <span className="text-sm font-semibold text-white">
            {italianUi ? "Packaging Center" : "Packaging Center"}
          </span>
        </div>
        <span className="text-xs text-white/45">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/10 px-4 py-4 sm:px-5">
          <p className="text-[11px] leading-relaxed text-white/50">
            {italianUi
              ? "Titolo, cover, keyword, store e KDP — ottimizzazione del libro, non un percorso separato."
              : "Title, cover, keywords, store and KDP — book optimization, not a separate path."}
          </p>

          {onTitleChange ? (
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Titolo</span>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-400/50"
              />
            </label>
          ) : (
            <p className="text-sm text-white/80">
              <span className="text-white/45">Titolo · </span>
              {title}
            </p>
          )}

          {onSubtitleChange ? (
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-white/40">Sottotitolo</span>
              <input
                value={subtitle || ""}
                onChange={(e) => onSubtitleChange(e.target.value)}
                className="w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-400/50"
              />
            </label>
          ) : subtitle ? (
            <p className="text-sm text-white/65">{subtitle}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {onTitleIntel && (
              <button type="button" onClick={onTitleIntel} className="inline-flex items-center gap-1.5 rounded-xl border border-violet-300/25 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-100">
                <Sparkles className="h-3.5 w-3.5" />
                {italianUi ? "Titolo" : "Title"}
              </button>
            )}
            {onCover && (
              <button
                type="button"
                onClick={onCover}
                className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
              >
                Cover Studio
              </button>
            )}
            {onKeywordGold && (
              <button type="button" onClick={onKeywordGold} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/20 bg-amber-400/8 px-3 py-2 text-xs font-semibold text-amber-100">
                <Tags className="h-3.5 w-3.5" />
                Keyword Gold
              </button>
            )}
            {onRadar && (
              <button type="button" onClick={onRadar} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/20 bg-emerald-400/8 px-3 py-2 text-xs font-semibold text-emerald-100">
                <TrendingUp className="h-3.5 w-3.5" />
                Radar
              </button>
            )}
            {onKdp && (
              <button
                type="button"
                onClick={onKdp}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100"
              >
                <Store className="h-3.5 w-3.5" />
                KDP Launch
              </button>
            )}
            {onMarket && (
              <button type="button" onClick={onMarket} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-300/20 bg-cyan-400/8 px-3 py-2 text-xs font-semibold text-cyan-100">
                <BarChart3 className="h-3.5 w-3.5" />
                {italianUi ? "Mercato" : "Market"}
              </button>
            )}
            {onExport && (
              <button type="button" onClick={onExport} className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-white/75">
                <FileDown className="h-3.5 w-3.5" />
                Export
              </button>
            )}
          </div>

          {(keywords.length > 0 || categories.length > 0) && (
            <div className="space-y-2">
              {keywords.length > 0 && (
                <div>
                  <p className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/40">
                    <Tags className="h-3 w-3" /> Keyword
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {keywords.map((kw) => (
                      <span key={kw} className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/65">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <span key={cat} className={cn("rounded-full border border-violet-300/20 px-2 py-0.5 text-[10px] text-violet-100")}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
