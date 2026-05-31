import { useEffect, useMemo, useRef, useState } from "react";
import { Users, Wand2, Save, X, Loader2, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { CharacterStudioGuidedFlow } from "@/components/CharacterStudioGuidedFlow";
import { GuidedTourTriggerButton } from "@/components/GuidedTourTriggerButton";
import { GUIDED_TOUR_IDS } from "@/lib/guided-tour-events";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUserId } from "@/services/storageService";
import { t, tt, useUILanguage } from "@/lib/i18n";

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
  { value: "psychological thriller", label: "Psychological thriller" },
  { value: "crime", label: "Crime / noir" },
  { value: "mystery", label: "Mystery" },
  { value: "fantasy", label: "Fantasy" },
  { value: "urban fantasy", label: "Urban fantasy" },
  { value: "dark fantasy", label: "Dark fantasy" },
  { value: "epic fantasy", label: "Epic fantasy" },
  { value: "horror", label: "Horror" },
  { value: "gothic horror", label: "Gothic horror" },
  { value: "folk horror", label: "Folk horror" },
  { value: "sci-fi", label: "Science fiction" },
  { value: "dystopian", label: "Dystopian" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "historical fiction", label: "Historical fiction" },
  { value: "literary fiction", label: "Literary fiction" },
  { value: "young adult", label: "Young adult" },
  { value: "paranormal", label: "Paranormal" },
  { value: "adventure", label: "Adventure" },
  { value: "suspense", label: "Suspense" },
  { value: "family saga", label: "Family saga" },
  { value: "memoir narrativo", label: "Narrative memoir" }
];

const SUBGENRES_PRO: ChoiceOption[] = [
  { value: "enemies to lovers", label: "Enemies to lovers" },
  { value: "second chance", label: "Second chance" },
  { value: "forbidden love", label: "Forbidden love" },
  { value: "slow burn", label: "Slow burn" },
  { value: "small town", label: "Small town" },
  { value: "billionaire", label: "Billionaire romance" },
  { value: "workplace romance", label: "Workplace romance" },
  { value: "fake dating", label: "Fake dating" },
  { value: "forced proximity", label: "Forced proximity" },
  { value: "age gap", label: "Age gap" },
  { value: "friends to lovers", label: "Friends to lovers" },
  { value: "mafia romance", label: "Mafia romance" },
  { value: "psychological suspense", label: "Psychological suspense" },
  { value: "domestic thriller", label: "Domestic thriller" },
  { value: "serial killer", label: "Serial killer" },
  { value: "missing person", label: "Missing person" },
  { value: "legal thriller", label: "Legal thriller" },
  { value: "conspiracy", label: "Conspiracy" },
  { value: "revenge story", label: "Revenge story" },
  { value: "chosen one", label: "Chosen one" },
  { value: "portal fantasy", label: "Portal fantasy" },
  { value: "academy", label: "Academy" },
  { value: "royal court intrigue", label: "Royal court intrigue" },
  { value: "monster romance", label: "Monster romance" },
  { value: "haunted house", label: "Haunted house" },
  { value: "survival horror", label: "Survival horror" },
  { value: "coming of age", label: "Coming of age" },
  { value: "found family", label: "Found family" },
  { value: "redemption arc", label: "Redemption arc" },
  { value: "morally grey characters", label: "Morally grey characters" }
];

const TONES_PRO: ChoiceOption[] = [
  "poetic and cinematic",
  "dark and sensual",
  "elegant and literary",
  "fast and commercial",
  "emotional BookTok-ready",
  "raw and realistic",
  "witty and sharp",
  "gothic and atmospheric",
  "epic and mythic",
  "intimate and confessional",
  "suspenseful and mysterious",
  "brutal high-tension",
  "romantic slow burn",
  "spicy but elegant",
  "clean and deep",
  "melancholic and aching",
];

const INTENSITIES_PRO: ChoiceOption[] = [
  { value: "soft", label: "Soft" },
  { value: "medium", label: "Medium" },
  { value: "intense", label: "Intense" },
  { value: "slow burn", label: "Slow burn" },
  { value: "high drama", label: "High drama" },
  { value: "high suspense", label: "High suspense" },
  { value: "emotional devastation", label: "Emotional devastation" },
  { value: "dark but elegant", label: "Dark but elegant" },
  { value: "commercial page-turner", label: "Commercial page-turner" },
  { value: "literary deep focus", label: "Literary deep focus" },
];

const CHARACTER_DYNAMICS_PRO: ChoiceOption[] = [
  "forbidden love",
  "attraction and guilt",
  "revenge",
  "family secret",
  "betrayal",
  "redemption",
  "investigation",
  "survival",
  "power and corruption",
  "fate vs free will",
  "rivalry",
  "obsession",
  "loss and rebirth",
  "escaping the past",
  "hidden identity",
  "enemies forced to collaborate",
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
  useUILanguage();
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("romance");
  const [subcategory, setSubcategory] = useState("slow burn");
  const [tone, setTone] = useState("poetic and cinematic");
  const [intensity, setIntensity] = useState("slow burn");
  const [centralDynamic, setCentralDynamic] = useState("attraction and guilt");
  const [protagonistType, setProtagonistType] = useState("wounded but fierce protagonist");
  const [language, setLanguage] = useState("English");
  const [manualCharacterNames, setManualCharacterNames] = useState("");
  const [characterBible, setCharacterBible] = useState("");
  const [loading, setLoading] = useState(false);
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const ideaSectionRef = useRef<HTMLDivElement | null>(null);
  const setupSectionRef = useRef<HTMLDivElement | null>(null);
  const ideaTextareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      toast.success(t("character_studio_toast_idea_generated"));
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
      toast.warning(t("character_studio_toast_idea_fallback"));
    } finally {
      setIdeaLoading(false);
    }
  };

  const developUserStory = async () => {
    if (ideaLoading || loading) return;
    const userStory = idea.trim();
    if (userStory.length < 20) {
      toast.error(t("character_studio_toast_story_short"));
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
      toast.success(t("character_studio_toast_story_developed"));
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
      toast.warning(t("character_studio_toast_story_fallback"));
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
      toast.success(t("character_studio_toast_characters_generated"));
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
      toast.warning(t("character_studio_toast_bible_fallback"));
    } finally {
      setLoading(false);
    }
  };

  const saveAndLink = () => {
    const bible = String(characterBible || "").trim();

    if (!bible) {
      toast.error(t("character_studio_toast_bible_empty"));
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
      toast.error(t("character_studio_toast_save_failed"));
      return;
    }

    window.dispatchEvent(new Event("scriptora-character-bible-change"));
    window.dispatchEvent(new CustomEvent("scriptora-open-new-book-from-character-studio", { detail: payload }));
    setSaved(true);
    toast.success(t("character_studio_toast_linked"));
  };

  const clear = () => {
    localStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
    sessionStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
    localStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    sessionStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    setCharacterBible("");
    setManualCharacterNames("");
    setSaved(false);
    toast.info(t("character_studio_toast_cleared"));
  };

  if (!open) return null;

  return (
    <div className="scriptora-modal-overlay">
      <div className="scriptora-modal-panel scriptora-mobile-work-panel max-w-4xl flex max-h-[min(94dvh,920px)] flex-col">
        <div className="scriptora-mobile-work-panel__header flex shrink-0 items-center justify-between border-b border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">{t("character_studio_dialog_title")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("character_studio_dialog_subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GuidedTourTriggerButton tourId={GUIDED_TOUR_IDS.characterStudio} />
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="scriptora-modal-body scriptora-mobile-work-panel__body min-h-0 flex-1 overflow-y-auto space-y-5 p-5">
          <CharacterStudioGuidedFlow
            open={open}
            onFocusIdea={() => {
              ideaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              ideaTextareaRef.current?.focus();
            }}
            onFocusSetup={() => {
              setupSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          />

          <div ref={ideaSectionRef} data-guided-tour="character-idea" className="scriptora-modal-section rounded-xl p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>{t("character_studio_idea_label")}</Label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={developUserStory}
                    disabled={ideaLoading || loading || idea.trim().length < 20}
                    className="scriptora-modal-cta-secondary h-9 px-3 text-xs font-semibold"
                  >
                    {ideaLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                    {t("character_studio_develop_story")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={generateNovelIdea}
                    disabled={ideaLoading || loading}
                    className="scriptora-modal-cta-secondary h-9 px-3 text-xs font-semibold"
                  >
                    {ideaLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="mr-1.5 h-3.5 w-3.5" />}
                    {t("character_studio_generate_idea")}
                  </Button>
                </div>
              </div>
              <Textarea
                ref={ideaTextareaRef}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={3}
                placeholder={t("character_studio_idea_placeholder")}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("character_studio_idea_hint")}
              </p>
            </div>

            <div>
              <Label>{t("character_studio_names_label")}</Label>
              <Textarea
                value={manualCharacterNames}
                onChange={(e) => {
                  setManualCharacterNames(e.target.value);
                  setSaved(false);
                }}
                rows={2}
                placeholder={t("character_studio_names_placeholder")}
                className="text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("character_studio_names_hint")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>{t("character_studio_genre_label")}</Label>
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
                <Label>{t("character_studio_subgenre_label")}</Label>
                <Input
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder={t("character_studio_subgenre_placeholder")}
                />
              </div>

              <div>
                <Label>{t("character_studio_language_label")}</Label>
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
                <Label>{t("character_studio_tone_label")}</Label>
                <Input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder={t("character_studio_tone_placeholder")}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2" data-guided-tour="character-generate">
              <Button onClick={generate} disabled={!canGenerate || loading} className="scriptora-modal-cta-primary h-10 px-4 text-sm font-semibold">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {t("character_studio_generate_characters")}
              </Button>

              <Button variant="secondary" onClick={saveAndLink} disabled={loading} data-guided-tour="character-link" className="scriptora-modal-cta-secondary h-10 px-4 text-sm font-semibold">
                <Save className="h-4 w-4 mr-2" />
                {t("character_studio_save_link")}
              </Button>

              <Button variant="ghost" onClick={clear} className="scriptora-modal-cta-ghost h-10 px-3 text-sm font-semibold">
                {t("character_studio_clear")}
              </Button>
            </div>

            {saved && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  {tt("character_studio_link_active", {
                    genre,
                    subcategory: subcategory ? ` / ${subcategory}` : "",
                  })}
                </div>
              </div>
            )}
          </div>

          <div ref={setupSectionRef} data-guided-tour="character-setup" className="space-y-4">
            <div className="scriptora-modal-section rounded-2xl p-4 space-y-5">
            <div>
              <p className="text-sm font-semibold">{t("character_studio_direction_title")}</p>
              <p className="text-xs text-muted-foreground">
                {t("character_studio_direction_desc")}
              </p>
            </div>

            <ChoiceGrid
              label={t("character_studio_genre_label")}
              value={genre}
              options={ROMAN_GENRES_PRO}
              onChange={setGenre}
            />

            <ChoiceGrid
              label={t("character_studio_subgenre_label")}
              value={subcategory}
              options={SUBGENRES_PRO}
              onChange={setSubcategory}
            />

            <ChoiceGrid
              label={t("character_studio_narrative_tone")}
              value={tone}
              options={TONES_PRO}
              onChange={setTone}
            />

            <ChoiceGrid
              label={t("character_studio_intensity")}
              value={intensity}
              options={INTENSITIES_PRO}
              onChange={setIntensity}
            />

            <ChoiceGrid
              label={t("character_studio_central_dynamic")}
              value={centralDynamic}
              options={CHARACTER_DYNAMICS_PRO}
              onChange={setCentralDynamic}
            />
            </div>

            <div className="mb-2 flex items-center justify-between">
              <Label>{t("character_studio_output_label")}</Label>
              <span className="text-[11px] text-muted-foreground">
                {t("character_studio_output_hint")}
              </span>
            </div>
            <Textarea
              value={characterBible}
              onChange={(e) => {
                setCharacterBible(e.target.value);
                setSaved(false);
              }}
              rows={18}
              placeholder={t("character_studio_output_placeholder")}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-primary mt-0.5" />
              <p>
                {t("character_studio_footer_tip")}
              </p>
            </div>
          </div>
        </div>

        <div className="scriptora-modal-actions scriptora-mobile-work-panel__footer shrink-0 border-t border-border/70 bg-card/95 p-4 pb-safe backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{t("character_studio_footer_tip")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={generate}
                disabled={!canGenerate || loading}
                className="scriptora-modal-cta-primary h-11 flex-1 px-4 text-sm font-semibold sm:flex-none"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                {t("character_studio_generate_characters")}
              </Button>
              <Button
                variant="secondary"
                onClick={saveAndLink}
                disabled={loading || !characterBible.trim()}
                className="scriptora-modal-cta-secondary h-11 flex-1 px-4 text-sm font-semibold sm:flex-none"
              >
                <Save className="h-4 w-4 mr-2" />
                {t("character_studio_save_link")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
