import { AlertTriangle, Home, RefreshCw, RotateCcw, ShieldCheck } from "lucide-react";
import {
  clearScriptoraLocalSessionPointers,
  goScriptoraHome,
  openSafeScriptoraDashboard,
  retryScriptoraBoot,
} from "@/lib/boot-recovery";

interface InternalLoadingGuardPanelProps {
  details?: string;
  onOpenSafeDashboard?: () => void;
}

export function InternalLoadingGuardPanel({
  details,
  onOpenSafeDashboard,
}: InternalLoadingGuardPanelProps) {
  const clearAndRetry = () => {
    clearScriptoraLocalSessionPointers();
    retryScriptoraBoot();
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[500] mx-auto max-w-xl rounded-2xl border border-amber-300/25 bg-slate-950/95 p-4 text-left text-white shadow-2xl shadow-black/40 backdrop-blur-2xl sm:bottom-6 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-300/15 text-amber-200">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold">Scriptora non è riuscita a completare il caricamento.</p>
          <p className="text-xs leading-relaxed text-slate-300">
            {details || "Il workspace non deve mai restare bloccato: puoi riprovare o aprire una dashboard sicura."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          type="button"
          onClick={retryScriptoraBoot}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 text-[11px] font-semibold text-white transition hover:bg-white/15"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Riprova
        </button>
        <button
          type="button"
          onClick={goScriptoraHome}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 text-[11px] font-semibold text-white transition hover:bg-white/15"
        >
          <Home className="h-3.5 w-3.5" />
          Torna alla home
        </button>
        <button
          type="button"
          onClick={onOpenSafeDashboard || openSafeScriptoraDashboard}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-cyan-300/25 bg-cyan-300/15 px-3 text-[11px] font-semibold text-cyan-50 transition hover:bg-cyan-300/20"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          Apri dashboard vuota
        </button>
        <button
          type="button"
          onClick={clearAndRetry}
          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 text-[11px] font-semibold text-white transition hover:bg-white/15"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Pulisci sessione locale
        </button>
      </div>
    </div>
  );
}
