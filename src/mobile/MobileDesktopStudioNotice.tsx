import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, BarChart3, BookOpen, Laptop, Search, Sparkles } from "lucide-react";
import { disableDesktopModeOverride, enableDesktopModeOverride } from "@/lib/mobile-performance";

interface MobileDesktopStudioNoticeProps {
  featureName?: string;
}

export default function MobileDesktopStudioNotice({ featureName = "Publisher Pro" }: MobileDesktopStudioNoticeProps) {
  const location = useLocation();
  const theme = useMemo(() => resolveModuleTheme(featureName), [featureName]);

  const continueInFullBrowser = () => {
    enableDesktopModeOverride();
    const url = new URL(window.location.href);
    url.pathname = location.pathname;
    url.searchParams.set("desktop", "1");
    window.location.assign(url.toString());
  };

  const returnMobileLite = () => {
    disableDesktopModeOverride();
  };

  return (
    <main className="scriptora-ios-screen scriptora-app-surface scriptora-page-scroll min-h-[100dvh] overflow-x-hidden px-4 py-5 safe-area-pt safe-area-pb">
      <section className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center">
        <div className={`rounded-[28px] border ${theme.border} bg-slate-950/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)]`}>
          <div className="flex items-start gap-3">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${theme.border} ${theme.bg} ${theme.text}`}>
              <Laptop className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${theme.muted}`}>{theme.label}</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">
                {featureName} rende meglio da desktop.
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-white/72">
            Puoi iniziare qui e continuare dal browser completo. I tuoi libri restano nello stesso account, senza cambiare progetto o perdere contesto.
          </p>

          <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            {theme.tools.map(([label, Icon]) => (
              <div key={String(label)} className="flex items-center gap-2 text-sm text-white/78">
                <Icon className={`h-4 w-4 ${theme.icon}`} />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={continueInFullBrowser}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-slate-950 ${theme.cta}`}
            >
              Continua da browser
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/dashboard"
              onClick={returnMobileLite}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm font-semibold text-white"
            >
              Torna a Mobile Lite
            </Link>
            <Link
              to="/app"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-semibold text-white/76"
            >
              Apri Writer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function resolveModuleTheme(featureName: string) {
  const lower = featureName.toLowerCase();
  if (/kdp|publishing|keyword/.test(lower)) {
    return {
      label: "Scriptora Publishing",
      border: "border-amber-300/25",
      bg: "bg-amber-400/12",
      text: "text-amber-100",
      muted: "text-amber-200/75",
      icon: "text-amber-200",
      cta: "bg-amber-300 hover:bg-amber-200",
      tools: [
        ["KDP Launch", BarChart3],
        ["Publishing Center", BookOpen],
        ["Keyword Gold", Search],
        ["Cover Studio", Sparkles],
      ] as const,
    };
  }
  if (/market|radar|title|bestseller/.test(lower)) {
    return {
      label: "Scriptora Market OS",
      border: "border-violet-300/25",
      bg: "bg-violet-400/12",
      text: "text-violet-100",
      muted: "text-violet-200/75",
      icon: "text-violet-200",
      cta: "bg-violet-300 hover:bg-violet-200",
      tools: [
        ["Bestseller Radar", BarChart3],
        ["Title Domination", BookOpen],
        ["Market Intelligence", Search],
        ["creazione libro", Sparkles],
      ] as const,
    };
  }
  if (/cover/.test(lower)) {
    return {
      label: "Scriptora Cover Studio",
      border: "border-fuchsia-300/25",
      bg: "bg-fuchsia-400/12",
      text: "text-fuchsia-100",
      muted: "text-fuchsia-200/75",
      icon: "text-fuchsia-200",
      cta: "bg-fuchsia-300 hover:bg-fuchsia-200",
      tools: [
        ["Cover Studio Pro", Sparkles],
        ["Anteprima KDP", BookOpen],
        ["Export", ArrowRight],
        ["Publishing", BarChart3],
      ] as const,
    };
  }
  return {
    label: "Scriptora Studio",
    border: "border-sky-300/25",
    bg: "bg-sky-400/12",
    text: "text-sky-100",
    muted: "text-sky-200/75",
    icon: "text-sky-200",
    cta: "bg-sky-300 hover:bg-sky-200",
    tools: [
      ["Writer Studio", BookOpen],
      ["Cover Studio", Sparkles],
      ["Bestseller Radar", Search],
      ["Market Intelligence", ArrowRight],
    ] as const,
  };
}
