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
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";
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
      accent: "from-amber-200/30 to-[#f4ead8]",
    },
    {
      title: "Crea nuovo libro",
      subtitle: "Configura formato, genere, lettore, struttura e regole prima del blueprint.",
      cta: "Crea libro",
      icon: Rocket,
      onClick: onNewBook,
      accent: "from-[#f2c400]/22 to-[#faf6ee]",
    },
    {
      title: "I miei libri",
      subtitle: "Apri la libreria progetti, continua bozze e recupera libri già avviati.",
      cta: "Apri libreria",
      icon: Library,
      onClick: onMyBooks,
      accent: "from-stone-300/24 to-[#f4ead8]",
    },
    {
      title: "Pubblicazione / Export",
      subtitle: "Controlla readiness, formato, esportazioni e passaggi finali del libro.",
      cta: "Apri Export",
      icon: PackageCheck,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("export")),
      accent: "from-amber-300/24 to-[#efe2cc]",
    },
    {
      title: "KDP Launch",
      subtitle: "Prepara il libro per Amazon KDP: titolo, keyword, categorie, descrizione e readiness.",
      cta: "Apri KDP Launch",
      icon: Boxes,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("kdp")),
      accent: "from-orange-300/20 to-[#f4ead8]",
    },
    {
      title: "Market OS",
      subtitle: "Analizza mercato, nicchia, posizionamento e opportunità commerciali.",
      cta: "Apri Market OS",
      icon: LineChart,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("market-mobile")),
      accent: "from-amber-200/18 to-[#faf6ee]",
    },
    {
      title: "Cover Studio",
      subtitle: "Progetta copertina, direzione visiva e coerenza commerciale del libro.",
      cta: "Apri Cover Studio",
      icon: Image,
      onClick: dashboardActionContext.onOpenCover,
      accent: "from-yellow-200/20 to-[#f4ead8]",
    },
    {
      title: "Scriptora Study OS",
      subtitle: "Riassunti, quiz, flashcard, interrogazioni e attestati",
      cta: "Apri Study OS",
      icon: GraduationCap,
      onClick: () => dashboardActionContext.onNavigate(getToolRoute("study")),
      accent: "from-amber-100/28 to-[#efe2cc]",
    },
  ];

  return (
    <div className="scriptora-home-surface space-y-5 overflow-hidden rounded-[2rem] p-3 sm:p-5">
      <section className="scriptora-home-hero rounded-[1.75rem] p-5 sm:p-7">
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <ScriptoraLogoMark size="xs" />
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#f2c400]/90">Scriptora OS</p>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#faf6ee] sm:text-5xl">
              Il tuo studio editoriale
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#f4ead8]/82 sm:text-base">
              Crea, scrivi, prepara e pubblica libri da un&apos;unica dashboard pulita. Le tue scelte restano sempre al centro del libro.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewBook}
            className="relative z-[1] inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f2c400] px-5 text-sm font-black text-[#1a1209] shadow-[0_18px_40px_rgba(242,196,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#ffe06a] sm:w-auto"
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

      <section aria-labelledby="home-products-title" className="scriptora-home-card rounded-[1.5rem] p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="scriptora-home-eyebrow">Piattaforma</p>
            <h2 id="home-products-title" className="text-2xl font-black tracking-tight text-[#1a1209]">
              Scegli cosa fare
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#5c4030]">
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
                className={`group flex min-h-[176px] w-full flex-col justify-between rounded-2xl border border-[#c9a87c]/35 bg-gradient-to-br ${card.accent} p-4 text-left shadow-[0_12px_34px_rgba(26,18,9,0.08)] transition hover:-translate-y-0.5 hover:border-[#f2c400]/45 hover:shadow-[0_18px_44px_rgba(26,18,9,0.12)]`}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#c9a87c]/30 bg-[#faf6ee] text-[#2c1810] shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-4 block">
                  <span className="block text-base font-black text-[#1a1209]">{card.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-[#5c4030]">{card.subtitle}</span>
                </span>
                <span className="mt-4 inline-flex items-center text-xs font-black uppercase tracking-[0.08em] text-[#8b5a2b]">
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
