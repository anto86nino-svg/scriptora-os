import { useState } from "react";
import { BOOK_LENGTH_CONFIG, BookConfig, BookLength, Language, ChapterLength, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";

interface BookConfigFormProps {
  onSubmit: (config: BookConfig) => void;
}

const LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];
const LENGTHS: { value: ChapterLength; label: string }[] = [
  { value: "short", label: "Short (~1000 words)" },
  { value: "medium", label: "Medium (~2000 words)" },
  { value: "long", label: "Long (~4000 words)" },
];

export function BookConfigForm({ onSubmit }: BookConfigFormProps) {
  const [config, setConfig] = useState<BookConfig>({
    genre: "self-help",
    category: "Self Help",
    subcategory: "Mindset",
    title: "",
    subtitle: "",
    tone: "introspective, emotional, philosophical",
    authorStyle: "Brianna Wiest-inspired: poetic, deeply personal, universally relatable",
    language: "English",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 10,
    subchaptersEnabled: true,
    subchaptersPerChapter: DEFAULT_SUBCHAPTERS_PER_CHAPTER,
  });

  const update = (key: keyof BookConfig, value: any) => setConfig(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold text-foreground">Create Your Book</h2>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
          <input
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="The Mountain Is You"
            value={config.title}
            onChange={e => update("title", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Subtitle</label>
          <input
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Transforming Self-Sabotage Into Self-Mastery"
            value={config.subtitle}
            onChange={e => update("subtitle", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Tone</label>
          <input
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={config.tone}
            onChange={e => update("tone", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Author Style DNA</label>
          <input
            className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={config.authorStyle}
            onChange={e => update("authorStyle", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Language</label>
            <select
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={config.language}
              onChange={e => update("language", e.target.value)}
            >
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chapter Length</label>
            <select
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={config.chapterLength}
              onChange={e => update("chapterLength", e.target.value as ChapterLength)}
            >
              {LENGTHS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chapters</label>
            <input
              type="number"
              min={3}
              max={50}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={config.numberOfChapters}
              onChange={e => update("numberOfChapters", Math.max(3, Math.min(50, parseInt(e.target.value) || 10)))}
            />
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.subchaptersEnabled}
                onChange={e => update("subchaptersEnabled", e.target.checked)}
                className="rounded border-border accent-primary"
              />
              <span className="text-sm text-foreground">Subchapters</span>
            </label>
          </div>
        </div>

        {config.subchaptersEnabled && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Subchapters per chapter</label>
            <input
              type="number"
              min={1}
              max={8}
              className="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={config.subchaptersPerChapter ?? DEFAULT_SUBCHAPTERS_PER_CHAPTER}
              onChange={e => update("subchaptersPerChapter", Math.max(1, Math.min(8, parseInt(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)))}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Used by the blueprint and real subchapter generation.</p>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <label className="text-xs font-medium text-muted-foreground block">Book Length</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.entries(BOOK_LENGTH_CONFIG) as [BookLength, typeof BOOK_LENGTH_CONFIG[BookLength]][]).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => update("bookLength", key)}
                className={`rounded-md border px-2 py-2 text-left text-xs transition-colors ${
                  config.bookLength === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/50 text-foreground hover:bg-muted/40"
                }`}
              >
                <span className="block font-semibold">{value.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {key === "custom" ? "Custom words" : `~${(value.totalWords / 1000).toFixed(0)}k words`}
                </span>
              </button>
            ))}
          </div>
          {config.bookLength === "custom" && (
            <div className="grid gap-2 sm:grid-cols-[1fr,120px]">
              <input
                type="range"
                min={5000}
                max={200000}
                step={1000}
                value={config.customTotalWords ?? 30000}
                onChange={(e) => update("customTotalWords", Number(e.target.value) || 30000)}
                className="w-full accent-primary"
              />
              <input
                type="number"
                min={1000}
                step={500}
                value={config.customTotalWords ?? 30000}
                onChange={(e) => update("customTotalWords", Math.max(1000, Number(e.target.value) || 30000))}
                className="w-full bg-surface border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => config.title && onSubmit(config)}
        disabled={!config.title}
        className="w-full py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate Book
      </button>
    </div>
  );
}
