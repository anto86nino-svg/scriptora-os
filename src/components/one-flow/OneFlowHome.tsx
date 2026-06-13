import { useState } from "react";
import {
  BookOpen, FileSearch, Coins, UserRound, PenLine, ArrowRight, Sparkles,
  GraduationCap, Headphones, Wrench, Rocket, ChevronDown, ImagePlus, Package, Users,
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
  onCharacterStudio?: () => void;
  onKdpLaunch?: () => void;
  onTitleDomination?: () => void;
  onCredits: () => void;
  onProfile: () => void;
  onAdvancedTools?: () => void;
  showAdvancedLaunchpad?: boolean;
  onAutoBestsellerShortcut?: () => void;
  onOpenBestseller?: () => void;
  onOpenWriter?: () => void;
  onOpenPublishing?: () => void;
  onOpenIdentity?: () => void;
  compact?: boolean;
  /** Su mobile l'identità autore viene mostrata sotto l'hero dalla dashboard. */
  hideAuthorIdentityOnMobile?: boolean;
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
  onCharacterStudio,
  onKdpLaunch,
  onTitleDomination,
  onCredits,
  onProfile,
  onAdvancedTools,
  showAdvancedLaunchpad = false,
  onAutoBestsellerShortcut,
  onOpenBestseller,
  onOpenWriter,
  onOpenPublishing,
  onOpenIdentity,
  compact = true,
  hideAuthorIdentityOnMobile = true,
}: OneFlowHomeProps) {
  const [showMoreTools, setShowMoreTools] = useState(false);

  return (
    <section className={`safe-area-pb ${compact ? "mb-3" : "mb-6"}`}>
      <AuthorIdentityHomeCard
        className={hideAuthorIdentityOnMobile ? "hidden md:block" : undefined}
        identity={authorIdentity}
        onConfigure={onAuthorConfigure}
        onGenerateWithAi={onAuthorGenerateAi}
        onEdit={onAuthorEdit}
      />

      <div className={`mb-3 grid gap-3 ${compact ? "lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.85fr)]" : "lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]"}`}>
        <button
          type="button"
          onClick={onWriteBook}
          className={`group flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-gradient-to-r from-sky-950/55 via-slate-900/55 to-sky-900/30 text-left shadow-[0_20px_60px_rgba(14,165,233,0.16)] transition-all hover:-translate-y-0.5 hover:border-sky-400/45 ${compact ? "p-3.5 sm:p-4" : "p-5 sm:p-6"}`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/80">Percorso principale</p>
            <h2 className={`mt-1 font-bold tracking-tight text-white ${compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}>✍️ Inizia il tuo libro</h2>
            <p className={`mt-1 max-w-lg leading-6 text-white/72 ${compact ? "text-xs sm:text-sm" : "mt-2 text-sm"}`}>
              Dal primo capitolo alla pubblicazione. Scriptora ti guida tra idea, blueprint, capitoli, cover, KDP ed export.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/64">
              20 decisioni guidate · nessun campo lasciato al caso
            </span>
          </div>
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-[0_16px_40px_rgba(14,165,233,0.35)] transition-transform group-hover:translate-x-0.5">
            <Rocket className="h-5 w-5 text-sky-600" />
          </span>
        </button>

        <button
          type="button"
          onClick={onStudyWithAI}
          className={`group flex w-full items-center justify-between gap-3 rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-950/40 via-slate-900/48 to-slate-950/40 text-left shadow-[0_18px_52px_rgba(16,185,129,0.12)] transition-all hover:-translate-y-0.5 hover:border-emerald-300/45 ${compact ? "p-3.5 sm:p-4" : "p-5 sm:p-6"}`}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">Seconda pelle</p>
            <h2 className={`mt-1 font-bold tracking-tight text-white ${compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>🎓 Scriptora Study OS</h2>
            <p className={`mt-1 max-w-md leading-6 text-white/68 ${compact ? "text-xs sm:text-sm" : "mt-2 text-sm"}`}>
              Carica libri, PDF e appunti. Riassunti, quiz, flashcard e spiegazioni in pochi secondi.
            </p>
          </div>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-slate-950 shadow-[0_14px_36px_rgba(16,185,129,0.25)] transition-transform group-hover:translate-x-0.5">
            <GraduationCap className="h-5 w-5 text-emerald-800" />
          </span>
        </button>
      </div>

      <div className={`hidden gap-2 md:grid sm:grid-cols-3 lg:grid-cols-4 ${compact ? "mb-3" : "mb-4 gap-3"}`}>
        <StudioCard
          step="3"
          emoji="📚"
          title="I Miei Libri"
          subtitle="Progetti, progressi e ripresa scrittura"
          onClick={onMyBooks}
          accent="slate"
        />
        {onCharacterStudio && (
          <StudioCard
            step="4"
            emoji="👥"
            title="Character Studio"
            subtitle="Voci, ferite, ruoli e coerenza dei personaggi"
            onClick={onCharacterStudio}
            accent="slate"
          />
        )}
        <StudioCard
          step="5"
          emoji="🎨"
          title="Cover Studio"
          subtitle="Copertine professionali in un click"
          onClick={onCoverStudio}
          accent="violet"
        />
        <StudioCard
          step="6"
          emoji="📦"
          title="Export Studio"
          subtitle="EPUB, PDF, DOCX e packaging KDP"
          onClick={onExportStudio}
          accent="amber"
        />
      </div>

      <div className={`mb-3 grid grid-cols-2 gap-2 md:hidden ${compact ? "" : "gap-3"}`}>
        <EssentialToolCard icon={PenLine} label="Writer Studio" onClick={onOpenWriter || onContinue || onWriteBook} accent="cyan" />
        <EssentialToolCard icon={UserRound} label="Identità autore" onClick={onOpenIdentity || onAuthorConfigure} />
        {onCharacterStudio && <EssentialToolCard icon={Users} label="Character Studio" onClick={onCharacterStudio} />}
        <EssentialToolCard icon={FileSearch} label="Diagnostica" onClick={onEvaluateManuscript} />
        {onKdpLaunch && <EssentialToolCard icon={Rocket} label="KDP Market" onClick={onKdpLaunch} accent="amber" />}
        <EssentialToolCard icon={ImagePlus} label="Cover Studio" onClick={onCoverStudio} accent="violet" />
        <EssentialToolCard icon={Package} label="Export Studio" onClick={onExportStudio} accent="amber" />
      </div>

      <div className="mb-3 md:hidden">
        <button
          type="button"
          onClick={() => setShowMoreTools((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2.5 text-left text-xs font-semibold text-white/80"
        >
          <span>Altri strumenti</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showMoreTools ? "rotate-180" : ""}`} />
        </button>
        {showMoreTools && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ActionChip icon={BookOpen} label="I miei libri" onClick={onMyBooks} />
            <ActionChip icon={Wrench} label="Publishing" onClick={onOpenPublishing || onExportStudio} />
            {onTitleDomination && <ActionChip icon={Sparkles} label="Title Domination" onClick={onTitleDomination} />}
            {(onAutoBestsellerShortcut || onOpenBestseller) && (
              <ActionChip
                icon={Rocket}
                label="Auto Bestseller"
                onClick={onAutoBestsellerShortcut || onOpenBestseller!}
              />
            )}
            {onListenBook && <ActionChip icon={Headphones} label="Ascolta" onClick={onListenBook} />}
            {onOpenIdentity && <ActionChip icon={UserRound} label="Identità" onClick={onOpenIdentity} />}
          </div>
        )}
      </div>

      <div className={`hidden gap-2 md:grid ${compact ? "grid-cols-2 sm:grid-cols-4" : "gap-3 sm:grid-cols-2 lg:grid-cols-4"}`}>
        <ActionChip icon={PenLine} label="Writer Studio" onClick={onOpenWriter || onContinue || onWriteBook} accent="cyan" />
        <ActionChip icon={UserRound} label="Identità" onClick={onOpenIdentity || onAuthorConfigure} />
        {onCharacterStudio && <ActionChip icon={Users} label="Character Studio" onClick={onCharacterStudio} />}
        <ActionChip icon={FileSearch} label="Diagnostica" onClick={onEvaluateManuscript} />
        {onKdpLaunch && <ActionChip icon={Rocket} label="KDP Market" onClick={onKdpLaunch} />}
        {onTitleDomination && <ActionChip icon={Sparkles} label="Title Domination" onClick={onTitleDomination} />}
        <ActionChip icon={Wrench} label="Publishing" onClick={onOpenPublishing || onExportStudio} />
        {(onAutoBestsellerShortcut || onOpenBestseller) && (
          <ActionChip
            icon={Rocket}
            label="Auto Bestseller"
            onClick={onAutoBestsellerShortcut || onOpenBestseller!}
          />
        )}
        {onListenBook && <ActionChip icon={Headphones} label="Ascolta" onClick={onListenBook} />}
      </div>

      {!compact && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PrimaryCard accent="sky" emoji="✍️" title="Scrivi libro" subtitle="Wizard One Flow." ctaLabel="Apri wizard" ctaIcon={PenLine} onClick={onWriteBook} />
          <PrimaryCard accent="emerald" emoji="🎓" title="Studia con AI" subtitle="PDF, EPUB, appunti." ctaLabel="Studia con AI" ctaIcon={GraduationCap} onClick={onStudyWithAI} badge="Beta" />
        </div>
      )}

      {showAdvancedLaunchpad && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ActionChip icon={FileSearch} label="Valuta MS" onClick={onEvaluateManuscript} />
          <ActionChip icon={Coins} label="Crediti" onClick={onCredits} />
          <ActionChip icon={UserRound} label="Profilo" onClick={onProfile} />
          {onAdvancedTools && <ActionChip icon={Wrench} label="Launchpad" onClick={onAdvancedTools} />}
        </div>
      )}
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
      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors sm:rounded-2xl sm:p-4 ${accentClass}`}
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

function EssentialToolCard({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: typeof BookOpen;
  label: string;
  onClick: () => void;
  accent?: "cyan" | "violet" | "amber";
}) {
  const accentClass = accent === "cyan"
    ? "border-cyan-400/25 bg-cyan-400/10"
    : accent === "violet"
      ? "border-violet-400/25 bg-violet-400/10"
      : accent === "amber"
        ? "border-amber-400/25 bg-amber-400/10"
        : "border-white/12 bg-white/[0.06]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[88px] flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors hover:bg-white/[0.10] ${accentClass}`}
    >
      <Icon className="h-4 w-4 text-white/80" />
      <span className="text-[12px] font-semibold leading-4 text-white">{label}</span>
    </button>
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
