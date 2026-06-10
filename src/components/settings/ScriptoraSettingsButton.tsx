import { Settings2 } from "lucide-react";

interface ScriptoraSettingsButtonProps {
  onClick: () => void;
  className?: string;
  title?: string;
}

export function ScriptoraSettingsButton({
  onClick,
  className = "",
  title = "Impostazioni Scriptora",
}: ScriptoraSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] text-white/75 transition-all hover:border-sky-400/35 hover:bg-sky-400/10 hover:text-sky-100 hover:shadow-[0_0_18px_rgba(56,189,248,0.22)] sm:h-9 sm:w-9 ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_70%)]" />
      <Settings2 className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
    </button>
  );
}
