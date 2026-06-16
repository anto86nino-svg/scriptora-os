import { Download, Headphones, Settings, Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type WriterOverflowMenuProps = {
  open: boolean;
  onClose: () => void;
  onExport?: () => void;
  onVoice?: () => void;
  onSettings?: () => void;
  onCoach?: () => void;
  className?: string;
};

export function WriterOverflowMenu({
  open,
  onClose,
  onExport,
  onVoice,
  onSettings,
  onCoach,
  className,
}: WriterOverflowMenuProps) {
  if (!open) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-40" aria-label="Chiudi menu" onClick={onClose} />
      <div
        className={cn(
          "absolute right-3 top-[calc(100%+0.35rem)] z-50 min-w-[180px] rounded-xl border border-white/10 bg-[#0c0c12]/98 p-1.5 shadow-2xl backdrop-blur-xl",
          className,
        )}
      >
        {onExport && <MenuItem icon={Upload} label="Export" onClick={() => { onExport(); onClose(); }} />}
        {onVoice && <MenuItem icon={Headphones} label="Voice Studio" onClick={() => { onVoice(); onClose(); }} />}
        {onCoach && <MenuItem icon={Sparkles} label="AI Coach" onClick={() => { onCoach(); onClose(); }} />}
        {onSettings && <MenuItem icon={Settings} label="Impostazioni" onClick={() => { onSettings(); onClose(); }} />}
        <MenuItem icon={Download} label="Credits & piano" onClick={onClose} disabled />
      </div>
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Settings;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition enabled:hover:bg-white/[0.08] disabled:opacity-40"
    >
      <Icon className="h-4 w-4 shrink-0 text-white/50" />
      {label}
    </button>
  );
}
