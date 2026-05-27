import { Download, ImagePlus, X } from "lucide-react";

type ExportFormat = "EPUB" | "PDF" | "DOCX";

interface CoverBeforeExportDialogProps {
  open: boolean;
  format: ExportFormat;
  onCreateCover: () => void;
  onShipWithoutCover: () => void;
  onClose: () => void;
}

export function CoverBeforeExportDialog({
  open,
  format,
  onCreateCover,
  onShipWithoutCover,
  onClose,
}: CoverBeforeExportDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl">
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Ultimo passaggio
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Cover prima dell'export</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Il libro e completo. Prima di esportare in {format}, puoi creare la copertina oppure spedire il file senza cover.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 p-5">
          <button
            type="button"
            onClick={onCreateCover}
            className="flex items-center gap-3 rounded-xl border border-primary/35 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ImagePlus className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-foreground">Apri Scriptora Cover Studio</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                Genera o rifinisci la copertina, poi Scriptora riprende l'export.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onShipWithoutCover}
            className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-4 text-left transition-colors hover:bg-muted/45"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-foreground">
              <Download className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-foreground">Spedisci senza cover</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                Continua subito con l'export. Potrai creare la cover piu tardi.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
