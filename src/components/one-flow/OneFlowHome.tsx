import {
  BookOpen, FileSearch, Coins, UserRound, PenLine, ArrowRight, Sparkles,
  GraduationCap, Headphones, Wrench, Rocket,
} from "lucide-react";
import type { AuthorIdentity } from "@/types/book";
import { AuthorIdentityHomeCard } from "./AuthorIdentityHomeCard";

interface OneFlowHomeProps {
  authorIdentity: AuthorIdentity;
  lastProjectTitle?: string;
  lastProjectProgress?: number;
  onWriteBook: () => void;
  onStudyWithAI: () => void;
  onListenBook?: () => void;
  onContinue?: () => void;
  onMyBooks: () => void;
  onCoverStudio: () => void;
  onExportStudio: () => void;
  onAuthorConfigure: () => void;
  onAuthorGenerateAi: () => void;
  onAuthorEdit: () => void;
  onEvaluateManuscript: () => void;
  onCredits: () => void;
  onProfile: () => void;
  onAdvancedTools?: () => void;
  showAdvancedLaunchpad?: boolean;
}

export function OneFlowHome({
  authorIdentity,
  lastProjectTitle,
  lastProjectProgress = 0,
  onWriteBook,
  onStudyWithAI,
  onListenBook,
  onContinue,
  onMyBooks,
  onCoverStudio,
  onExportStudio,
  onAuthorConfigure,
  onAuthorGenerateAi,
  onAuthorEdit,
  onEvaluateManuscript,
  onCredits,
  onProfile,
  onAdvancedTools,
  showAdvancedLaunchpad = false,
}: OneFlowHomeProps) {
  return (
    <section className="mb-6 safe-area-pb">
      <AuthorIdentityHomeCard
        identity={authorIdentity}
        onConfigure={onAuthorConfigure}
        onGenerateWithAi={onAuthorGenerateAi}
        onEdit={onAuthorEdit}
      />

      <button
        type="button"
        onClick={onWriteBook}
        className="group mb-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-sky-400/30 bg-gradient-to-r from-sky-950/50 via-slate-900/50 to-sky-900/30 p-5 text-left shadow-[0_24px_80px_rgba(14,165,233,0.18)] transition-all hover:-translate-y-0.5 hover:border-sky-400/45 sm:p-6"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/80">Passo 2</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">🚀 Genera Bestseller</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/70">
            Dall&apos;idea al libro completo con One Flow OS, blueprint e generazione capitoli.
          </p>
        </div>
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-[0_16px_40px_rgba(14,165,233,0.35)] transition-transform group-hover:translate-x-0.5">
          <Rocket className="h-5 w-5 text-sky-600" />
        </span>
      </button>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StudioCard
          step="3"
          emoji="📚"
          title="I Miei Libri"
          subtitle="Progetti, progressi e ripresa scrittura"
          onClick={onMyBooks}
          accent="slate"
        />
        <StudioCard
          step="4"
          emoji="🎨"
          title="Cover Studio"
          subtitle="Copertine professionali in un click"
          onClick={onCoverStudio}
          accent="violet"
        />
        <StudioCard
          step="5"
          emoji="📦"
          title="Export Studio"
          subtitle="EPUB, PDF, DOCX e packaging KDP"
          onClick={onExportStudio}
          accent="amber"
        />
      </div>

      <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
        <Sparkles className="h-3 w-3 text-sky-300" /> Anche in Scriptora
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <PrimaryCard
          accent="sky"
          emoji="✍️"
          title="Scrivi libro"
          subtitle="Wizard One Flow: idea, personaggi, struttura e lancio."
          ctaLabel="Apri wizard"
          ctaIcon={PenLine}
          onClick={onWriteBook}
        />
        <PrimaryCard
          accent="emerald"
          emoji="🎓"
          title="Studia con AI"
          subtitle="Carica un libro, PDF o appunti e impara più velocemente."
          ctaLabel="Studia con AI"
          ctaIcon={GraduationCap}
          onClick={onStudyWithAI}
          badge="Beta Study Mode"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">6 · Strumenti avanzati</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {lastProjectTitle && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="col-span-2 flex flex-col items-start rounded-xl border border-sky-400/25 bg-sky-400/10 p-3 text-left transition-colors hover:bg-sky-400/16 sm:col-span-1"
            >
              <BookOpen className="h-4 w-4 text-sky-300" />
              <span className="mt-2 text-xs font-bold text-white">Continua progetto</span>
              <span className="mt-0.5 line-clamp-1 text-[10px] text-white/60">{lastProjectTitle}</span>
              <span className="text-[10px] tabular-nums text-sky-200/80">{lastProjectProgress}%</span>
            </button>
          )}
          {onListenBook && (
            <ActionChip icon={Headphones} label="Ascolta libro" onClick={onListenBook} accent="cyan" />
          )}
          <ActionChip icon={FileSearch} label="Valuta manoscritto" onClick={onEvaluateManuscript} />
          <ActionChip icon={Coins} label="Marketplace crediti" onClick={onCredits} />
          <ActionChip icon={UserRound} label="Profilo" onClick={onProfile} />
          {onAdvancedTools && !showAdvancedLaunchpad && (
            <ActionChip icon={Wrench} label="Launchpad OS" onClick={onAdvancedTools} accent="cyan" />
          )}
        </div>
      </div>
    </section>
  );
}

function StudioCard({
  step,
  emoji,
  title,
  subtitle,
  onClick,
  accent,
}: {
  step: string;
  emoji: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent: "slate" | "violet" | "amber";
}) {
  const accentClass = accent === "violet"
    ? "border-violet-400/25 bg-violet-400/10 hover:bg-violet-400/16"
    : accent === "amber"
      ? "border-amber-400/25 bg-amber-400/10 hover:bg-amber-400/16"
      : "border-white/12 bg-white/[0.06] hover:border-white/22 hover:bg-white/[0.10]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors ${accentClass}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">Passo {step}</span>
      <span className="mt-2 text-lg font-bold text-white">{emoji} {title}</span>
      <span className="mt-1 text-xs leading-5 text-white/60">{subtitle}</span>
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-white/80">
        Apri <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  );
}

function PrimaryCard({
  accent,
  emoji,
  title,
  subtitle,
  ctaLabel,
  ctaIcon: CtaIcon,
  onClick,
  badge,
}: {
  accent: "sky" | "emerald";
  emoji: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaIcon: typeof PenLine;
  onClick: () => void;
  badge?: string;
}) {
  const isSky = accent === "sky";
  const panelClass = isSky
    ? "border-white/15 bg-gradient-to-br from-slate-950/50 via-slate-900/40 to-sky-950/30"
    : "border-emerald-400/20 bg-gradient-to-br from-slate-950/50 via-emerald-950/25 to-slate-900/40";
  const badgeClass = isSky
    ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
    : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  const ctaClass = isSky
    ? "bg-white text-slate-950 shadow-[0_20px_50px_rgba(14,165,233,0.35)] hover:shadow-[0_28px_60px_rgba(14,165,233,0.45)]"
    : "bg-emerald-300 text-slate-950 shadow-[0_20px_50px_rgba(16,185,129,0.28)] hover:shadow-[0_28px_60px_rgba(16,185,129,0.38)]";
  const iconClass = isSky ? "text-sky-600" : "text-emerald-700";

  return (
    <div className={`ios-panel overflow-hidden border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8 ${panelClass}`}>
      {badge && (
        <p className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${badgeClass}`}>
          {badge}
        </p>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {emoji} {title}
      </h1>
      <p className="mt-3 max-w-md text-sm font-medium leading-6 text-white/72 sm:text-base">
        {subtitle}
      </p>
      <button
        type="button"
        onClick={onClick}
        className={`group mt-6 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl px-8 text-base font-bold transition-all hover:-translate-y-0.5 sm:w-auto ${ctaClass}`}
      >
        <CtaIcon className={`h-5 w-5 ${iconClass}`} />
        {ctaLabel}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: typeof BookOpen;
  label: string;
  onClick: () => void;
  accent?: "cyan";
}) {
  const accentClass = accent === "cyan"
    ? "border-cyan-400/25 bg-cyan-400/10 hover:bg-cyan-400/16"
    : "border-white/12 bg-white/[0.06] hover:border-white/22 hover:bg-white/[0.10]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${accentClass}`}
    >
      <Icon className="h-4 w-4 text-white/75" />
      <span className="mt-2 text-[11px] font-semibold leading-4 text-white">{label}</span>
    </button>
  );
}
