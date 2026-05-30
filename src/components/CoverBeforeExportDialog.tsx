import { Download, ImagePlus, X } from "lucide-react";
import { t, tt, useUILanguage } from "@/lib/i18n";

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
  useUILanguage();
  if (!open) return null;

  return (
    <div className="scriptora-modal-overlay">
      <div className="scriptora-modal-panel max-w-md border-white/10">
        <div className="flex shrink-0 items-start justify-between border-b border-border p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              {t("cover_export_kicker")}
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{t("cover_export_title")}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              {tt("cover_export_desc", { format })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t("close_label")}
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
              <span className="block text-sm font-bold text-foreground">{t("cover_export_open_studio")}</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {t("cover_export_open_studio_desc")}
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
              <span className="block text-sm font-bold text-foreground">{t("cover_export_ship_without")}</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                {t("cover_export_ship_without_desc")}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
