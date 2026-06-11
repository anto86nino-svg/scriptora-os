import { useCallback, useEffect, useState } from "react";
import {
  X, ArrowLeft, ArrowRight, Rocket, Sparkles, Plus, Trash2, Users, Loader2,
  CheckCircle2, AlertTriangle, BookOpen,
} from "lucide-react";
import type { AuthorIdentity, BookBlueprint, BookCharacter, BookConfig, Genre, Language } from "@/types/book";
import { DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import {
  DEFAULT_STYLE_PROFILE,
  STYLE_PRESETS,
  profileToStyleDirective,
  type WritingStyleProfile,
} from "@/lib/book-creation-os/objectives";
import {
  applyAuthorIdentityToConfig,
  isUserAuthorIdentityConfigured,
  saveAuthorIdentity,
} from "@/lib/author-identity";
import {
  consumeWizardCharacterFreeRegen,
  generateWizardCharacter,
  getWizardCharacterFreeRegensRemaining,
} from "@/lib/book-creation-os/character-generator";
import { usePlan } from "@/lib/plan";
import { toast } from "sonner";
import { STUDIO_STEPS, AMAZON_MARKETPLACES, STUDIO_GENRES, STUDIO_LANGUAGES } from "@/lib/book-config-studio/constants";
import { DEFAULT_MATTER_OPTIONS, normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import { validateBookConfigStudio } from "@/lib/book-config-studio/validation";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";

interface BookCreationOsWizardProps {
  open: boolean;
  onClose: () => void;
  authorIdentity: AuthorIdentity;
  onAuthorIdentity?: () => void;
  onManualStudio?: (config: BookConfig) => void;
  onStudioComplete?: (payload: StudioLaunchPayload) => void;
  onGenerateBlueprint?: (config: BookConfig) => Promise<BookBlueprint>;
  onDetectIntent?: (idea: string, language: Language) => Promise<{
    genre: string;
    subcategory: string;
    tone: string;
    numberOfChapters: number;
    suggestedTitles: string[];
    suggestedSubtitles: string[];
    bestTitleIndex: number;
  } | null>;
}

function emptyCharacter(): BookCharacter {
  return { name: "", role: "", wound: "", secret: "", externalDesire: "", personality: "" };
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/50 focus:outline-none";

export function BookCreationOsWizard({
  open,
  onClose,
  authorIdentity,
  onAuthorIdentity,
  onManualStudio,
  onStudioComplete,
  onGenerateBlueprint,
  onDetectIntent,
}: BookCreationOsWizardProps) {
  const { plan } = usePlan();
  const isFree = plan === "free";
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [idea, setIdea] = useState("");
  const [authorName, setAuthorName] = useState(authorIdentity.penName || "");
  const [language, setLanguage] = useState<Language>("Italian");
  const [amazonMarketplace, setAmazonMarketplace] = useState("amazon.it");
  const [category, setCategory] = useState("Fiction");
  const [subcategory, setSubcategory] = useState("General");
  const [bookTypeId, setBookTypeId] = useState("romance");
  const [genre, setGenre] = useState<Genre>("romance");
  const [subgenre, setSubgenre] = useState("");
  const [identityDraft, setIdentityDraft] = useState<AuthorIdentity>(authorIdentity);
  const [chapters, setChapters] = useState(18);
  const [chapterLength, setChapterLength] = useState<"short" | "medium" | "long">("medium");
  const [bookLength, setBookLength] = useState<"short" | "medium" | "long">(isFree ? "short" : "medium");
  const [subchaptersEnabled, setSubchaptersEnabled] = useState(true);
  const [subchaptersPerChapter, setSubchaptersPerChapter] = useState(DEFAULT_SUBCHAPTERS_PER_CHAPTER);
  const [matterOptions, setMatterOptions] = useState(DEFAULT_MATTER_OPTIONS);
  const [characters, setCharacters] = useState<BookCharacter[]>([emptyCharacter()]);
  const [styleProfile, setStyleProfile] = useState<WritingStyleProfile>(DEFAULT_STYLE_PROFILE);
  const [tone, setTone] = useState("editoriale, chiaro, coinvolgente");
  const [targetReader, setTargetReader] = useState("");
  const [referenceAuthors, setReferenceAuthors] = useState("");
  const [blueprintPreview, setBlueprintPreview] = useState<BookBlueprint | null>(null);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [generatingCharacter, setGeneratingCharacter] = useState(false);
  const [freeRegensLeft, setFreeRegensLeft] = useState(() => getWizardCharacterFreeRegensRemaining());

  const buildConfig = useCallback((): BookConfig => {
    const styleDirective = profileToStyleDirective(styleProfile);
    const presetLabel = STYLE_PRESETS.find((p) => p.id === styleProfile.presetId)?.label || "Bestseller Commerciale";
    const mergedIdentity = saveAuthorIdentity({
      ...identityDraft,
      penName: identityDraft.penName || authorName,
      biography: identityDraft.biography || "",
      voice: identityDraft.voice || "",
      language,
    });
    return normalizeBookConfig(applyAuthorIdentityToConfig({
      title: title.trim() || "Romanzo senza titolo",
      subtitle: subtitle.trim(),
      idea: idea.trim(),
      language,
      titleLanguage: language,
      amazonMarketplace,
      bookTypeId,
      genre,
      category,
      subcategory,
      subgenre: subgenre.trim() || subcategory,
      tone: `${tone} · ${styleDirective}`,
      authorStyle: presetLabel,
      authorName: authorName.trim() || mergedIdentity.penName,
      author: authorName.trim() || mergedIdentity.penName,
      targetReader: targetReader.trim(),
      referenceAuthors: referenceAuthors.trim(),
      chapterLength,
      bookLength: isFree ? "short" : bookLength,
      numberOfChapters: chapters,
      subchaptersEnabled,
      subchaptersPerChapter: subchaptersEnabled ? subchaptersPerChapter : 0,
      matterOptions,
      styleProfile,
      characters: characters.filter((c) => String(c.name || "").trim()),
      configStatus: "validated",
    }, mergedIdentity) as BookConfig);
  }, [
    styleProfile, identityDraft, authorName, title, subtitle, idea, language, amazonMarketplace,
    bookTypeId, genre, category, subcategory, subgenre, tone, targetReader, referenceAuthors, chapterLength,
    bookLength, isFree, chapters, subchaptersEnabled, subchaptersPerChapter, matterOptions, characters,
  ]);

  const persistDraft = useCallback(() => {
    try {
      sessionStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, JSON.stringify({
        step, title, subtitle, idea, authorName, language, amazonMarketplace, category, subcategory,
        bookTypeId, genre, subgenre, chapters, chapterLength, bookLength, subchaptersEnabled, subchaptersPerChapter,
        matterOptions, characters, styleProfile, tone, targetReader, referenceAuthors,
      }));
    } catch { /* noop */ }
  }, [
    step, title, subtitle, idea, authorName, language, amazonMarketplace, category, subcategory,
    bookTypeId, genre, subgenre, chapters, chapterLength, bookLength, subchaptersEnabled, subchaptersPerChapter,
    matterOptions, characters, styleProfile, tone, targetReader, referenceAuthors,
  ]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = sessionStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.step != null) setStep(draft.step);
      if (draft.title) setTitle(draft.title);
      if (draft.subtitle) setSubtitle(draft.subtitle);
      if (draft.idea) setIdea(draft.idea);
      if (draft.authorName) setAuthorName(draft.authorName);
      if (draft.language) setLanguage(draft.language);
      if (draft.amazonMarketplace) setAmazonMarketplace(draft.amazonMarketplace);
      if (draft.category) setCategory(draft.category);
      if (draft.subcategory) setSubcategory(draft.subcategory);
      if (draft.bookTypeId) setBookTypeId(draft.bookTypeId);
      if (draft.genre) setGenre(draft.genre);
      if (draft.subgenre) setSubgenre(draft.subgenre);
      if (draft.chapters) setChapters(draft.chapters);
      if (draft.chapterLength) setChapterLength(draft.chapterLength);
      if (draft.bookLength) setBookLength(draft.bookLength);
      if (draft.subchaptersEnabled != null) setSubchaptersEnabled(draft.subchaptersEnabled);
      if (draft.subchaptersPerChapter) setSubchaptersPerChapter(draft.subchaptersPerChapter);
      if (draft.matterOptions) setMatterOptions({ ...DEFAULT_MATTER_OPTIONS, ...draft.matterOptions });
      if (draft.characters?.length) setCharacters(draft.characters);
      if (draft.styleProfile) setStyleProfile({ ...DEFAULT_STYLE_PROFILE, ...draft.styleProfile });
      if (draft.tone) setTone(draft.tone);
      if (draft.targetReader) setTargetReader(draft.targetReader);
      if (draft.referenceAuthors) setReferenceAuthors(draft.referenceAuthors);
    } catch { /* noop */ }
  }, [open]);

  useEffect(() => {
    if (open) persistDraft();
  }, [open, persistDraft]);

  useEffect(() => {
    setIdentityDraft(authorIdentity);
    if (!authorName.trim()) setAuthorName(authorIdentity.penName || "");
  }, [authorIdentity]);

  if (!open) return null;

  const validationIssues = validateBookConfigStudio(buildConfig(), identityDraft);
  const stepLabel = STUDIO_STEPS[step];

  const applyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setStyleProfile((prev) => ({ ...prev, ...preset.profile, presetId }));
    setTone(preset.label);
  };

  const goNext = async () => {
    if (step === 0 && !title.trim()) {
      toast.error("Inserisci il titolo del libro.");
      return;
    }
    if (step === 1) {
      saveAuthorIdentity({ ...identityDraft, penName: identityDraft.penName || authorName, language });
    }
    if (step === 5 && validationIssues.length) {
      toast.error("Completa i campi mancanti prima di continuare.");
      return;
    }
    if (step === 6) {
      if (!onGenerateBlueprint) {
        const config = buildConfig();
        onStudioComplete?.({ config, mode: "studio-draft" });
        onClose();
        return;
      }
      setGeneratingBlueprint(true);
      try {
        const config = buildConfig();
        const bp = await onGenerateBlueprint(config);
        setBlueprintPreview(bp);
        setStep(7);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Blueprint non generato");
      } finally {
        setGeneratingBlueprint(false);
      }
      return;
    }
    setStep((s) => Math.min(STUDIO_STEPS.length - 1, s + 1));
  };

  const finishApproved = async () => {
    if (!blueprintPreview) {
      toast.error("Genera e rivedi il blueprint prima di approvare.");
      return;
    }
    setLaunching(true);
    try {
      const config = buildConfig();
      const payload: StudioLaunchPayload = {
        config: { ...config, configStatus: "approved" },
        blueprint: blueprintPreview,
        blueprintApproved: true,
        mode: "studio-approved",
      };
      if (onStudioComplete) {
        onStudioComplete(payload);
        sessionStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
        onClose();
        return;
      }
      onManualStudio?.(config);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avvio non riuscito");
    } finally {
      setLaunching(false);
    }
  };

  const detectFromIdea = async () => {
    if (!onDetectIntent || idea.trim().length < 6) return;
    try {
      const detected = await onDetectIntent(idea.trim(), language);
      if (detected?.suggestedTitles?.length && !title.trim()) {
        const best = Math.max(0, Math.min(2, detected.bestTitleIndex || 0));
        setTitle(detected.suggestedTitles[best] || "");
        setSubtitle(detected.suggestedSubtitles?.[best] || "");
      }
      if (detected?.genre) setGenre(detected.genre as Genre);
      if (detected?.subcategory) setSubcategory(detected.subcategory);
      if (detected?.numberOfChapters) setChapters(detected.numberOfChapters);
      toast.success("Suggerimenti applicati dall'idea.");
    } catch {
      toast.error("Analisi idea non disponibile.");
    }
  };

  return (
    <div className="scriptora-modal-overlay fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="scriptora-wizard-shell flex max-h-[min(94dvh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-slate-950 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Book Configuration Studio</p>
            <p className="text-sm font-semibold text-white">Step {step + 1}/{STUDIO_STEPS.length} — {stepLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="scriptora-wizard-scroll flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {step === 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Crea libro</h2>
              <p className="text-sm text-white/65">Metadati editoriali — nessun blueprint in questa fase.</p>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo libro *" className={inputClass} />
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sottotitolo (opzionale)" className={inputClass} />
              <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Nome autore *" className={inputClass} />
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className={inputClass}>
                {STUDIO_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <select value={amazonMarketplace} onChange={(e) => setAmazonMarketplace(e.target.value)} className={inputClass}>
                {AMAZON_MARKETPLACES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <select
                value={bookTypeId}
                onChange={(e) => {
                  const g = STUDIO_GENRES.find((x) => x.id === e.target.value);
                  if (!g) return;
                  setBookTypeId(g.id);
                  setGenre(g.genre);
                  setCategory(g.category);
                  setSubcategory(g.defaultSubcategory);
                  setSubchaptersEnabled(g.defaultSubchapters);
                }}
                className={inputClass}
              >
                {STUDIO_GENRES.map((g) => <option key={g.id} value={g.id}>{g.label} ({g.family})</option>)}
              </select>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria" className={inputClass} />
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Sottocategoria" className={inputClass} />
              <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="Sottogenere (opzionale)" className={inputClass} />
              <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} placeholder="Idea / concept (opzionale, per suggerimenti AI)" className={inputClass} />
              {onDetectIntent && (
                <button type="button" onClick={() => void detectFromIdea()} className="text-xs font-semibold text-sky-300 hover:text-sky-200">
                  Analizza idea e suggerisci titolo/genere
                </button>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Identità autore</h2>
                {onAuthorIdentity && (
                  <button type="button" onClick={onAuthorIdentity} className="text-xs text-sky-300">Apri Identity OS</button>
                )}
              </div>
              <input value={identityDraft.penName || authorName} onChange={(e) => setIdentityDraft((d) => ({ ...d, penName: e.target.value }))} placeholder="Pen name *" className={inputClass} />
              <textarea value={identityDraft.biography || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, biography: e.target.value }))} rows={3} placeholder="Bio breve *" className={inputClass} />
              <textarea value={identityDraft.voice || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, voice: e.target.value }))} rows={2} placeholder="Voce narrativa *" className={inputClass} />
              <input value={targetReader} onChange={(e) => setTargetReader(e.target.value)} placeholder="Target lettore" className={inputClass} />
              <input value={referenceAuthors} onChange={(e) => setReferenceAuthors(e.target.value)} placeholder="Autori di riferimento" className={inputClass} />
              <input value={identityDraft.archetype || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, archetype: e.target.value }))} placeholder="Stile prevalente / archetipo" className={inputClass} />
              {!isUserAuthorIdentityConfigured(identityDraft) && (
                <p className="text-xs text-amber-200">Completa pen name, bio e voce narrativa per sbloccare il blueprint.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Configurazione libro</h2>
              <label className="block text-sm text-white/70">Capitoli: {chapters}
                <input type="range" min={6} max={32} value={chapters} onChange={(e) => setChapters(Number(e.target.value))} className="mt-2 w-full accent-emerald-400" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as const).map((len) => (
                  <button key={len} type="button" onClick={() => { setChapterLength(len); if (!isFree) setBookLength(len); }}
                    className={`rounded-xl border py-2 text-xs font-semibold capitalize ${chapterLength === len ? "border-emerald-400/50 bg-emerald-400/12 text-emerald-100" : "border-white/12 text-white/65"}`}>
                    Capitoli {len}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white">
                Sottocapitoli
                <input type="checkbox" checked={subchaptersEnabled} onChange={(e) => setSubchaptersEnabled(e.target.checked)} />
              </label>
              {subchaptersEnabled && (
                <label className="block text-sm text-white/70">Sottocapitoli per capitolo: {subchaptersPerChapter}
                  <input type="range" min={1} max={5} value={subchaptersPerChapter} onChange={(e) => setSubchaptersPerChapter(Number(e.target.value))} className="mt-2 w-full accent-sky-400" />
                </label>
              )}
              {([
                ["frontMatterEnabled", "Front Matter"],
                ["backMatterEnabled", "Back Matter"],
                ["acknowledgmentsEnabled", "Ringraziamenti"],
                ["ctaEnabled", "CTA finale"],
                ["bibliographyEnabled", "Bibliografia"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white">
                  {label}
                  <input type="checkbox" checked={matterOptions[key]} onChange={(e) => setMatterOptions((m) => ({ ...m, [key]: e.target.checked }))} />
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-white">Personaggi</h2>
                <div className="flex gap-2">
                  <button type="button" disabled={generatingCharacter} onClick={async () => {
                    setGeneratingCharacter(true);
                    try {
                      const remaining = getWizardCharacterFreeRegensRemaining();
                      if (remaining <= 0) {
                        const { chargePremiumOperation } = await import("@/lib/billing/charge");
                        await chargePremiumOperation("character_studio_ai", { source: "wizard_character_generate" });
                      } else {
                        consumeWizardCharacterFreeRegen();
                        setFreeRegensLeft(getWizardCharacterFreeRegensRemaining());
                      }
                      const generated = generateWizardCharacter(`${idea}|${Date.now()}`);
                      setCharacters((list) => [...list.filter((c) => c.name?.trim()), generated]);
                      toast.success("Personaggio generato.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Errore generazione");
                    } finally {
                      setGeneratingCharacter(false);
                    }
                  }} className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-400/12 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
                    {generatingCharacter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Genera
                  </button>
                  <button type="button" onClick={() => setCharacters((c) => [...c, emptyCharacter()])} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/80">
                    <Plus className="h-3 w-3" /> Aggiungi
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-white/55">Rigenerazioni gratuite: {freeRegensLeft}</p>
              {characters.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-white/12 bg-white/5 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={ch.name} onChange={(e) => setCharacters((list) => list.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))} placeholder="Nome" className={inputClass} />
                    <button type="button" onClick={() => setCharacters((list) => list.filter((_, i) => i !== idx))} className="rounded-lg p-2 text-white/50 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {([["role", "Ruolo"], ["externalDesire", "Obiettivo"], ["wound", "Ferita"], ["secret", "Segreto"], ["personality", "Arco narrativo"]] as const).map(([field, ph]) => (
                    <input key={field} value={String(ch[field] || "")} onChange={(e) => setCharacters((list) => list.map((c, i) => i === idx ? { ...c, [field]: e.target.value } : c))} placeholder={ph} className={inputClass} />
                  ))}
                </div>
              ))}
              <p className="text-[11px] text-white/50 flex items-center gap-1"><Users className="h-3 w-3" /> Salvati nella Story Bible del progetto.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Stile e tono</h2>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium ${styleProfile.presetId === p.id ? "border-amber-300/50 bg-amber-400/15 text-amber-100" : "border-white/12 text-white/70"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Tono editoriale" className={inputClass} />
              {([
                ["voiceIntensity", "Voce autore"], ["emotionalIntensity", "Livello emotivo"], ["dialogueLevel", "Intensità dialoghi"],
                ["poeticLevel", "Intensità descrizioni"], ["narrativePace", "Ritmo narrativo"], ["tensionIntensity", "Livello tensione"],
                ["psychologicalDepth", "Livello dettaglio"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 flex justify-between text-[11px] text-white/70"><span>{label}</span><span>{styleProfile[key]}%</span></span>
                  <input type="range" min={0} max={100} value={styleProfile[key]} onChange={(e) => setStyleProfile((p) => ({ ...p, [key]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                </label>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Validazione progetto</h2>
              {validationIssues.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p>Configurazione completa. Puoi generare il blueprint.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validationIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Step {issue.step}: {issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-xs text-white/70 space-y-1">
                <p><strong className="text-white">Titolo:</strong> {title || "—"}</p>
                <p><strong className="text-white">Autore:</strong> {authorName || identityDraft.penName}</p>
                <p><strong className="text-white">Genere:</strong> {genre} / {subcategory}</p>
                <p><strong className="text-white">Capitoli:</strong> {chapters}{subchaptersEnabled ? ` · ${subchaptersPerChapter} sottocapitoli` : ""}</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-sky-300" />
              <h2 className="text-xl font-semibold text-white">Generazione Blueprint</h2>
              <p className="text-sm text-white/65">Scriptora costruirà premessa, struttura, capitoli{subchaptersEnabled ? ", sottocapitoli" : ""}, front e back matter.</p>
              {generatingBlueprint && <p className="text-sm text-sky-200 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generazione in corso…</p>}
            </div>
          )}

          {step === 7 && blueprintPreview && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Approvazione autore</h2>
              <p className="text-sm text-white/65">Rivedi la struttura. Solo dopo l'approvazione potrai generare il libro.</p>
              <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-sm text-white/80 space-y-2">
                <p className="font-semibold text-white">{title}{subtitle ? `: ${subtitle}` : ""}</p>
                <p className="text-xs leading-relaxed">{blueprintPreview.overview.slice(0, 500)}{blueprintPreview.overview.length > 500 ? "…" : ""}</p>
                <p className="text-[11px] text-white/55">{blueprintPreview.chapterOutlines.length} capitoli pianificati</p>
                <ul className="max-h-40 overflow-y-auto text-xs space-y-1">
                  {blueprintPreview.chapterOutlines.slice(0, 12).map((o, i) => (
                    <li key={i}>{i + 1}. {o.title}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="scriptora-wizard-footer flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-30">
            <ArrowLeft className="h-4 w-4" /> Indietro
          </button>
          {step < 6 && (
            <button type="button" onClick={() => void goNext()} className="inline-flex items-center gap-1 rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-950">
              Avanti <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {step === 6 && (
            <button type="button" disabled={generatingBlueprint || validationIssues.length > 0} onClick={() => void goNext()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
              {generatingBlueprint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera Blueprint
            </button>
          )}
          {step === 7 && (
            <button type="button" disabled={launching} onClick={() => void finishApproved()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Approva e apri Studio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
