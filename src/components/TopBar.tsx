import { useState } from "react";
import { BookConfig, Language, Genre, ChapterLength, BookLength, CATEGORIES, BOOK_LENGTH_CONFIG } from "@/types/book";
import { Download, Image, Loader2, FileText, FileType, Rocket, Home, Cloud, CloudOff, Lock, CreditCard, LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t } from "@/lib/i18n";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { usePlan, PLAN_LIMITS, useQuota } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PlanBadge } from "@/components/PlanBadge";
import { getWordBudget } from "@/lib/subscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { BookProject } from "@/types/book";

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

export function TopBar({ config, onUpdateConfig, isGenerating, hasProject, onExport, onExportDocx, onExportPdf, onCover, onPublish, isExporting, exportLabel, phase, syncStatus, projectId, project }: TopBarProps) {
  const { plan } = usePlan();
  const isFreePlan = plan === "free";
  const nav = useNavigate();
  const dev = isDevMode();
  // Honour dev-mode plan override (Free → no export, Beta/Pro/Premium → export).
  const canExport = PLAN_LIMITS[plan].canExport;
  const { quota } = useQuota(projectId || null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { user, signOut } = useAuth();
  const guard = (fn: () => void) => () => (canExport ? fn() : setShowUpgrade(true));
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

  return (
    <div className="ios-glass-soft mb-2 ml-12 flex h-14 shrink-0 items-center gap-2 overflow-x-auto rounded-lg px-3 md:ml-0">
      <button onClick={() => nav("/dashboard")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
        <Home className="h-3.5 w-3.5" /> {t("home")}
      </button>
      <button onClick={() => nav("/pricing")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground" title="Pricing">
        <CreditCard className="h-3.5 w-3.5" /> Pricing
      </button>
      <button onClick={() => nav("/downloads")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground" title="Downloads">
        <Download className="h-3.5 w-3.5" /> Downloads
      </button>
      <Divider />
      <MiniSelect label={t("lang")} value={config.language} options={LANGUAGES.map(l => ({ value: l, label: l }))} onChange={(v) => onUpdateConfig("language", v)} />
      <Divider />
      <MiniSelect label={t("genre")} value={config.genre} options={GENRES} onChange={(v) => onUpdateConfig("genre", v)} />
      <Divider />
      <MiniSelect label={t("book")} value={isFreePlan ? "short" : (config.bookLength || "medium")}
        options={isFreePlan ? [
          { value: "short", label: `${t("short")} (~10k) · Free` },
        ] : [
          { value: "short", label: `${t("short")} (~10k)` },
          { value: "medium", label: `${t("medium")} (~50k)` },
          { value: "long", label: `${t("long")} (~100k+)` },
        ]}
        onChange={(v) => {
          if (isFreePlan && v !== "short") return;
          onUpdateConfig("bookLength", isFreePlan ? "short" : v);
        }} />
      <Divider />
      <MiniSelect label={t("cat")} value={config.category || "Self Help"} options={categories.map(c => ({ value: c, label: c }))}
        onChange={(v) => { onUpdateConfig("category", v); onUpdateConfig("subcategory", CATEGORIES[v]?.[0] || ""); }} />
      <MiniSelect label="" value={config.subcategory || ""} options={subcategories.map(s => ({ value: s, label: s }))}
        onChange={(v) => onUpdateConfig("subcategory", v)} />
      <Divider />
      <MiniSelect label={t("ch_len")} value={config.chapterLength} options={LENGTHS.map(l => ({ ...l, label: t(l.value) }))} onChange={(v) => onUpdateConfig("chapterLength", v)} />
      <Divider />
      <div className="flex items-center gap-1">
        <span className="text-[10px] uppercase text-muted-foreground">{t("tone")}</span>
        <input value={config.tone} onChange={e => onUpdateConfig("tone", e.target.value)}
          className="h-8 w-28 rounded-lg border border-white/10 bg-white/[0.07] px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="warm, direct" />
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
            title={canExport ? "Export DOCX" : "Finish your book — unlock export"}
            className="ios-toolbar-button px-2.5 text-[11px] font-medium disabled:opacity-40">
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {!canExport ? "Unlock DOCX" : "DOCX"}
          </button>
          <button onClick={guard(onExportPdf)} disabled={isExporting || phase !== "complete"}
            title={canExport ? "Export PDF" : "Finish your book — unlock export"}
            className="ios-toolbar-button px-2.5 text-[11px] font-medium disabled:opacity-40">
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <FileType className="h-3 w-3" />}
            {!canExport ? "Unlock PDF" : "PDF"}
          </button>
          <button onClick={guard(onExport)} disabled={isExporting || phase !== "complete"}
            title={canExport ? "Export EPUB" : "Finish your book — unlock export"}
            className="flex h-[34px] items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:opacity-40">
            {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
            {!canExport ? "Unlock EPUB" : "EPUB"}
          </button>
          <button onClick={onPublish} disabled={phase !== "complete"}
            className="flex h-[34px] items-center gap-1 rounded-lg bg-accent px-2.5 text-[11px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40">
            <Rocket className="h-3 w-3" /> Publish
          </button>
        </div>
      )}
      <div className="ml-2 shrink-0">
        <PlanBadge tokensUsed={quota?.tokensUsed} />
      </div>
      {budget && (
        <div
          title={budget.exceeded ? "Limite parole raggiunto — passa a un piano superiore" : `${budget.used.toLocaleString()} / ${budget.max.toLocaleString()} parole`}
          className={`hidden md:flex items-center gap-1 ml-1 px-2 h-7 rounded-md border text-[10px] font-semibold tabular-nums shrink-0 ${budgetTone}`}
        >
          <span>{formatCount(budget.used)}</span>
          <span className="opacity-60">/</span>
          <span>{formatCount(budget.max)}</span>
          <span className="opacity-70 normal-case font-normal">words</span>
        </div>
      )}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
      {user && (
        <button
          onClick={async () => { await signOut(); toast.success("Disconnesso"); nav("/auth"); }}
          title={user.email || "Esci"}
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

function MiniSelect({ label, value, options, onChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {label && <span className="text-[10px] uppercase text-muted-foreground">{label}</span>}
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-8 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/[0.07] px-2 pr-5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 3px center' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
