import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, BookOpen, Laptop, Search, Sparkles } from "lucide-react";

interface MobileDesktopStudioNoticeProps {
  featureName?: string;
}

export default function MobileDesktopStudioNotice({ featureName = "Publisher Pro" }: MobileDesktopStudioNoticeProps) {
  return (
    <main className="scriptora-page-scroll min-h-[100dvh] bg-background px-4 py-5 safe-area-pt safe-area-pb">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <div className="rounded-[28px] border border-white/12 bg-slate-950/92 p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-400/12 text-sky-100">
              <Laptop className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/75">Creator Studio Desktop</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">{featureName} vive meglio su PC o Mac.</h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/72">
            Le funzioni Publisher Pro sono disponibili nella versione desktop di Scriptora. I tuoi libri sono gia sincronizzati:
            puoi continuare da mobile e aprire gli strumenti avanzati dallo stesso account su desktop.
          </p>

          <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            {[
              ["Cover Studio Pro", Sparkles],
              ["KDP Launch", BarChart3],
              ["Bestseller Radar", Search],
              ["Title Domination", BookOpen],
              ["Market Intelligence", ArrowRight],
            ].map(([label, Icon]) => (
              <div key={String(label)} className="flex items-center gap-2 text-sm text-white/78">
                <Icon className="h-4 w-4 text-sky-200" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            <Link
              to="/dashboard"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-slate-950"
            >
              Torna a Mobile Lite
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm font-semibold text-white"
            >
              Apri Writer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
