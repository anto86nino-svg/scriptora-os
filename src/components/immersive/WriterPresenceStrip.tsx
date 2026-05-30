import { useEffect, useState } from "react";
import { Feather, BookOpen } from "lucide-react";
import type { BookProject } from "@/types/book";
import { AUTHOR_IDENTITY_CHANGED_EVENT } from "@/lib/author-identity";
import { ATMOSPHERE_CHANGE_EVENT } from "@/lib/atmosphere-engine";
import { getWriterPresenceSnapshot } from "@/lib/immersive/writer-presence";
import { t } from "@/lib/i18n";

type WriterPresenceStripProps = {
  project?: BookProject | null;
  className?: string;
};

export function WriterPresenceStrip({ project, className = "" }: WriterPresenceStripProps) {
  const [snap, setSnap] = useState(() => getWriterPresenceSnapshot(project));

  useEffect(() => {
    const refresh = () => setSnap(getWriterPresenceSnapshot(project));
    refresh();
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refresh);
    window.addEventListener(ATMOSPHERE_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener(ATMOSPHERE_CHANGE_EVENT, refresh);
    };
  }, [project]);

  return (
    <section
      className={`scriptora-writer-presence scriptora-premium-surface animate-scriptora-fade-in rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-5 ${className}`}
      aria-label={snap.greeting}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">{snap.greeting}</p>
          <p className="mt-1.5 flex items-start gap-2 text-sm leading-relaxed text-white/65">
            <Feather className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
            <span className="italic">{snap.quote}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2 sm:items-end">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            {t(snap.creative.labelKey)}
          </span>
          {snap.bookTitle && (
            <span className="flex max-w-[14rem] items-center gap-1.5 truncate text-xs font-medium text-white/85">
              <BookOpen className="h-3 w-3 shrink-0 text-primary/80" />
              {snap.bookTitle}
            </span>
          )}
          {snap.creative.progressLabel && (
            <span className="text-[11px] tabular-nums text-white/55">{snap.creative.progressLabel}</span>
          )}
        </div>
      </div>
    </section>
  );
}
