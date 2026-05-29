import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bomb, Flame, Loader2, RefreshCw } from "lucide-react";
import { AutoBestsellerInput } from "@/services/autoBestsellerService";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { BOOK_LENGTH_CONFIG, DEFAULT_SUBCHAPTERS_PER_CHAPTER, type BookLength, type Language } from "@/types/book";
import { generateShadowTitleSet } from "@/lib/title-shadow";

interface Props {
  isRunning: boolean;
  initialInput?: Partial<AutoBestsellerInput> | null;
  autoStart?: boolean;
  onGenerateOne: (input: AutoBestsellerInput) => void;
  onGenerateBatch: (input: AutoBestsellerInput, count: number) => void;
}

const GENRES = [
  "self-help", "romance", "dark-romance", "thriller", "horror", "fantasy",
  "sci-fi", "historical", "memoir", "philosophy", "business", "spirituality",
  "children", "poetry",
];

const TONES = [
  "natural", "intense", "warm", "ironic", "poetic", "minimalist",
  "academic", "conversational", "dark", "uplifting",
];

const LANGUAGES = ["English", "Italian", "Spanish", "French", "German", "Portuguese"];

export function InputPanel({ isRunning, initialInput, autoStart, onGenerateOne, onGenerateBatch }: Props) {
  const selectedAuthor = getSelectedAuthorIdentity();
  const [idea, setIdea] = useState(initialInput?.idea ?? "");
  const [authorName, setAuthorName] = useState(initialInput?.authorName ?? selectedAuthor.penName);
  const [genre, setGenre] = useState(initialInput?.genre ?? "self-help");
  const [subcategory, setSubcategory] = useState(initialInput?.subcategory ?? "");
  const [targetAudience, setTargetAudience] = useState(initialInput?.targetAudience ?? "");
  const [tone, setTone] = useState(initialInput?.tone ?? "natural");
  const [language, setLanguage] = useState(initialInput?.language ?? "English");
  const [titleLanguage, setTitleLanguage] = useState(initialInput?.titleLanguage ?? initialInput?.language ?? "English");
  const [prefilledTitle, setPrefilledTitle] = useState(initialInput?.prefilledTitle ?? "");
  const [prefilledSubtitle, setPrefilledSubtitle] = useState(initialInput?.prefilledSubtitle ?? "");
  const [numberOfChapters, setNumberOfChapters] = useState(initialInput?.numberOfChapters ?? 8);
  const [subchaptersEnabled, setSubchaptersEnabled] = useState(initialInput?.subchaptersEnabled ?? false);
  const [subchaptersPerChapter, setSubchaptersPerChapter] = useState(initialInput?.subchaptersPerChapter ?? DEFAULT_SUBCHAPTERS_PER_CHAPTER);
  const [bookLength, setBookLength] = useState<BookLength>(
    initialInput?.bookLength ?? (initialInput?.totalWordTarget ? "custom" : "medium"),
  );
  const [customTotalWords, setCustomTotalWords] = useState(
    initialInput?.customTotalWords ?? initialInput?.totalWordTarget ?? 30000,
  );
  const [charactersText, setCharactersText] = useState(initialInput?.charactersText ?? "");

  // Apply external prefill (e.g. from Home or Recent Runs)
  useEffect(() => {
    if (!initialInput) return;
    if (initialInput.idea !== undefined) setIdea(initialInput.idea);
    if (initialInput.authorName !== undefined) setAuthorName(initialInput.authorName);
    if (initialInput.genre !== undefined) setGenre(initialInput.genre);
    if (initialInput.subcategory !== undefined) setSubcategory(initialInput.subcategory ?? "");
    if (initialInput.targetAudience !== undefined) setTargetAudience(initialInput.targetAudience);
    if (initialInput.tone !== undefined) setTone(initialInput.tone);
    if (initialInput.language !== undefined) setLanguage(initialInput.language);
    if (initialInput.titleLanguage !== undefined) setTitleLanguage(initialInput.titleLanguage);
    if (initialInput.prefilledTitle !== undefined) setPrefilledTitle(initialInput.prefilledTitle);
    if (initialInput.prefilledSubtitle !== undefined) setPrefilledSubtitle(initialInput.prefilledSubtitle);
    if (initialInput.numberOfChapters !== undefined) setNumberOfChapters(initialInput.numberOfChapters);
    if (initialInput.subchaptersEnabled !== undefined) setSubchaptersEnabled(initialInput.subchaptersEnabled);
    if (initialInput.subchaptersPerChapter !== undefined) setSubchaptersPerChapter(initialInput.subchaptersPerChapter);
    if (initialInput.bookLength !== undefined) setBookLength(initialInput.bookLength);
    if (initialInput.customTotalWords !== undefined || initialInput.totalWordTarget !== undefined) {
      setCustomTotalWords(initialInput.customTotalWords ?? initialInput.totalWordTarget ?? 30000);
    }
    if (initialInput.charactersText !== undefined) setCharactersText(initialInput.charactersText);
  }, [initialInput]);

  const valid = idea.trim().length > 10;

  const improveIdea = () => {
    if (isRunning) return;

    const currentIdea = idea.trim();

    if (!currentIdea) {
      setIdea(
        "Un libro pratico e trasformativo che aiuta il lettore a superare un blocco reale, con esempi concreti, una promessa chiara e un percorso capitolo dopo capitolo."
      );
      return;
    }

    if (currentIdea.length < 80) {
      setIdea(
        `${currentIdea}. Trasforma questa idea in un libro concreto, utile e vendibile: definisci il problema principale del lettore, la promessa di trasformazione, gli ostacoli emotivi e pratici, e un percorso progressivo che porti da confusione a chiarezza.`
      );
      return;
    }

    setIdea(currentIdea);
  };


  const improveTone = () => {
    if (!tone || tone === "natural") {
      setTone("warm, insightful, transformative");
      return;
    }

    const current = tone.trim();
    if (!current.toLowerCase().includes("insightful")) {
      setTone(`${current}, insightful, emotionally engaging`);
    }
  };

  const suggestAudienceTone = () => {
    if (isRunning) return;

    if (!targetAudience.trim()) {
      setTargetAudience(
        "lettori adulti che vogliono migliorare la propria vita con un approccio chiaro, umano, pratico e profondo"
      );
    }

    if (!tone || tone === "natural") {
      setTone("warm, insightful, transformative");
    }
  };

  const generateBookTitle = () => {
    const candidates = generateShadowTitleSet({
      title: prefilledTitle,
      subtitle: prefilledSubtitle,
      idea,
      genre,
      subcategory,
      targetAudience,
      tone,
      language,
      titleLanguage: titleLanguage as Language,
      readerPromise: targetAudience,
      seed: Date.now(),
    }, 1);
    const best = candidates[0];
    if (!best) return;
    setPrefilledTitle(best.title);
    setPrefilledSubtitle(best.subtitle);
  };


  const buildInput = (): AutoBestsellerInput => ({
    idea: idea.trim(),
    authorName: authorName.trim() || selectedAuthor.penName,
    authorIdentityId: initialInput?.authorIdentityId || selectedAuthor.id,
    authorIdentity: initialInput?.authorIdentity || selectedAuthor,
    genre,
    subcategory: subcategory.trim() || undefined,
    targetAudience: targetAudience.trim() || "",
    tone,
    language,
    titleLanguage,
    prefilledTitle: prefilledTitle.trim() || undefined,
    prefilledSubtitle: prefilledSubtitle.trim() || undefined,
    numberOfChapters,
    subchaptersEnabled,
    subchaptersPerChapter: subchaptersEnabled
      ? Math.max(1, Math.min(8, Number(subchaptersPerChapter) || DEFAULT_SUBCHAPTERS_PER_CHAPTER))
      : undefined,
    bookLength,
    customTotalWords: bookLength === "custom" ? customTotalWords : undefined,
    totalWordTarget: bookLength === "custom" ? customTotalWords : BOOK_LENGTH_CONFIG[bookLength].totalWords,
    charactersText: charactersText.trim() || undefined,
  });

  // Auto-start once when conditions met (e.g. coming from Home with prefilled brief)
  useEffect(() => {
    if (autoStart && valid && !isRunning) {
      onGenerateOne(buildInput());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Book Architect Brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="idea">Idea / Argomento</Label>
            <Button type="button" variant="ghost" size="sm" onClick={improveIdea} disabled={isRunning} className="h-7 px-2 text-xs">
              <span className="mr-1">✨</span> Genera con IA
            </Button>
          </div>
          <Textarea
            id="idea"
            placeholder="e.g. A practical guide to overcoming social anxiety using cognitive behavioral techniques"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            disabled={isRunning}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="book-title">Titolo reale del libro</Label>
            <Input
              id="book-title"
              value={prefilledTitle}
              onChange={(e) => setPrefilledTitle(e.target.value)}
              placeholder="Es. The Cathedral of Forgotten Souls"
              disabled={isRunning}
            />
          </div>
          <div>
            <Label htmlFor="book-subtitle">Sottotitolo reale</Label>
            <Input
              id="book-subtitle"
              value={prefilledSubtitle}
              onChange={(e) => setPrefilledSubtitle(e.target.value)}
              placeholder="Ogni segreto ha un prezzo."
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <Label htmlFor="title-language">Lingua titolo/sottotitolo</Label>
            <Select value={titleLanguage} onValueChange={setTitleLanguage} disabled={isRunning}>
              <SelectTrigger id="title-language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={generateBookTitle} disabled={isRunning || idea.trim().length < 8} className="h-10">
              <RefreshCw className="mr-2 h-4 w-4" />
              Genera titolo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="genre">Genre</Label>
            <Select value={genre} onValueChange={setGenre} disabled={isRunning}>
              <SelectTrigger id="genre"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subcategory">Subcategory <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. anxiety, productivity"
              disabled={isRunning}
            />
          </div>
        </div>

          <div>
            <Label htmlFor="audience">Target audience <span className="text-muted-foreground text-xs">(optional — inferred if empty)</span></Label>
          <Input
            id="audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. professionals 25-40 dealing with workplace anxiety"
            disabled={isRunning}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="tone">Tono</Label>
              <Button type="button" variant="ghost" size="sm" onClick={improveTone} disabled={isRunning} className="h-7 px-2 text-xs">
                <span className="mr-1">✨</span> Suggerisci
              </Button>
            </div>
            <Select value={tone} onValueChange={setTone} disabled={isRunning}>
              <SelectTrigger id="tone"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage} disabled={isRunning}>
              <SelectTrigger id="language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="chapters">Chapters</Label>
            <Input
              id="chapters"
              type="number"
              min={3}
              max={50}
              value={numberOfChapters}
              onChange={(e) => setNumberOfChapters(Math.max(3, Math.min(50, Number(e.target.value) || 8)))}
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={subchaptersEnabled}
              onChange={(e) => setSubchaptersEnabled(e.target.checked)}
              disabled={isRunning}
              className="rounded border-border accent-primary"
            />
            Genera sottocapitoli reali
          </label>
          {subchaptersEnabled && (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,120px]">
              <div>
                <Label htmlFor="subchapters-per-chapter">Sottocapitoli per capitolo</Label>
                <p className="text-xs text-muted-foreground">Scriptora creerà beat narrativi separati, non semplici etichette decorative.</p>
              </div>
              <Input
                id="subchapters-per-chapter"
                type="number"
                min={1}
                max={8}
                value={subchaptersPerChapter}
                onChange={(e) => setSubchaptersPerChapter(Math.max(1, Math.min(8, Number(e.target.value) || DEFAULT_SUBCHAPTERS_PER_CHAPTER)))}
                disabled={isRunning}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <Label>Book Length</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.entries(BOOK_LENGTH_CONFIG) as [BookLength, typeof BOOK_LENGTH_CONFIG[BookLength]][]).map(([key, value]) => (
              <button
                key={key}
                type="button"
                disabled={isRunning}
                onClick={() => setBookLength(key)}
                className={`rounded-md border px-2.5 py-2 text-left text-xs transition-colors disabled:opacity-50 ${
                  bookLength === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/50 text-foreground hover:bg-muted/40"
                }`}
              >
                <span className="block font-semibold">{value.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {key === "custom" ? "Custom" : `~${(value.totalWords / 1000).toFixed(0)}k words`}
                </span>
              </button>
            ))}
          </div>
          {bookLength === "custom" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,140px]">
              <Input
                type="range"
                min={5000}
                max={200000}
                step={1000}
                value={customTotalWords}
                onChange={(e) => setCustomTotalWords(Number(e.target.value) || 30000)}
                disabled={isRunning}
                className="accent-primary"
              />
              <Input
                type="number"
                min={1000}
                step={500}
                value={customTotalWords}
                onChange={(e) => setCustomTotalWords(Math.max(1000, Number(e.target.value) || 30000))}
                disabled={isRunning}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button
            className="flex-1"
            disabled={!valid || isRunning}
            onClick={() => onGenerateOne(buildInput())}
          >
            {isRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flame className="mr-2 h-4 w-4" />}
            Build narrative blueprint
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={!valid || isRunning}
            onClick={() => onGenerateBatch(buildInput(), 10)}
            title="One blueprint at a time"
          >
            <Bomb className="mr-2 h-4 w-4" />
            One book at a time
          </Button>
        </div>
        {!valid && !isRunning && (
          <p className="text-xs text-muted-foreground">Describe your idea in at least a few words to begin architecture.</p>
        )}
      </CardContent>
    </Card>
  );
}
