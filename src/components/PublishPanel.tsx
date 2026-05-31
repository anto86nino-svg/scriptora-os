import { useState, useEffect, useRef } from "react";
import { BookProject, BookConfig, CATEGORIES, BOOK_LENGTH_CONFIG, Language, Genre, ChapterLength, BookLength, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import {
  X, Loader2, Sparkles, ChevronDown, ChevronRight, Settings2,
  BookOpen, Save, Edit3, Clock, Download, Rocket, Check, FilePlus
} from "lucide-react";
import { toast } from "sonner";
import { toastPremiumError } from "@/lib/premium-notices";
import { usePlan } from "@/lib/plan";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { useRequirementGate } from "@/hooks/useRequirementGate";

interface PublishPanelProps {
  project: BookProject | null;
  onClose: () => void;
  onStartFresh: (config: BookConfig) => void;
  onGenerateFullBook?: (onSectionFocus?: (s: any) => void) => Promise<void>;
  isBookGenerating?: boolean;
  onUpdateConfig?: (key: keyof BookConfig, value: any) => void;
  onUpdateChapterContent?: (chapterIndex: number, content: string) => void;
  onSaveProject?: () => Promise<void> | void;
  onExportEpub?: () => void;
  onExportPdf?: () => void;
  onExportDocx?: () => void;
}

const BLANK_CONFIG: BookConfig = {
  title: "",
  subtitle: "",
  language: "Italian",
  genre: "self-help",
  category: "Self Help",
  subcategory: "Mindset",
  bookLength: "medium",
  customTotalWords: 30000,
  chapterLength: "medium",
  numberOfChapters: 10,
  tone: "ispirante",
  authorStyle: "",
  audience: "",
  subchaptersEnabled: false,
  subchaptersPerChapter: DEFAULT_SUBCHAPTERS_PER_CHAPTER,
} as BookConfig;

export function PublishPanel({
  project, onClose, onStartFresh,
  onGenerateFullBook, isBookGenerating,
  onUpdateConfig, onUpdateChapterContent, onSaveProject,
  onExportEpub, onExportPdf, onExportDocx
}: PublishPanelProps) {
  const { plan } = usePlan();
  const { showRequirement, requirementDialog } = useRequirementGate();
  const isFreePlan = plan === "free";
  // Session-local: each Publish open starts fresh, ignoring previous projects
  const [sessionStarted, setSessionStarted] = useState(false);
  const [draftConfig, setDraftConfig] = useState<BookConfig>({ ...BLANK_CONFIG });

  const [showConfigWizard, setShowConfigWizard] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const isWorking = !!isBookGenerating;

  useEffect(() => {
    if (isWorking) {
      if (startTimeRef.current === null) startTimeRef.current = Date.now();
      const interval = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      startTimeRef.current = null;
      setElapsedSec(0);
    }
  }, [isWorking]);

  const handleStartFresh = () => {
    if (!draftConfig.title.trim()) {
      showRequirement("missing_book_title", {
        onPrimary: () => {
          document.querySelector<HTMLInputElement>("[data-publish-book-title]")?.focus();
        },
      });
      return;
    }
    onStartFresh(draftConfig);
    setSessionStarted(true);
    toast.success(`✨ Nuova sessione di scrittura: "${draftConfig.title}"`);
  };

  // ───── BLANK START SCREEN ─────
  if (!sessionStarted || !project) {
    return (
      <>
      <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-safe pt-safe">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
          <div className="px-5 py-4 border-b border-border shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FilePlus className="h-5 w-5 text-primary" />
                Nuova sessione di scrittura
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pagina rasa · nessun progetto precedente collegato
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Titolo del libro *</label>
              <input
                type="text" autoFocus value={draftConfig.title} data-publish-book-title
                onChange={(e) => setDraftConfig({ ...draftConfig, title: e.target.value })}
                placeholder="Es. Il potere del silenzio"
                className="w-full h-10 bg-background border border-border rounded px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Sottotitolo (opzionale)</label>
              <input
                type="text" value={draftConfig.subtitle || ""}
                onChange={(e) => setDraftConfig({ ...draftConfig, subtitle: e.target.value })}
                placeholder="Es. Una guida per ritrovare se stessi"
                className="w-full h-9 bg-background border border-border rounded px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ConfigSelect label="Lingua" value={draftConfig.language}
                onChange={(v) => setDraftConfig({ ...draftConfig, language: v as Language })}
                options={["English", "Italian", "Spanish", "French", "German"]} />
              <ConfigSelect label="Genere" value={draftConfig.genre}
                onChange={(v) => setDraftConfig({ ...draftConfig, genre: v as Genre })}
                options={["self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy", "business", "memoir"]} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ConfigSelect label="Categoria" value={draftConfig.category}
                onChange={(v) => {
                  const subs = CATEGORIES[v];
                  setDraftConfig({ ...draftConfig, category: v, subcategory: subs?.[0] || "" });
                }}
                options={Object.keys(CATEGORIES)} />
              <ConfigSelect label="Sottocategoria" value={draftConfig.subcategory}
                onChange={(v) => setDraftConfig({ ...draftConfig, subcategory: v })}
                options={CATEGORIES[draftConfig.category] || []} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ConfigSelect label="Lunghezza libro" value={isFreePlan ? "short" : draftConfig.bookLength}
                onChange={(v) => {
                  if (isFreePlan && v !== "short") return;
                  setDraftConfig({
                    ...draftConfig,
                    bookLength: isFreePlan ? "short" : v as BookLength,
                    customTotalWords: v === "custom" ? draftConfig.customTotalWords || 30000 : draftConfig.customTotalWords,
                  });
                }}
                options={isFreePlan ? ["short"] : ["short", "medium", "long", "custom"]}
                labels={{ short: "Breve ~10k · Free", medium: "Medio ~50k", long: "Lungo ~100k+", custom: "Custom" }} />
              <ConfigSelect label="Lunghezza capitolo" value={draftConfig.chapterLength}
                onChange={(v) => setDraftConfig({ ...draftConfig, chapterLength: v as ChapterLength })}
                options={["short", "medium", "long"]}
                labels={{ short: "Breve", medium: "Media", long: "Lunga" }} />
            </div>
            {draftConfig.bookLength === "custom" && !isFreePlan && (
              <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Parole totali</label>
                  <span className="text-xs font-semibold text-primary">{(draftConfig.customTotalWords || 30000).toLocaleString()}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr,120px]">
                  <input
                    type="range"
                    min={5000}
                    max={200000}
                    step={1000}
                    value={draftConfig.customTotalWords || 30000}
                    onChange={(e) => setDraftConfig({ ...draftConfig, customTotalWords: Number(e.target.value) || 30000 })}
                    className="w-full accent-primary"
                  />
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={draftConfig.customTotalWords || 30000}
                    onChange={(e) => setDraftConfig({ ...draftConfig, customTotalWords: Math.max(1000, Number(e.target.value) || 30000) })}
                    className="w-full h-9 bg-background border border-border rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">N° Capitoli</label>
                <input type="number" min={3} max={50} value={draftConfig.numberOfChapters}
                  onChange={(e) => setDraftConfig({ ...draftConfig, numberOfChapters: Math.max(3, Math.min(50, parseInt(e.target.value) || 3)) })}
                  className="w-full h-9 bg-background border border-border rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Tono</label>
                <input type="text" value={draftConfig.tone}
                  onChange={(e) => setDraftConfig({ ...draftConfig, tone: e.target.value })}
                  placeholder="es. ispirante, dark, ironico..."
                  className="w-full h-9 bg-background border border-border rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/80 pt-1">
              <input type="checkbox" checked={draftConfig.subchaptersEnabled}
                onChange={(e) => setDraftConfig({ ...draftConfig, subchaptersEnabled: e.target.checked })}
                className="rounded border-border" />
              Abilita sottocapitoli
            </label>
            {draftConfig.subchaptersEnabled && (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Sottocapitoli per capitolo</label>
                <div className="grid gap-2 sm:grid-cols-[1fr_110px] sm:items-center">
                  <p className="text-[11px] leading-4 text-muted-foreground">
                    Verranno generati come sezioni reali del libro, con titolo e contenuto coerenti.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={draftConfig.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER}
                    onChange={(e) => setDraftConfig({ ...draftConfig, subchaptersPerChapter: Math.max(1, Math.min(8, parseInt(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)) })}
                    className="w-full h-9 bg-background border border-border rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground italic pt-1">
              💡 Questa sessione è isolata: non userà né modificherà i progetti già salvati.
            </p>
          </div>

          <div className="px-5 py-4 border-t border-border shrink-0 flex items-center justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Annulla
            </button>
            <button onClick={handleStartFresh} disabled={!draftConfig.title.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-primary via-purple-500 to-amber-500 text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 shadow-lg">
              <Sparkles className="h-4 w-4" />
              Avvia sessione
            </button>
          </div>
        </div>
      </div>
      {requirementDialog}
      </>
    );
  }

  // ───── ACTIVE PUBLISH SESSION (project is the freshly-created blank one) ─────
  const completedChaptersLive = project.chapters?.filter(c => c.content && c.content.length > 50).length || 0;
  const totalChaptersTarget = project.config.numberOfChapters || project.chapters?.length || 1;
  const bookProgress = Math.min(100, Math.round((completedChaptersLive / totalChaptersTarget) * 100));
  const remainingChapters = Math.max(0, totalChaptersTarget - completedChaptersLive);
  const estimatedRemainingSec = remainingChapters * 45;
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const handleSaveProject = async () => {
    setIsSaving(true);
    try {
      if (onSaveProject) await onSaveProject();
      toast.success("💾 Progetto salvato! Pronto per esportazione.");
    } catch (e: any) {
      toastPremiumError(e?.message, "scriptora_error_generic");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWriteFullBook = async () => {
    if (!onGenerateFullBook || isWorking) return;
    toast.info(`📖 Scrittura "${project.config.title || "libro"}" iniziata...`);
    try {
      await onGenerateFullBook();
      toast.success("✅ Libro completo! Apri l'anteprima per modificare.");
      setShowPreview(true);
    } catch (e: any) {
      toastPremiumError(e?.message, "toast_gen_failed");
    }
  };

  const bookComplete = project.phase === "complete";

  return (
    <>
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pb-safe pt-safe">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-border shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">📖 Scrittura libro</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                <span className="font-semibold text-foreground/70">{project.config.title || "Senza titolo"}</span>
                {" · "}
                <span className="italic text-primary/70">sessione isolata</span>
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {onUpdateConfig && (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
              <button
                onClick={() => setShowConfigWizard(!showConfigWizard)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Settings2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-foreground truncate">⚙️ Configurazione di questo libro</span>
                </div>
                {showConfigWizard ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </button>
              {!showConfigWizard && (
                <div className="px-3 pb-2 -mt-1 flex flex-wrap gap-1.5">
                  <ConfigChip label={project.config.language} />
                  <ConfigChip label={project.config.genre} />
                  <ConfigChip label={`${project.config.numberOfChapters} cap.`} />
                  <ConfigChip label={BOOK_LENGTH_CONFIG[project.config.bookLength]?.label || project.config.bookLength} />
                  <ConfigChip label={project.config.tone} />
                  {project.config.subchaptersEnabled && <ConfigChip label={`${project.config.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER} sottocap./cap.`} />}
                </div>
              )}
              {showConfigWizard && (
                <div className="p-3 space-y-2.5 border-t border-border/50">
                  <div className="grid grid-cols-2 gap-2">
                    <ConfigSelect label="Lingua" value={project.config.language} onChange={(v) => onUpdateConfig("language", v as Language)}
                      options={["English", "Italian", "Spanish", "French", "German"]} />
                    <ConfigSelect label="Genere" value={project.config.genre} onChange={(v) => onUpdateConfig("genre", v as Genre)}
                      options={["self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy", "business", "memoir"]} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ConfigSelect label="Categoria" value={project.config.category} onChange={(v) => { onUpdateConfig("category", v); const subs = CATEGORIES[v]; if (subs?.[0]) onUpdateConfig("subcategory", subs[0]); }}
                      options={Object.keys(CATEGORIES)} />
                    <ConfigSelect label="Sottocategoria" value={project.config.subcategory} onChange={(v) => onUpdateConfig("subcategory", v)}
                      options={CATEGORIES[project.config.category] || []} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ConfigSelect label="Lunghezza libro" value={isFreePlan ? "short" : project.config.bookLength} onChange={(v) => {
                      if (isFreePlan && v !== "short") return;
                      onUpdateConfig("bookLength", isFreePlan ? "short" : v as BookLength);
                      if (v === "custom" && !project.config.customTotalWords) onUpdateConfig("customTotalWords", 30000);
                    }}
                      options={isFreePlan ? ["short"] : ["short", "medium", "long", "custom"]} labels={{ short: "Breve ~10k · Free", medium: "Medio ~50k", long: "Lungo ~100k+", custom: "Custom" }} />
                    <ConfigSelect label="Lunghezza capitolo" value={project.config.chapterLength} onChange={(v) => onUpdateConfig("chapterLength", v as ChapterLength)}
                      options={["short", "medium", "long"]} labels={{ short: "Breve", medium: "Media", long: "Lunga" }} />
                  </div>
                  {project.config.bookLength === "custom" && !isFreePlan && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Parole totali</label>
                        <span className="text-xs font-semibold text-primary">{(project.config.customTotalWords || 30000).toLocaleString()}</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr,120px]">
                        <input
                          type="range"
                          min={5000}
                          max={200000}
                          step={1000}
                          value={project.config.customTotalWords || 30000}
                          onChange={(e) => onUpdateConfig("customTotalWords", Number(e.target.value) || 30000)}
                          className="w-full accent-primary"
                        />
                        <input
                          type="number"
                          min={1000}
                          step={500}
                          value={project.config.customTotalWords || 30000}
                          onChange={(e) => onUpdateConfig("customTotalWords", Math.max(1000, Number(e.target.value) || 30000))}
                          className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">N° Capitoli</label>
                      <input type="number" min={3} max={50} value={project.config.numberOfChapters}
                        onChange={(e) => onUpdateConfig("numberOfChapters", Math.max(3, Math.min(50, parseInt(e.target.value) || 3)))}
                        className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Tono</label>
                      <input type="text" value={project.config.tone} onChange={(e) => onUpdateConfig("tone", e.target.value)}
                        placeholder="es. ispirante, dark, ironico..."
                        className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground/80">
                    <input type="checkbox" checked={project.config.subchaptersEnabled}
                      onChange={(e) => onUpdateConfig("subchaptersEnabled", e.target.checked)}
                      className="rounded border-border" />
                    Abilita sottocapitoli
                  </label>
                  {project.config.subchaptersEnabled && (
                    <div className="rounded-lg border border-border/70 bg-background/40 p-3">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Sottocapitoli per capitolo</label>
                      <div className="grid gap-2 sm:grid-cols-[1fr_100px] sm:items-center">
                        <p className="text-[11px] leading-4 text-muted-foreground">
                          Numero usato da blueprint e generazione reale prima del back matter.
                        </p>
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={project.config.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER}
                          onChange={(e) => onUpdateConfig("subchaptersPerChapter", Math.max(1, Math.min(8, parseInt(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)))}
                          className="w-full h-8 bg-background border border-border rounded px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isWorking && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  {bookProgress}% — {completedChaptersLive}/{totalChaptersTarget} cap.
                </span>
                <span className="flex items-center gap-1 text-muted-foreground tabular-nums text-[11px]">
                  <Clock className="h-3 w-3" /> {fmtTime(elapsedSec)}
                  {remainingChapters > 0 && <span className="opacity-60">· ~{fmtTime(estimatedRemainingSec)} rim.</span>}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-purple-500 to-amber-500 transition-all duration-500"
                  style={{ width: `${bookProgress}%` }}
                />
              </div>
            </div>
          )}

          {onGenerateFullBook && (
            <button
              onClick={handleWriteFullBook}
              disabled={isWorking}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-primary via-purple-500 to-amber-500 text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
            >
              {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {isWorking ? "Scrittura in corso..." : "🚀 Scrivi libro reale completo"}
            </button>
          )}

          <button
            onClick={() => setShowPreview(true)}
            disabled={completedChaptersLive === 0}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-card border border-primary/40 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
          >
            <Edit3 className="h-3.5 w-3.5" />
            👁️ Anteprima & Modifica capitoli
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveProject}
              disabled={isSaving || isWorking}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              💾 Salva progetto
            </button>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={onExportEpub} disabled={!onExportEpub || completedChaptersLive === 0}
                className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border transition-colors disabled:opacity-40"
                title="Esporta EPUB"><Download className="h-3 w-3" />EPUB</button>
              <button onClick={onExportPdf} disabled={!onExportPdf || completedChaptersLive === 0}
                className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border transition-colors disabled:opacity-40"
                title="Esporta PDF"><Download className="h-3 w-3" />PDF</button>
              <button onClick={onExportDocx} disabled={!onExportDocx || completedChaptersLive === 0}
                className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[10px] font-semibold bg-muted/50 hover:bg-muted text-foreground border border-border transition-colors disabled:opacity-40"
                title="Esporta DOCX"><Download className="h-3 w-3" />DOCX</button>
            </div>
          </div>
        </div>

        {showPreview && (
          <BookPreviewModal
            project={project}
            onClose={() => { setShowPreview(false); setEditingChapter(null); }}
            editingChapter={editingChapter}
            setEditingChapter={setEditingChapter}
            onUpdateChapterContent={onUpdateChapterContent}
            onSave={handleSaveProject}
            isSaving={isSaving}
          />
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Stato del libro
            </h3>
            <div className="space-y-1.5">
              <StatusRow done={!!project.blueprint} label="Blueprint generata" />
              <StatusRow done={!!project.frontMatter} label="Front matter pronto" />
              <StatusRow done={completedChaptersLive > 0} label={`Capitoli scritti (${completedChaptersLive}/${totalChaptersTarget})`} />
              <StatusRow done={!!project.backMatter} label="Back matter pronto" />
              <StatusRow done={bookComplete} label="Libro completo" />
            </div>
            {bookComplete && (
              <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <span className="text-xs font-medium text-green-300">
                  Libro pronto! Salva e esporta sopra.
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              📣 Guida pubblicazione (separata)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quando il libro è scritto, la pubblicazione su KDP richiede:
              <strong className="text-foreground/80"> titoli ottimizzati, descrizione, keyword, BISAC, copertina</strong>.
              Questi strumenti sono in una sezione separata, fuori dal flusso di scrittura.
            </p>
          </div>
        </div>
      </div>
    </div>
    {requirementDialog}
    </>
  );
}

/* ── Sub-components ── */

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${done ? "bg-green-500/20 border-green-500/40" : "border-border"}`}>
        {done && <Check className="h-3 w-3 text-green-400" />}
      </div>
      <span className={`text-xs ${done ? "text-foreground/80" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

function ConfigChip({ label }: { label: string }) {
  return <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/20 capitalize">{label}</span>;
}

function ConfigSelect({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 bg-background border border-border rounded px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
        {options.map(opt => <option key={opt} value={opt}>{labels?.[opt] || opt}</option>)}
      </select>
    </div>
  );
}

/* ── Book Preview Modal with inline edit ── */
function BookPreviewModal({
  project, onClose, editingChapter, setEditingChapter, onUpdateChapterContent, onSave, isSaving
}: {
  project: BookProject;
  onClose: () => void;
  editingChapter: number | null;
  setEditingChapter: (i: number | null) => void;
  onUpdateChapterContent?: (chapterIndex: number, content: string) => void;
  onSave: () => Promise<void> | void;
  isSaving: boolean;
}) {
  const chapters = project.chapters || [];
  const wordCount = chapters.reduce((acc, c) => acc + (c.content?.split(/\s+/).filter(Boolean).length || 0), 0);

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 pb-safe pt-safe sm:p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col">
        <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground truncate">📖 {project.config.title || "Untitled"}</h3>
            <p className="text-[11px] text-muted-foreground">
              {chapters.filter(c => c.content).length}/{chapters.length} capitoli · {wordCount.toLocaleString()} parole
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salva
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {project.frontMatter && (
            <div className="border-b border-border/50 pb-4">
              <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest mb-2">Front Matter</h4>
              {project.frontMatter.dedication && <p className="text-sm text-foreground/80 italic mb-2">{project.frontMatter.dedication}</p>}
              {project.frontMatter.letterToReader && <p className="text-sm text-foreground/70 whitespace-pre-line line-clamp-6">{project.frontMatter.letterToReader}</p>}
            </div>
          )}

          {chapters.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Nessun capitolo ancora generato.</p>
          )}
          {chapters.map((ch, i) => (
            <div key={`stable-${i}`} className="border border-border/50 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between border-b border-border/50">
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-foreground truncate">
                    {formatChapterDisplayTitle(i, ch.title, {
                      config: project.config,
                      summary: project.blueprint?.chapterOutlines?.[i]?.summary,
                      totalChapters: project.config.numberOfChapters,
                    })}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{ch.content?.split(/\s+/).filter(Boolean).length || 0} parole</p>
                </div>
                <button
                  onClick={() => setEditingChapter(editingChapter === i ? null : i)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0 ml-2"
                >
                  {editingChapter === i ? "Chiudi" : "Modifica"}
                </button>
              </div>
              {editingChapter === i && onUpdateChapterContent ? (
                <textarea
                  value={ch.content || ""}
                  onChange={(e) => onUpdateChapterContent(i, e.target.value)}
                  className="w-full min-h-[300px] p-4 bg-background text-sm text-foreground font-serif leading-relaxed focus:outline-none resize-y"
                />
              ) : (
                <div className="p-4 text-sm text-foreground/80 whitespace-pre-wrap font-serif leading-relaxed max-h-[400px] overflow-y-auto">
                  {ch.content || <span className="italic text-muted-foreground">Vuoto</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
