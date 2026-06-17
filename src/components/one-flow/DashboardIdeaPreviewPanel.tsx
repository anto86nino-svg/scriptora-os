import {
  ArrowRight, Flame, Globe, Loader2, Sparkles, Wand2,
} from "lucide-react";
import {
  BOOK_LENGTH_CONFIG, BookLength, DEFAULT_SUBCHAPTERS_PER_CHAPTER,
} from "@/types/book";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { ONE_FLOW_TOOL_ROLES } from "@/lib/one-flow/one-flow-tool-roles";
import { t } from "@/lib/i18n";
import type { PlanTier } from "@/lib/plan";

export type DetectedIntent = {
  genre: string;
  subcategory: string;
  level: "beginner" | "intermediate" | "advanced";
  readerPromise: string;
  targetAudience: string;
  tone: string;
  numberOfChapters: number;
  suggestedTitles: string[];
  suggestedSubtitles: string[];
  bestTitleIndex: number;
};

const BOOK_LANGUAGES = [
  { value: "English", label: "🇬🇧 English" },
  { value: "Italian", label: "🇮🇹 Italiano" },
  { value: "Spanish", label: "🇪🇸 Español" },
  { value: "French", label: "🇫🇷 Français" },
  { value: "German", label: "🇩🇪 Deutsch" },
];

export type IdeaPreviewPanelProps = {
  idea: string;
  setIdea: (v: string) => void;
  briefTitle: string;
  setBriefTitle: (v: string) => void;
  briefSubtitle: string;
  setBriefSubtitle: (v: string) => void;
  bookLang: string;
  setBookLang: (v: string) => void;
  titleLang: string;
  setTitleLang: (v: string) => void;
  bookLength: BookLength;
  setBookLength: (v: BookLength) => void;
  customTotalWords: number;
  setCustomTotalWords: (v: number) => void;
  oneClickChapters: number;
  setOneClickChapters: (v: number) => void;
  oneClickSubchaptersEnabled: boolean;
  setOneClickSubchaptersEnabled: (v: boolean) => void;
  oneClickSubchaptersPerChapter: number;
  setOneClickSubchaptersPerChapter: (v: number) => void;
  intent: DetectedIntent | null;
  detecting: boolean;
  launching: boolean;
  currentPlan: PlanTier;
  heroValid: boolean;
  onDetectIntent: () => void;
  onLaunchOneClick: () => void;
  onOpenAdvancedForge: () => void;
  onClose: () => void;
};

export function DashboardIdeaPreviewPanel({
  idea,
  setIdea,
  briefTitle,
  setBriefTitle,
  briefSubtitle,
  setBriefSubtitle,
  bookLang,
  setBookLang,
  titleLang,
  setTitleLang,
  bookLength,
  setBookLength,
  customTotalWords,
  setCustomTotalWords,
  oneClickChapters,
  setOneClickChapters,
  oneClickSubchaptersEnabled,
  setOneClickSubchaptersEnabled,
  oneClickSubchaptersPerChapter,
  setOneClickSubchaptersPerChapter,
  intent,
  detecting,
  launching,
  currentPlan,
  heroValid,
  onDetectIntent,
  onLaunchOneClick,
  onOpenAdvancedForge,
}: IdeaPreviewPanelProps) {
  const busy = launching || detecting;

  return (
    <div>
      <p className="mb-3 text-[11px] text-muted-foreground">{ONE_FLOW_TOOL_ROLES.ideaPreview.it}</p>

      <label htmlFor="idea-modal" className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" /> {t("your_book_idea")}
      </label>
      <textarea
        id="idea-modal"
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder={t("book_idea_placeholder")}
        rows={3}
        autoFocus
        disabled={launching}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Titolo e sottotitolo reali
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={briefTitle}
            onChange={(e) => setBriefTitle(e.target.value)}
            placeholder="Titolo del libro"
            disabled={busy}
            className="h-9 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <input
            value={briefSubtitle}
            onChange={(e) => setBriefSubtitle(e.target.value)}
            placeholder="Sottotitolo / tagline"
            disabled={busy}
            className="h-9 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase text-muted-foreground">Lingua titolo</span>
          {BOOK_LANGUAGES.map((l) => (
            <button
              key={`title-${l.value}`}
              type="button"
              onClick={() => setTitleLang(l.value)}
              disabled={busy}
              className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                titleLang === l.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/[0.07] text-secondary-foreground hover:bg-white/[0.12]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <Globe className="h-3 w-3" /> {t("book_language_label")}
        </span>
        {BOOK_LANGUAGES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setBookLang(l.value)}
            disabled={busy}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
              bookLang === l.value
                ? "bg-primary text-primary-foreground"
                : "bg-white/[0.07] text-secondary-foreground hover:bg-white/[0.12]"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lunghezza libro</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.entries(BOOK_LENGTH_CONFIG) as [BookLength, typeof BOOK_LENGTH_CONFIG[BookLength]][]).map(([key, value]) => {
            const locked = currentPlan === "free" && key !== "short";
            return (
              <button
                key={key}
                type="button"
                disabled={busy || locked}
                onClick={() => setBookLength(key)}
                className={`rounded-lg border px-2.5 py-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  (currentPlan === "free" ? "short" : bookLength) === key
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.06] text-foreground hover:bg-white/[0.1]"
                }`}
              >
                <span className="block font-semibold">{value.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {key === "custom" ? "Custom" : `~${(value.totalWords / 1000).toFixed(0)}k parole`}
                </span>
              </button>
            );
          })}
        </div>
        {bookLength === "custom" && currentPlan !== "free" && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,120px]">
            <input
              type="range"
              min={5000}
              max={200000}
              step={1000}
              value={customTotalWords}
              onChange={(e) => setCustomTotalWords(Number(e.target.value) || 30000)}
              disabled={busy}
              className="w-full accent-primary"
            />
            <input
              type="number"
              min={1000}
              step={500}
              value={customTotalWords}
              onChange={(e) => setCustomTotalWords(Math.max(1000, Number(e.target.value) || 30000))}
              disabled={busy}
              className="h-8 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Struttura reale del libro</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wider">N° capitoli</label>
            <input
              type="number"
              min={3}
              max={50}
              value={oneClickChapters}
              onChange={(e) => setOneClickChapters(Math.max(3, Math.min(50, Number(e.target.value) || 10)))}
              disabled={busy}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div className="flex items-end">
            <label className="flex h-9 items-center gap-2 text-xs text-foreground/80">
              <input
                type="checkbox"
                checked={oneClickSubchaptersEnabled}
                onChange={(e) => setOneClickSubchaptersEnabled(e.target.checked)}
                disabled={busy}
                className="rounded border-border accent-primary"
              />
              Attiva sottocapitoli
            </label>
          </div>
        </div>
        {oneClickSubchaptersEnabled && (
          <div className="mt-2">
            <input
              type="number"
              min={1}
              max={8}
              value={oneClickSubchaptersPerChapter}
              onChange={(e) => setOneClickSubchaptersPerChapter(Math.max(1, Math.min(8, Number(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)))}
              disabled={busy}
              className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
        )}
      </div>

      {intent && (
        <div className="ios-glass-soft mt-3 space-y-2 rounded-lg p-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">{intent.genre}</span>
            {intent.subcategory && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">{intent.subcategory}</span>
            )}
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] capitalize text-secondary-foreground">{intent.level}</span>
            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
              {intent.numberOfChapters} {t("chapters").toLowerCase()}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("suggested_title")}</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {intent.suggestedTitles?.[intent.bestTitleIndex] || intent.suggestedTitles?.[0]}
            </p>
            <p className="mt-0.5 text-xs italic text-muted-foreground">
              {intent.suggestedSubtitles?.[intent.bestTitleIndex] || intent.suggestedSubtitles?.[0]}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold">{t("promise")}:</span> {intent.readerPromise}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <button
            type="button"
            onClick={onLaunchOneClick}
            disabled={!heroValid || busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
            {launching ? t("launching") : detecting ? t("detecting") : t("generate_full_book")}
          </button>
          <CreditCostBadge operation="auto_bestseller" prominent />
        </div>
        {!intent ? (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onDetectIntent}
              disabled={!heroValid || busy}
              className="ios-toolbar-button h-11 px-4 text-sm font-medium disabled:opacity-50"
            >
              <Wand2 className="h-3.5 w-3.5" /> {t("preview_action")}
            </button>
            <CreditCostBadge operation="market_intelligence" />
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenAdvancedForge}
            disabled={launching}
            className="ios-toolbar-button h-11 px-4 text-sm font-medium disabled:opacity-50"
          >
            {t("advanced")} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {!heroValid && (
        <p className="mt-2 text-[11px] text-muted-foreground">{t("min_idea_chars")}</p>
      )}
    </div>
  );
}
