import { BookOpen, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  author?: string;
  genre?: string;
  coverUrl?: string | null;
  onCover?: () => void;
  italianUi?: boolean;
  className?: string;
};

export function BlueprintBookIdentity({
  title,
  subtitle,
  author,
  genre,
  coverUrl,
  onCover,
  italianUi = true,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "blueprint-theater-identity glass-premium rounded-[1.75rem] border border-white/10 p-4 sm:p-5",
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
        {italianUi ? "Identità libro" : "Book identity"}
      </p>

      <div className="mt-4 flex gap-4">
        <button
          type="button"
          onClick={onCover}
          className="group relative h-[120px] w-[84px] shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-violet-500/20 to-cyan-500/10 shadow-lg transition hover:border-white/25"
          aria-label={italianUi ? "Copertina" : "Cover"}
        >
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/40">
              <BookOpen className="h-8 w-8" />
              <ImageIcon className="h-4 w-4 opacity-60" />
            </div>
          )}
          {onCover && (
            <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[9px] font-semibold text-white/80 opacity-0 transition group-hover:opacity-100">
              {italianUi ? "Cover" : "Cover"}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="line-clamp-3 text-xl font-bold leading-tight text-white sm:text-2xl">
            {title || (italianUi ? "Senza titolo" : "Untitled")}
          </h1>
          {subtitle && (
            <p className="line-clamp-2 text-sm italic leading-relaxed text-white/55">{subtitle}</p>
          )}
          {author && <p className="text-sm font-medium text-white/70">{author}</p>}
          {genre && (
            <span className="inline-flex rounded-full border border-violet-300/25 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-100">
              {genre}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
