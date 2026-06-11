import type { BookConfig } from "@/types/book";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { cn } from "@/lib/utils";

const FAMILY_STYLES: Record<string, string> = {
  narrative: "border-violet-400/35 bg-violet-400/12 text-violet-100",
  nonfiction: "border-emerald-400/35 bg-emerald-400/12 text-emerald-100",
  educational: "border-sky-400/35 bg-sky-400/12 text-sky-100",
  manual: "border-amber-400/35 bg-amber-400/12 text-amber-100",
  cookbook: "border-orange-400/35 bg-orange-400/12 text-orange-100",
  poetry: "border-rose-400/35 bg-rose-400/12 text-rose-100",
};

const STYLE_LABELS: Record<string, string> = {
  narrative: "Narrativa",
  lesson: "Lezione",
  recipe: "Ricetta",
  reference: "Riferimento",
  workflow: "Workflow",
  poetry: "Poesia",
};

interface BookTypeBadgeProps {
  config: Partial<BookConfig>;
  className?: string;
  compact?: boolean;
}

export function BookTypeBadge({ config, className, compact }: BookTypeBadgeProps) {
  if (!config.genre) return null;

  const def = resolveBookTypeDefinition(
    config.genre,
    config.subcategory,
    config.subgenre,
    config.bookTypeId,
  );
  const style = FAMILY_STYLES[def.family] || FAMILY_STYLES.narrative;
  const chapterStyle = STYLE_LABELS[def.chapterStyle] || def.chapterStyle;

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide",
        style,
        className,
      )}
      title={`${def.label} · ${def.family}`}
    >
      <span className="uppercase">{def.label}</span>
      {!compact && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-medium normal-case opacity-85">
            {config.numberOfChapters || "?"} cap
          </span>
          <span className="opacity-40">·</span>
          <span className="font-medium normal-case opacity-75">{chapterStyle}</span>
        </>
      )}
    </div>
  );
}

export function getBookTypeLabel(config: Partial<BookConfig>): string {
  if (!config.genre) return "";
  return resolveBookTypeDefinition(
    config.genre,
    config.subcategory,
    config.subgenre,
    config.bookTypeId,
  ).label;
}
