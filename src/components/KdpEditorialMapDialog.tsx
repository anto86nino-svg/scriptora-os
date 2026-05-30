import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookMarked, Compass, Copy, Layers, Map, Sparkles, Target, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { generateKdpEditorialMap, type KdpBookPlan, type KdpEditorialMap } from "@/lib/kdp-editorial-map";
import type { Language } from "@/types/book";

interface KdpEditorialMapDialogProps {
  open: boolean;
  onClose: () => void;
  onUseBook: (book: KdpBookPlan, map: KdpEditorialMap) => void;
}

const LANGUAGES: Language[] = ["Italian", "English", "Spanish", "French", "German"];
const GENRES = ["self-help", "business", "productivity", "spirituality", "romance", "dark-romance", "thriller", "fantasy", "children", "manual"];

function mapToClipboardText(map: KdpEditorialMap): string {
  return [
    `Mappa KDP: ${map.niche}`,
    map.positioning,
    "",
    "Collane:",
    ...map.series.map((series) => `- ${series.name}: ${series.promise}`),
    "",
    "Libri da scrivere:",
    ...map.books.map((book) => `${book.priority}. ${book.title} - ${book.subtitle} [${book.seriesName}]`),
  ].join("\n");
}

export function KdpEditorialMapDialog({ open, onClose, onUseBook }: KdpEditorialMapDialogProps) {
  const [niche, setNiche] = useState("");
  const [genre, setGenre] = useState("self-help");
  const [language, setLanguage] = useState<Language>("Italian");
  const [targetAudience, setTargetAudience] = useState("");
  const [map, setMap] = useState<KdpEditorialMap | null>(null);

  useEffect(() => {
    if (!open) return;
    setMap((current) => current || generateKdpEditorialMap({
      niche: "ansia quotidiana per adulti impegnati",
      genre: "self-help",
      language: "Italian",
      targetAudience: "adulti che vogliono strumenti pratici e immediati",
    }));
  }, [open]);

  const canGenerate = niche.trim().length >= 3;

  const visibleMap = useMemo(() => map, [map]);

  if (!open) return null;

  const generateMap = () => {
    const next = generateKdpEditorialMap({
      niche: niche.trim(),
      genre,
      language,
      targetAudience: targetAudience.trim() || undefined,
    });
    setMap(next);
    toast.success("Mappa editoriale generata.");
  };

  const copyMap = async () => {
    if (!visibleMap) return;
    try {
      await navigator.clipboard.writeText(mapToClipboardText(visibleMap));
      toast.success("Mappa copiata.");
    } catch {
      toast.error("Copia non riuscita.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/75 p-3 pb-safe pt-safe backdrop-blur-2xl sm:p-4"
      onClick={onClose}
    >
      <div
        className="ios-panel flex max-h-[min(90dvh,90vh)] w-full max-w-6xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="ios-icon ios-icon-green h-10 w-10 shrink-0 rounded-[16px]">
              <Map className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-foreground">Mappa Editoriale KDP</h2>
              <p className="text-[11px] text-muted-foreground">Titoli shadow, collane e lista libri da scrivere.</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button type="button" onClick={copyMap} className="ios-toolbar-button hidden h-9 px-3 text-xs font-semibold sm:inline-flex">
              <Copy className="h-3.5 w-3.5" />
              Copia
            </button>
            <button type="button" onClick={onClose} className="ios-toolbar-button h-9 w-9" aria-label="Chiudi Mappa KDP">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-3 overflow-y-auto border-b border-white/10 bg-white/[0.035] p-4 lg:border-b-0 lg:border-r">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Nicchia da dominare</label>
              <textarea
                value={niche}
                onChange={(event) => setNiche(event.target.value)}
                rows={3}
                placeholder="es. self-help per ansia quotidiana, romance slow burn, business per freelance..."
                className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Genere</label>
                <select
                  value={genre}
                  onChange={(event) => setGenre(event.target.value)}
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground outline-none"
                >
                  {GENRES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Lingua</label>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] px-2 text-xs text-foreground outline-none"
                >
                  {LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-muted-foreground">Pubblico</label>
              <input
                value={targetAudience}
                onChange={(event) => setTargetAudience(event.target.value)}
                placeholder="lettori, professionisti, mamme, creator..."
                className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="button"
              onClick={generateMap}
              disabled={!canGenerate}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <Wand2 className="h-4 w-4" />
              Genera mappa
            </button>

            {visibleMap && (
              <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-200">
                  <Compass className="h-3.5 w-3.5" />
                  Posizionamento
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{visibleMap.positioning}</p>
              </div>
            )}
          </aside>

          <main className="min-h-0 overflow-y-auto p-4 scrollbar-thin">
            {visibleMap && (
              <div className="space-y-5">
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sky-300" />
                    <h3 className="text-sm font-semibold text-foreground">Titoli shadow</h3>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {visibleMap.shadowTitles.slice(0, 8).map((title) => (
                      <div key={`${title.title}-${title.angle}`} className="rounded-lg border border-white/10 bg-white/[0.055] p-3">
                        <p className="text-sm font-semibold leading-5 text-foreground">{title.title}</p>
                        <p className="mt-1 text-xs leading-4 text-muted-foreground">{title.subtitle}</p>
                        <p className="mt-2 text-[10px] uppercase text-sky-300">{title.angle} · {title.confidence}%</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-300" />
                    <h3 className="text-sm font-semibold text-foreground">Collane da creare</h3>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {visibleMap.series.map((series) => (
                      <div key={series.id} className="rounded-lg border border-white/10 bg-white/[0.055] p-3">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Collana {series.order}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{series.name}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{series.promise}</p>
                        <p className="mt-2 text-[10px] font-semibold uppercase text-emerald-300">{series.bookCount} libri</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-300" />
                    <h3 className="text-sm font-semibold text-foreground">Lista libri da scrivere</h3>
                  </div>
                  <div className="space-y-2">
                    {visibleMap.books.map((book) => (
                      <div key={book.id} className="group rounded-lg border border-white/10 bg-white/[0.055] p-3 transition hover:border-primary/40">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">#{book.priority}</span>
                              <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-[10px] text-muted-foreground">{book.seriesName}</span>
                              <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-200">{book.kdpAngle}</span>
                            </div>
                            <p className="text-sm font-semibold leading-5 text-foreground">{book.title}</p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{book.subtitle}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {book.keywords.slice(0, 6).map((keyword) => (
                                <span key={`${book.id}-${keyword}`} className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUseBook(book, visibleMap)}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                          >
                            <BookMarked className="h-3.5 w-3.5" />
                            Scrivi
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
