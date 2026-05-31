import { useState, useMemo, useEffect, useRef, useCallback, forwardRef } from "react";
import { SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/components/CharacterStudioDialog";
import { NewBookGuidedFlow } from "@/components/NewBookGuidedFlow";
import { GuidedTourTriggerButton } from "@/components/GuidedTourTriggerButton";
import { GUIDED_TOUR_IDS } from "@/lib/guided-tour-events";
import { BookConfig, Language, Genre, ChapterLength, BookLength, CATEGORIES, BOOK_LENGTH_CONFIG, AuthorIdentity, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { BookOpen, X, Sparkles, PenTool, UserRound, Save, Fingerprint, PlusCircle, Trash2, RefreshCw } from "lucide-react";
import { t, tt } from "@/lib/i18n";
import { getGenreBlueprint } from "@/lib/genre-intelligence";
import { getStylesForGenre, type WritingStylePreset } from "@/lib/writing-styles";
import { usePlan } from "@/lib/plan";
import { DEFAULT_AUTHOR_IDENTITIES, deleteAuthorIdentity, getSelectedAuthorIdentity, isDeletableAuthorIdentity, loadAuthorIdentities, normalizeAuthorIdentity, saveAuthorIdentity, setSelectedAuthorIdentityId } from "@/lib/author-identity";
import { ensureBookTitleMetadata, generateShadowTitleSet } from "@/lib/title-shadow";
import { toast } from "sonner";
import { useScriptoraModalScrollLock } from "@/lib/viewport-safe";

interface NewBookDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: BookConfig) => void;
  initialConfig?: BookConfig | null;
  reconfigureMode?: boolean;
}

const LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];
function normalizeCharacterStudioGenre(value?: string): Genre {
  const g = String(value || "").toLowerCase().trim();

  if (g.includes("dark") && g.includes("romance")) return "dark-romance";
  if (g.includes("romance") || g.includes("romantasy")) return "romance";
  if (g.includes("thriller") || g.includes("crime") || g.includes("mystery") || g.includes("suspense") || g.includes("noir")) return "thriller";
  if (g.includes("fantasy")) return "fantasy";
  if (g.includes("horror")) return "horror";
  if (g.includes("sci") || g.includes("cyberpunk") || g.includes("dystop")) return "sci-fi";
  if (g.includes("historical") || g.includes("storico")) return "historical";
  if (g.includes("memoir")) return "memoir";

  return "romance";
}

function normalizeCharacterStudioLanguage(value?: string): Language {
  const l = String(value || "").toLowerCase().trim();
  if (l.includes("ital")) return "Italian";
  if (l.includes("span")) return "Spanish";
  if (l.includes("french") || l.includes("franc")) return "French";
  if (l.includes("german") || l.includes("ted")) return "German";
  return "English";
}

function titleFromCharacterIdea(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/\s+/g, " ")
    .slice(0, 70)
    .replace(/[,.!?;:]?\s+[^\s]*$/, "")
    .trim();
}

function looksLikePlotInsteadOfTitle(value?: string): boolean {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return true;
  return clean.length > 78 || (clean.length > 48 && /[,.;:]/.test(clean));
}

const GENRES: { value: Genre; label: string; group: string }[] = [
  { value: "self-help", label: "Self-Help", group: "Non-Fiction" },
  { value: "business", label: "Business", group: "Non-Fiction" },
  { value: "philosophy", label: "Philosophy", group: "Non-Fiction" },
  { value: "memoir", label: "Memoir", group: "Non-Fiction" },
  { value: "biography", label: "Biografia", group: "Non-Fiction" },
  { value: "spirituality", label: "Spiritualità", group: "Non-Fiction" },
  { value: "romance", label: "Romance", group: "Fiction" },
  { value: "dark-romance", label: "Dark Romance", group: "Fiction" },
  { value: "thriller", label: "Thriller", group: "Fiction" },
  { value: "fantasy", label: "Fantasy", group: "Fiction" },
  { value: "horror", label: "Horror", group: "Fiction" },
  { value: "sci-fi", label: "Sci-Fi", group: "Fiction" },
  { value: "historical", label: "Storico", group: "Fiction" },
  { value: "children", label: "Libri per Bambini", group: "Creativi" },
  { value: "fairy-tale", label: "Favole", group: "Creativi" },
  { value: "poetry", label: "Poesie", group: "Creativi" },
  { value: "jokes", label: "Barzellette", group: "Creativi" },
  { value: "cookbook", label: "Cookbook", group: "Practical" },
  { value: "manual", label: "Manuale (generico)", group: "Practical" },
  { value: "technical-manual", label: "Manuale Tecnico", group: "Practical" },
  { value: "software-guide", label: "Guida Software", group: "Practical" },
  { value: "ai-tools-guide", label: "Guida AI Tools", group: "Practical" },
  { value: "gardening", label: "Giardinaggio", group: "Practical" },
  { value: "beekeeping", label: "Apicoltura", group: "Practical" },
  { value: "health-medicine", label: "Salute & Medicina", group: "Practical" },
  { value: "diet-nutrition", label: "Dieta & Nutrizione", group: "Practical" },
  { value: "fitness", label: "Fitness", group: "Practical" },
  { value: "productivity", label: "Produttività", group: "Practical" },
  { value: "education", label: "Education", group: "Practical" },
];

export function NewBookDialog({ open, onClose, onSubmit, initialConfig, reconfigureMode = false }: NewBookDialogProps) {
  useScriptoraModalScrollLock(open);
  const { plan } = usePlan();
  const isFreePlan = plan === "free";
  const [pendingCharacterProject, setPendingCharacterProject] = useState<any | null>(null);
  const [titleDominationRound, setTitleDominationRound] = useState(0);
  const [titleLanguage, setTitleLanguage] = useState<Language>("English");
  const initialAuthorIdentity = getSelectedAuthorIdentity();

  useEffect(() => {
    if (!open) return;

    if (initialConfig) {
      setConfig({ ...initialConfig });
      setTitleLanguage(initialConfig.titleLanguage || initialConfig.language || "English");
      return;
    }

    try {
      const raw = sessionStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY) || localStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
      const pending = raw ? JSON.parse(raw) : null;
      setPendingCharacterProject(pending);

      if (pending?.characterBible) {
        const nextGenre = normalizeCharacterStudioGenre(pending.genre);
        const nextLanguage = normalizeCharacterStudioLanguage(pending.language);
        const nextTitleLanguage = normalizeCharacterStudioLanguage(pending.titleLanguage || pending.language);
        const nextSubcategory = String(pending.subcategory || "").trim();
        const nextTone = String(pending.tone || "").trim();
        setTitleLanguage(nextTitleLanguage);
        const titleOptions = generateShadowTitleSet({
          idea: pending.idea,
          genre: nextGenre,
          category: "Fiction",
          subcategory: nextSubcategory,
          targetAudience: nextTone,
          language: nextLanguage,
          titleLanguage: nextTitleLanguage,
          characterBible: pending.characterBible,
          manualCharacterNames: pending.manualCharacterNames,
          seed: Date.now(),
        }, 8);
        const bestTitle = titleOptions[0];

        setConfig(prev => ({
          ...prev,
          title: !prev.title || looksLikePlotInsteadOfTitle(prev.title) ? (bestTitle?.title || titleFromCharacterIdea(pending.idea) || "Romanzo senza titolo") : prev.title,
          subtitle: !prev.subtitle || looksLikePlotInsteadOfTitle(prev.subtitle) ? (bestTitle?.subtitle || nextSubcategory || "") : prev.subtitle,
          language: nextLanguage,
          titleLanguage: nextTitleLanguage,
          genre: nextGenre,
          category: "Fiction",
          subcategory: nextSubcategory || prev.subcategory || "",
          tone: nextTone || prev.tone || "poetico e cinematografico",
          authorStyle: nextTone || prev.authorStyle || "cinematic, emotional, bestseller-level",
          subchaptersEnabled: false,
          subchaptersPerChapter: prev.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER,
          shadowTitleOptions: titleOptions,
        } as BookConfig));
      }
    } catch {
      setPendingCharacterProject(null);
    }
  }, [open, initialConfig]);
  const [config, setConfig] = useState<BookConfig>({
    title: "",
    subtitle: "",
    titleLanguage: "English",
    tone: "warm, insightful, transformative",
    authorStyle: "Brianna Wiest",
    authorIdentityId: initialAuthorIdentity.id,
    authorIdentity: initialAuthorIdentity,
    authorName: initialAuthorIdentity.penName,
    author: initialAuthorIdentity.penName,
    writerName: initialAuthorIdentity.penName,
    language: "English",
    genre: "self-help",
    category: "Self Help",
    subcategory: "Mindset",
    chapterLength: "medium",
    bookLength: "short",
    numberOfChapters: 10,
    subchaptersEnabled: true,
    subchaptersPerChapter: DEFAULT_SUBCHAPTERS_PER_CHAPTER,
  });
  const [authorIdentities, setAuthorIdentities] = useState<AuthorIdentity[]>(() => loadAuthorIdentities());
  const [authorDraft, setAuthorDraft] = useState<AuthorIdentity>(() => initialAuthorIdentity);
  const shadowTitleOptions = useMemo(() => generateShadowTitleSet({
    title: config.title,
    subtitle: config.subtitle,
    idea: pendingCharacterProject?.idea,
    genre: config.genre,
    category: config.category,
    subcategory: config.subcategory,
    targetAudience: config.tone,
    language: config.language,
    titleLanguage,
    characterBible: pendingCharacterProject?.characterBible,
    manualCharacterNames: pendingCharacterProject?.manualCharacterNames,
    seed: titleDominationRound,
  }, 6), [config.title, config.subtitle, pendingCharacterProject?.idea, pendingCharacterProject?.characterBible, pendingCharacterProject?.manualCharacterNames, config.genre, config.category, config.subcategory, config.tone, config.language, titleLanguage, titleDominationRound]);
  const primaryShadowTitle = shadowTitleOptions[0];

  const applyShadowTitle = (candidate = primaryShadowTitle) => {
    if (!candidate) return;
    setConfig(prev => ({ ...prev, title: candidate.title, subtitle: candidate.subtitle, titleLanguage, shadowTitleOptions }));
  };

  const changeTitleLanguage = (next: Language) => {
    setTitleLanguage(next);
    setTitleDominationRound((round) => round + 1);
    setConfig(prev => ({ ...prev, titleLanguage: next }));
  };

  useEffect(() => {
    if (!open) return;
    const identities = loadAuthorIdentities();
    setAuthorIdentities(identities);
    const selected =
      getSelectedAuthorIdentity() ||
      identities.find((item) => item.id === config.authorIdentityId) ||
      normalizeAuthorIdentity(config.authorIdentity) ||
      identities[0] ||
      DEFAULT_AUTHOR_IDENTITIES[0];
    setAuthorDraft(selected);
    applyAuthorIdentity(selected, identities);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !isFreePlan) return;

    setConfig(prev => ({
      ...prev,
      bookLength: "short",
      customTotalWords: Math.min(prev.customTotalWords ?? 10000, 10000),
    }));
  }, [open, isFreePlan]);

  const update = (key: keyof BookConfig, value: any) => {
    if (isFreePlan && key === "bookLength" && value !== "short") return;
    if (isFreePlan && key === "customTotalWords") {
      setConfig(prev => ({ ...prev, customTotalWords: Math.min(Number(value) || 10000, 10000) }));
      return;
    }
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const applyAuthorIdentity = (identity: AuthorIdentity | null, sourceList = authorIdentities) => {
    const normalized = normalizeAuthorIdentity(identity);
    if (!normalized) {
      setConfig(prev => ({
        ...prev,
        authorIdentityId: "",
        authorIdentity: undefined,
        authorName: "",
        author: "",
        writerName: "",
      }));
      return;
    }
    const fromList = sourceList.find((item) => item.id === normalized.id) || normalized;
    setAuthorDraft(fromList);
    setSelectedAuthorIdentityId(fromList.id);
    setConfig(prev => ({
      ...prev,
      authorIdentityId: fromList.id,
      authorIdentity: fromList,
      authorName: fromList.penName,
      author: fromList.penName,
      writerName: fromList.penName,
    }));
  };

  const updateAuthorDraft = (patch: Partial<AuthorIdentity>) => {
    const next = { ...authorDraft, ...patch };
    if (patch.realName !== undefined && (!authorDraft.copyrightName || authorDraft.copyrightName === authorDraft.realName || authorDraft.copyrightName === authorDraft.penName)) {
      next.copyrightName = patch.realName;
    }
    if (patch.penName !== undefined && !next.name.trim()) {
      next.name = patch.penName;
    }
    setAuthorDraft(next);
    setConfig(prev => ({
      ...prev,
      authorIdentityId: next.id,
      authorIdentity: next,
      authorName: next.penName,
      author: next.penName,
      writerName: next.penName,
    }));
  };

  const persistAuthorDraft = () => {
    const saved = saveAuthorIdentity(authorDraft);
    const identities = loadAuthorIdentities();
    setAuthorIdentities(identities);
    setSelectedAuthorIdentityId(saved.id);
    applyAuthorIdentity(saved, identities);
  };

  const createBlankAuthor = () => {
    const now = new Date().toISOString();
    const fresh: AuthorIdentity = {
      id: `custom-${crypto.randomUUID()}`,
      name: "Nuovo autore",
      realName: "",
      penName: "",
      copyrightName: "",
      archetype: "",
      biography: "",
      authorNote: "",
      voice: "",
      signatureMoves: "",
      forbiddenMoves: "",
      recurringThemes: "",
      language: config.language,
      createdAt: now,
      updatedAt: now,
    };
    setAuthorDraft(fresh);
    applyAuthorIdentity(fresh);
  };

  const deleteAuthorDraft = () => {
    if (!isDeletableAuthorIdentity(authorDraft.id)) return;
    const name = authorDraft.penName || authorDraft.name || t("author_identity");
    const ok = window.confirm(tt("confirm_delete_author_identity", { name }));
    if (!ok) return;

    try {
      const fallback = deleteAuthorIdentity(authorDraft.id);
      const identities = loadAuthorIdentities();
      setAuthorIdentities(identities);
      applyAuthorIdentity(fallback, identities);
      toast.success(t("author_identity_deleted"));
    } catch {
      toast.error(t("delete_project_failed"));
    }
  };
  const categories = Object.keys(CATEGORIES);
  const subcategories = CATEGORIES[config.category] || [];
  const titleSectionRef = useRef<HTMLDivElement | null>(null);
  const structureSectionRef = useRef<HTMLDivElement | null>(null);
  const styleSectionRef = useRef<HTMLDivElement | null>(null);
  const createSectionRef = useRef<HTMLDivElement | null>(null);

  const submitBook = useCallback(() => {
    const identity = normalizeAuthorIdentity(config.authorIdentity);
    const authorName = (identity?.penName || config.authorName || config.author || config.writerName || "").trim();
    if (identity?.id) setSelectedAuthorIdentityId(identity.id);
    onSubmit(ensureBookTitleMetadata({
      ...config,
      titleLanguage,
      authorIdentity: identity || undefined,
      authorIdentityId: identity?.id || config.authorIdentityId,
      authorName,
      author: authorName,
      writerName: authorName,
    }, {
      idea: pendingCharacterProject?.idea,
      genre: config.genre,
      category: config.category,
      subcategory: config.subcategory,
      targetAudience: config.tone,
      language: config.language,
      titleLanguage,
      characterBible: pendingCharacterProject?.characterBible,
      manualCharacterNames: pendingCharacterProject?.manualCharacterNames,
    }));
  }, [config, onSubmit, pendingCharacterProject, titleLanguage]);

  if (!open) return null;

  return (
    <div className="scriptora-modal-overlay">
      <div className="scriptora-modal-panel scriptora-mobile-work-panel max-w-3xl">
        <div className="scriptora-mobile-work-panel__header flex shrink-0 items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {reconfigureMode ? t("reconfigure_book") : t("create_new_book")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <GuidedTourTriggerButton tourId={GUIDED_TOUR_IDS.newbook} />
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="scriptora-modal-body scriptora-mobile-work-panel__body space-y-4 p-4 sm:p-5">
          <NewBookGuidedFlow open={open} />

          <div ref={titleSectionRef} data-guided-tour="newbook-title">
          <Field label={t("title")}>
            <input value={config.title} onChange={e => update("title", e.target.value)}
              className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="The Art of Living" />
          </Field>

          <Field label={t("subtitle")}>
            <input value={config.subtitle} onChange={e => update("subtitle", e.target.value)}
              className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="A guide to inner peace" />
          </Field>

          <Field label={t("title_language")}>
            <select
              value={titleLanguage}
              onChange={e => changeTitleLanguage(e.target.value as Language)}
              className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {t("title_language_hint")}
            </p>
          </Field>

          {primaryShadowTitle && (
            <div className="rounded-xl border border-sky-400/25 bg-sky-400/10 p-3 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase text-sky-300">Shadow title sempre attivo</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">{primaryShadowTitle.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{primaryShadowTitle.subtitle}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setTitleDominationRound((round) => round + 1)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-300/20"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Rigenera dominazione
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShadowTitle()}
                    className="h-8 rounded-lg border border-sky-300/30 bg-sky-300/10 px-3 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-300/20"
                  >
                    Usa titolo
                  </button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {shadowTitleOptions.slice(1, 5).map((candidate) => (
                  <button
                    key={`${candidate.title}-${candidate.subtitle}`}
                    type="button"
                    onClick={() => applyShadowTitle(candidate)}
                    className="rounded-lg border border-sky-300/15 bg-background/35 p-2 text-left transition-colors hover:border-sky-300/35 hover:bg-sky-300/10"
                  >
                    <p className="truncate text-xs font-semibold text-foreground">{candidate.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{candidate.subtitle}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-sky-300/80">{candidate.angle} · {candidate.confidence}%</p>
                  </button>
                ))}
              </div>
              {pendingCharacterProject?.characterBible && (
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Prima scegli titolo e sottotitolo. Poi Scriptora userà trama, cast e Character Lock senza mettere la descrizione nel campo titolo.
                </p>
              )}
            </div>
          )}
          </div>

          <div ref={structureSectionRef} className="space-y-4" data-guided-tour="newbook-structure">
          <Field label={t("book_length")}>
            <div className="grid grid-cols-4 gap-2">

        {pendingCharacterProject?.characterBible && (
          <div className="rounded-xl border border-pink-500/30 bg-pink-500/10 p-3 text-sm text-pink-200">
            <strong>Character Studio collegato.</strong>
            <span className="block text-xs text-muted-foreground mt-1">
              Scriptora userà personaggi, genere romanzo e filone: {pendingCharacterProject.genre || "romanzo"}{pendingCharacterProject.subcategory ? ` / ${pendingCharacterProject.subcategory}` : ""}.
            </span>
          </div>
        )}
              {(Object.entries(BOOK_LENGTH_CONFIG) as [BookLength, typeof BOOK_LENGTH_CONFIG[BookLength]][]).map(([key, val]) => {
                const lockedForFree = isFreePlan && key !== "short";
                const requiredPlan = key === "medium" ? "Pro" : key === "long" || key === "custom" ? "Premium" : "";

                return (
                  <button key={key} type="button"
                    disabled={lockedForFree}
                    title={lockedForFree ? `${requiredPlan} richiesto. Il piano Free include un libro fino a 10.000 parole.` : undefined}
                    onClick={() => update("bookLength", key)}
                    className={`relative p-3 rounded-lg border text-center transition-all ${
                      config.bookLength === key
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : lockedForFree
                          ? "border-border bg-muted/20 opacity-55 cursor-not-allowed"
                          : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}>
                    <p className={`text-xs font-semibold ${config.bookLength === key ? "text-primary" : "text-foreground"}`}>{val.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {key === "custom" ? "Choose words" : `~${(val.totalWords / 1000).toFixed(0)}k words`}
                    </p>
                    {lockedForFree && (
                      <p className="mt-1 inline-flex rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                        {requiredPlan}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            {isFreePlan && (
              <p className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
                Il piano Free include <strong className="text-foreground">1 libro fino a 10.000 parole</strong>. I libri più lunghi sono disponibili con Pro/Premium.
              </p>
            )}
            {config.bookLength === "custom" && (
              <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Words</span>
                  <span className="text-sm font-semibold text-primary">
                    {(config.customTotalWords ?? 30000).toLocaleString()} words
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={200000}
                  step={1000}
                  value={config.customTotalWords ?? 30000}
                  onChange={e => update("customTotalWords", parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1000}
                    max={500000}
                    step={500}
                    value={config.customTotalWords ?? 30000}
                    onChange={e => update("customTotalWords", Math.max(1000, parseInt(e.target.value) || 30000))}
                    className="flex-1 h-8 bg-muted/50 border border-border rounded-md px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    ≈ {Math.round((config.customTotalWords ?? 30000) / config.numberOfChapters).toLocaleString()} words/chapter
                  </span>
                </div>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("language")}>
              <select value={config.language} onChange={e => update("language", e.target.value)}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label={t("genre")}>
              <select value={config.genre} onChange={e => update("genre", e.target.value)}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                {["Non-Fiction", "Fiction", "Creativi", "Practical"].map(group => (
                  <optgroup key={group} label={group}>
                    {GENRES.filter(g => g.group === group).map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
          </div>

          <GenreStructurePreview genre={config.genre} subcategory={config.subcategory} />

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("category")}>
              <select value={config.category} onChange={e => { update("category", e.target.value); update("subcategory", CATEGORIES[e.target.value]?.[0] || ""); }}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="">
              <select value={config.subcategory} onChange={e => update("subcategory", e.target.value)}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t("num_chapters")}>
              <input type="number" min={3} max={50} value={config.numberOfChapters}
                onChange={e => update("numberOfChapters", Math.max(3, Math.min(50, parseInt(e.target.value) || 10)))}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </Field>
            <Field label={t("default_length")}>
              <select value={config.chapterLength} onChange={e => update("chapterLength", e.target.value)}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="short">{t("short")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="long">{t("long")}</option>
              </select>
            </Field>
          </div>
          </div>

          <div ref={styleSectionRef} className="space-y-4" data-guided-tour="newbook-style">
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("tone")}>
              <input value={config.tone} onChange={e => update("tone", e.target.value)}
                className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="warm, direct" />
            </Field>
            <Field label={t("writing_style")}>
              <WritingStyleSelector
                genre={config.genre}
                subcategory={config.subcategory}
                value={config.authorStyle}
                onChange={(v) => update("authorStyle", v)}
              />
            </Field>
          </div>

          <Field label={t("subchapters")}>
              <label className="flex items-center gap-2 h-9 cursor-pointer">
                <input type="checkbox" checked={config.subchaptersEnabled}
                  onChange={e => update("subchaptersEnabled", e.target.checked)}
                  className="rounded border-border" />
                <span className="text-xs text-foreground">{t("enabled")}</span>
              </label>
            </Field>

          {config.subchaptersEnabled && (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_120px] sm:items-center">
                <div>
                  <p className="text-xs font-semibold text-foreground">Sottocapitoli reali per capitolo</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                    Scriptora userà questo numero nel blueprint e genererà sottocapitoli con sviluppo narrativo vero, non preview finte.
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={config.subchaptersPerChapter ?? DEFAULT_SUBCHAPTERS_PER_CHAPTER}
                  onChange={e => update("subchaptersPerChapter", Math.max(1, Math.min(8, parseInt(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)))}
                  className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          )}
          </div>
        </div>

        <div ref={createSectionRef} data-guided-tour="newbook-create" className="flex shrink-0 justify-end gap-2 border-t border-border bg-card p-5">
          <button onClick={onClose}
            className="scriptora-modal-cta-ghost h-10 px-4 text-sm font-semibold">
            {t("cancel")}
          </button>
          <button onClick={submitBook}
            className="scriptora-modal-cta-primary h-10 px-6 text-sm font-semibold disabled:opacity-40">
            {t("create_book")}
          </button>
        </div>
      </div>
    </div>
  );
}

const Field = forwardRef<HTMLDivElement, { label: string; children: React.ReactNode }>(
  function Field({ label, children }, ref) {
    return (
      <div ref={ref}>
        {label && <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>}
        {children}
      </div>
    );
  }
);

function AuthorIdentitySection({
  identities,
  draft,
  selectedId,
  onSelect,
  onCreate,
  onSave,
  onDelete,
  onChange,
}: {
  identities: AuthorIdentity[];
  draft: AuthorIdentity;
  selectedId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSave: () => void;
  onDelete: () => void;
  onChange: (patch: Partial<AuthorIdentity>) => void;
}) {
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="ios-icon ios-icon-blue h-9 w-9 rounded-[14px]">
            <Fingerprint className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Identità autore</p>
            <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
              Scegli o crea una penna: nome reale, pen name, bio e nota autore verranno usati nel libro e nella voce di scrittura.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Nuova
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {identities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.penName} · {item.realName || item.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          {isDeletableAuthorIdentity(draft.id) && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("delete_author_identity")}
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.penName.trim()}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Salva autore
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] leading-5 text-muted-foreground">
        Nel libro verrà dichiarato come <strong className="text-foreground">{draft.penName || "pen name non impostato"}</strong>
        {draft.realName ? `, profilo reale ${draft.realName}` : ""}. Copyright: <strong className="text-foreground">{draft.copyrightName || draft.realName || draft.penName || "da impostare"}</strong>.
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniAuthorField label="Nome profilo">
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Es. Thriller legale, Penna Romance..."
          />
        </MiniAuthorField>
        <MiniAuthorField label="Nome reale">
          <input
            value={draft.realName || ""}
            onChange={(e) => onChange({ realName: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Nome reale autore o società"
          />
        </MiniAuthorField>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniAuthorField label="Pen name pubblico">
          <input
            value={draft.penName}
            onChange={(e) => onChange({ penName: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Nome in copertina"
          />
        </MiniAuthorField>
        <MiniAuthorField label="Nome copyright">
          <input
            value={draft.copyrightName || ""}
            onChange={(e) => onChange({ copyrightName: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Nome legale o pen name per copyright"
          />
        </MiniAuthorField>
      </div>

      <MiniAuthorField label="Archetipo">
        <input
          value={draft.archetype}
          onChange={(e) => onChange({ archetype: e.target.value })}
          className="h-9 w-full rounded-lg border border-border bg-muted/50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Es. narratore oscuro, coach pratico, saggista poetico"
        />
      </MiniAuthorField>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniAuthorField label="Voce">
          <textarea
            value={draft.voice}
            onChange={(e) => onChange({ voice: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Ritmo, tono, fraseggio, lessico..."
          />
        </MiniAuthorField>
        <MiniAuthorField label="Biografia pubblica">
          <textarea
            value={draft.biography}
            onChange={(e) => onChange({ biography: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Bio che apparirà nella sezione autore del libro..."
          />
        </MiniAuthorField>
      </div>

      <MiniAuthorField label="Nota autore">
        <textarea
          value={draft.authorNote || ""}
          onChange={(e) => onChange({ authorNote: e.target.value })}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Nota personale da usare nella postfazione / nota dell'autore..."
        />
      </MiniAuthorField>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniAuthorField label="Firma">
          <textarea
            value={draft.signatureMoves}
            onChange={(e) => onChange({ signatureMoves: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Aperture, immagini, finali..."
          />
        </MiniAuthorField>
        <MiniAuthorField label="Divieti">
          <textarea
            value={draft.forbiddenMoves}
            onChange={(e) => onChange({ forbiddenMoves: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Cosa non deve mai fare..."
          />
        </MiniAuthorField>
        <MiniAuthorField label="Ossessioni">
          <textarea
            value={draft.recurringThemes}
            onChange={(e) => onChange({ recurringThemes: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Temi ricorrenti..."
          />
        </MiniAuthorField>
      </div>
    </div>
  );
}

function MiniAuthorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
        <UserRound className="h-3 w-3" />
        {label}
      </span>
      {children}
    </label>
  );
}

function GenreStructurePreview({ genre, subcategory }: { genre: string; subcategory?: string }) {
  const bp = useMemo(() => getGenreBlueprint(genre, subcategory), [genre, subcategory]);
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Genre Engine — Editorial Blueprint</span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground/80">Style:</span> {bp.chapterStyle.replace(/_/g, " ")}
        {" · "}
        <span className="font-medium text-foreground/80">Tone:</span> {bp.tone}
      </div>
      <div className="flex flex-wrap gap-1">
        {bp.structure.slice(0, 8).map((s, i) => (
          <span key={`stable-${i}`} className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted/60 border border-border/40 text-foreground/80">
            {i + 1}. {s}
          </span>
        ))}
      </div>
      {bp.contentRules.length > 0 && (
        <ul className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/30">
          {bp.contentRules.slice(0, 3).map((r, i) => (
            <li key={`stable-${i}`} className="leading-snug">• {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WritingStyleSelector({
  genre,
  subcategory,
  value,
  onChange,
}: {
  genre: string;
  subcategory?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = useMemo(() => getStylesForGenre(genre, subcategory), [genre, subcategory]);
  const authors = presets.filter(p => p.kind === "author");
  const styles = presets.filter(p => p.kind === "style");

  const matched: WritingStylePreset | undefined = useMemo(() => {
    return presets.find(p => p.id === value || p.label.toLowerCase() === value.toLowerCase());
  }, [presets, value]);

  const [mode, setMode] = useState<"preset" | "custom">(matched || !value ? "preset" : "custom");

  // Quando cambia genere, se lo stile attuale non è più nella lista, ripiega sul primo
  useEffect(() => {
    if (mode === "preset" && value && !matched) {
      const fallback = authors[0] ?? styles[0];
      if (fallback) onChange(fallback.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, subcategory]);

  const selectedPreset = matched ?? (mode === "preset" ? authors[0] ?? styles[0] : null);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => { setMode("preset"); if (!matched) onChange((authors[0] ?? styles[0])?.id ?? ""); }}
          className={`flex-1 h-7 text-[10px] font-medium rounded-md border transition-colors ${
            mode === "preset" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Preset
        </button>
        <button
          type="button"
          onClick={() => { setMode("custom"); onChange(""); }}
          className={`flex-1 h-7 text-[10px] font-medium rounded-md border transition-colors ${
            mode === "custom" ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Custom
        </button>
      </div>

      {mode === "preset" ? (
        <>
          <select
            value={selectedPreset?.id ?? ""}
            onChange={e => onChange(e.target.value)}
            className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {authors.length > 0 && (
              <optgroup label="✍ Autori del genere">
                {authors.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </optgroup>
            )}
            {styles.length > 0 && (
              <optgroup label="🎨 Stili tecnici">
                {styles.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </optgroup>
            )}
          </select>
          {selectedPreset && (
            <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground leading-snug pt-0.5">
              <PenTool className="h-3 w-3 text-primary shrink-0 mt-0.5" />
              <span>{selectedPreset.hint}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full h-9 bg-muted/50 border border-border rounded-lg px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Es. Italo Calvino, lirico-fiabesco..."
          />
          <p className="text-[10px] text-muted-foreground leading-snug">
            Lo stile custom verrà interpretato letteralmente dall'AI.
          </p>
        </>
      )}
    </div>
  );
}
