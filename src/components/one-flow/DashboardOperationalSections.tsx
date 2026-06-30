import { lazy, Suspense, type ReactNode, type RefObject } from "react";
import {
  ArrowRight,
  BookOpen,
  FileDown,
  GraduationCap,
  ImagePlus,
  Plus,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react";
import { OsHomeHero } from "@/components/os/OsHomeHero";
import { DashboardContinueCard } from "@/components/projects/DashboardContinueCard";
import type { DashboardActionContext } from "@/lib/one-flow/dashboard-home-actions";
import { getToolRoute } from "@/lib/one-flow/tool-registry";
import type { BookProject } from "@/types/book";

const DashboardPackagingRow = lazy(() =>
  import("@/components/one-flow/DashboardPackagingRow").then((m) => ({ default: m.DashboardPackagingRow })),
);

type Props = {
  lastProject: BookProject | null | undefined;
  progressPercent: number;
  projects: BookProject[];
  dashboardActionContext: DashboardActionContext;
  packagingAnchorRef: RefObject<HTMLDivElement | null>;
  advancedToolsAnchorRef: RefObject<HTMLDivElement | null>;
  showAdvancedLaunchpad: boolean;
  onContinue: () => void;
  onContinueProject: (projectId: string) => void;
  onGenerateNextChapter: () => void;
  onExport: () => void;
  onNewBook: () => void;
  onMyBooks: () => void;
  onOpenCover: () => void;
  onStudyOs: () => void;
  onCharacterStudio: () => void;
  onOpenAdvancedTools: () => void;
  onOpenSettings: () => void;
  ideaBookCard: ReactNode;
};

function SectionShell({
  kicker,
  title,
  description,
  children,
  className = "",
}: {
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)] ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{kicker}</p>
      <h2 className="mt-1 text-lg font-black text-white">{title}</h2>
      {description ? <p className="mt-1 text-xs leading-5 text-white/55">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function QuickLinkButton({
  icon: Icon,
  label,
  onClick,
  accent = "default",
}: {
  icon: typeof BookOpen;
  label: string;
  onClick: () => void;
  accent?: "default" | "primary" | "amber" | "emerald";
}) {
  const accentClass =
    accent === "primary"
      ? "border-sky-300/30 bg-sky-400/12 text-white hover:bg-sky-400/18"
      : accent === "amber"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15"
        : accent === "emerald"
          ? "border-emerald-300/28 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/15"
          : "border-white/12 bg-white/[0.06] text-white/80 hover:bg-white/[0.10]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${accentClass}`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
    </button>
  );
}

export function DashboardOperationalSections({
  lastProject,
  progressPercent,
  projects,
  dashboardActionContext,
  packagingAnchorRef,
  advancedToolsAnchorRef,
  showAdvancedLaunchpad,
  onContinue,
  onContinueProject,
  onGenerateNextChapter,
  onExport,
  onNewBook,
  onMyBooks,
  onOpenCover,
  onStudyOs,
  onCharacterStudio,
  onOpenAdvancedTools,
  onOpenSettings,
  ideaBookCard,
}: Props) {
  return (
    <>
      <OsHomeHero
        lastProject={lastProject}
        progressPercent={progressPercent}
        onContinue={onContinue}
        onGenerateNextChapter={onGenerateNextChapter}
        onExport={onExport}
        onNewBook={onNewBook}
        onMyBooks={onMyBooks}
      />

      <div className="mb-4 grid gap-3 sm:mb-5 sm:grid-cols-2">
        <SectionShell
          kicker="Libreria"
          title="I miei libri"
          description="Apri, continua o gestisci i progetti salvati."
        >
          <QuickLinkButton icon={BookOpen} label="Apri libreria progetti" onClick={onMyBooks} accent="primary" />
        </SectionShell>

        <SectionShell
          kicker="Creazione"
          title="Crea nuovo libro"
          description="Avvia One Book Flow: configurazione, concept, blueprint e Writer."
        >
          <QuickLinkButton icon={Plus} label="Nuovo libro" onClick={onNewBook} accent="primary" />
        </SectionShell>
      </div>

      {ideaBookCard}

      <div ref={packagingAnchorRef}>
        <Suspense
          fallback={
            <div className="mb-4 rounded-2xl border border-amber-300/20 bg-black/28 p-4 text-sm text-white/55 sm:mb-6">
              Carico mercato e pubblicazione…
            </div>
          }
        >
          <DashboardPackagingRow
            projectTitle={lastProject?.config?.title}
            context={dashboardActionContext}
          />
        </Suspense>
      </div>

      <div className="mb-4 grid gap-3 sm:mb-5 lg:grid-cols-3">
        <SectionShell
          kicker="Design"
          title="Copertine"
          description="Cover Studio con il libro attivo."
        >
          <QuickLinkButton icon={ImagePlus} label="Apri Cover Studio" onClick={onOpenCover} accent="amber" />
        </SectionShell>

        <SectionShell
          kicker="Output"
          title="Esportazione"
          description="EPUB, DOCX e PDF da Export Studio."
        >
          <QuickLinkButton icon={FileDown} label="Vai a Export Studio" onClick={onExport} accent="amber" />
        </SectionShell>

        <SectionShell
          kicker="Formazione"
          title="Studio e formazione"
          description="Study OS: riassunti, quiz, flashcard e mappe."
        >
          <QuickLinkButton icon={GraduationCap} label="Apri Study OS" onClick={onStudyOs} accent="emerald" />
        </SectionShell>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardContinueCard
          projects={projects}
          lastProject={lastProject}
          onContinue={onContinueProject}
          onOpenProjects={onMyBooks}
        />

        <section ref={advancedToolsAnchorRef} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Strumenti avanzati</p>
              <h2 className="mt-1 text-lg font-black text-white">Console qualità</h2>
              <p className="mt-1 text-xs leading-5 text-white/55">
                Audit, continuità, mercato, Voice Studio e strumenti editoriali.
              </p>
            </div>
            <span className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-2 py-1 text-[10px] font-black text-sky-100">
              {showAdvancedLaunchpad ? "ON" : "READY"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-white/58">
            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">Audit</span>
            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">Voice</span>
            <span className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">Market</span>
          </div>
          <button
            type="button"
            onClick={onOpenAdvancedTools}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-white/80 transition-colors hover:bg-white/[0.10]"
          >
            <Wrench className="h-4 w-4" />
            Apri strumenti avanzati
          </button>
        </section>
      </div>

      <SectionShell
        kicker="Account"
        title="Impostazioni"
        description="Profilo autore, aspetto, crediti e preferenze."
        className="mb-4"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickLinkButton icon={Settings} label="Apri impostazioni" onClick={onOpenSettings} />
          <QuickLinkButton
            icon={Sparkles}
            label="Publishing Center"
            onClick={() => dashboardActionContext.onNavigate(getToolRoute("publishing"))}
            accent="amber"
          />
        </div>
      </SectionShell>
    </>
  );
}
