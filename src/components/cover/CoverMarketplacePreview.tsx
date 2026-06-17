import { useEffect, useState } from "react";
import type { MarketplaceStoreId } from "@/lib/cover-studio/cover-focus-types";
import { cn } from "@/lib/utils";

const STORES: Array<{ id: MarketplaceStoreId; label: string; accent: string }> = [
  { id: "amazon", label: "Amazon", accent: "#ff9900" },
  { id: "apple", label: "Apple Books", accent: "#fa243c" },
  { id: "kobo", label: "Kobo", accent: "#bf0000" },
  { id: "google", label: "Google Play", accent: "#34a853" },
];

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  title: string;
  author: string;
  genre?: string;
  italianUi?: boolean;
  refreshKey?: string;
};

export function CoverMarketplacePreview({
  canvasRef,
  title,
  author,
  genre,
  italianUi = true,
  refreshKey,
}: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [store, setStore] = useState<MarketplaceStoreId>("amazon");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      setThumbUrl(canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      setThumbUrl(null);
    }
  }, [canvasRef, title, author, refreshKey]);

  const storeLabel = STORES.find((s) => s.id === store)?.label ?? "Store";

  return (
    <div className="space-y-4 text-xs">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {italianUi
          ? "Anteprima reale di come la copertina appare negli store — miniatura, risultati di ricerca e scheda prodotto."
          : "Real preview of how your cover appears in stores — thumbnail, search results and product page."}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {STORES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStore(s.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[10px] font-semibold transition",
              store === s.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {italianUi ? "Risultati ricerca" : "Search results"}
        </p>
        <div className="grid gap-2">
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-2 py-2 transition",
                row === 0 ? "border-primary/40 bg-primary/8" : "border-border/40 bg-background/40",
              )}
            >
              <div
                className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted shadow-sm"
                style={{ borderLeft: row === 0 ? `3px solid ${STORES.find((s) => s.id === store)?.accent}` : undefined }}
              >
                {row === 0 && thumbUrl ? (
                  <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-[11px] font-semibold", row === 0 ? "text-foreground" : "text-muted-foreground")}>
                  {row === 0 ? title : italianUi ? "Altro titolo nel genere" : "Another title in genre"}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {row === 0 ? author : italianUi ? "Autore esempio" : "Sample author"}
                </p>
                {row === 0 && genre && (
                  <p className="mt-0.5 text-[9px] text-primary/80">{genre}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/10 bg-background/50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {italianUi ? "Scheda prodotto" : "Product page"} · {storeLabel}
        </p>
        <div className="flex gap-3">
          <div className="w-[38%] shrink-0 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/10">
            {thumbUrl ? (
              <img src={thumbUrl} alt="" className="aspect-[2/3] w-full object-cover" />
            ) : (
              <div className="aspect-[2/3] w-full bg-muted" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-bold leading-tight text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground">{author}</p>
            <div className="mt-2 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-[10px] text-amber-400">★</span>
              ))}
              <span className="text-[10px] text-muted-foreground">4.2</span>
            </div>
            <p className="mt-2 line-clamp-4 text-[10px] leading-relaxed text-muted-foreground">
              {italianUi
                ? "Il lettore vede questa miniatura prima del titolo completo — verifica contrasto e leggibilità."
                : "Readers see this thumbnail before the full title — check contrast and readability."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
