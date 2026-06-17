import { cn } from "@/lib/utils";
import { SCRIPTORA_LOGO_SRC } from "@/lib/brand/scriptoraBrand";

type ScriptoraLogoMarkProps = {
  size?: "xs" | "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  imageClassName?: string;
  alt?: string;
};

const sizeClasses = {
  xs: "h-6 w-6 rounded-lg",
  sm: "h-8 w-8 rounded-xl",
  md: "h-10 w-10 rounded-2xl",
  lg: "h-14 w-14 rounded-3xl",
};

export function ScriptoraLogoMark({
  size = "sm",
  showText = false,
  className,
  imageClassName,
  alt = "Scriptora OS",
}: ScriptoraLogoMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden bg-[#f2c400] shadow-[0_0_22px_rgba(242,196,0,0.22)] ring-1 ring-black/10",
          sizeClasses[size],
        )}
      >
        <img
          src={SCRIPTORA_LOGO_SRC}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
        />
      </span>
      {showText && (
        <span className="text-xs font-black uppercase tracking-[0.22em] text-[#f2c400]">
          Scriptora
        </span>
      )}
    </span>
  );
}
