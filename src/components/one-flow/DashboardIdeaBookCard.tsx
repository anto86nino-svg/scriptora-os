import { useState, type ReactNode } from "react";
import { ArrowRight, Lightbulb, Loader2, PencilLine, Sparkles } from "lucide-react";
import {
  BOOK_LENGTH_CONFIG,
  type BookLength,
  type Genre,
  type Language,
} from "@/types/book";
import type { PlanTier } from "@/lib/plan";
import {
  buildIdeaBookDraft,
  type IdeaBookDraft,
} from "@/lib/book-creation-os/idea-book-flow";

const BOOK_LANGUAGES: Array<{ value: Language; label: string }> = [
  { value: "Italian", label: "Italiano" },
  { value: "English", label: "English" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "German", label: "Deutsch" },
];

const BOOK_FORMATS = [
  "novel",
  "novella",
  "poetry_collection",
  "poetic_essay",
  "lyrical_prose",
  "short_story_collection",
  "essay",
  "short_essay",
  "manual",
  "guide",
  "self_help",
  "historical_essay",
  "memoir",
  "children_book",
  "study_material",
  "mixed_or_unknown",
] as const;

const GENRES: Genre[] = [
  "self-help",
  "romance",
  "dark-romance",
  "thriller",
  "fantasy",
  "philosophy",
  "business",
  "memoir",
  "education",
  "horror",
  "sci-fi",
  "historical",
  "children",
  "poetry",
  "manual",
];

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-black/22 px-3 py-2 text-xs text-white outline-none transition placeholder:text-white/30 focus:border-amber-200/45 focus:ring-2 focus:ring-amber-300/15";

type DashboardIdeaBookCardProps = {
  currentPlan: PlanTier;
  defaultLanguage: Language;
  onStartWriting: (draft: IdeaBookDraft) => void;
  onOpenAdvancedForge: (draft: IdeaBookDraft) => void;
};

export function DashboardIdeaBookCard({
  currentPlan,
  defaultLanguage,
  onStartWriting,
  onOpenAdvancedForge,
}: DashboardIdeaBookCardProps) {
  const [rawIdea, setRawIdea] = useState("");
  const [draft, setDraft] = useState<IdeaBookDraft | null>(null);
  const [building, setBuilding] = useState(false);
  const [launching, setLaunching] = useState(false);
  const validIdea = rawIdea.trim().length >= 6;
  const busy = building || launching;
  const chapterLabel = draft?.structureMode === "sections" ? "sezioni" : "capitoli";

  const updateDraft = <K extends keyof IdeaBookDraft>(key: K, value: IdeaBookDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const createDraft = () => {
    if (!validIdea) return;
    setBuilding(true);
    try {
      setDraft(buildIdeaBookDraft(rawIdea, {
        language: defaultLanguage,
        planIsFree: currentPlan === "free",
      }));
    } finally {
      setBuilding(false);
    }
  };

  const startWriting = () => {
    if (!draft) return;
    setLaunching(true);
    onStartWriting(draft);
  };

  return (
    <section className="mb-5 overflow-hidden rounded-[1.75rem] border border-amber-300/28 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(15,23,42,0.86)_46%,rgba(56,189,248,0.10))] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.24)] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-slate-950 shadow-[0_16px_44px_rgba(245,158,11,0.28)]">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/75">Nuovo percorso</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Idea Libro</h2>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/68">
            Scrivi un'idea grezza. Scriptora la trasforma in titolo, struttura e libro pronto da scrivere.
          </p>
          <label htmlFor="idea-book-input" className="mt-4 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            La tua idea
          </label>
          <textarea
            id="idea-book-input"
            value={rawIdea}
            onChange={(event) => {
              setRawIdea(event.target.value);
              if (draft) setDraft(null);
            }}
            placeholder="Es. Un libro sul narcisismo, un manuale sui pomodori, un saggio breve sulle dipendenze..."
            rows={4}
            disabled={busy}
            className="mt-2 min-h-[112px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-amber-200/45 focus:ring-2 focus:ring-amber-300/20 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={createDraft}
            disabled={!validIdea || busy}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Crea progetto
          </button>
          {!validIdea && (
            <p className="mt-2 text-xs text-white/45">Inserisci almeno qualche parola: anche una frase grezza va bene.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/18 p-3 sm:p-4">
          {!draft ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <PencilLine className="h-8 w-8 text-white/28" />
              <p className="mt-3 text-sm font-semibold text-white/72">Scriptora preparera qui la configurazione editoriale.</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-white/45">
                Titolo, sottotitolo, formato, tono, pubblico e struttura restano modificabili prima del Writer Studio.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/75">Scriptora ha capito che vuoi creare</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Titolo">
                  <input value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} className={INPUT_CLASS} />
                </Field>
                <Field label="Sottotitolo">
                  <input value={draft.subtitle} onChange={(e) => updateDraft("subtitle", e.target.value)} className={INPUT_CLASS} />
                </Field>
                <Field label="Lingua">
                  <select value={draft.language} onChange={(e) => updateDraft("language", e.target.value as Language)} className={INPUT_CLASS}>
                    {BOOK_LANGUAGES.map((language) => (
                      <option key={language.value} value={language.value}>{language.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Formato libro">
                  <select value={draft.bookFormat} onChange={(e) => updateDraft("bookFormat", e.target.value as IdeaBookDraft["bookFormat"])} className={INPUT_CLASS}>
                    {BOOK_FORMATS.map((format) => (
                      <option key={format} value={format}>{format.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Genere">
                  <select value={draft.genre} onChange={(e) => updateDraft("genre", e.target.value as Genre)} className={INPUT_CLASS}>
                    {GENRES.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Categoria">
                  <input value={draft.category} onChange={(e) => updateDraft("category", e.target.value)} className={INPUT_CLASS} />
                </Field>
                <Field label="Sottocategoria">
                  <input value={draft.subcategory} onChange={(e) => updateDraft("subcategory", e.target.value)} className={INPUT_CLASS} />
                </Field>
                <Field label="Lunghezza">
                  <select value={draft.bookLength} onChange={(e) => updateDraft("bookLength", e.target.value as BookLength)} className={INPUT_CLASS}>
                    {(Object.keys(BOOK_LENGTH_CONFIG) as BookLength[]).map((length) => (
                      <option key={length} value={length}>{BOOK_LENGTH_CONFIG[length].label}</option>
                    ))}
                  </select>
                </Field>
                <Field label={chapterLabel}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={draft.chaptersCount}
                    onChange={(e) => updateDraft("chaptersCount", Math.max(1, Math.min(60, Number(e.target.value) || draft.chaptersCount)))}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Sottocapitoli">
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/22 px-3 py-2 text-xs text-white/80">
                    <input
                      type="checkbox"
                      checked={draft.subchaptersEnabled}
                      onChange={(e) => updateDraft("subchaptersEnabled", e.target.checked)}
                      className="accent-amber-300"
                    />
                    <span>{draft.subchaptersEnabled ? "Attivi" : "Disattivati"}</span>
                    {draft.subchaptersEnabled && (
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={draft.subchaptersPerChapter}
                        onChange={(e) => updateDraft("subchaptersPerChapter", Math.max(1, Math.min(8, Number(e.target.value) || 3)))}
                        className="ml-auto h-7 w-14 rounded-lg border border-white/10 bg-white/[0.08] px-2 text-xs text-white outline-none"
                      />
                    )}
                  </div>
                </Field>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Tono">
                  <textarea value={draft.tone} onChange={(e) => updateDraft("tone", e.target.value)} rows={2} className={`${INPUT_CLASS} min-h-[68px] resize-none`} />
                </Field>
                <Field label="Pubblico ideale">
                  <textarea value={draft.targetReader} onChange={(e) => updateDraft("targetReader", e.target.value)} rows={2} className={`${INPUT_CLASS} min-h-[68px] resize-none`} />
                </Field>
              </div>
              <Field label="Promessa del libro" className="mt-3">
                <textarea value={draft.promise} onChange={(e) => updateDraft("promise", e.target.value)} rows={2} className={`${INPUT_CLASS} min-h-[74px] resize-none`} />
              </Field>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={startWriting}
                  disabled={launching}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:opacity-60"
                >
                  {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Inizia a scrivere
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAdvancedForge(draft)}
                  disabled={launching}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.07] px-4 text-sm font-bold text-white/82 transition hover:bg-white/[0.12] disabled:opacity-60"
                >
                  Modifica con Book Forge
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{label}</span>
      {children}
    </label>
  );
}
