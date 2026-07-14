// Single download card. Pure presentational — action handled in parent.

import { useState } from "react";
import { Download, Apple, Monitor, Smartphone, Package as PackageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { DownloadItem } from "@/config/downloads";

const ICONS: Record<string, React.ReactNode> = {
  android: <Smartphone className="h-4 w-4" />,
  ios: <Smartphone className="h-4 w-4" />,
  macos: <Apple className="h-4 w-4" />,
  windows: <Monitor className="h-4 w-4" />,
  linux: <Monitor className="h-4 w-4" />,
  web: <PackageIcon className="h-4 w-4" />,
};

interface DownloadCardProps {
  item: DownloadItem;
}

export function DownloadCard({ item }: DownloadCardProps) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (item.available && item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "relative rounded-2xl border p-5 flex flex-col transition-all",
          item.recommended
            ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent"
            : "border-border bg-card",
        )}
      >
        {item.recommended && (
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold bg-primary text-primary-foreground">
            Consigliato
          </span>
        )}

        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            {ICONS[item.platform]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{item.label}</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              .{item.fileType}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4 flex-1 leading-relaxed">
          {item.description}
        </p>

        <div className="flex items-center justify-between mb-3">
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold border",
              item.available
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {item.available ? "Disponibile" : "In arrivo"}
          </span>
        </div>

        <button
          onClick={handleClick}
          disabled={false}
          className={cn(
            "w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
            item.available
              ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02]"
              : "bg-muted text-foreground/70 hover:bg-muted/80 border border-border",
          )}
        >
          <Download className="h-3.5 w-3.5" />
          {item.available ? `Scarica ${item.fileType.toUpperCase()}` : "Non ancora disponibile"}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center mb-2">
              <PackageIcon className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Build presto disponibile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground text-center">
            <p>
              Il file <span className="font-bold text-foreground">{item.label}</span> sarà attivato
              quando verrà configurato il link nel file <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs">.env</code>.
            </p>
            <p className="text-xs">
              L'infrastruttura di rilascio è già pronta — non sarà necessaria alcuna modifica al
              codice per attivare questo download.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="mt-4 w-full text-center px-4 py-2.5 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Ho capito
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
