import { Archive, Trash2 } from "lucide-react";
import { MobileFullscreenShell } from "./MobileFullscreenShell";

export type MobileDeleteProjectDialogProps = {
  open: boolean;
  projectTitle: string;
  onCancel: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  busy?: boolean;
};

export function MobileDeleteProjectDialog({
  open,
  projectTitle,
  onCancel,
  onDelete,
  onArchive,
  busy,
}: MobileDeleteProjectDialogProps) {
  if (!open) return null;

  return (
    <MobileFullscreenShell
      title="Lasciar andare questo universo?"
      subtitle={projectTitle}
      onClose={onCancel}
      backLabel="Annulla"
    >
      <div className="scriptora-mobile-enter space-y-6 px-4 py-6">
        <p className="text-sm leading-7 text-white/65">
          Vuoi davvero lasciar andare questo universo? Puoi recuperarlo entro 7 giorni — poi svanisce per sempre.
        </p>

        <div className="space-y-3">
          {onArchive && (
            <button
              type="button"
              disabled={busy}
              onClick={onArchive}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-4 text-base font-semibold text-white disabled:opacity-50"
            >
              <Archive className="h-5 w-5" />
              Archivia
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-500/90 px-4 text-base font-semibold text-white disabled:opacity-50"
          >
            <Trash2 className="h-5 w-5" />
            Elimina
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-medium text-white/55"
          >
            Annulla — torno al libro
          </button>
        </div>
      </div>
    </MobileFullscreenShell>
  );
}
