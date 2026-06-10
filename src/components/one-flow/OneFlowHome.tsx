import {
  BookOpen, FolderOpen, FileSearch, Coins, UserRound, PenLine, ArrowRight, Sparkles, GraduationCap, Headphones,
} from "lucide-react";

interface OneFlowHomeProps {
  lastProjectTitle?: string;
  lastProjectProgress?: number;
  onWriteBook: () => void;
  onStudyWithAI: () => void;
  onListenBook?: () => void;
  onContinue?: () => void;
  onMyBooks: () => void;
  onEvaluateManuscript: () => void;
  onCredits: () => void;
  onProfile: () => void;
}

export function OneFlowHome({
  lastProjectTitle,
  lastProjectProgress = 0,
  onWriteBook,
  onStudyWithAI,
  onListenBook,
  onContinue,
  onMyBooks,
  onEvaluateManuscript,
  onCredits,
  onProfile,
}: OneFlowHomeProps) {
  return (
    <section className="mb-6 safe-area-pb">
      <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
        <Sparkles className="h-3 w-3 text-sky-300" /> Scriptora — due modi di usare l&apos;AI
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <PrimaryCard
          accent="sky"
          emoji="✍️"
          title="Scrivi libro"
          subtitle="Dall'idea al bestseller. One Flow OS invariato."
          ctaLabel="Scrivi libro"
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

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
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
        <ActionChip icon={FolderOpen} label="I miei libri" onClick={onMyBooks} />
        <ActionChip icon={FileSearch} label="Valuta manoscritto" onClick={onEvaluateManuscript} />
        <ActionChip icon={Coins} label="Marketplace crediti" onClick={onCredits} />
        <ActionChip icon={UserRound} label="Profilo" onClick={onProfile} />
      </div>
    </section>
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
