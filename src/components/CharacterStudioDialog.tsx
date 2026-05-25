import { useEffect, useMemo, useState } from "react";
import { Users, Wand2, Save, X, Loader2, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
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

type CharacterName = {
  name: string;
  surname: string;
};

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

const CHARACTER_NAME_POOLS: Record<string, CharacterName[]> = {
  Italian: [
    { name: "Livia", surname: "D'Amico" },
    { name: "Nicolò", surname: "Serra" },
    { name: "Marta", surname: "Riva" },
    { name: "Elia", surname: "Valenti" },
    { name: "Adele", surname: "Ferri" },
    { name: "Tommaso", surname: "Neri" },
    { name: "Bianca", surname: "Moretti" },
    { name: "Damiano", surname: "Greco" },
    { name: "Iris", surname: "Leoni" },
    { name: "Vittorio", surname: "Mancini" },
    { name: "Clara", surname: "Santoro" },
    { name: "Enea", surname: "Bellini" },
    { name: "Ginevra", surname: "Marini" },
    { name: "Leonardo", surname: "Costa" },
    { name: "Viola", surname: "Ruggeri" },
    { name: "Mattia", surname: "Conti" },
    { name: "Sveva", surname: "Barbieri" },
    { name: "Lorenzo", surname: "Vitale" },
    { name: "Nina", surname: "De Luca" },
    { name: "Samuele", surname: "Rinaldi" },
    { name: "Alma", surname: "Pellegrini" },
    { name: "Dario", surname: "Ferretti" },
    { name: "Greta", surname: "Monti" },
    { name: "Riccardo", surname: "Valli" },
  ],
  English: [
    { name: "Mara", surname: "Voss" },
    { name: "Elias", surname: "Reed" },
    { name: "Iris", surname: "Vale" },
    { name: "Jonah", surname: "Cross" },
    { name: "Nora", surname: "Blake" },
    { name: "Theo", surname: "Marsh" },
    { name: "Ada", surname: "Rowe" },
    { name: "Julian", surname: "Stone" },
    { name: "Celia", surname: "Hart" },
    { name: "Noah", surname: "Wren" },
    { name: "Vera", surname: "Lane" },
    { name: "Silas", surname: "Cole" },
    { name: "Elena", surname: "Price" },
    { name: "Caleb", surname: "Shaw" },
    { name: "Maeve", surname: "Sinclair" },
    { name: "Rowan", surname: "Hale" },
    { name: "Lena", surname: "Arden" },
    { name: "Ezra", surname: "Monroe" },
  ],
  Spanish: [
    { name: "Lucía", surname: "Vargas" },
    { name: "Mateo", surname: "Salazar" },
    { name: "Inés", surname: "Roldán" },
    { name: "Bruno", surname: "Soler" },
    { name: "Clara", surname: "Mendoza" },
    { name: "Nicolás", surname: "Vega" },
    { name: "Alma", surname: "Cortés" },
    { name: "Diego", surname: "Luna" },
  ],
  French: [
    { name: "Camille", surname: "Moreau" },
    { name: "Adrien", surname: "Lefèvre" },
    { name: "Élise", surname: "Roux" },
    { name: "Mathis", surname: "Garnier" },
    { name: "Noémie", surname: "Valentin" },
    { name: "Julien", surname: "Marchand" },
  ],
  German: [
    { name: "Marlene", surname: "Vogel" },
    { name: "Jonas", surname: "Weber" },
    { name: "Anika", surname: "Keller" },
    { name: "Felix", surname: "Brandt" },
    { name: "Lena", surname: "Hoffmann" },
    { name: "Emil", surname: "Schreiber" },
  ],
};



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

function cleanManualNameLine(value: string): string {
  return value
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/^(nome|name|personaggio|character)\s*[:\-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseManualCharacterNames(value: string): CharacterName[] {
  return value
    .split(/[\n;,]+/)
    .map(cleanManualNameLine)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(" ").filter(Boolean);
      return {
        name: parts[0] || "",
        surname: parts.slice(1).join(" "),
      };
    })
    .filter((item) => item.name)
    .slice(0, 8);
}

function characterNameLabel(item: CharacterName): string {
  return [item.name, item.surname].filter(Boolean).join(" ");
}

function pickCharacterNames(input: {
  language: string;
  seed: number;
  manualCharacterNames?: string;
}): CharacterName[] {
  const manual = parseManualCharacterNames(input.manualCharacterNames || "");
  if (manual.length >= 2) return manual;

  const pool = CHARACTER_NAME_POOLS[input.language] || CHARACTER_NAME_POOLS.English;
  const first = pool[input.seed % pool.length];
  let second = pool[(input.seed + 7) % pool.length];
  if (characterNameLabel(first).toLowerCase() === characterNameLabel(second).toLowerCase()) {
    second = pool[(input.seed + 11) % pool.length];
  }
  return manual.length === 1 ? [manual[0], second] : [first, second];
}

function replaceAllLiteral(text: string, from: string, to: string): string {
  const cleanFrom = from.trim();
  const cleanTo = to.trim();
  if (!cleanFrom || !cleanTo || cleanFrom === cleanTo) return text;
  return text.split(cleanFrom).join(cleanTo);
}

function applyManualNamesToBible(text: string, manualCharacterNames: string): string {
  const manual = parseManualCharacterNames(manualCharacterNames);
  if (!text.trim() || manual.length === 0) return text;

  const blocks = text.split(/\n(?=Nome:|Name:)/g);
  const replacements: Array<{ from: CharacterName; to: CharacterName }> = [];

  const nextBlocks = blocks.map((block, index) => {
    const target = manual[index];
    if (!target) return block;

    const oldName = block.match(/^(Nome|Name):\s*(.+)$/im)?.[2]?.trim() || "";
    const oldSurname = block.match(/^(Cognome|Surname):\s*(.+)$/im)?.[2]?.trim() || "";
    replacements.push({
      from: { name: oldName, surname: oldSurname },
      to: target,
    });

    let next = block;
    if (/^(Nome|Name):/im.test(next)) {
      next = next.replace(/^(Nome|Name):\s*.*$/im, (line, label) => `${label}: ${target.name}`);
    }
    if (/^(Cognome|Surname):/im.test(next)) {
      next = next.replace(/^(Cognome|Surname):\s*.*$/im, (line, label) => `${label}: ${target.surname || ""}`);
    }
    if (/^Regole di continuità:/im.test(next)) {
      next = next.replace(
        /^Regole di continuità:\s*(.*)$/im,
        `Regole di continuità: Non rinominare mai ${characterNameLabel(target)}. Questo nome è canonico per la saga. $1`,
      );
    } else if (/^Continuity rules:/im.test(next)) {
      next = next.replace(
        /^Continuity rules:\s*(.*)$/im,
        `Continuity rules: Never rename ${characterNameLabel(target)}. This name is canonical for the saga. $1`,
      );
    }
    return next;
  });

  let nextText = nextBlocks.join("\n");
  for (const replacement of replacements) {
    const oldFull = characterNameLabel(replacement.from);
    const newFull = characterNameLabel(replacement.to);
    nextText = replaceAllLiteral(nextText, oldFull, newFull);
    nextText = replaceAllLiteral(nextText, replacement.from.name, replacement.to.name);
    if (replacement.from.surname && replacement.to.surname) {
      nextText = replaceAllLiteral(nextText, replacement.from.surname, replacement.to.surname);
    }
  }
  return nextText;
}

function fallbackCharacterBible(input: {
  idea: string;
  genre: string;
  subcategory: string;
  tone: string;
  intensity?: string;
  centralDynamic?: string;
  protagonistType?: string;
  language: string;
  manualCharacterNames?: string;
}) {
  const hash = Array.from(`${input.idea}|${input.genre}|${input.subcategory}|${input.centralDynamic || ""}`)
    .reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const selectedNames = pickCharacterNames({
    language: input.language,
    seed: hash,
    manualCharacterNames: input.manualCharacterNames,
  });
  const professions = [
    "fotografa investigativa abituata a leggere dettagli invisibili",
    "traduttrice freelance che vive tra lingue, bugie e omissioni",
    "architetta di interni specializzata in case lasciate a metà",
    "ricercatrice che ha trasformato una colpa in metodo",
    "musicista che controlla tutto perché teme l'imprevisto",
    "cartografa climatica che misura confini che non restano fermi",
    "ex magistrata radiata che riconosce le confessioni false",
    "apicoltrice urbana con una memoria quasi fotografica",
    "pilota di droni subacquei per relitti industriali",
    "chef di navi merci che custodisce ricette come prove",
    "matematica del rischio assunta per prevedere tradimenti",
  ];
  const counterpartRoles = [
    "antagonista emotivo / alleato necessario",
    "figura di svolta con agenda nascosta",
    "rivale professionale che conosce una parte della verità",
    "custode del luogo e della memoria che la protagonista evita",
    "testimone ambiguo, attrazione e minaccia insieme",
    "partner obbligato in una scelta che non lascia innocenti",
  ];
  const profession = professions[hash % professions.length];
  const counterpartRole = counterpartRoles[(hash >>> 3) % counterpartRoles.length];
  const protagonistName = selectedNames[0]?.name || "Livia";
  const protagonistSurname = selectedNames[0]?.surname || "D'Amico";
  const loveName = selectedNames[1]?.name || "Nicolò";
  const loveSurname = selectedNames[1]?.surname || "Serra";

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
  previousIdeas?: string[];
}) {
  const scenes = [
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
    {
      protagonist: "una tassidermista di creature estinte accusata di fabbricare miracoli",
      place: "un museo privato aperto solo durante gli equinozi",
      wound: "ha venduto una creatura falsa a una famiglia in lutto",
      desire: "dimostrare che un animale impossibile è tornato vivo",
      conflict: "ogni corpo esposto nel museo conserva una memoria che non appartiene al morto",
    },
    {
      protagonist: "un cartografo di soglie che disegna confini tra mondi instabili",
      place: "una dogana costruita sopra un cratere pieno di porte",
      wound: "ha chiuso il passaggio mentre sua sorella era ancora dall'altra parte",
      desire: "riaprire una sola porta senza risvegliare tutte le altre",
      conflict: "la mappa risponde soltanto alle bugie che lui riesce a confessare",
    },
    {
      protagonist: "una fabbricante di campane che sente il futuro nel metallo incrinato",
      place: "un ducato in cui nessuno può morire finché una campana resta muta",
      wound: "ha fuso l'ultima campana usando il nome di una persona amata",
      desire: "spezzare il patto che tiene viva una città sbagliata",
      conflict: "ogni rintocco salva un innocente e condanna qualcuno che lei conosce",
    },
    {
      protagonist: "una ladra liturgica che ruba reliquie non per rivenderle ma per farle tacere",
      place: "una cattedrale sospesa sopra una palude di nebbia",
      wound: "ha scambiato una preghiera vera con una salvezza falsa",
      desire: "liberarsi da una voce sacra che parla sotto la sua pelle",
      conflict: "la reliquia più pericolosa porta il suo stesso volto",
    },
    {
      protagonist: "un notaio dei morti incaricato di registrare testamenti impossibili",
      place: "una città portuale dove i defunti tornano solo per firmare",
      wound: "ha cancellato l'ultima volontà di sua madre",
      desire: "ritrovare un testamento che può sciogliere un'intera casata",
      conflict: "il documento nomina come erede una persona che non è ancora nata",
    },
  ];
  const recentText = (input.previousIdeas || []).join(" ").toLowerCase();
  const availableScenes = scenes.filter((scene) => {
    const firstKeyword = scene.protagonist.split(" ").slice(1, 3).join(" ").toLowerCase();
    return !firstKeyword || !recentText.includes(firstKeyword);
  });
  const scenePool = availableScenes.length ? availableScenes : scenes;
  const seed = Math.floor(Math.random() * scenePool.length);
  const pick = scenePool[seed];
  return `${pick.protagonist} arriva in ${pick.place} con una ferita precisa: ${pick.wound}. Vuole ${pick.desire}, ma scopre che ${pick.conflict}. La storia intreccia ${input.centralDynamic || "desiderio, conflitto e segreto"} con un tono ${input.tone || "cinematografico"} e intensità ${input.intensity || "media"}, evitando il solito schema di fuga romantica e costruendo una promessa narrativa più riconoscibile. La protagonista resta ${input.protagonistType || "contraddittoria e attiva"}, con lingua narrativa ${input.language}. Genere: ${optionLabel(ROMAN_GENRES_PRO.find(o => optionValue(o) === input.genre) || input.genre)}. Filone: ${optionLabel(SUBGENRES_PRO.find(o => optionValue(o) === input.subcategory) || input.subcategory)}.`;
}

function buildLocalUserStoryDevelopment(input: {
  idea: string;
  genre: string;
  subcategory: string;
  tone: string;
  intensity: string;
  centralDynamic: string;
  protagonistType: string;
  language: string;
}) {
  const cleanIdea = input.idea.replace(/\s+/g, " ").trim();
  const base = cleanIdea.replace(/[.!?]*$/, ".");
  return `${base} Scriptora la sviluppa come premessa editoriale completa: il cuore della storia resta quello indicato dall'utente, ma la traiettoria viene chiarita in ferita, desiderio, posta in gioco e conseguenza finale. Il genere resta ${optionLabel(ROMAN_GENRES_PRO.find(o => optionValue(o) === input.genre) || input.genre)}, con filone ${optionLabel(SUBGENRES_PRO.find(o => optionValue(o) === input.subcategory) || input.subcategory)}, tono ${input.tone || "cinematografico"} e intensità ${input.intensity || "media"}. La protagonista deve restare coerente con l'idea originale, ma ogni scena dovrà aumentare conflitto, scelta morale e tensione emotiva senza tradire la storia che l'utente vuole raccontare.`;
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
  const [manualCharacterNames, setManualCharacterNames] = useState("");
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
        if (parsed.manualCharacterNames) setManualCharacterNames(parsed.manualCharacterNames);
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
      const currentIdea = idea.trim();
      const currentLooksLikeGeneratedIdea = currentIdea.length > 180;
      const previousIdeas = [
        ...(currentLooksLikeGeneratedIdea ? [currentIdea] : []),
        ...readIdeaHistory(),
      ].filter(Boolean).slice(0, 12);
      const diversitySeed = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.functions.invoke("scriptora-novel-idea", {
        body: {
          seedIdea: currentLooksLikeGeneratedIdea ? "" : currentIdea,
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
        previousIdeas,
      });
      setIdea(generated);
      saveIdeaToHistory(generated);
      toast.warning("AI non disponibile: Scriptora ha creato un’idea locale di sicurezza.");
    } finally {
      setIdeaLoading(false);
    }
  };

  const developUserStory = async () => {
    if (ideaLoading || loading) return;
    const userStory = idea.trim();
    if (userStory.length < 20) {
      toast.error("Scrivi prima la tua storia o almeno un seme narrativo più specifico.");
      return;
    }

    setIdeaLoading(true);

    try {
      const diversitySeed = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.functions.invoke("scriptora-novel-idea", {
        body: {
          seedIdea: userStory,
          preserveUserStory: true,
          genre,
          subcategory: subcategory.trim(),
          tone: tone.trim(),
          intensity,
          centralDynamic,
          protagonistType: protagonistType.trim(),
          language,
          diversitySeed,
          previousIdeas: readIdeaHistory(),
          userId: getCurrentUserId(),
        },
      });

      if (error) throw error;

      const developed = String(data?.idea || data?.text || "").trim();
      if (!developed) throw new Error("Idea elaborata vuota");

      setIdea(developed);
      saveIdeaToHistory(developed);
      toast.success("La tua storia è stata elaborata mantenendo il nucleo originale.");
    } catch {
      const developed = buildLocalUserStoryDevelopment({
        idea: userStory,
        genre,
        subcategory,
        tone,
        intensity,
        centralDynamic,
        protagonistType,
        language,
      });
      setIdea(developed);
      saveIdeaToHistory(developed);
      toast.warning("AI non disponibile: Scriptora ha elaborato localmente la tua storia.");
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
    manualCharacterNames: manualCharacterNames.trim(),
    characterBible: characterBible.trim(),
    createdAt: new Date().toISOString(),
  }), [idea, genre, subcategory, tone, intensity, centralDynamic, protagonistType, language, manualCharacterNames, characterBible]);

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
          manualCharacterNames: parseManualCharacterNames(manualCharacterNames).map(characterNameLabel),
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
        manualCharacterNames,
      });

      setCharacterBible(applyManualNamesToBible(finalText, manualCharacterNames));
      toast.success("Personaggi generati. Ora salvali e collegali a Nuovo Libro.");
    } catch (e) {
      const finalText = fallbackCharacterBible({
        idea,
        genre,
        subcategory,
        tone,
        language,
        intensity,
        centralDynamic,
        protagonistType,
        manualCharacterNames,
      });
      setCharacterBible(applyManualNamesToBible(finalText, manualCharacterNames));
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
      manualCharacterNames: manualCharacterNames.trim(),
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
    setManualCharacterNames("");
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
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={developUserStory}
                    disabled={ideaLoading || loading || idea.trim().length < 20}
                    className="h-8 px-2 text-xs"
                  >
                    {ideaLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    Elabora la mia storia
                  </Button>
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
              </div>
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                placeholder="Scrivi la tua storia da raccontare, oppure lascia vuoto e usa Genera idea con Scriptora..."
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Se hai già una storia, scrivila qui e usa “Elabora la mia storia”. Se vuoi una proposta nuova, usa “Genera idea con Scriptora”.
              </p>
            </div>

            <div>
              <Label>Nomi protagonisti / saga (opzionale)</Label>
              <Textarea
                value={manualCharacterNames}
                onChange={(e) => {
                  setManualCharacterNames(e.target.value);
                  setSaved(false);
                }}
                rows={2}
                placeholder={"Se continui una saga, inserisci qui i nomi canonici, uno per riga.\nEsempio: Elena Ferri\nMarco Greco"}
                className="text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Se compili questo campo, Scriptora deve usare questi nomi e non rinominare i protagonisti.
              </p>
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
