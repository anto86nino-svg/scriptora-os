import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Wand2, Save, X, Loader2, BookOpen, CheckCircle2, Sparkles, Fingerprint, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUserId } from "@/services/storageService";
import { devOnlyDiagnostic } from "@/lib/user-friendly-error";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";

import {
  SCRIPTORA_CHARACTER_BIBLE_KEY,
  SCRIPTORA_CHARACTER_PROJECT_KEY,
} from "@/lib/character-studio-keys";
import { buildBookForgeHandoff } from "@/lib/book-forge/book-forge-handoff";

export { SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY };
const SCRIPTORA_IDEA_HISTORY_KEY = "scriptora-character-idea-history-v1";

type CharacterStudioLiveOperation = "idea" | "story" | "title" | "characters" | "handoff";

const CHARACTER_STUDIO_LIVE_COPY: Record<CharacterStudioLiveOperation, { title: string; steps: string[] }> = {
  idea: {
    title: "Scriptora sta creando una premessa viva",
    steps: [
      "Analizzo genere, filone e dinamica centrale…",
      "Cerco un conflitto con conseguenze leggibili…",
      "Costruisco una premessa utilizzabile da Character Studio…",
      "Verifico che l'idea non ripeta varianti già generate…",
      "Finalizzo una base pronta per titolo, promessa e cast.",
    ],
  },
  story: {
    title: "Scriptora sta sviluppando la tua storia",
    steps: [
      "Proteggo il nucleo della tua idea originale…",
      "Chiarisco ferita, desiderio e posta in gioco…",
      "Allineo tono, genere e dinamica narrativa…",
      "Rendo la premessa più leggibile per il blueprint…",
      "Consegno una versione pronta per il cast canonico.",
    ],
  },
  title: {
    title: "Scriptora sta fissando titolo e promessa",
    steps: [
      "Analizzo mercato narrativo e filone…",
      "Cerco un hook coerente con la promessa…",
      "Creo titolo, sottotitolo e direzione editoriale…",
      "Verifico impatto e chiarezza per Book Forge…",
      "Blocca i dati approvati come canonici.",
    ],
  },
  characters: {
    title: "Scriptora sta costruendo il cast canonico",
    steps: [
      "Definisco protagonisti e forze antagoniste…",
      "Collego ferite, desideri e segreti…",
      "Creo relazioni e conflitti spendibili in scena…",
      "Verifico coerenza con titolo e promessa…",
      "Finalizzo la Character Bible per Writer Studio.",
    ],
  },
  handoff: {
    title: "Scriptora sta collegando Character Studio a Book Forge",
    steps: [
      "Salvo Character Bible e dati canonici…",
      "Blocca titolo, sottotitolo e promessa approvati…",
      "Preparo handoff senza rigenerazioni inutili…",
      "Allineo cast, genere, struttura e target lettore…",
      "Apro Book Forge nel punto giusto del percorso.",
    ],
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

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


type CharacterStudioDirectionPreset = {
  subcategory: string;
  tone: string;
  intensity: string;
  centralDynamic: string;
  subgenres: ChoiceOption[];
  tones: ChoiceOption[];
  intensities: ChoiceOption[];
  dynamics: ChoiceOption[];
  targetReader: string;
  narrativePromise: string;
};

function normalizeCharacterStudioGenre(value: string): string {
  return String(value || "").toLowerCase().replace(/[_\s]+/g, "-");
}

function getCharacterStudioDirectionPreset(genre: string): CharacterStudioDirectionPreset {
  const g = normalizeCharacterStudioGenre(genre);

  if (/thriller|crime|noir|mystery|mistero|suspense/.test(g)) {
    return {
      subcategory: "psychological suspense",
      tone: "teso e cinematografico",
      intensity: "high suspense",
      centralDynamic: "indagine",
      targetReader: "Lettori di thriller psicologici, misteri oscuri, indagini morali e colpi di scena emotivi.",
      narrativePromise: "Un thriller ad alta tensione dove ogni risposta apre una ferita più profonda, fino a una verità che cambia il senso di tutto.",
      subgenres: [
        { value: "psychological suspense", label: "Suspense psicologica" },
        { value: "domestic thriller", label: "Thriller domestico" },
        { value: "serial killer", label: "Serial killer" },
        { value: "missing person", label: "Persona scomparsa" },
        { value: "legal thriller", label: "Thriller legale" },
        { value: "conspiracy", label: "Cospirazione" },
        { value: "revenge story", label: "Storia di vendetta" },
        { value: "closed circle", label: "Luogo chiuso / isolamento" },
        { value: "cold case", label: "Cold case" },
      ],
      tones: [
        "teso e cinematografico",
        "sospeso e misterioso",
        "crudo e realistico",
        "brutale e ad alta tensione",
        "elegante e letterario",
        "page-turner commerciale",
      ],
      intensities: [
        { value: "high suspense", label: "Alta suspense" },
        { value: "commercial page-turner", label: "Page-turner commerciale" },
        { value: "intense", label: "Intensa" },
        { value: "psychological depth", label: "Profondità psicologica" },
      ],
      dynamics: [
        "indagine",
        "segreto familiare",
        "tradimento",
        "vendetta",
        "ossessione",
        "fuga dal passato",
        "identità nascosta",
        "sopravvivenza",
        "colpa e verità",
      ],
    };
  }

  if (/horror|gothic|folk/.test(g)) {
    return {
      subcategory: "gothic horror",
      tone: "gotico e atmosferico",
      intensity: "dark but elegant",
      centralDynamic: "sopravvivenza",
      targetReader: "Lettori di horror atmosferico, luoghi malati, presenze ambigue e tensione psicologica.",
      narrativePromise: "Un horror in cui il luogo non è sfondo ma minaccia, e la verità arriva come una contaminazione.",
      subgenres: [
        { value: "gothic horror", label: "Horror gotico" },
        { value: "folk horror", label: "Folk horror" },
        { value: "haunted house", label: "Casa infestata" },
        { value: "survival horror", label: "Survival horror" },
        { value: "psychological horror", label: "Horror psicologico" },
      ],
      tones: [
        "gotico e atmosferico",
        "sospeso e misterioso",
        "crudo e realistico",
        "brutale e ad alta tensione",
        "melanconico e disturbante",
      ],
      intensities: [
        { value: "slow dread", label: "Lenta e inquietante" },
        { value: "high suspense", label: "Alta suspense" },
        { value: "dark but elegant", label: "Dark ma elegante" },
        { value: "intense", label: "Intensa" },
      ],
      dynamics: [
        "sopravvivenza",
        "ossessione",
        "segreto familiare",
        "perdita e rinascita",
        "fuga dal passato",
        "memoria e colpa",
      ],
    };
  }

  if (/fantasy|romantasy|urban|epic|dark-fantasy/.test(g)) {
    return {
      subcategory: /romantasy/.test(g) ? "romantasy" : "dark fantasy",
      tone: "epico e mitico",
      intensity: "high drama",
      centralDynamic: "potere e corruzione",
      targetReader: "Lettori di fantasy con magia, destino, alleanze instabili, potere e trasformazione emotiva.",
      narrativePromise: "Un fantasy dove il potere salva e corrompe, e ogni scelta costa identità, memoria o libertà.",
      subgenres: [
        { value: "epic fantasy", label: "Fantasy epico" },
        { value: "dark fantasy", label: "Dark fantasy" },
        { value: "urban fantasy", label: "Urban fantasy" },
        { value: "romantasy", label: "Romantasy" },
        { value: "chosen one", label: "Prescelto" },
        { value: "portal fantasy", label: "Portal fantasy" },
        { value: "academy", label: "Academy" },
        { value: "royal court intrigue", label: "Intrighi di corte" },
        { value: "found family", label: "Famiglia trovata" },
      ],
      tones: [
        "epico e mitico",
        "gotico e atmosferico",
        "elegante e letterario",
        "veloce e commerciale",
        "sospeso e misterioso",
      ],
      intensities: [
        { value: "high drama", label: "Alto dramma" },
        { value: "commercial page-turner", label: "Page-turner commerciale" },
        { value: "intense", label: "Intensa" },
        { value: "dark but elegant", label: "Dark ma elegante" },
      ],
      dynamics: [
        "potere e corruzione",
        "destino contro libero arbitrio",
        "rivalità",
        "redenzione",
        "identità nascosta",
        "nemici costretti a collaborare",
        "tradimento",
      ],
    };
  }

  if (/romance|dark-romance/.test(g)) {
    return {
      subcategory: /dark-romance/.test(g) ? "mafia romance" : "slow burn",
      tone: /dark-romance/.test(g) ? "dark e sensuale" : "romantico slow burn",
      intensity: /dark-romance/.test(g) ? "dark but elegant" : "slow burn",
      centralDynamic: /dark-romance/.test(g) ? "attrazione e colpa" : "amore proibito",
      targetReader: "Lettrici di romance emotivo, tensione relazionale, desiderio progressivo e payoff sentimentale forte.",
      narrativePromise: "Una storia d'amore ad alta tensione emotiva, dove desiderio e ferita si trasformano in scelta.",
      subgenres: SUBGENRES_PRO.filter((option) =>
        [
          "enemies to lovers",
          "second chance",
          "forbidden love",
          "slow burn",
          "small town",
          "billionaire",
          "workplace romance",
          "fake dating",
          "forced proximity",
          "age gap",
          "friends to lovers",
          "mafia romance",
        ].includes(optionValue(option)),
      ),
      tones: [
        "romantico slow burn",
        "poetico e cinematografico",
        "dark e sensuale",
        "emotivo da BookTok",
        "spicy ma elegante",
        "pulito e profondo",
        "melanconico e struggente",
      ],
      intensities: [
        { value: "soft", label: "Morbida" },
        { value: "medium", label: "Media" },
        { value: "slow burn", label: "Lenta e bruciante" },
        { value: "high drama", label: "Alto dramma" },
        { value: "emotional devastation", label: "Devastazione emotiva" },
        { value: "dark but elegant", label: "Dark ma elegante" },
      ],
      dynamics: [
        "amore proibito",
        "attrazione e colpa",
        "redenzione",
        "tradimento",
        "perdita e rinascita",
        "fuga dal passato",
        "nemici costretti a collaborare",
      ],
    };
  }

  return {
    subcategory: "narrativa commerciale",
    tone: "cinematografico",
    intensity: "media",
    centralDynamic: "segreto familiare",
    targetReader: "Lettori di narrativa ad alta tensione emotiva, personaggi forti e promessa chiara.",
    narrativePromise: "Una storia con personaggi memorabili, conflitto leggibile e payoff emotivo forte.",
    subgenres: [
      { value: "narrativa commerciale", label: "Narrativa commerciale" },
      { value: "literary fiction", label: "Narrativa letteraria" },
      { value: "family saga", label: "Saga familiare" },
      { value: "coming of age", label: "Formazione / crescita" },
      { value: "memoir narrativo", label: "Memoir narrativo" },
      { value: "self help narrativo", label: "Self Help narrativo" },
    ],
    tones: [
      "cinematografico",
      "elegante e letterario",
      "veloce e commerciale",
      "crudo e realistico",
      "intimo e confessionale",
      "sospeso e misterioso",
    ],
    intensities: [
      { value: "media", label: "Media" },
      { value: "intense", label: "Intensa" },
      { value: "literary deep focus", label: "Profondità letteraria" },
      { value: "commercial page-turner", label: "Page-turner commerciale" },
    ],
    dynamics: [
      "segreto familiare",
      "redenzione",
      "tradimento",
      "perdita e rinascita",
      "identità nascosta",
      "fuga dal passato",
    ],
  };
}

function optionListHasValue(options: ChoiceOption[], value: string): boolean {
  const clean = String(value || "").trim().toLowerCase();
  return options.some((option) => optionValue(option).toLowerCase() === clean || optionLabel(option).toLowerCase() === clean);
}

function resolveChoiceValue(options: ChoiceOption[], value: string, fallback: string): string {
  const clean = String(value || "").trim().toLowerCase();
  const found = options.find(
    (option) => optionValue(option).toLowerCase() === clean || optionLabel(option).toLowerCase() === clean,
  );
  return found ? optionValue(found) : fallback;
}

function displayChoiceLabel(options: ChoiceOption[], value: string): string {
  const clean = String(value || "").trim().toLowerCase();
  const found = options.find(
    (option) => optionValue(option).toLowerCase() === clean || optionLabel(option).toLowerCase() === clean,
  );
  return found ? optionLabel(found) : value;
}


interface Props {
  open: boolean;
  onClose: () => void;
  onAuthorIdentity?: () => void;
}

const GENRES = [
  { value: "horror", label: "Horror" },
  { value: "thriller", label: "Thriller" },
  { value: "fantasy", label: "Fantasy" },
  { value: "romance", label: "Romance" },
  { value: "dark-romance", label: "Dark Romance" },
  { value: "sci-fi", label: "Fantascienza" },
  { value: "literary fiction", label: "Narrativa" },
  { value: "historical fiction", label: "Storico" },
  { value: "self help", label: "Self Help" },
  { value: "memoir", label: "Memoir" },
];

const LANGUAGES = ["Italian", "English", "Spanish", "French", "German"];


type CharacterStudioSmartPreset = {
  subcategory: string;
  tone: string;
  intensity: string;
  centralDynamic: string;
  spiceLevel: string;
  darknessLevel: string;
  violenceLevel: string;
  targetReader: string;
  narrativePromise: string;
  subgenres: string[];
  tones: string[];
  intensities: string[];
  dynamics: string[];
};

function normalizeStudioGenre(value: string): string {
  return String(value || "").toLowerCase().replace(/[_\s]+/g, "-");
}

function getCharacterStudioPreset(genre: string): CharacterStudioSmartPreset {
  const g = normalizeStudioGenre(genre);

  if (/thriller|crime|noir|mistero|suspense/.test(g)) {
    return {
      subcategory: "thriller psicologico",
      tone: "teso e cinematografico",
      intensity: "alta suspense",
      centralDynamic: "indagine",
      spiceLevel: "non applicabile",
      darknessLevel: "dark",
      violenceLevel: "psicologica",
      targetReader: "Lettori di thriller psicologici, misteri oscuri, segreti familiari e colpi di scena emotivi.",
      narrativePromise: "Un thriller ad alta tensione dove ogni risposta apre una ferita più profonda, fino a una verità che cambia il senso di tutto.",
      subgenres: [
        "Thriller psicologico",
        "Crime / noir",
        "Mistero",
        "Suspense psicologica",
        "Thriller domestico",
        "Persona scomparsa",
        "Thriller legale",
        "Cospirazione",
        "Storia di vendetta",
        "Cold case",
        "Isola / luogo chiuso",
        "Segreto familiare",
      ],
      tones: [
        "teso e cinematografico",
        "sospeso e misterioso",
        "crudo e realistico",
        "brutale e ad alta tensione",
        "elegante e letterario",
        "dark e atmosferico",
        "page-turner commerciale",
      ],
      intensities: [
        "Alta suspense",
        "Page-turner commerciale",
        "Intensa",
        "Lenta e inquietante",
        "Profondità psicologica",
        "Devastazione emotiva",
      ],
      dynamics: [
        "indagine",
        "segreto familiare",
        "persona scomparsa",
        "tradimento",
        "vendetta",
        "ossessione",
        "fuga dal passato",
        "identità nascosta",
        "colpa e verità",
        "sopravvivenza",
      ],
    };
  }

  if (/horror|folk/.test(g)) {
    return {
      subcategory: "horror gotico",
      tone: "gotico e atmosferico",
      intensity: "dark ma elegante",
      centralDynamic: "sopravvivenza",
      spiceLevel: "non applicabile",
      darknessLevel: "dark",
      violenceLevel: "psicologica",
      targetReader: "Lettori di horror atmosferico, luoghi malati, presenze ambigue e tensione psicologica.",
      narrativePromise: "Un horror in cui il luogo non è sfondo ma minaccia, e la verità arriva come una contaminazione.",
      subgenres: [
        "Horror gotico",
        "Folk horror",
        "Casa infestata",
        "Survival horror",
        "Possessione",
        "Body horror leggero",
        "Horror psicologico",
        "Luogo maledetto",
        "Culto / rituale",
      ],
      tones: [
        "gotico e atmosferico",
        "sospeso e misterioso",
        "brutale e ad alta tensione",
        "crudo e realistico",
        "melanconico e disturbante",
        "dark e sensoriale",
      ],
      intensities: [
        "Lenta e inquietante",
        "Alta suspense",
        "Dark ma elegante",
        "Intensa",
        "Devastazione emotiva",
      ],
      dynamics: [
        "sopravvivenza",
        "ossessione",
        "segreto familiare",
        "perdita e rinascita",
        "fuga dal passato",
        "contagio",
        "memoria e colpa",
        "presenza soprannaturale",
      ],
    };
  }

  if (/fantasy|romantasy|urban|epico|dark-fantasy/.test(g)) {
    return {
      subcategory: /romantasy/.test(g) ? "romantasy" : "dark fantasy",
      tone: "epico e mitico",
      intensity: "alto dramma",
      centralDynamic: "potere e corruzione",
      spiceLevel: /romantasy/.test(g) ? "medio" : "non applicabile",
      darknessLevel: /dark/.test(g) ? "dark" : "medio",
      violenceLevel: "medio",
      targetReader: "Lettori di fantasy con magia, destino, alleanze instabili, potere e trasformazione emotiva.",
      narrativePromise: "Un fantasy dove il potere salva e corrompe, e ogni scelta costa identità, memoria o libertà.",
      subgenres: [
        "Fantasy epico",
        "Dark fantasy",
        "Urban fantasy",
        "Romantasy",
        "Prescelto",
        "Portal fantasy",
        "Academy",
        "Intrighi di corte",
        "Magia proibita",
        "Regno in rovina",
        "Famiglia trovata",
      ],
      tones: [
        "epico e mitico",
        "gotico e atmosferico",
        "elegante e letterario",
        "veloce e commerciale",
        "sospeso e misterioso",
        "dark e sensoriale",
      ],
      intensities: [
        "Alto dramma",
        "Page-turner commerciale",
        "Intensa",
        "Dark ma elegante",
        "Profondità letteraria",
      ],
      dynamics: [
        "potere e corruzione",
        "destino contro libero arbitrio",
        "rivalità",
        "redenzione",
        "identità nascosta",
        "nemici costretti a collaborare",
        "famiglia trovata",
        "tradimento",
      ],
    };
  }

  if (/romance|dark-romance/.test(g)) {
    return {
      subcategory: /dark/.test(g) ? "dark romance" : "slow burn",
      tone: /dark/.test(g) ? "dark e sensuale" : "romantico slow burn",
      intensity: /dark/.test(g) ? "dark ma elegante" : "lenta e bruciante",
      centralDynamic: /dark/.test(g) ? "attrazione e colpa" : "amore proibito",
      spiceLevel: "medio",
      darknessLevel: /dark/.test(g) ? "dark" : "medio",
      violenceLevel: /dark/.test(g) ? "psicologica" : "assente",
      targetReader: "Lettrici di romance emotivo, tensione relazionale, desiderio progressivo e payoff sentimentale forte.",
      narrativePromise: "Una storia d'amore ad alta tensione emotiva, dove desiderio e ferita si trasformano in scelta.",
      subgenres: [
        "Slow burn",
        "Nemici che si innamorano",
        "Seconda occasione",
        "Amore proibito",
        "Piccola città",
        "Romance sul lavoro",
        "Finta relazione",
        "Costretti vicini",
        "Da amici ad amanti",
        "Dark romance",
        "Mafia romance",
      ],
      tones: [
        "romantico slow burn",
        "poetico e cinematografico",
        "dark e sensuale",
        "emotivo da BookTok",
        "spicy ma elegante",
        "pulito e profondo",
        "melanconico e struggente",
      ],
      intensities: [
        "Morbida",
        "Media",
        "Lenta e bruciante",
        "Alto dramma",
        "Devastazione emotiva",
        "Dark ma elegante",
      ],
      dynamics: [
        "amore proibito",
        "attrazione e colpa",
        "redenzione",
        "tradimento",
        "perdita e rinascita",
        "fuga dal passato",
        "nemici costretti a collaborare",
      ],
    };
  }

  return {
    subcategory: "narrativa commerciale",
    tone: "cinematografico",
    intensity: "media",
    centralDynamic: "segreto familiare",
    spiceLevel: "non applicabile",
    darknessLevel: "medio",
    violenceLevel: "medio",
    targetReader: "Lettori di narrativa ad alta tensione emotiva, personaggi forti e promessa chiara.",
    narrativePromise: "Una storia con personaggi memorabili, conflitto leggibile e payoff emotivo forte.",
    subgenres: [
      "Narrativa letteraria",
      "Saga familiare",
      "Young adult",
      "Avventura",
      "Suspense",
      "Formazione / crescita",
      "Arco di redenzione",
      "Personaggi moralmente ambigui",
    ],
    tones: [
      "cinematografico",
      "elegante e letterario",
      "veloce e commerciale",
      "crudo e realistico",
      "intimo e confessionale",
      "sospeso e misterioso",
    ],
    intensities: [
      "Media",
      "Intensa",
      "Profondità letteraria",
      "Page-turner commerciale",
    ],
    dynamics: [
      "segreto familiare",
      "redenzione",
      "tradimento",
      "perdita e rinascita",
      "identità nascosta",
      "fuga dal passato",
    ],
  };
}

const CHARACTER_STUDIO_PRESET_GENRES = [
  "romance",
  "dark-romance",
  "thriller",
  "crime",
  "mystery",
  "horror",
  "fantasy",
  "romantasy",
  "sci-fi",
  "literary fiction",
  "self help",
  "memoir",
];

function isAutoPresetText(value: string, field: "targetReader" | "narrativePromise"): boolean {
  const clean = value.trim();
  if (!clean) return true;
  return CHARACTER_STUDIO_PRESET_GENRES.some((presetGenre) => {
    const smart = getCharacterStudioPreset(presetGenre)[field];
    const direction = getCharacterStudioDirectionPreset(presetGenre)[field];
    return clean === smart || clean === direction;
  });
}

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

function charactersFromCharacterBibleText(text?: string): any[] {
  const raw = String(text || "").trim();
  if (!raw) return [];

  return raw
    .split(/\n{2,}(?=Nome:|Name:)/g)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const get = (label: string) => {
        const found = lines.find((line) => line.toLowerCase().startsWith(label.toLowerCase()));
        return found ? found.replace(new RegExp("^" + label + "\\s*", "i"), "").trim() : "";
      };

      const name = get("Nome:") || get("Name:") || lines[0] || "Personaggio";
      const surname = get("Cognome:") || get("Surname:");
      const character = get("Carattere:") || get("Personality:");
      const contradiction = get("Contraddizione:") || get("Contradiction:") || get("Blind spot:");
      const dominantFlaw = get("Difetto dominante:") || get("Dominant flaw:");
      const transformationArc = get("Arco di trasformazione:") || get("Transformation arc:");
      const personality = [
        character,
        contradiction && `Contraddizione: ${contradiction}`,
        dominantFlaw && `Difetto dominante: ${dominantFlaw}`,
        transformationArc && `Arco di trasformazione: ${transformationArc}`,
      ].filter(Boolean).join("\n");

      return {
        name,
        surname,
        age: get("Età:") || get("Age:"),
        role: get("Ruolo nella storia:") || get("Role:"),
        physicalDescription: get("Aspetto fisico:") || get("Physical description:"),
        wound: get("Ferita interiore:") || get("Core wound:"),
        externalDesire: get("Desiderio esterno:") || get("External desire:"),
        internalNeed: get("Bisogno interiore:") || get("Internal need:"),
        secret: get("Segreto:") || get("Secret:"),
        vulnerability: get("Paura:") || get("Core fear:") || get("Fear:") || get("Vulnerabilità:") || get("Vulnerability:"),
        dominantFlaw,
        blindSpot: contradiction,
        emotionalTriggers: get("Trigger emotivi:") || get("Emotional triggers:"),
        recurringBehavior: get("Comportamento ricorrente:") || get("Recurring behavior:"),
        personalLanguage: get("Linguaggio personale:") || get("Personal language:") || get("Voce:") || get("Voice:"),
        relationships: get("Rapporto con gli altri personaggi:") || get("Relationship to other characters:"),
        personality: personality || block,
        strictRules:
          get("Regole di continuità:") ||
          get("Continuity rules:") ||
          `Non rinominare mai ${name}. Mantieni ruolo, ferita, desiderio, segreto e dinamica.`,
      };
    })
    .filter((character) => String(character.name || "").trim().length >= 2)
    .slice(0, 12);
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
Paura: Essere scelta solo finché resta utile, poi abbandonata quando mostra il bisogno vero.
Contraddizione: Desidera appartenenza ma sabota ogni luogo che potrebbe diventare casa.
Difetto dominante: Trasforma lucidità e controllo in distanza emotiva.
Trigger emotivi: Promesse vaghe, stanze chiuse, messaggi senza risposta, qualcuno che decide per lei.
Comportamento ricorrente: Riordina oggetti piccoli quando mente o sta per cedere.
Linguaggio personale: Frasi precise, ironia asciutta, domande che spostano il peso sull'altro.
Arco di trasformazione: Da fuga elegante a scelta consapevole di restare anche quando costa.
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
Paura: Se lascia entrare qualcuno, dovrà ammettere quanto è rimasto fermo nel passato.
Contraddizione: Vuole proteggere ${protagonistName}, ma ogni protezione rischia di diventare possesso.
Difetto dominante: Confondere silenzio e lealtà, controllo e cura.
Trigger emotivi: Domande sul passato, gesti di fiducia improvvisi, oggetti legati alla perdita.
Comportamento ricorrente: Risponde tardi, osserva le uscite, sistema le maniche prima di dire una verità.
Linguaggio personale: Poche parole, concrete, con sottotesto; evita confessioni dirette finché la scena lo costringe.
Arco di trasformazione: Da custode del passato a persona capace di scegliere il presente senza cancellare ciò che ha perso.
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
  const normalizedIdea = input.idea.replace(/\s+/g, " ").trim();
  const base = normalizedIdea.replace(/[.!?]*$/, ".");
  return `${base} Scriptora la sviluppa come premessa editoriale completa: il cuore della storia resta quello indicato dall'utente, ma la traiettoria viene chiarita in ferita, desiderio, posta in gioco e conseguenza finale. Il genere resta ${optionLabel(ROMAN_GENRES_PRO.find(o => optionValue(o) === input.genre) || input.genre)}, con filone ${optionLabel(SUBGENRES_PRO.find(o => optionValue(o) === input.subcategory) || input.subcategory)}, tono ${input.tone || "cinematografico"} e intensità ${input.intensity || "media"}. La protagonista deve restare coerente con l'idea originale, ma ogni scena dovrà aumentare conflitto, scelta morale e tensione emotiva senza tradire la storia che l'utente vuole raccontare.`;
}


function cleanOneLine(value: unknown, max = 110): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

function pickStableVariant(options: string[], seed: string): string {
  const cleanOptions = options.filter(Boolean);
  if (!cleanOptions.length) return "Titolo provvisorio";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  return cleanOptions[Math.abs(hash) % cleanOptions.length];
}

function titleCaseFragment(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildCharacterStudioFallbackTitle(input: {
  idea?: string;
  genre?: string;
  subcategory?: string;
  setting?: string;
  centralDynamic?: string;
}): string {
  const genre = cleanOneLine(input.genre).toLowerCase();
  const subcategory = cleanOneLine(input.subcategory);
  const setting = cleanOneLine(input.setting, 48);
  const dynamic = cleanOneLine(input.centralDynamic, 48);
  const idea = cleanOneLine(input.idea, 140);
  const hay = `${idea} ${dynamic} ${genre} ${subcategory} ${setting}`.toLowerCase();
  const seed = hay || `${Date.now()}`;

  const place = titleCaseFragment(setting);
  const motif = titleCaseFragment(
    (hay.match(/archiv\w*|soteropoli|villa|casa|palazzo|isola|accademia|ritratto|dipinto|fotogra\w*|memoria|cenere|ombra|fiamma|contratto|patto|segreto|acqua|stelle|sangue/i) || [""])[0],
  );

  if (setting) {
    return pickStableVariant([
      place ? `Il segreto di ${place}` : "",
      place ? `Le ombre di ${place}` : "",
      place ? `La memoria di ${place}` : "",
      motif ? `${motif} proibita` : "",
    ], seed);
  }

  if (/dark.?romance|romance/.test(genre)) {
    return pickStableVariant([
      motif ? `${motif} e desiderio` : "",
      motif ? `La promessa di ${motif}` : "",
      "La ferita che resta",
      "Il confine del desiderio",
      "Quello che brucia tra noi",
      "La colpa dei baci impossibili",
      "Dove l'amore diventa ombra",
      "Il patto delle cose non dette",
    ], seed);
  }

  if (/thriller|suspense|crime|noir/.test(genre)) {
    return pickStableVariant(["La verità sepolta", "Il nome che manca", "L'ultima prova", "Prima che cada il silenzio"], seed);
  }
  if (/horror|gotic/.test(genre)) {
    return pickStableVariant(["La casa che ricorda", "Le stanze del buio", "Il respiro delle mura", "Dove dormono le ombre"], seed);
  }
  if (/fantasy|romantasy/.test(genre)) {
    return pickStableVariant(["Il canto delle ombre", "La corona spezzata", "La città sotto l'incanto", "Il giuramento delle stelle"], seed);
  }
  if (/sci.?fi|fantascienza|cyberpunk/.test(genre)) {
    return pickStableVariant(["La memoria delle stelle", "L'orbita dei fantasmi", "Il codice dell'ultima alba", "Neon sopra il vuoto"], seed);
  }

  if (subcategory) return pickStableVariant([`Il segreto ${subcategory}`, `La promessa ${subcategory}`, `Anatomia di ${subcategory}`], seed);

  const extracted = titleCaseFragment(idea);
  return extracted.length > 10 ? extracted : "Titolo provvisorio";
}

function buildCharacterStudioFallbackSubtitle(input: {
  idea?: string;
  narrativePromise?: string;
  centralDynamic?: string;
  genre?: string;
  subcategory?: string;
}): string {
  const promise = cleanOneLine(input.narrativePromise, 130);
  if (promise.length >= 12) return promise;

  const dynamic = cleanOneLine(input.centralDynamic, 90);
  if (dynamic.length >= 8) {
    return `Una storia di ${dynamic}, segreti e trasformazione.`;
  }

  const idea = cleanOneLine(input.idea, 140);
  if (idea.length >= 24) {
    return idea.endsWith(".") ? idea : `${idea}.`;
  }

  const genre = cleanOneLine(input.genre || "romanzo");
  const subcategory = cleanOneLine(input.subcategory);
  return `Un ${genre}${subcategory ? ` ${subcategory}` : ""} dove ogni scelta cambia il destino dei personaggi.`;
}

function clampTitleScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function buildTitleScoreRows(input: {
  title: string;
  subtitle: string;
  idea: string;
  genre: string;
  subcategory: string;
}): Array<{ label: string; value: number }> {
  const title = cleanOneLine(input.title, 120);
  const subtitle = cleanOneLine(input.subtitle, 180);
  const ideaWords = new Set(
    cleanOneLine(input.idea, 320)
      .toLowerCase()
      .split(/[^a-zà-ÿ0-9]+/i)
      .filter((word) => word.length > 4),
  );
  const titleWords = title
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/i)
    .filter((word) => word.length > 3);
  const storySpecificWords = titleWords.filter((word) => ideaWords.has(word)).length;
  const hasGenreSignal = `${title} ${subtitle}`.toLowerCase().includes(input.genre.replace("-", " ")) ||
    `${title} ${subtitle}`.toLowerCase().includes(input.subcategory.toLowerCase());

  return [
    { label: "Memorabilità", value: clampTitleScore(5 + (title.length >= 12 ? 1 : 0) + (title.length <= 52 ? 1 : 0) + (/[’']/u.test(title) ? 0 : 1)) },
    { label: "Hook", value: clampTitleScore(5 + (subtitle.length >= 45 ? 2 : 0) + (/[?.!]/u.test(subtitle) ? 1 : 0) + (titleWords.length <= 6 ? 1 : 0)) },
    { label: "Originalità", value: clampTitleScore(5 + Math.min(3, storySpecificWords) + (titleWords.length >= 3 ? 1 : 0)) },
    { label: "Coerenza con la storia", value: clampTitleScore(5 + Math.min(3, storySpecificWords) + (hasGenreSignal ? 1 : 0)) },
  ];
}

function scoreToneClass(value: number): string {
  if (value >= 8) return "text-emerald-300";
  if (value >= 6) return "text-amber-200";
  return "text-muted-foreground";
}

function InfoLine({ label, value }: { label: string; value?: unknown }) {
  const text = String(value || "").trim();
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-foreground">{text || "Da definire"}</p>
    </div>
  );
}


export function CharacterStudioDialog({ open, onClose, onAuthorIdentity }: Props) {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("literary fiction");
  const [subcategory, setSubcategory] = useState("narrativa commerciale");
  const [tone, setTone] = useState("cinematografico");
  const [intensity, setIntensity] = useState("media");
  const [centralDynamic, setCentralDynamic] = useState("segreto familiare");
  const [protagonistType, setProtagonistType] = useState("protagonista ferita ma combattiva");
  const [language, setLanguage] = useState("Italian");
  const [bookFormat, setBookFormat] = useState("novel");
  const [bookLength, setBookLength] = useState("medium");
  const [chapterCount, setChapterCount] = useState(20);
  const [subchaptersEnabled, setSubchaptersEnabled] = useState(false);
  const [subchaptersPerChapter, setSubchaptersPerChapter] = useState(3);
  const [targetReader, setTargetReader] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookSubtitle, setBookSubtitle] = useState("");
  const [narrativePromise, setNarrativePromise] = useState("");
  const [setting, setSetting] = useState("");
  const [endingType, setEndingType] = useState("chiuso ma con eco");
  const [pov, setPov] = useState("terza persona limitata");
  const [tense, setTense] = useState("passato");
  const [spiceLevel, setSpiceLevel] = useState("non applicabile");
  const [darknessLevel, setDarknessLevel] = useState("medio");
  const [violenceLevel, setViolenceLevel] = useState("medio");
  const [canonRules, setCanonRules] = useState("");
  const [manualCharacterNames, setManualCharacterNames] = useState("");
  const [characterBible, setCharacterBible] = useState("");
  const [previewPanel, setPreviewPanel] = useState<"idea" | "bible" | null>(null);
  const [showCastDetails, setShowCastDetails] = useState(false);
  const [openCharacterIndex, setOpenCharacterIndex] = useState(0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [liveOperation, setLiveOperation] = useState<CharacterStudioLiveOperation | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const preset = getCharacterStudioPreset(genre);

    setSubcategory((current) => {
      const normalized = current.trim().toLowerCase();
      const allowed = preset.subgenres.some((item) => item.toLowerCase() === normalized);
      return allowed ? current : preset.subcategory;
    });

    setTone((current) => {
      const normalized = current.trim().toLowerCase();
      const allowed = preset.tones.some((item) => item.toLowerCase() === normalized);
      return allowed ? current : preset.tone;
    });

    setIntensity((current) => {
      const normalized = current.trim().toLowerCase();
      const allowed = preset.intensities.some((item) => item.toLowerCase() === normalized);
      return allowed ? current : preset.intensity;
    });

    setCentralDynamic((current) => {
      const normalized = current.trim().toLowerCase();
      const allowed = preset.dynamics.some((item) => item.toLowerCase() === normalized);
      return allowed ? current : preset.centralDynamic;
    });

    setSpiceLevel(preset.spiceLevel);
    setDarknessLevel(preset.darknessLevel);
    setViolenceLevel(preset.violenceLevel);

    setTargetReader((current) => isAutoPresetText(current, "targetReader") ? preset.targetReader : current);
    setNarrativePromise((current) => isAutoPresetText(current, "narrativePromise") ? preset.narrativePromise : current);
  }, [genre]);

  useEffect(() => {
    const preset = getCharacterStudioDirectionPreset(genre);

    setSubcategory((current) => resolveChoiceValue(preset.subgenres, current, preset.subcategory));
    setTone((current) => resolveChoiceValue(preset.tones, current, preset.tone));
    setIntensity((current) => resolveChoiceValue(preset.intensities, current, preset.intensity));
    setCentralDynamic((current) => resolveChoiceValue(preset.dynamics, current, preset.centralDynamic));

    setTargetReader((current) => isAutoPresetText(current, "targetReader") ? preset.targetReader : current);
    setNarrativePromise((current) => isAutoPresetText(current, "narrativePromise") ? preset.narrativePromise : current);
  }, [genre]);

  useEffect(() => {
    if (!open) return;
    try {
      const freshStart = sessionStorage.getItem("scriptora-character-studio-fresh-start") === "1";
      if (freshStart) {
        sessionStorage.removeItem("scriptora-character-studio-fresh-start");
        sessionStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
        sessionStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
        localStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
        localStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);

        setIdea("");
        setGenre("literary fiction");
        setSubcategory("narrativa commerciale");
        setTone("cinematografico");
        setIntensity("media");
        setCentralDynamic("segreto familiare");
        setProtagonistType("protagonista ferita ma combattiva");
        setLanguage("Italian");
        setBookFormat("novel");
        setBookLength("medium");
        setChapterCount(20);
        setSubchaptersEnabled(false);
        setSubchaptersPerChapter(3);
        setTargetReader("");
        setNarrativePromise("");
        setSetting("");
        setEndingType("chiuso ma con eco");
        setPov("terza persona limitata");
        setTense("passato");
        setSpiceLevel("non applicabile");
        setDarknessLevel("medio");
        setViolenceLevel("medio");
        setCanonRules("");
        setManualCharacterNames("");
        setCharacterBible("");
        setShowCastDetails(false);
        setOpenCharacterIndex(0);
        setAdvancedOpen(false);
        setSaved(false);
        return;
      }

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
        if (parsed.bookFormat) setBookFormat(parsed.bookFormat);
        if (parsed.bookLength) setBookLength(parsed.bookLength);
        if (parsed.chapterCount) setChapterCount(Number(parsed.chapterCount) || 20);
        if (typeof parsed.subchaptersEnabled === "boolean") setSubchaptersEnabled(parsed.subchaptersEnabled);
        if (parsed.subchaptersPerChapter) setSubchaptersPerChapter(Number(parsed.subchaptersPerChapter) || 3);
        if (parsed.targetReader) setTargetReader(parsed.targetReader);
        if (parsed.title) setBookTitle(parsed.title);
        if (parsed.subtitle) setBookSubtitle(parsed.subtitle);
        if (parsed.narrativePromise) setNarrativePromise(parsed.narrativePromise);
        if (parsed.setting) setSetting(parsed.setting);
        if (parsed.endingType) setEndingType(parsed.endingType);
        if (parsed.pov) setPov(parsed.pov);
        if (parsed.tense) setTense(parsed.tense);
        if (parsed.spiceLevel) setSpiceLevel(parsed.spiceLevel);
        if (parsed.darknessLevel) setDarknessLevel(parsed.darknessLevel);
        if (parsed.violenceLevel) setViolenceLevel(parsed.violenceLevel);
        if (parsed.canonRules) setCanonRules(parsed.canonRules);
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
    setLiveOperation("idea");

    const currentIdea = idea.trim();
    const currentLooksLikeGeneratedIdea = currentIdea.length > 180;
    const previousIdeas = [
      ...(currentLooksLikeGeneratedIdea ? [currentIdea] : []),
      ...readIdeaHistory(),
    ].filter(Boolean).slice(0, 12);

    try {
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
    } catch (error) {
      devOnlyDiagnostic("character-studio-idea-fallback", error);
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
      toast.message("Idea pronta", {
        description: "Ho preparato una versione rapida utilizzabile. Puoi rigenerarla quando vuoi.",
      });
    } finally {
      setIdeaLoading(false);
      setLiveOperation(null);
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
    setLiveOperation("story");

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
    } catch (error) {
      devOnlyDiagnostic("character-studio-story-fallback", error);
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
      toast.message("Storia elaborata", {
        description: "Ho preparato una versione rapida mantenendo il nucleo originale.",
      });
    } finally {
      setIdeaLoading(false);
      setLiveOperation(null);
    }
  };

  const directionPreset = getCharacterStudioDirectionPreset(genre);
  const directionSubgenreOptions = directionPreset.subgenres;
  const directionToneOptions = directionPreset.tones;
  const directionIntensityOptions = directionPreset.intensities;
  const directionDynamicOptions = directionPreset.dynamics;

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
    bookType: bookFormat,
    bookTypeId: bookFormat,
    bookFormat,
    bookLength,
    chapterCount,
    numberOfChapters: chapterCount,
    subchaptersEnabled,
    subchaptersPerChapter,
    targetReader: targetReader.trim(),
    narrativePromise: narrativePromise.trim(),
    promise: narrativePromise.trim(),
    setting: setting.trim(),
    endingType,
    pov,
    tense,
    spiceLevel,
    darknessLevel,
    violenceLevel,
    canonRules: canonRules.trim(),
    manualCharacterNames: manualCharacterNames.trim(),
    characterBible: characterBible.trim(),
    createdAt: new Date().toISOString(),
  }), [
    idea,
    genre,
    subcategory,
    tone,
    intensity,
    centralDynamic,
    protagonistType,
    language,
    bookFormat,
    bookLength,
    chapterCount,
    subchaptersEnabled,
    subchaptersPerChapter,
    targetReader,
    narrativePromise,
    setting,
    endingType,
    pov,
    tense,
    spiceLevel,
    darknessLevel,
    violenceLevel,
    canonRules,
    manualCharacterNames,
    characterBible,
  ]);

  const generate = async () => {
    if (!canGenerate || loading) return;
    setLoading(true);
    setLiveOperation("characters");
    setSaved(false);

    try {
      const { chargePremiumOperation } = await import("@/lib/billing/charge");
      await chargePremiumOperation("character_studio_ai", { source: "character_studio_bible", genre }, undefined, [idea.slice(0, 32)]);
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
      setShowCastDetails(false);
      setOpenCharacterIndex(0);
      toast.success("Personaggi generati. Ora puoi leggerli, salvarli e continuare nella creazione libro.");
    } catch (e) {
      devOnlyDiagnostic("character-studio-bible-fallback", e);
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
      setShowCastDetails(false);
      setOpenCharacterIndex(0);
      toast.message("Character Bible pronta", {
        description: "Ho preparato una versione rapida utilizzabile. Puoi salvarla e collegarla al libro.",
      });
    } finally {
      setLoading(false);
      setLiveOperation(null);
    }
  };

  const generateTitleAndSubtitle = async () => {
    if (liveOperation) return;
    setLiveOperation("title");
    try {
      await sleep(650);

      const resolvedTitle = buildCharacterStudioFallbackTitle({
        idea,
        genre,
        subcategory,
        setting,
        centralDynamic,
      });

      const resolvedSubtitle = buildCharacterStudioFallbackSubtitle({
        idea,
        narrativePromise,
        centralDynamic,
        genre,
        subcategory,
      });

      setBookTitle(resolvedTitle);
      setBookSubtitle(resolvedSubtitle);
      setNarrativePromise((current) => current.trim() ? current : resolvedSubtitle);
      toast.success("Titolo e sottotitolo preparati per il flusso libro.");
    } finally {
      setLiveOperation(null);
    }
  };

  const saveAndLink = () => {
    const bible = String(characterBible || "").trim();

    if (!bible) {
      toast.error("Prima genera i personaggi: l’output Character Bible è vuoto.");
      return;
    }
    setLiveOperation("handoff");

    const characters = charactersFromCharacterBibleText(bible);
    const cleanIdea = idea.trim();
    const cleanSubcategory = subcategory.trim();
    const cleanTone = tone.trim();
    const cleanDynamic = centralDynamic.trim();
    const plot = [
      cleanIdea,
      cleanDynamic ? `Dinamica narrativa: ${cleanDynamic}` : "",
      protagonistType.trim() ? `Tipo protagonista: ${protagonistType.trim()}` : "",
      intensity ? `Intensità: ${intensity}` : "",
    ].filter(Boolean).join("\n\n");

    const resolvedTitle = bookTitle.trim() || buildCharacterStudioFallbackTitle({
      idea: cleanIdea,
      genre,
      subcategory: cleanSubcategory,
      setting,
      centralDynamic: cleanDynamic,
    });
    const resolvedSubtitle = bookSubtitle.trim() || buildCharacterStudioFallbackSubtitle({
      idea: cleanIdea,
      narrativePromise,
      centralDynamic: cleanDynamic,
      genre,
      subcategory: cleanSubcategory,
    });
    const resolvedPromise = narrativePromise.trim() || resolvedSubtitle;

    const payload = {
      source: "character-studio",
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
      idea: cleanIdea,
      genre,
      subcategory: cleanSubcategory,
      subgenre: cleanSubcategory,
      niche: cleanSubcategory,
      tone: cleanTone,
      intensity,
      centralDynamic: cleanDynamic,
      protagonistType: protagonistType.trim(),
      language,
      category: "Fiction",
      bookType: bookFormat,
      bookTypeId: bookFormat,
      bookFormat,
      bookLength,
      chapterCount,
      numberOfChapters: chapterCount,
      subchaptersEnabled,
      subchaptersPerChapter,
      manualCharacterNames: manualCharacterNames.trim(),
      characters,
      plot,
      conflict: cleanDynamic || cleanIdea,
      promise: resolvedPromise,
      narrativePromise: resolvedPromise,
      targetReader:
        targetReader.trim() ||
        `Lettori di ${genre}${cleanSubcategory ? ` / ${cleanSubcategory}` : ""} con tono ${cleanTone || "cinematografico"}`,
      setting: setting.trim(),
      endingType,
      pov,
      tense,
      spiceLevel,
      darknessLevel,
      violenceLevel,
      canonRules: canonRules.trim(),
      style: cleanTone,
      structureMode: subchaptersEnabled ? "chaptered-fiction-with-subchapters" : "chaptered-fiction",
      commercialAngle: resolvedPromise || cleanDynamic || cleanIdea,
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
      const lightPayload = {
        source: "character-studio",
        title: resolvedTitle,
        subtitle: resolvedSubtitle,
        idea: cleanIdea.slice(0, 1200),
        genre,
        subcategory: cleanSubcategory,
        subgenre: cleanSubcategory,
        niche: cleanSubcategory,
        tone: cleanTone,
        language,
        bookType: bookFormat,
        bookTypeId: bookFormat,
        bookFormat,
        bookLength,
        chapterCount,
        numberOfChapters: chapterCount,
        promise: resolvedPromise.slice(0, 800),
        narrativePromise: resolvedPromise.slice(0, 800),
        setting: setting.trim().slice(0, 500),
        centralDynamic: cleanDynamic.slice(0, 500),
        characters: Array.isArray((payload as any).characters)
          ? (payload as any).characters.slice(0, 8).map((character: any) => ({
              id: character?.id,
              name: character?.name,
              role: character?.role,
              archetype: character?.archetype,
            }))
          : [],
        savedAsPreview: true,
        storageMode: "session-full-local-preview",
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(SCRIPTORA_CHARACTER_PROJECT_KEY, JSON.stringify(lightPayload));
        localStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
      } catch (storageError) {
        console.warn("[CharacterStudio] localStorage preview unavailable, continuing with sessionStorage handoff", storageError);
      }
      savedSomewhere = true;
    } catch (e) {
      console.warn("[CharacterStudio] optional localStorage preview ignored; sessionStorage handoff remains active", e);
      savedSomewhere = true;
    }

    if (!savedSomewhere) {
      setLiveOperation(null);
      toast.error("Non sono riuscito a salvare il collegamento personaggi. Prova a svuotare cache/spazio browser.");
      return;
    }

    const handoff = buildBookForgeHandoff("character-studio", payload);

    try {
      window.dispatchEvent(new Event("scriptora-character-bible-change"));
      window.dispatchEvent(
        new CustomEvent("scriptora-open-new-book-from-character-studio", {
          detail: { payload, handoff },
        }),
      );

      setSaved(true);
      setLiveOperation(null);
      onClose?.();

      navigate("/dashboard", {
        state: {
          openForge: true,
          bookForgeHandoff: handoff,
          source: "character-studio",
        },
      });

      toast.success("Personaggi collegati. Apro la creazione libro con cast, genere, filone e tono già pronti.");
    } catch (error) {
      devOnlyDiagnostic("[CharacterStudio] open creazione libro failed", error);
      setLiveOperation(null);
      setSaved(true);
      toast.success("Cast salvato. Apri la creazione libro dalla Dashboard per continuare.");
    }
  };

  const clear = () => {
    localStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
    sessionStorage.removeItem(SCRIPTORA_CHARACTER_BIBLE_KEY);
    localStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    sessionStorage.removeItem(SCRIPTORA_CHARACTER_PROJECT_KEY);
    setCharacterBible("");
    setManualCharacterNames("");
    setBookTitle("");
    setBookSubtitle("");
    setShowCastDetails(false);
    setOpenCharacterIndex(0);
    setSaved(false);
    toast.info("Character Bible rimossa.");
  };

  const hasIdeaReady = idea.trim().length >= 8;
  const hasTitleReady = bookTitle.trim().length >= 2;
  const hasSubtitleReady = bookSubtitle.trim().length >= 8 || narrativePromise.trim().length >= 8;
  const hasBibleReady = characterBible.trim().length >= 20;
  const characterSummaries = useMemo(() => charactersFromCharacterBibleText(characterBible), [characterBible]);
  const detectedCharacterCount = characterSummaries.length;
  const titleScoreRows = useMemo(
    () =>
      buildTitleScoreRows({
        title: bookTitle,
        subtitle: bookSubtitle || narrativePromise,
        idea,
        genre,
        subcategory,
      }),
    [bookTitle, bookSubtitle, narrativePromise, idea, genre, subcategory],
  );

  const missingHandoffItems = [
    !hasIdeaReady && "idea",
    !hasTitleReady && "titolo",
    !hasSubtitleReady && "promessa",
    !hasBibleReady && "personaggi",
  ].filter(Boolean) as string[];

  const primaryCharacterActionLabel = loading
    ? "Sto generando personaggi..."
    : ideaLoading
      ? "Sto preparando l’idea..."
      : !hasIdeaReady
        ? "Genera idea con Scriptora"
        : !hasTitleReady || !hasSubtitleReady
          ? "Genera titolo e promessa"
          : !hasBibleReady
            ? "Genera personaggi"
            : "CONTINUA NELLA CREAZIONE LIBRO";

  const runPrimaryCharacterAction = () => {
    if (loading || ideaLoading) return;

    if (!hasIdeaReady) {
      void generateNovelIdea();
      return;
    }

    if (!hasTitleReady || !hasSubtitleReady) {
      void generateTitleAndSubtitle();
      return;
    }

    if (!hasBibleReady) {
      void generate();
      return;
    }

    saveAndLink();
  };

  if (!open) return null;

  return (
    <div className="scriptora-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      {liveOperation && (
        <ScriptoraAliveTransition
          overlay
          tone="writer"
          title={CHARACTER_STUDIO_LIVE_COPY[liveOperation].title}
          steps={CHARACTER_STUDIO_LIVE_COPY[liveOperation].steps}
        />
      )}

      {previewPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-card/95 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Character Studio
                </p>
                <h3 className="text-lg font-bold text-foreground">
                  {previewPanel === "idea" ? "Idea del romanzo in lettura" : "Character Bible canonica"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPanel(null)}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              >
                Chiudi
              </button>
            </div>

            <div className="overflow-y-auto whitespace-pre-wrap px-6 py-5 text-sm leading-7 text-foreground">
              {(previewPanel === "idea" ? idea : characterBible).trim() || "Nessun testo disponibile."}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText((previewPanel === "idea" ? idea : characterBible).trim());
                  toast.success("Testo copiato.");
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                Copia testo
              </button>
              {previewPanel === "bible" && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewPanel(null);
                    saveAndLink();
                  }}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Salva e continua
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="scriptora-modal-panel relative flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="z-10 flex shrink-0 flex-col gap-3 border-b border-border bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Character Studio Pro</h2>
              <p className="text-xs text-muted-foreground">
                Dall'idea al libro in un flusso unico.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onAuthorIdentity && (
              <Button variant="outline" size="sm" onClick={onAuthorIdentity} className="gap-1.5 text-xs">
                <Fingerprint className="h-3.5 w-3.5" />
                Identità autore
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="scriptora-modal-body min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <section className="rounded-2xl border border-border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 1</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">Racconta la tua storia</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scrivi l'idea del romanzo. Scriptora costruirà il resto.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={developUserStory}
                  disabled={ideaLoading || loading || idea.trim().length < 20}
                  className="h-9 gap-1.5 text-xs"
                >
                  {ideaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Elabora la mia storia
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateNovelIdea}
                  disabled={ideaLoading || loading}
                  className="h-9 gap-1.5 text-xs"
                >
                  {ideaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  Genera idea con Scriptora
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Label>Idea del romanzo</Label>
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                rows={4}
                placeholder="Es. Una nave-laboratorio torna vuota al porto. Nella camera 14 restano audiocassette, mappe antiche e iscrizioni che cambiano quando nessuno guarda..."
                className="mt-2"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 2</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">Che libro stai scrivendo?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Blocca l'identità prima di generare titolo, promessa e cast.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <Label>Genere principale</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Filone</Label>
                <Select value={subcategory} onValueChange={setSubcategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {directionSubgenreOptions.map((option) => (
                      <SelectItem key={optionValue(option)} value={optionValue(option)}>
                        {optionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lingua</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tono narrativo</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {directionToneOptions.map((option) => (
                      <SelectItem key={optionValue(option)} value={optionValue(option)}>
                        {optionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background/60 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 3</p>
              <h3 className="mt-1 text-lg font-bold text-foreground">Coordinate narrative</h3>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">POV</span>
                <select
                  value={pov}
                  onChange={(event) => setPov(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="terza persona limitata">Terza persona limitata</option>
                  <option value="prima persona">Prima persona</option>
                  <option value="pov alternato">POV alternato</option>
                  <option value="terza persona corale">Terza persona corale</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Finale</span>
                <select
                  value={endingType}
                  onChange={(event) => setEndingType(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="chiuso ma con eco">Chiuso ma con eco</option>
                  <option value="agrodolce">Agrodolce</option>
                  <option value="aperto">Aperto</option>
                  <option value="disturbante">Disturbante</option>
                  <option value="cliffhanger">Cliffhanger</option>
                  <option value="happy ending">Happy ending</option>
                </select>
              </label>

              <div>
                <Label>Intensità</Label>
                <Select value={intensity} onValueChange={setIntensity}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {directionIntensityOptions.map((option) => (
                      <SelectItem key={optionValue(option)} value={optionValue(option)}>
                        {optionLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Oscurità</span>
                <select
                  value={darknessLevel}
                  onChange={(event) => setDarknessLevel(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="leggera">Leggera</option>
                  <option value="medio">Media</option>
                  <option value="dark">Dark</option>
                  <option value="estrema">Estrema</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 4</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">Identità commerciale</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Titolo, sottotitolo e promessa nascono dalle coordinate già scelte.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void generateTitleAndSubtitle()}
                disabled={!hasIdeaReady || Boolean(liveOperation)}
                className="gap-2"
              >
                {liveOperation === "title" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Genera titolo e promessa
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Titolo</span>
                <Input
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Titolo provvisorio"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Sottotitolo / promessa click</span>
                <Textarea
                  value={bookSubtitle}
                  onChange={(e) => {
                    setBookSubtitle(e.target.value);
                    setNarrativePromise((current) => current.trim() ? current : e.target.value);
                  }}
                  placeholder="Una frase che aumenta curiosità e desiderio, non una trama generica."
                  rows={3}
                />
              </label>
            </div>

            {hasTitleReady && (
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {titleScoreRows.map((row) => (
                  <div key={row.label} className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{row.label}</p>
                    <p className={`mt-1 text-lg font-bold tabular-nums ${scoreToneClass(row.value)}`}>{row.value}/10</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 5</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">Costruisci il cast</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  I personaggi restano canonici nel passaggio a Book Forge.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasBibleReady && (
                  <Button type="button" variant="outline" onClick={() => setShowCastDetails((current) => !current)} className="gap-2">
                    <Eye className="h-4 w-4" />
                    Visualizza cast
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={generate} disabled={!canGenerate || loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  {hasBibleReady ? "Rigenera" : "Genera personaggi"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className={`rounded-xl border px-3 py-2 ${hasBibleReady ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}>
                {hasBibleReady ? "✓ Character Bible pronta" : "Cast non generato"}
              </div>
              <div className={`rounded-xl border px-3 py-2 ${detectedCharacterCount ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-border bg-muted/20 text-muted-foreground"}`}>
                {detectedCharacterCount ? `✓ ${detectedCharacterCount} personaggi creati` : "Nessun personaggio canonico ancora disponibile"}
              </div>
            </div>

            {hasBibleReady && showCastDetails && (
              <div className="mt-4 space-y-2">
                {characterSummaries.length > 0 ? (
                  characterSummaries.map((character, index) => {
                    const characterName = [character.name, character.surname].filter(Boolean).join(" ") || `Personaggio ${index + 1}`;
                    const isOpen = openCharacterIndex === index;
                    return (
                      <div key={`${characterName}-${index}`} className="overflow-hidden rounded-xl border border-border bg-muted/10">
                        <button
                          type="button"
                          onClick={() => setOpenCharacterIndex(isOpen ? -1 : index)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{characterName}</p>
                            <p className="text-xs text-muted-foreground">{character.role || "Ruolo da Character Bible"}</p>
                          </div>
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {isOpen && (
                          <div className="grid gap-3 border-t border-border px-4 py-3 text-sm md:grid-cols-2">
                            <InfoLine label="Ruolo" value={character.role} />
                            <InfoLine label="Ferita" value={character.wound} />
                            <InfoLine label="Desiderio" value={character.externalDesire || character.internalNeed} />
                            <InfoLine label="Segreto" value={character.secret} />
                            <div className="md:col-span-2">
                              <InfoLine label="Continuità" value={character.strictRules} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                    Character Bible salvata, ma non strutturata in schede. Apri le impostazioni avanzate per leggere o modificare il testo completo.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-background/60">
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 6</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">Impostazioni avanzate</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lunghezza, capitoli, target, limiti narrativi e testo canonico.
                </p>
              </div>
              {advancedOpen ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
            </button>

            {advancedOpen && (
              <div className="border-t border-border p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Formato libro</span>
                    <select
                      value={bookFormat}
                      onChange={(event) => setBookFormat(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="novel">Romanzo</option>
                      <option value="novella">Novella</option>
                      <option value="short_story_collection">Raccolta racconti</option>
                      <option value="poetry_collection">Raccolta poetica</option>
                      <option value="memoir">Memoir narrativo</option>
                      <option value="manual">Manuale / guida</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Lunghezza libro</span>
                    <select
                      value={bookLength}
                      onChange={(event) => setBookLength(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="short">Breve</option>
                      <option value="medium">Medio</option>
                      <option value="long">Lungo</option>
                      <option value="epic">Epico / serie</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Numero capitoli</span>
                    <input
                      type="number"
                      min={1}
                      max={80}
                      value={chapterCount}
                      onChange={(event) => setChapterCount(Number(event.target.value) || 20)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Sottocapitoli</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSubchaptersEnabled(!subchaptersEnabled)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                          subchaptersEnabled ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {subchaptersEnabled ? "Attivi" : "Disattivati"}
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        disabled={!subchaptersEnabled}
                        value={subchaptersPerChapter}
                        onChange={(event) => setSubchaptersPerChapter(Number(event.target.value) || 3)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
                      />
                    </div>
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Nomi protagonisti / saga</span>
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
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Target lettore</span>
                    <input
                      value={targetReader}
                      onChange={(event) => setTargetReader(event.target.value)}
                      placeholder="Es. lettori che amano horror gotico, tensione emotiva e misteri familiari"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Promessa narrativa</span>
                    <textarea
                      value={narrativePromise}
                      onChange={(event) => setNarrativePromise(event.target.value)}
                      placeholder="Che esperienza promette il libro?"
                      className="min-h-[90px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Ambientazione</span>
                    <input
                      value={setting}
                      onChange={(event) => setSetting(event.target.value)}
                      placeholder="Es. nave-laboratorio, hotel sul lago, regno in rovina..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Tipo protagonista</span>
                    <input
                      value={protagonistType}
                      onChange={(event) => setProtagonistType(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  <div>
                    <Label>Dinamica centrale</Label>
                    <Select value={centralDynamic} onValueChange={setCentralDynamic}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {directionDynamicOptions.map((option) => (
                          <SelectItem key={optionValue(option)} value={optionValue(option)}>
                            {optionLabel(option)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Tempo narrativo</span>
                    <select
                      value={tense}
                      onChange={(event) => setTense(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="passato">Passato</option>
                      <option value="presente">Presente</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Spice / sensualità</span>
                    <select
                      value={spiceLevel}
                      onChange={(event) => setSpiceLevel(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="pulito">Pulito</option>
                      <option value="medio">Medio</option>
                      <option value="intenso">Intenso</option>
                      <option value="non applicabile">Non applicabile</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Violenza</span>
                    <select
                      value={violenceLevel}
                      onChange={(event) => setViolenceLevel(event.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="assente">Assente</option>
                      <option value="medio">Media</option>
                      <option value="alta">Alta</option>
                      <option value="psicologica">Psicologica</option>
                    </select>
                  </label>

                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs font-semibold text-muted-foreground">Regole canoniche extra</span>
                    <textarea
                      value={canonRules}
                      onChange={(event) => setCanonRules(event.target.value)}
                      placeholder="Es. non cambiare nomi, niente triangolo amoroso, niente finale tragico..."
                      className="min-h-[90px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </label>

                  {hasBibleReady && (
                    <label className="space-y-1 md:col-span-2">
                      <span className="text-xs font-semibold text-muted-foreground">Testo completo Character Bible</span>
                      <Textarea
                        value={characterBible}
                        onChange={(e) => {
                          setCharacterBible(e.target.value);
                          setSaved(false);
                        }}
                        rows={10}
                        placeholder="Qui apparirà la Character Bible generata da Scriptora..."
                        className="max-h-[32dvh] min-h-[120px] resize-y font-mono text-xs leading-relaxed"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 7</p>
                <h3 className="mt-1 text-base font-bold text-foreground">Continua nel flusso libro</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dopo il salvataggio, Scriptora apre creazione libro con cast, genere, filone e tono già collegati.
                </p>
              </div>
            </div>

            {saved && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4" />
                <div>
                  <strong>Collegamento attivo.</strong> Character Studio ha salvato i dati canonici per Book Forge.
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="sticky bottom-0 z-20 border-t border-border bg-card/95 p-4 backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Prossima azione</p>
              <p className="truncate text-sm text-muted-foreground">
                {missingHandoffItems.length
                  ? `Mancano: ${missingHandoffItems.join(", ")}`
                  : `Pronto per creazione libro · ${bookTitle || "Titolo pronto"} · ${detectedCharacterCount || "cast"} personaggi`}
              </p>
            </div>

            <Button
              type="button"
              onClick={runPrimaryCharacterAction}
              disabled={loading || ideaLoading}
              className="w-full gap-2 sm:w-auto"
            >
              {loading || ideaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasBibleReady ? <Save className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {primaryCharacterActionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
