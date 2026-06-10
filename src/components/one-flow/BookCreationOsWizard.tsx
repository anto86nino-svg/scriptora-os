import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ArrowLeft, ArrowRight, Rocket, Sparkles, Plus, Trash2, Users, Loader2, Fingerprint,
} from "lucide-react";
import type { AuthorIdentity, BookCharacter, BookConfig, Language } from "@/types/book";
import { DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import {
  BOOK_OBJECTIVES,
  DEFAULT_STYLE_PROFILE,
  IDEA_EXAMPLES,
  STYLE_PRESETS,
  objectiveById,
  profileToStyleDirective,
  type WritingStyleProfile,
} from "@/lib/book-creation-os/objectives";
import { applyAuthorIdentityToConfig, isUserAuthorIdentityConfigured } from "@/lib/author-identity";
import {
  consumeWizardCharacterFreeRegen,
  generateWizardCharacter,
  getWizardCharacterFreeRegensRemaining,
} from "@/lib/book-creation-os/character-generator";
import { usePlan } from "@/lib/plan";
import { toast } from "sonner";
import { WizardLiveIntelligencePanel, WizardLiveIntelligenceStrip } from "./WizardLiveIntelligencePanel";

const STEPS = ["Idea", "Obiettivo", "Stile", "Personaggi", "Struttura", "Genera"] as const;

interface BookCreationOsWizardProps {
  open: boolean;
  onClose: () => void;
  authorIdentity: AuthorIdentity;
  onAuthorIdentity?: () => void;
  onManualStudio?: (config: BookConfig) => void;
  onDetectIntent?: (idea: string, language: Language) => Promise<{
    genre: string;
    subcategory: string;
    tone: string;
    numberOfChapters: number;
    suggestedTitles: string[];
    suggestedSubtitles: string[];
    bestTitleIndex: number;
    targetAudience: string;
    level: string;
    readerPromise: string;
  } | null>;
}

function emptyCharacter(): BookCharacter {
  return { name: "", role: "", wound: "", secret: "", externalDesire: "", personality: "" };
}

export function BookCreationOsWizard({
  open,
  onClose,
  authorIdentity,
  onAuthorIdentity,
  onManualStudio,
  onDetectIntent,
}: BookCreationOsWizardProps) {
  const navigate = useNavigate();
  const { plan } = usePlan();
  const isFree = plan === "free";
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [objectiveId, setObjectiveId] = useState(BOOK_OBJECTIVES[0].id);
  const [styleProfile, setStyleProfile] = useState<WritingStyleProfile>(DEFAULT_STYLE_PROFILE);
  const [characters, setCharacters] = useState<BookCharacter[]>([emptyCharacter()]);
  const [chapters, setChapters] = useState(18);
  const [bookLength, setBookLength] = useState<"short" | "medium" | "long">(isFree ? "short" : "medium");
  const [launching, setLaunching] = useState(false);
  const [generatingCharacter, setGeneratingCharacter] = useState(false);
  const [freeRegensLeft, setFreeRegensLeft] = useState(() => getWizardCharacterFreeRegensRemaining());
  const [language] = useState<Language>("Italian");

  if (!open) return null;

  const objective = objectiveById(objectiveId) || BOOK_OBJECTIVES[0];
  const stepLabel = STEPS[step];

  const applyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setStyleProfile((prev) => ({ ...prev, ...preset.profile, presetId }));
  };

  const buildConfig = (): BookConfig => {
    const styleDirective = profileToStyleDirective(styleProfile);
    const presetLabel = STYLE_PRESETS.find((p) => p.id === styleProfile.presetId)?.label || objective.authorStyle;
    return applyAuthorIdentityToConfig({
      title: title.trim() || idea.trim().slice(0, 60) || "Romanzo senza titolo",
      subtitle: subtitle.trim(),
      language,
      titleLanguage: language,
      genre: objective.genre,
      category: objective.genre.includes("help") || objective.genre === "business" ? "Non-Fiction" : "Fiction",
      subcategory: objective.subcategory,
      tone: `${objective.tone} · ${styleDirective}`,
      authorStyle: presetLabel,
      chapterLength: "medium",
      bookLength: isFree ? "short" : bookLength,
      numberOfChapters: chapters,
      subchaptersEnabled: true,
      subchaptersPerChapter: DEFAULT_SUBCHAPTERS_PER_CHAPTER,
      characters: characters.filter((c) => String(c.name || "").trim()),
    }, authorIdentity) as BookConfig;
  };

  const launchBestseller = async () => {
    if (idea.trim().length < 6) {
      toast.error("Scrivi almeno un'idea di 6 caratteri.");
      return;
    }
    setLaunching(true);
    try {
      let detected = null;
      if (onDetectIntent) {
        detected = await onDetectIntent(idea.trim(), language);
        if (detected?.suggestedTitles?.length && !title.trim()) {
          const best = Math.max(0, Math.min(2, detected.bestTitleIndex || 0));
          setTitle(detected.suggestedTitles[best] || "");
          setSubtitle(detected.suggestedSubtitles?.[best] || "");
        }
      }

      const config = buildConfig();
      if (onManualStudio) {
        onManualStudio(config);
        onClose();
        return;
      }
      sessionStorage.setItem("nexora-new-book", JSON.stringify(config));
      onClose();
      navigate("/app");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avvio non riuscito");
    } finally {
      setLaunching(false);
    }
  };

  const openStudio = () => {
    const config = buildConfig();
    onManualStudio?.(config);
    onClose();
  };

  const intelProps = {
    step,
    idea,
    objective,
    styleProfile,
    characters,
    chapters,
    bookLength,
  };

  return (
    <div className="scriptora-modal-overlay fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="scriptora-wizard-shell flex max-h-[min(94dvh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-slate-950 shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">AI Book Architect</p>
            <p className="text-sm font-semibold text-white">Step {step + 1}/6 — {stepLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {onAuthorIdentity && (
              <button
                type="button"
                onClick={onAuthorIdentity}
                className={`hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold sm:inline-flex ${
                  isUserAuthorIdentityConfigured(authorIdentity)
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                    : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                }`}
              >
                <Fingerprint className="h-3.5 w-3.5" />
                Identità autore
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <WizardLiveIntelligenceStrip {...intelProps} />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="scriptora-wizard-scroll flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">La tua idea</h2>
              <p className="text-sm text-white/65">Titolo o concept — Scriptora costruirà il resto.</p>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={5}
                placeholder="Descrivi il libro che vuoi scrivere..."
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-sky-400/50 focus:outline-none"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo (opzionale)"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35"
              />
              <div className="flex flex-wrap gap-2">
                {IDEA_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setIdea(ex)}
                    className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] text-white/70 hover:bg-white/10"
                  >
                    {ex.slice(0, 42)}…
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Obiettivo del libro</h2>
              <p className="text-sm text-white/65">Scegli la direzione commerciale e narrativa.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {BOOK_OBJECTIVES.map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => {
                      setObjectiveId(obj.id);
                      setChapters(obj.numberOfChapters);
                      if (!isFree) setBookLength(obj.bookLength as "short" | "medium" | "long");
                    }}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      objectiveId === obj.id
                        ? "border-sky-400/50 bg-sky-400/12 ring-1 ring-sky-400/30"
                        : "border-white/12 bg-white/5 hover:border-white/25"
                    }`}
                  >
                    <p className="text-sm font-semibold text-white">{obj.label}</p>
                    <p className="mt-1 text-[11px] text-white/60">{obj.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Stile autore</h2>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                      styleProfile.presetId === p.id
                        ? "border-amber-300/50 bg-amber-400/15 text-amber-100"
                        : "border-white/12 text-white/70 hover:bg-white/8"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {([
                ["voiceIntensity", "Voce autore"],
                ["emotionalIntensity", "Intensità emotiva"],
                ["poeticLevel", "Livello poetico"],
                ["dialogueLevel", "Livello dialoghi"],
                ["slowBurn", "Slow burn"],
                ["tensionIntensity", "Intensità tensione"],
                ["psychologicalDepth", "Profondità psicologica"],
                ["showDontTell", "Show don't tell"],
                ["narrativePace", "Ritmo narrativo"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 flex justify-between text-[11px] text-white/70">
                    <span>{label}</span>
                    <span>{styleProfile[key]}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={styleProfile[key]}
                    onChange={(e) => setStyleProfile((p) => ({ ...p, [key]: Number(e.target.value) }))}
                    className="w-full accent-sky-400"
                  />
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-white">Personaggi</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={generatingCharacter}
                    onClick={async () => {
                      if (generatingCharacter) return;
                      setGeneratingCharacter(true);
                      try {
                        const remaining = getWizardCharacterFreeRegensRemaining();
                        if (remaining <= 0) {
                          const { chargePremiumOperation } = await import("@/lib/billing/charge");
                          await chargePremiumOperation(
                            "character_studio_ai",
                            { source: "wizard_character_generate", genre: objective.genre || "fiction" },
                            undefined,
                            [idea.slice(0, 32) || "wizard"],
                          );
                        } else {
                          consumeWizardCharacterFreeRegen();
                          setFreeRegensLeft(getWizardCharacterFreeRegensRemaining());
                        }
                        const generated = generateWizardCharacter(`${idea}|${Date.now()}|${characters.length}`);
                        setCharacters((list) => {
                          const emptyIdx = list.findIndex((c) => !String(c.name || "").trim());
                          if (emptyIdx >= 0) {
                            return list.map((c, i) => (i === emptyIdx ? generated : c));
                          }
                          return [...list, generated];
                        });
                        setFreeRegensLeft(getWizardCharacterFreeRegensRemaining());
                        toast.success("Personaggio generato.");
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "Generazione non disponibile";
                        toast.error(msg);
                      } finally {
                        setGeneratingCharacter(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-400/12 px-2.5 py-1 text-[11px] font-semibold text-sky-100 disabled:opacity-50"
                  >
                    {generatingCharacter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Genera Personaggio
                  </button>
                  <button
                    type="button"
                    onClick={() => setCharacters((c) => [...c, emptyCharacter()])}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/80"
                  >
                    <Plus className="h-3 w-3" /> Aggiungi
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-white/55">
                Rigenerazioni gratuite rimaste: <span className="font-bold tabular-nums text-sky-200">{freeRegensLeft}</span>
                {freeRegensLeft <= 0 && " · dalla prossima operazione verranno consumati crediti"}
              </p>
              {characters.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-white/12 bg-white/5 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={ch.name}
                      onChange={(e) => setCharacters((list) => list.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))}
                      placeholder="Nome"
                      className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setCharacters((list) => list.filter((_, i) => i !== idx))}
                      className="rounded-lg p-2 text-white/50 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ["role", "Ruolo"],
                      ["wound", "Ferita / trauma"],
                      ["externalDesire", "Desiderio"],
                      ["secret", "Segreto"],
                      ["personality", "Conflitto / arco"],
                    ] as const).map(([field, ph]) => (
                      <input
                        key={field}
                        value={String(ch[field] || "")}
                        onChange={(e) => setCharacters((list) => list.map((c, i) => i === idx ? { ...c, [field]: e.target.value } : c))}
                        placeholder={ph}
                        className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white placeholder:text-white/30"
                      />
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-white/50 flex items-center gap-1">
                <Users className="h-3 w-3" /> Collegato automaticamente a Character Studio e continuity engine.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Struttura</h2>
              <label className="block text-sm text-white/70">
                Capitoli ({chapters})
                <input
                  type="range"
                  min={6}
                  max={32}
                  value={chapters}
                  onChange={(e) => setChapters(Number(e.target.value))}
                  className="mt-2 w-full accent-emerald-400"
                />
              </label>
              {!isFree && (
                <div className="grid grid-cols-3 gap-2">
                  {(["short", "medium", "long"] as const).map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setBookLength(len)}
                      className={`rounded-xl border py-2 text-xs font-semibold capitalize ${
                        bookLength === len ? "border-emerald-400/50 bg-emerald-400/12 text-emerald-100" : "border-white/12 text-white/65"
                      }`}
                    >
                      {len}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-white/55">
                Titoli capitolo coerenti, sottocapitoli e progressione narrativa — attivati automaticamente da blueprint + anti-repetition.
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-amber-300" />
              <h2 className="text-2xl font-bold text-white">Pronto per il bestseller</h2>
              <p className="text-sm text-white/65">
                Scriptora attiverà blueprint, humanizer, tension engine, editorial intelligence e market intelligence — senza che tu debba configurarli.
              </p>
              <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-left text-xs text-white/70 space-y-1">
                <p><strong className="text-white">Idea:</strong> {idea.slice(0, 120)}{idea.length > 120 ? "…" : ""}</p>
                <p><strong className="text-white">Obiettivo:</strong> {objective.label}</p>
                <p><strong className="text-white">Capitoli:</strong> {chapters}</p>
                <p><strong className="text-white">Personaggi:</strong> {characters.filter((c) => c.name?.trim()).length}</p>
              </div>
            </div>
          )}
        </div>

        <WizardLiveIntelligencePanel {...intelProps} />
        </div>

        <div className="scriptora-wizard-footer flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Indietro
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-950"
            >
              Avanti <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={openStudio}
                className="rounded-xl border border-white/20 px-4 py-2 text-xs font-medium text-white/80"
              >
                Apri in Studio (avanzato)
              </button>
              <button
                type="button"
                disabled={launching}
                onClick={() => void launchBestseller()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60"
              >
                {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                Genera libro bestseller
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
