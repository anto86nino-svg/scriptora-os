import { useEffect, useState, type ReactNode } from "react";
import { BookConfig, Language, Genre, ChapterLength, BookLength, CATEGORIES, BOOK_LENGTH_CONFIG, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { Download, Image, Loader2, FileText, FileType, Rocket, Home, Cloud, CloudOff, Lock, CreditCard, LogOut, Fingerprint } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { t, tt, useUILanguage } from "@/lib/i18n";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { usePlan, PLAN_LIMITS, useQuota } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PlanBadge } from "@/components/PlanBadge";
import { getWordBudget } from "@/lib/subscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { BookProject } from "@/types/book";
import { AUTHOR_IDENTITY_CHANGED_EVENT, findAuthorIdentity, getSelectedAuthorIdentity, loadAuthorIdentities, normalizeAuthorIdentity, setSelectedAuthorIdentityId, applyAuthorIdentityToConfig, enforceAuthorIdentityLock } from "@/lib/author-identity";
import { FocusMusicControl } from "@/components/FocusMusicControl";
import { GuidedTourTriggerButton } from "@/components/GuidedTourTriggerButton";
import { GUIDED_TOUR_IDS } from "@/lib/guided-tour-events";

interface TopBarProps {
  config: BookConfig | null;
  onUpdateConfig: (key: keyof BookConfig, value: any) => void;
  isGenerating: boolean;
  hasProject: boolean;
  onExport: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onCover: () => void;
  onPublish: () => void;
  isExporting: boolean;
  exportLabel?: string;
  phase: string;
  syncStatus?: SyncStatus;
  projectId?: string | null;
  project?: BookProject | null;
}

const LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];
const GENRES: { value: Genre; label: string }[] = [
  { value: "self-help", label: "Self-Help" },
  { value: "romance", label: "Romance" },
  { value: "dark-romance", label: "Dark Romance" },
  { value: "thriller", label: "Thriller" },
  { value: "fantasy", label: "Fantasy" },
  { value: "philosophy", label: "Philosophy" },
  { value: "business", label: "Business" },
  { value: "memoir", label: "Memoir" },
];
const LENGTHS: { value: ChapterLength; label: string }[] = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export function TopBar({
   config, onUpdateConfig, isGenerating, hasProject, onExport, onExportDocx, onExportPdf, onCover, onPublish, isExporting, exportLabel, phase, syncStatus, projectId, project }: TopBarProps) {

  const location = useLocation();

  const isFocusMode =
    location.pathname.includes("/app") ||
    location.pathname.includes("editor") ||
    location.pathname.includes("book") ||
    location.pathname.includes("writer");

  if (isFocusMode) {
    return null;
  }


  useUILanguage();
  const { plan } = usePlan();
  const isFreePlan = plan === "free";
  const nav = useNavigate();
  const dev = isDevMode();
  // Honour dev-mode plan override (Free → no export, Beta/Pro/Premium → export).
  const canExport = PLAN_LIMITS[plan].canExport;
  const { quota } = useQuota(projectId || null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user, signOut } = useAuth();
  const [authorIdentities, setAuthorIdentities] = useState(() => loadAuthorIdentities());
  const guard = (fn: () => void) => () => (canExport ? fn() : setShowUpgrade(true));

  useEffect(() => {
    const refreshAuthors = () => setAuthorIdentities(loadAuthorIdentities());
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthors);
    window.addEventListener("storage", refreshAuthors);
    return () => {
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthors);
      window.removeEventListener("storage", refreshAuthors);
    };
  }, []);

  if (!config) return null;

  const budget = project ? getWordBudget(plan, project) : null;
  const budgetTone = !budget ? "" : budget.exceeded ? "bg-destructive/15 text-destructive border-destructive/40" :
    budget.percent >= 85 ? "bg-amber-500/15 text-amber-500 border-amber-500/40" :
    "bg-muted/40 text-muted-foreground border-border";
  const syncTone = syncStatus === "offline"
    ? "border-red-500/20 bg-red-500/10"
    : syncStatus === "saving"
      ? "border-amber-500/20 bg-amber-500/10"
      : syncStatus === "pending"
        ? "border-sky-500/20 bg-sky-500/10"
      : "border-emerald-500/20 bg-emerald-500/10";

  const categories = Object.keys(CATEGORIES);
  const subcategories = CATEGORIES[config.category] || [];
  const selectedAuthor =
    normalizeAuthorIdentity(config.authorIdentity) ||
    findAuthorIdentity(config.authorIdentityId) ||
    getSelectedAuthorIdentity();

  const changeProjectAuthor = (id: string) => {
    const identity = authorIdentities.find((item) => item.id === id);
    if (!identity || !config) return;
    const normalized = normalizeAuthorIdentity(identity);
    if (!normalized) return;
    const locked = enforceAuthorIdentityLock(
      applyAuthorIdentityToConfig({ ...config, authorStyle: config.authorStyle || normalized.archetype || config.authorStyle }, normalized),
    );
    setSelectedAuthorIdentityId(normalized.id);
    onUpdateConfig("authorIdentityId", locked.authorIdentityId || normalized.id);
    onUpdateConfig("authorIdentity", locked.authorIdentity);
    onUpdateConfig("authorIdentityLock", locked.authorIdentityLock);
    onUpdateConfig("authorName", normalized.penName);
    onUpdateConfig("author", normalized.penName);
    onUpdateConfig("writerName", normalized.penName);
    toast.success(tt("author_identity_selected", { name: normalized.penName }));
  };

  return (
    <div className="ios-glass-soft mb-2 ml-12 flex h-14 shrink-0 items-center gap-2 overflow-x-auto rounded-lg px-3 md:ml-0">
      <button onClick={() => nav("/dashboard")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
        <Home className="h-3.5 w-3.5" /> {t("home")}
      </button>
      <GuidedTourTriggerButton tourId={GUIDED_TOUR_IDS.writer} compact />
      <button onClick={() => nav("/pricing")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground" title={t("pricing")}>
        <CreditCard className="h-3.5 w-3.5" /> {t("pricing")}
      </button>
      <button onClick={() => nav("/downloads")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground" title={t("install_app_hint")}>
        <Download className="h-3.5 w-3.5" /> {t("install_app")}
      </button>
      <Divider />
      <MiniSelect label={t("lang")} value={config.language} options={LANGUAGES.map(l => ({ value: l, label: l }))} onChange={(v) => onUpdateConfig("language", v)} />
      <Divider />
      <MiniSelect
        label={t("author_identity")}
        value={selectedAuthor.id}
        icon={<Fingerprint className="h-3 w-3 text-sky-300" />}
        options={authorIdentities.map((identity) => ({ value: identity.id, label: identity.penName }))}
        onChange={changeProjectAuthor}
      />
      <FocusMusicControl />
      <Divider />
      <MiniSelect label={t("genre")} value={config.genre} options={GENRES} onChange={(v) => onUpdateConfig("genre", v)} />
      <Divider />
      <MiniSelect label={t("book")} value={isFreePlan ? "short" : (config.bookLength || "medium")}
        options={isFreePlan ? [
          { value: "short", label: `${t("short")} (~10k) · ${t("free")}` },
        ] : [
          { value: "short", label: `${t("short")} (~10k)` },
          { value: "medium", label: `${t("medium")} (~50k)` },
          { value: "long", label: `${t("long")} (~100k+)` },
          { value: "custom", label: `Custom (${(config.customTotalWords || 30000).toLocaleString()})` },
        ]}
        onChange={(v) => {
          if (isFreePlan && v !== "short") return;
          onUpdateConfig("bookLength", isFreePlan ? "short" : v);
          if (v === "custom" && !config.customTotalWords) onUpdateConfig("customTotalWords", 30000);
        }} />
      <Divider />
      <MiniSelect label={t("cat")} value={config.category || "Self Help"} options={categories.map(c => ({ value: c, label: c }))}
        onChange={(v) => { onUpdateConfig("category", v); onUpdateConfig("subcategory", CATEGORIES[v]?.[0] || ""); }} />
      <MiniSelect label="" value={config.subcategory || ""} options={subcategories.map(s => ({ value: s, label: s }))}
        onChange={(v) => onUpdateConfig("subcategory", v)} />
      <Divider />
      <MiniSelect label={t("ch_len")} value={config.chapterLength} options={LENGTHS.map(l => ({ ...l, label: t(l.value) }))} onChange={(v) => onUpdateConfig("chapterLength", v)} />
      <MiniSelect
        label="cap."
        value={String(config.numberOfChapters || 10)}
        options={Array.from({ length: 48 }, (_, i) => {
          const value = String(i + 3);
          return { value, label: value };
        })}
        onChange={(v) => onUpdateConfig("numberOfChapters", Math.max(3, Math.min(50, Number(v) || 10)))}
      />
      <MiniSelect
        label="sub"
        value={config.subchaptersEnabled ? String(config.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER) : "off"}
        options={[
          { value: "off", label: "Off" },
          ...Array.from({ length: 8 }, (_, i) => {
            const value = String(i + 1);
            return { value, label: value };
          }),
        ]}
        onChange={(v) => {
          if (v === "off") {
            onUpdateConfig("subchaptersEnabled", false);
            return;
          }
          onUpdateConfig("subchaptersEnabled", true);
          onUpdateConfig("subchaptersPerChapter", Math.max(1, Math.min(8, Number(v) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)));
        }}
      />
      <Divider />
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase text-muted-foreground">{t("tone")}</span>
        <input value={config.tone} onChange={e => onUpdateConfig("tone", e.target.value)}
          className="h-8 w-28 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder={t("tone_placeholder")} />
      </div>

      <div className="flex-1" />

      {/* Sync Status */}
      {syncStatus && (
        <div
          className={`mr-1 flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 ${syncTone}`}
          title={
            syncStatus === "offline"
              ? t("sync_offline")
              : syncStatus === "pending"
                ? t("sync_pending")
                : syncStatus === "saving"
                  ? t("sync_saving")
                  : t("sync_saved")
          }
        >
          {syncStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
              <span className="text-[10px] font-semibold text-amber-500">{t("sync_saving")}</span>
            </>
          )}
          {syncStatus === "pending" && (
            <>
              <Cloud className="h-3 w-3 text-sky-500" />
              <span className="text-[10px] font-semibold text-sky-500">{t("sync_pending")}</span>
            </>
          )}
          {(syncStatus === "saved" || syncStatus === "idle") && (
            <>
              <Cloud className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-500">{t("sync_saved")}</span>
            </>
          )}
          {syncStatus === "offline" && (
            <>
              <CloudOff className="h-3 w-3 text-red-500" />
              <span className="text-[10px] font-semibold text-red-500">{t("sync_offline")}</span>
            </>
          )}
        </div>
      )}

      {hasProject && (
        <div className="flex items-center gap-1.5 shrink-0">
          {isGenerating && (
        <div className="mr-1 flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span className="text-[10px] text-primary font-medium">{t("generating")}</span>
            </div>
          )}
          <button onClick={onCover}
            className="ios-toolbar-button px-2.5 text-[11px] font-medium">
            <Image className="h-3 w-3" /> {t("cover")}
          </button>
          <button onClick={guard(onExportDocx)} disabled={isExporting || phase !== "complete"}
            title={canExport ? tt("export_format_title", { format: "DOCX" }) : t("export_locked_title")}
            className="ios-toolbar-button px-2.5 text-[11px] font-medium disabled:opacity-40">
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {!canExport ? tt("unlock_format", { format: "DOCX" }) : "DOCX"}
          </button>
          <button onClick={guard(onExportPdf)} disabled={isExporting || phase !== "complete"}
            title={canExport ? tt("export_format_title", { format: "PDF" }) : t("export_locked_title")}
            className="ios-toolbar-button px-2.5 text-[11px] font-medium disabled:opacity-40">
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <FileType className="h-3 w-3" />}
            {!canExport ? tt("unlock_format", { format: "PDF" }) : "PDF"}
          </button>
          <button onClick={guard(onExport)} disabled={isExporting || phase !== "complete"}
            title={canExport ? tt("export_format_title", { format: "EPUB" }) : t("export_locked_title")}
            className="flex h-[34px] items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:opacity-40">
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
            {!canExport ? tt("unlock_format", { format: "EPUB" }) : "EPUB"}
          </button>
          <button onClick={onPublish} disabled={phase !== "complete"}
            className="flex h-[34px] items-center gap-1 rounded-lg bg-accent px-2.5 text-[11px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40">
            <Rocket className="h-3 w-3" /> {t("publish")}
          </button>
        </div>
      )}
      <div className="ml-2 shrink-0">
        <PlanBadge tokensUsed={quota?.tokensUsed} />
      </div>
      {budget && (
        <div
          title={budget.exceeded ? t("word_limit_reached") : `${budget.used.toLocaleString()} / ${budget.max.toLocaleString()} ${t("words_unit")}`}
          className={`hidden md:flex items-center gap-1 ml-1 px-2 h-7 rounded-md border text-[10px] font-semibold tabular-nums shrink-0 ${budgetTone}`}
        >
          <span>{formatCount(budget.used)}</span>
          <span className="opacity-60">/</span>
          <span>{formatCount(budget.max)}</span>
          <span className="opacity-70 normal-case font-normal">{t("words_unit")}</span>
        </div>
      )}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
      {user && (
        <button
          onClick={async () => { await signOut(); toast.success(t("toast_signed_out")); nav("/auth"); }}
          title={user.email || t("sign_out")}
          className="ios-toolbar-button ml-1 shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

function Divider() {
  return <div className="h-6 w-px shrink-0 bg-white/10" />;
}

function MiniSelect({ label, value, options, onChange, icon }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; icon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {icon}
      {label && <span className="text-[10px] uppercase text-muted-foreground">{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.07] px-2 pr-5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 3px center' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
