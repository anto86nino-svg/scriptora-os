import { useEffect, useMemo, useState } from "react";
import { Users, Wand2, Save, X, Loader2, BookOpen, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUserId } from "@/services/storageService";

export const SCRIPTORA_CHARACTER_BIBLE_KEY = "scriptora-character-bible-v1";
export const SCRIPTORA_CHARACTER_PROJECT_KEY = "scriptora-character-project-v1";
const SCRIPTORA_IDEA_HISTORY_KEY = "scriptora-character-idea-history-v1";

type ChoiceOption = string | { value: string; label: string };

function optionValue(option: ChoiceOption): string {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: ChoiceOption): string {
  return typeof option === "string" ? option : option.label;
}

const ROMAN_GENRES_PRO: ChoiceOption[] = [
  { value: "romance", label: "Romance" },
  { value: "dark-romance", label: "Dark romance" },
  { value: "romantasy", label: "Romantasy" },
  { value: "thriller", label: "Thriller" },
  { value: "psychological thriller", label: "Thriller psicologico" },
  { value: "crime", label: "Crime / noir" },
  { value: "mystery", label: "Mistero" },
  { value: "fantasy", label: "Fantasy" },
  { value: "urban fantasy", label: "Urban fantasy" },
  { value: "dark fantasy", label: "Dark fantasy" },
  { value: "epic fantasy", label: "Fantasy epico" },
  { value: "horror", label: "Horror" },
  { value: "gothic horror", label: "Horror gotico" },
  { value: "folk horror", label: "Folk horror" },
  { value: "sci-fi", label: "Fantascienza" },
  { value: "dystopian", label: "Distopico" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "historical fiction", label: "Romanzo storico" },
  { value: "literary fiction", label: "Narrativa letteraria" },
  { value: "young adult", label: "Young adult" },
  { value: "paranormal", label: "Paranormale" },
  { value: "adventure", label: "Avventura" },
  { value: "suspense", label: "Suspense" },
  { value: "family saga", label: "Saga familiare" },
  { value: "memoir narrativo", label: "Memoir narrativo" }
];

const SUBGENRES_PRO: ChoiceOption[] = [
  { value: "enemies to lovers", label: "Nemici che si innamorano" },
  { value: "second chance", label: "Seconda occasione" },
  { value: "forbidden love", label: "Amore proibito" },
  { value: "slow burn", label: "Slow burn" },
  { value: "small town", label: "Piccola città" },
  { value: "billionaire", label: "Billionaire romance" },
  { value: "workplace romance", label: "Romance sul lavoro" },
  { value: "fake dating", label: "Finta relazione" },
  { value: "forced proximity", label: "Costretti vicini" },
  { value: "age gap", label: "Differenza d’età" },
  { value: "friends to lovers", label: "Da amici ad amanti" },
  { value: "mafia romance", label: "Mafia romance" },
  { value: "psychological suspense", label: "Suspense psicologica" },
  { value: "domestic thriller", label: "Thriller domestico" },
  { value: "serial killer", label: "Serial killer" },
  { value: "missing person", label: "Persona scomparsa" },
  { value: "legal thriller", label: "Thriller legale" },
  { value: "conspiracy", label: "Cospirazione" },
  { value: "revenge story", label: "Storia di vendetta" },
  { value: "chosen one", label: "Prescelto" },
  { value: "portal fantasy", label: "Portal fantasy" },
  { value: "academy", label: "Academy" },
  { value: "royal court intrigue", label: "Intrighi di corte" },
  { value: "monster romance", label: "Monster romance" },
  { value: "haunted house", label: "Casa infestata" },
  { value: "survival horror", label: "Survival horror" },
  { value: "coming of age", label: "Formazione / crescita" },
  { value: "found family", label: "Famiglia trovata" },
  { value: "redemption arc", label: "Arco di redenzione" },
  { value: "morally grey characters", label: "Personaggi moralmente ambigui" }
];

const TONES_PRO: ChoiceOption[] = [
  "poetico e cinematografico",
  "dark e sensuale",
  "elegante e letterario",
  "veloce e commerciale",
  "emotivo da BookTok",
  "crudo e realistico",
  "ironico e brillante",
  "gotico e atmosferico",
  "epico e mitico",
  "intimo e confessionale",
  "sospeso e misterioso",
  "brutale e ad alta tensione",
  "romantico slow burn",
  "spicy ma elegante",
  "pulito e profondo",
  "melanconico e struggente"
];

const INTENSITIES_PRO: ChoiceOption[] = [
  { value: "soft", label: "Morbida" },
  { value: "medium", label: "Media" },
  { value: "intense", label: "Intensa" },
  { value: "slow burn", label: "Lenta e bruciante" },
  { value: "high drama", label: "Alto dramma" },
  { value: "high suspense", label: "Alta suspense" },
  { value: "emotional devastation", label: "Devastazione emotiva" },
  { value: "dark but elegant", label: "Dark ma elegante" },
  { value: "commercial page-turner", label: "Page-turner commerciale" },
  { value: "literary deep focus", label: "Profondità letteraria" }
];

const CHARACTER_DYNAMICS_PRO: ChoiceOption[] = [
  "amore proibito",
  "attrazione e colpa",
  "vendetta",
  "segreto familiare",
  "tradimento",
  "redenzione",
  "indagine",
  "sopravvivenza",
  "potere e corruzione",
  "destino contro libero arbitrio",
  "rivalità",
  "ossessione",
  "perdita e rinascita",
  "fuga dal passato",
  "identità nascosta",
  "nemici costretti a collaborare"
];



function ChoiceGrid({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const v = optionValue(option);
          const labelText = optionLabel(option);
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                active
                  ? "border-primary bg-primary/15 text-foreground shadow-sm"
                  : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/50 hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const GENRES = [
  { value: "romance", label: "Romance" },
  { value: "dark-romance", label: "Dark Romance" },
  { value: "thriller", label: "Thriller" },
  { value: "fantasy", label: "Fantasy" },
  { value: "memoir", label: "Memoir / Narrativa autobiografica" },
  { value: "historical", label: "Historical fiction" },
  { value: "horror", label: "Horror" },
  { value: "sci-fi", label: "Sci-fi" },
];

const LANGUAGES = ["Italian", "English", "Spanish", "French", "German"];

function fallbackCharacterBible(input: {
  idea: string;
  genre: string;
  subcategory: string;
  tone: string;
  intensity?: string;
  centralDynamic?: string;
  protagonistType?: string;
  language: string;
}) {
  const hash = Array.from(`${input.idea}|${input.genre}|${input.subcategory}|${input.centralDynamic || ""}`)
    .reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const namePairs = input.language === "Italian"
    ? [
      ["Livia", "D'Amico", "Nicolò", "Serra"],
      ["Marta", "Riva", "Elia", "Valenti"],
      ["Adele", "Ferri", "Tommaso", "Neri"],
      ["Bianca", "Moretti", "Damiano", "Greco"],
      ["Iris", "Leoni", "Vittorio", "Mancini"],
      ["Clara", "Santoro", "Enea", "Bellini"],
    ]
    : [
      ["Mara", "Voss", "Elias", "Reed"],
      ["Iris", "Vale", "Jonah", "Cross"],
      ["Nora", "Blake", "Theo", "Marsh"],
      ["Ada", "Rowe", "Julian", "Stone"],
      ["Celia", "Hart", "Noah", "Wren"],
      ["Vera", "Lane", "Silas", "Cole"],
    ];
  const professions = [
    "restauratrice di archivi e memoria familiare",
    "fotografa investigativa abituata a leggere dettagli invisibili",
    "traduttrice freelance che vive tra lingue, bugie e omissioni",
    "architetta di interni specializzata in case lasciate a metà",
    "ricercatrice che ha trasformato una colpa in metodo",
    "musicista che controlla tutto perché teme l'imprevisto",
  ];
  const counterpartRoles = [
    "antagonista emotivo / alleato necessario",
    "figura di svolta con agenda nascosta",
    "rivale professionale che conosce una parte della verità",
    "custode del luogo e della memoria che la protagonista evita",
    "testimone ambiguo, attrazione e minaccia insieme",
    "partner obbligato in una scelta che non lascia innocenti",
  ];
  const pair = namePairs[hash % namePairs.length];
  const profession = professions[hash % professions.length];
  const counterpartRole = counterpartRoles[(hash >>> 3) % counterpartRoles.length];
  const protagonistName = pair[0];
  const protagonistSurname = pair[1];
  const loveName = pair[2];
  const loveSurname = pair[3];

  return `Nome: ${protagonistName}
Cognome: ${protagonistSurname}
Età: 32
Ruolo nella storia: Protagonista / ${profession}
Aspetto fisico: Da definire con coerenza durante la scrittura, senza contraddizioni.
Carattere: Sensibile, osservatrice, ferita ma non fragile. Tende a scappare quando una verità emotiva diventa troppo vicina.
Ferita interiore: Ha perso fiducia nella possibilità di appartenere davvero a qualcuno o a un luogo.
Desiderio esterno: Ricominciare altrove e trovare una direzione concreta.
Bisogno interiore: Smettere di scappare e imparare a scegliere.
Segreto: Nasconde una paura profonda di essere vista davvero.
Rapporto con gli altri personaggi: Il suo rapporto con ${loveName} deve crescere lentamente, attraverso tensione, silenzi, gesti e conseguenze.
Regole di continuità: Non rinominare mai ${protagonistName}. Non trasformarla in un'altra persona. Ogni capitolo deve rispettare la sua ferita, il suo desiderio e il suo arco emotivo.

Nome: ${loveName}
Cognome: ${loveSurname}
Età: 35
Ruolo nella storia: ${input.genre.includes("romance") ? "Interesse romantico / " : ""}${counterpartRole}
Aspetto fisico: Presenza intensa, concreta, non patinata. Deve sembrare una persona reale, non un archetipo generico.
Carattere: Riservato, magnetico, segnato dal passato. Mostra più con i gesti che con le parole.
Ferita interiore: Porta una perdita o un fallimento che lo ha reso prudente nell'amore.
Desiderio esterno: Proteggere il suo mondo e non perdere il controllo.
Bisogno interiore: Accettare che amare di nuovo non significa tradire il passato.
Segreto: C'è una parte della sua storia che non racconta subito.
Rapporto con gli altri personaggi: Con ${protagonistName} deve esserci attrazione, paura, resistenza e progressiva fiducia.
Regole di continuità: Non rinominare mai ${loveName}. Non farlo confessare troppo presto. Ogni intimità deve avere una conseguenza narrativa.`;
}

function readIdeaHistory(): string[] {
  try {
    const raw = localStorage.getItem(SCRIPTORA_IDEA_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

function saveIdeaToHistory(nextIdea: string): void {
  const clean = nextIdea.replace(/\s+/g, " ").trim();
  if (!clean) return;
  const existing = readIdeaHistory().filter((item) => item.toLowerCase() !== clean.toLowerCase());
  try {
    localStorage.setItem(SCRIPTORA_IDEA_HISTORY_KEY, JSON.stringify([clean, ...existing].slice(0, 12)));
  } catch {
    /* noop */
  }
}

function buildLocalNovelIdea(input: {
  genre: string;
  subcategory: string;
  tone: string;
  intensity: string;
  centralDynamic: string;
  protagonistType: string;
  language: string;
}) {
  const scenes = [
    {
      protagonist: "una restauratrice di mappe antiche",
      place: "un archivio sotterraneo sotto una città termale",
      wound: "ha falsificato un documento per salvare qualcuno e non si è mai perdonata",
      desire: "ritrovare l'origine di una mappa senza proprietario",
      conflict: "ogni strada disegnata sulla carta anticipa una scelta che qualcuno farà davvero",
    },
    {
      protagonist: "un ex medico di bordo radiato",
      place: "una nave-laboratorio bloccata in un porto senza nome",
      wound: "ha lasciato morire una persona seguendo il protocollo invece del cuore",
      desire: "dimostrare che un'epidemia impossibile non è naturale",
      conflict: "la sola testimone è anche la persona che potrebbe distruggergli la reputazione",
    },
    {
      protagonist: "una violinista che sente le bugie come note stonate",
      place: "un conservatorio chiuso per restauri durante l'inverno",
      wound: "ha perso la sorella dopo aver ignorato l'ultima richiesta d'aiuto",
      desire: "suonare l'opera incompiuta che nessuno riesce a decifrare",
      conflict: "la partitura rivela confessioni che i vivi vogliono seppellire",
    },
    {
      protagonist: "un'erede che lavora sotto falso nome in un hotel sul lago",
      place: "una località elegante fuori stagione, piena di stanze vuote",
      wound: "crede che l'amore sia sempre una transazione mascherata",
      desire: "vendere l'hotel prima che la famiglia lo trasformi in un monumento alla menzogna",
      conflict: "l'uomo incaricato della perizia conosce il suo vero cognome e il motivo della sua fuga",
    },
    {
      protagonist: "una fotografa forense incapace di dimenticare i volti",
      place: "una valle dove la nebbia cancella i confini tra case e bosco",
      wound: "ha testimoniato contro la persona sbagliata",
      desire: "ricostruire l'ultimo giorno di una ragazza scomparsa",
      conflict: "le foto sviluppano dettagli che lei non ha mai scattato",
    },
    {
      protagonist: "un traduttore di lingue morte che non parla più con nessuno",
      place: "una biblioteca privata costruita dentro un faro",
      wound: "ha tradito il maestro che lo aveva salvato dalla strada",
      desire: "tradurre un diario che cambia lingua ogni notte",
      conflict: "la donna che lo sorveglia sembra conoscere tutte le frasi prima che vengano scritte",
    },
  ];
  const seed = Math.floor(Math.random() * scenes.length);
  const pick = scenes[seed];
  return `${pick.protagonist} arriva in ${pick.place} con una ferita precisa: ${pick.wound}. Vuole ${pick.desire}, ma scopre che ${pick.conflict}. La storia intreccia ${input.centralDynamic || "desiderio, conflitto e segreto"} con un tono ${input.tone || "cinematografico"} e intensità ${input.intensity || "media"}, evitando il solito schema di fuga romantica e costruendo una promessa narrativa più riconoscibile. La protagonista resta ${input.protagonistType || "contraddittoria e attiva"}, con lingua narrativa ${input.language}. Genere: ${optionLabel(ROMAN_GENRES_PRO.find(o => optionValue(o) === input.genre) || input.genre)}. Filone: ${optionLabel(SUBGENRES_PRO.find(o => optionValue(o) === input.subcategory) || input.subcategory)}.`;
}

export function CharacterStudioDialog({ open, onClose }: Props) {
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("romance");
  const [subcategory, setSubcategory] = useState("slow burn");
  const [tone, setTone] = useState("poetico e cinematografico");
  const [intensity, setIntensity] = useState("slow burn");
  const [centralDynamic, setCentralDynamic] = useState("attrazione e colpa");
  const [protagonistType, setProtagonistType] = useState("protagonista ferita ma combattiva");
  const [language, setLanguage] = useState("Italian");
  const [characterBible, setCharacterBible] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      const savedProject = localStorage.getItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
      const savedBible = localStorage.getItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
      if (savedProject) {
        const parsed = JSON.parse(savedProject);
        if (parsed.idea) setIdea(parsed.idea);
        if (parsed.genre) setGenre(parsed.genre);
        if (parsed.subcategory) setSubcategory(parsed.subcategory);
        if (parsed.tone) setTone(parsed.tone);
        if (parsed.intensity) setIntensity(parsed.intensity);
        if (parsed.centralDynamic) setCentralDynamic(parsed.centralDynamic);
        if (parsed.protagonistType) setProtagonistType(parsed.protagonistType);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.characterBible) setCharacterBible(parsed.characterBible);
      } else if (savedBible) {
        setCharacterBible(savedBible);
      }
    } catch {
      /* noop */
    }
  }, [open]);

  const generateNovelIdea = async () => {
    if (ideaLoading || loading) return;
    setIdeaLoading(true);

    try {
      const previousIdeas = readIdeaHistory();
      const diversitySeed = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.functions.invoke("scriptora-novel-idea", {
        body: {
          seedIdea: idea.trim(),
          genre,
          subcategory: subcategory.trim(),
          tone: tone.trim(),
          intensity,
          centralDynamic,
          protagonistType: protagonistType.trim(),
          language,
          diversitySeed,
          previousIdeas,
          userId: getCurrentUserId(),
        },
      });

      if (error) throw error;

      const generated = String(data?.idea || data?.text || "").trim();
      if (!generated) throw new Error("Idea vuota");

      setIdea(generated);
      saveIdeaToHistory(generated);
      toast.success("Idea romanzo generata da Scriptora con variante nuova.");
    } catch {
      const generated = buildLocalNovelIdea({
        genre,
        subcategory,
        tone,
        intensity,
        centralDynamic,
        protagonistType,
        language,
      });
      setIdea(generated);
      saveIdeaToHistory(generated);
      toast.warning("AI non disponibile: Scriptora ha creato un’idea locale di sicurezza.");
    } finally {
      setIdeaLoading(false);
    }
  };

  const canGenerate = idea.trim().length >= 8;

  const projectPayload = useMemo(() => ({
    idea: idea.trim(),
    genre,
    subcategory: subcategory.trim(),
    tone: tone.trim(),
    intensity,
    centralDynamic,
    protagonistType: protagonistType.trim(),
    language,
    category: "Fiction",
    bookType: "novel",
    characterBible: characterBible.trim(),
    createdAt: new Date().toISOString(),
  }), [idea, genre, subcategory, tone, intensity, centralDynamic, protagonistType, language, characterBible]);

  const generate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke("scriptora-character-bible", {
        body: {
          idea: idea.trim(),
          genre,
          subcategory: subcategory.trim(),
          tone: tone.trim(),
          intensity,
          centralDynamic,
          protagonistType: protagonistType.trim(),
          language,
          userId: getCurrentUserId(),
        },
      });

      if (error) throw error;

      const output =
        data?.characterBible ||
        data?.bible ||
        data?.text ||
        data?.result ||
        "";

      const finalText = String(output || "").trim() || fallbackCharacterBible({
        idea,
        genre,
        subcategory,
        tone,
        language,
      });

      setCharacterBible(finalText);
      toast.success("Personaggi generati. Ora salvali e collegali a Nuovo Libro.");
    } catch (e) {
      const finalText = fallbackCharacterBible({
        idea,
        genre,
        subcategory,
        tone,
        language,
      });
      setCharacterBible(finalText);
      toast.warning("AI non disponibile: ho creato una Character Bible locale di sicurezza.");
    } finally {
      setLoading(false);
    }
  };

  const saveAndLink = () => {
    const bible = String(characterBible || "").trim();

    if (!bible) {
      toast.error("Prima genera i personaggi: l’output Character Bible è vuoto.");
      return;
    }

    const payload = {
      idea: idea.trim(),
      genre,
      subcategory: subcategory.trim(),
      tone: tone.trim(),
      intensity,
      centralDynamic,
      protagonistType: protagonistType.trim(),
      language,
      category: "Fiction",
      bookType: "novel",
      characterBible: bible,
      savedAt: new Date().toISOString(),
    };

    const payloadJson = JSON.stringify(payload);

    let savedSomewhere = false;

    try {
      sessionStorage.setItem(SCRIPTORA_CHARACTER_BIBLE_KEY, bible);
      sessionStorage.setItem(SCRIPTORA_CHARACTER_PROJECT_KEY, payloadJson);
      savedSomewhere = true;
    } catch (e) {
      console.warn("[CharacterStudio] sessionStorage save failed", e);
    }

    try {
      localStorage.setItem(SCRIPTORA_CHARACTER_BIBLE_KEY, bible);
      localStorage.setItem(SCRIPTORA_CHARACTER_PROJECT_KEY, payloadJson);
      savedSomewhere = true;
    } catch (e) {
      console.warn("[CharacterStudio] localStorage save failed", e);
    }

    if (!savedSomewhere) {
      toast.error("Non sono riuscito a salvare il collegamento personaggi. Prova a svuotare cache/spazio browser.");
      return;
    }

    window.dispatchEvent(new Event("scriptora-character-bible-change"));
    window.dispatchEvent(new CustomEvent("scriptora-open-new-book-from-character-studio", { detail: payload }));
    setSaved(true);
    toast.success("Personaggi collegati. Apro Nuovo Libro con cast, genere, filone e tono già pronti.");
  };

  const clear = () => {
    localStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
    sessionStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
    localStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    sessionStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    setCharacterBible("");
    setSaved(false);
    toast.info("Character Bible rimossa.");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Scriptora Character Studio</h2>
              <p className="text-xs text-muted-foreground">
                Crea cast canonico, genere, filone, tono e dinamica narrativa. Poi collegalo a Nuovo Libro.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
              <Label>Idea del romanzo</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateNovelIdea}
                disabled={ideaLoading || loading}
                className="h-8 px-2 text-xs"
              >
                {ideaLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 h-3 w-3" />}
                Genera idea con Scriptora
              </Button>
            </div>
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                placeholder="Descrivi il seme del romanzo oppure lascia che Scriptora generi un’idea diversa ogni volta..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Genere romanzo</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Filone / sottogenere</Label>
                <Input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="slow burn, desert romance..."
                />
              </div>

              <div>
                <Label>Lingua</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tono</Label>
                <Input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="poetico, intenso..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} disabled={!canGenerate || loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Genera personaggi con Scriptora
              </Button>

              <Button variant="secondary" onClick={saveAndLink} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Salva e collega a Nuovo Libro
              </Button>

              <Button variant="ghost" onClick={clear}>
                Svuota
              </Button>
            </div>

            {saved && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  <strong>Collegamento attivo.</strong> Quando apri “Nuovo Libro”, Scriptora sa già che stai creando un romanzo di genere <strong>{genre}</strong>{subcategory ? ` / ${subcategory}` : ""} e userà questi personaggi come Character Lock.
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-5">
            <div>
              <p className="text-sm font-semibold">Regia del romanzo</p>
              <p className="text-xs text-muted-foreground">
                Scegli genere, filone, tono, intensità e dinamica narrativa. Scriptora userà queste coordinate per creare personaggi coerenti e agganciarli a Nuovo Libro.
              </p>
            </div>

            <ChoiceGrid
              label="Genere romanzo"
              value={genre}
              options={ROMAN_GENRES_PRO}
              onChange={setGenre}
            />

            <ChoiceGrid
              label="Filone / sottogenere"
              value={subcategory}
              options={SUBGENRES_PRO}
              onChange={setSubcategory}
            />

            <ChoiceGrid
              label="Tono narrativo"
              value={tone}
              options={TONES_PRO}
              onChange={setTone}
            />

            <ChoiceGrid
              label="Intensità"
              value={intensity}
              options={INTENSITIES_PRO}
              onChange={setIntensity}
            />

            <ChoiceGrid
              label="Dinamica centrale"
              value={centralDynamic}
              options={CHARACTER_DYNAMICS_PRO}
              onChange={setCentralDynamic}
            />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <Label>Output personaggi / Character Bible</Label>
              <span className="text-[11px] text-muted-foreground">
                Questo testo viene passato al motore di scrittura
              </span>
            </div>
            <Textarea
              value={characterBible}
              onChange={(e) => {
                setCharacterBible(e.target.value);
                setSaved(false);
              }}
              rows={18}
              placeholder="Qui apparirà la Character Bible generata da Scriptora..."
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-primary mt-0.5" />
              <p>
                Dopo il salvataggio, vai su <strong>Nuovo Libro</strong>. Se il genere è narrativo, Scriptora collega automaticamente cast, filone, tono e continuità al progetto. Il motore non deve più inventare nomi a caso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
