import type { RefObject } from "react";
import {
  BookOpen,
  Boxes,
  GraduationCap,
  Image,
  Library,
  LineChart,
  PackageCheck,
  Rocket,
} from "lucide-react";
import type { BookProject } from "@/types/book";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import type { HomeCreaChip } from "@/components/os/home/HomeCreaBlock";
import { HomeContinuaBlock } from "@/components/os/home/HomeContinuaBlock";
import { HomeLibriBlock } from "@/components/os/home/HomeLibriBlock";
import { HomeCreaBlock } from "@/components/os/home/HomeCreaBlock";
import { HomePubblicazioneBlock } from "@/components/os/home/HomePubblicazioneBlock";
import { getToolRoute } from "@/lib/one-flow/tool-registry";

export type HomeRebirthProps = {
  lastProject: BookProject | null | undefined;
  progressPercent: number;
  projects: BookProject[];
  dashboardActionContext: DashboardActionContext;
  packagingAnchorRef: RefObject<HTMLElement | null>;
  onContinue: () => void;
  onContinueProject: (projectId: string) => void;
  onNewBook: () => void;
  onMyBooks: () => void;
  onStartOneFlow: (idea: string, genreHint?: HomeCreaChip) => void;
};

export function HomeRebirth({
  lastProject,
  progressPercent,
  projects,
  dashboardActionContext,
  packagingAnchorRef,
  onContinue,
  onContinueProject,
  onNewBook,
  onMyBooks,
  onStartOneFlow,
}: HomeRebirthProps) {
  const productCards = [
    {
      title: "Continua a scrivere",
      subtitle: lastProject?.config?.title?.trim()
        ? `Riprendi ${lastProject.config.title.trim()} dal punto esatto in cui eri rimasto.`
        : "Riprendi il libro attivo o crea subito un nuovo progetto.",
      cta: lastProject ? "Apri Writer" : "Crea libro",
      icon: BookOpen,
      onClick: lastProject ? onContinue : onNewBook,
      accent: "from-emerald-400/18 to-lime-200/10",
    },
    {
      title: "Crea nuovo libro",
      subtitle: "Configura formato, genere, lettore, struttura e regole prima del blueprint.",
      cta: "Crea libro",
      icon: Rocket,
      onClick: onNewBook,
      accent: "from-lime-300/18 to-white/10",
    },
    {
      title: "I miei libri",
      subtitle: "Apri la libreria progetti, continua bozze e recupera libri già avviati.",
      cta: "Apri libreria",
      icon: Library,
      onClick: onMyBooks,
      accent: "from-stone-200/16 to-white/8",
    },
    {
      title: "Pubblicazione / Export",
      subtitle: "Controlla readiness, formato, esportazioni e passaggi finali del libro.",
      cta: "Apri Export",
      icon: PackageCheck,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("export")),
      accent: "from-amber-300/18 to-white/8",
    },
    {
      title: "KDP Launch",
      subtitle: "Prepara il libro per Amazon KDP: titolo, keyword, categorie, descrizione e readiness.",
      cta: "Apri KDP Launch",
      icon: Boxes,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("kdp")),
      accent: "from-orange-300/18 to-lime-200/8",
    },
    {
      title: "Market OS",
      subtitle: "Analizza mercato, nicchia, posizionamento e opportunità commerciali.",
      cta: "Apri Market OS",
      icon: LineChart,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("market-mobile")),
      accent: "from-sky-300/16 to-lime-200/8",
    },
    {
      title: "Cover Studio",
      subtitle: "Progetta copertina, direzione visiva e coerenza commerciale del libro.",
      cta: "Apri Cover Studio",
      icon: Image,
      onClick: dashboardActionContext.onOpenCover,
      accent: "from-fuchsia-300/14 to-lime-200/8",
    },
    {
      title: "Scriptora Study OS",
      subtitle: "Riassunti, quiz, flashcard, interrogazioni e attestati",
      cta: "Apri Study OS",
      icon: GraduationCap,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("study")),
      accent: "from-emerald-300/18 to-cyan-200/8",
    },
  ];

  return (
    <div className="space-y-5 overflow-hidden rounded-[2rem] border border-stone-200/70 bg-[linear-gradient(145deg,#f8faf5_0%,#f3f7ef_42%,#ffffff_100%)] p-3 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-5">
      <section className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(187,247,208,0.62),transparent_38%),linear-gradient(135deg,#0b0f0c_0%,#172016_48%,#f8faf5_220%)] p-5 text-white shadow-[0_22px_70px_rgba(15,23,42,0.22)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-lime-200/80">Scriptora OS</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Il tuo studio editoriale
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/68 sm:text-base">
              Crea, scrivi, prepara e pubblica libri da un&apos;unica dashboard pulita. Le tue scelte restano sempre al centro del libro.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewBook}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lime-200 px-5 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(190,242,100,0.22)] transition hover:-translate-y-0.5 hover:bg-lime-100 sm:w-auto"
          >
            <Rocket className="h-4 w-4" />
            Crea nuovo libro
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <HomeContinuaBlock
          project={lastProject}
          progressPercent={progressPercent}
          onContinue={onContinue}
          onNewBook={onNewBook}
        />
        <HomeCreaBlock onStartOneFlow={onStartOneFlow} />
      </div>

      <section aria-labelledby="home-products-title" className="rounded-[1.5rem] border border-stone-200 bg-white/88 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.07)] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700/70">Piattaforma</p>
            <h2 id="home-products-title" className="text-2xl font-black tracking-tight text-slate-950">
              Scegli cosa fare
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Un solo ecosistema, con strumenti separati e sempre raggiungibili.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {productCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className={`group flex min-h-[176px] w-full flex-col justify-between rounded-2xl border border-stone-200 bg-gradient-to-br ${card.accent} p-4 text-left shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-emerald-300/80 hover:shadow-[0_18px_44px_rgba(15,23,42,0.10)]`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white text-slate-900 shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-4 block">
                  <span className="block text-base font-black text-slate-950">{card.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{card.subtitle}</span>
                </span>
                <span className="mt-4 inline-flex items-center text-xs font-black uppercase tracking-[0.08em] text-emerald-800">
                  {card.cta}
                  <span className="ml-1 transition group-hover:translate-x-0.5">→</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeLibriBlock
          projects={projects}
          onOpenLibrary={onMyBooks}
          onContinueProject={onContinueProject}
        />
        <HomePubblicazioneBlock
          ref={packagingAnchorRef}
          projectTitle={lastProject?.config?.title}
          context={dashboardActionContext}
        />
      </div>
    </div>
  );
}
