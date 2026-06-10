import { X, Settings, BookOpen, Coins, CreditCard, FlaskConical, Palette, Fingerprint } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isDevMode } from "@/lib/dev-mode";

const ADVANCED_KEY = "scriptora-advanced-launchpad";

export function isAdvancedLaunchpadEnabled(): boolean {
  try {
    return localStorage.getItem(ADVANCED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAdvancedLaunchpadEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(ADVANCED_KEY, "true");
    else localStorage.removeItem(ADVANCED_KEY);
    window.dispatchEvent(new Event("scriptora-advanced-mode-change"));
  } catch { /* noop */ }
}

interface ProfileMenuDialogProps {
  open: boolean;
  onClose: () => void;
  advancedEnabled: boolean;
  onToggleAdvanced: (enabled: boolean) => void;
  onOpenStudio: () => void;
  onAuthorIdentity: () => void;
  onAppearance: () => void;
  onCredits: () => void;
  onPricing: () => void;
}

export function ProfileMenuDialog({
  open,
  onClose,
  advancedEnabled,
  onToggleAdvanced,
  onOpenStudio,
  onAuthorIdentity,
  onAppearance,
  onCredits,
  onPricing,
}: ProfileMenuDialogProps) {
  const { user } = useAuth();
  if (!open) return null;

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Autore";

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl border border-white/15 bg-slate-950 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Profilo</p>
            <p className="text-xs text-white/55">{displayName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1 p-3">
          <MenuRow icon={BookOpen} label="Scriptora OS Studio" hint="Modalità avanzata — editor completo" onClick={() => { onOpenStudio(); onClose(); }} />
          <MenuRow icon={Fingerprint} label="Identità autore" onClick={() => { onAuthorIdentity(); onClose(); }} />
          <MenuRow icon={Palette} label="Aspetto studio" onClick={() => { onAppearance(); onClose(); }} />
          <MenuRow icon={Coins} label="Crediti e utilizzo" onClick={() => { onCredits(); onClose(); }} />
          <MenuRow icon={CreditCard} label="Piano e abbonamento" onClick={() => { onPricing(); onClose(); }} />
          <div className="my-2 border-t border-white/10" />
          <label className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-3 hover:bg-white/5">
            <span className="flex items-center gap-3">
              <FlaskConical className="h-4 w-4 text-amber-300" />
              <span>
                <span className="block text-sm font-medium text-white">Modalità avanzata</span>
                <span className="text-[11px] text-white/50">Mostra launchpad completo (Writer OS, Bestseller OS…)</span>
              </span>
            </span>
            <input
              type="checkbox"
              checked={advancedEnabled}
              onChange={(e) => onToggleAdvanced(e.target.checked)}
              className="h-4 w-4 accent-sky-400"
            />
          </label>
          {isDevMode() && import.meta.env.DEV && (
            <p className="px-3 pb-2 text-[10px] text-amber-200/70">Dev build — strumenti extra visibili solo in sviluppo.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Settings;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5"
    >
      <Icon className="h-4 w-4 shrink-0 text-white/70" />
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint && <span className="text-[11px] text-white/50">{hint}</span>}
      </span>
    </button>
  );
}
