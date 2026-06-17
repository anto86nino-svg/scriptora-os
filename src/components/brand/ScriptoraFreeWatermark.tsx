import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getScriptoraFreeUpgradeText,
  getScriptoraWatermarkText,
} from "@/lib/brand/scriptoraBrand";
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";

type ScriptoraFreeWatermarkProps = {
  language?: string | null;
  compact?: boolean;
  className?: string;
};

export function ScriptoraFreeWatermark({
  language,
  compact = false,
  className,
}: ScriptoraFreeWatermarkProps) {
  return (
    <aside
      className={cn(
        "mt-6 rounded-3xl border border-[#f2c400]/25 bg-[#050505]/88 p-4 text-[#f2c400] shadow-[0_18px_60px_rgba(0,0,0,0.28)]",
        "supports-[backdrop-filter]:bg-[#050505]/72 supports-[backdrop-filter]:backdrop-blur-xl",
        compact && "mt-4 rounded-2xl p-3",
        className,
      )}
      aria-label={getScriptoraWatermarkText(language)}
    >
      <div className="flex items-center gap-3">
        <ScriptoraLogoMark size={compact ? "xs" : "sm"} alt="Scriptora OS" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f2c400]">
            {getScriptoraWatermarkText(language)}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-[#f2c400]/68">
            {getScriptoraFreeUpgradeText(language)}
          </p>
        </div>
        <Crown className="hidden h-4 w-4 text-[#f2c400]/70 sm:block" aria-hidden="true" />
      </div>
    </aside>
  );
}
