import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Wand2, Save, X, Loader2, BookOpen, CheckCircle2, Sparkles, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUserId } from "@/services/storageService";
import { devOnlyDiagnostic } from "@/lib/user-friendly-error";

import {
  SCRIPTORA_CHARACTER_BIBLE_KEY,
  SCRIPTORA_CHARACTER_PROJECT_KEY,
} from "@/lib/character-studio-keys";
import { buildBookForgeHandoff } from "@/lib/book-forge/book-forge-handoff";

export { SCRIPTORA_CHARACTER_BIBLE_KEY, SCRIPTORA_CHARACTER_PROJECT_KEY };
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

function optionListHasValue(options: ChoiceOption[], value: string): boolean {
  const clean = String(value || "").trim().toLowerCase();
  return options.some((option) => optionValue(option).toLowerCase() === clean || optionLabel(option).toLowerCase() === clean);
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

      return {
        name,
        surname,
        role: get("Ruolo nella storia:") || get("Role:"),
        wound: get("Ferita interiore:") || get("Core wound:"),
        externalDesire: get("Desiderio esterno:") || get("External desire:"),
        internalNeed: get("Bisogno interiore:") || get("Internal need:"),
        secret: get("Segreto:") || get("Secret:"),
        relationships: get("Rapporto con gli altri personaggi:") || get("Relationship to other characters:"),
        personality: get("Carattere:") || get("Personality:") || block,
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

export function CharacterStudioDialog({ open, onClose, onAuthorIdentity }: Props) {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("romance");
  const [subcategory, setSubcategory] = useState("slow burn");
  const [tone, setTone] = useState("poetico e cinematografico");
  const [intensity, setIntensity] = useState("slow burn");
  const [centralDynamic, setCentralDynamic] = useState("attrazione e colpa");
  const [protagonistType, setProtagonistType] = useState("protagonista ferita ma combattiva");
  const [language, setLanguage] = useState("Italian");
  const [bookFormat, setBookFormat] = useState("novel");
  const [bookLength, setBookLength] = useState("medium");
  const [chapterCount, setChapterCount] = useState(20);
  const [subchaptersEnabled, setSubchaptersEnabled] = useState(false);
  const [subchaptersPerChapter, setSubchaptersPerChapter] = useState(3);
  const [targetReader, setTargetReader] = useState("");
  const [narrativePromise, setNarrativePromise] = useState("");
  const [setting, setSetting] = useState("");
  const [endingType, setEndingType] = useState("chiuso ma con eco");
  const [pov, setPov] = useState("terza persona limitata");
  const [tense, setTense] = useState("passato");
  const [spiceLevel, setSpiceLevel] = useState("medio");
  const [darknessLevel, setDarknessLevel] = useState("medio");
  const [violenceLevel, setViolenceLevel] = useState("medio");
  const [canonRules, setCanonRules] = useState("");
  const [manualCharacterNames, setManualCharacterNames] = useState("");
  const [characterBible, setCharacterBible] = useState("");
  const [activeStudioStep, setActiveStudioStep] = useState<"identity" | "idea" | "direction" | "bible">("identity");
  const [previewPanel, setPreviewPanel] = useState<"idea" | "bible" | null>(null);
  const [loading, setLoading] = useState(false);
  const [ideaLoading, setIdeaLoading] = useState(false);
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

    setTargetReader((current) => current.trim() ? current : preset.targetReader);
    setNarrativePromise((current) => current.trim() ? current : preset.narrativePromise);
  }, [genre]);

  useEffect(() => {
    const preset = getCharacterStudioDirectionPreset(genre);

    setSubcategory((current) => optionListHasValue(preset.subgenres, current) ? current : preset.subcategory);
    setTone((current) => optionListHasValue(preset.tones, current) ? current : preset.tone);
    setIntensity((current) => optionListHasValue(preset.intensities, current) ? current : preset.intensity);
    setCentralDynamic((current) => optionListHasValue(preset.dynamics, current) ? current : preset.centralDynamic);

    setTargetReader((current) => current.trim() ? current : preset.targetReader);
    setNarrativePromise((current) => current.trim() ? current : preset.narrativePromise);
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
        setGenre("romance");
        setSubcategory("slow burn");
        setTone("poetico e cinematografico");
        setIntensity("slow burn");
        setCentralDynamic("attrazione e colpa");
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
        setSpiceLevel("medio");
        setDarknessLevel("medio");
        setViolenceLevel("medio");
        setCanonRules("");
        setManualCharacterNames("");
        setCharacterBible("");
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
    }
  };

  const smartPreset = getCharacterStudioPreset(genre);
  const smartSubgenreOptions = smartPreset.subgenres;
  const smartToneOptions = smartPreset.tones;
  const smartIntensityOptions = smartPreset.intensities;
  const smartDynamicOptions = smartPreset.dynamics;

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
      toast.success("Personaggi generati. Ora puoi leggerli, salvarli e continuare in Book Forge.");
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
      toast.message("Character Bible pronta", {
        description: "Ho preparato una versione rapida utilizzabile. Puoi salvarla e collegarla al libro.",
      });
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

    const payload = {
      source: "character-studio",
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
      characterBible: bible,
      characters,
      plot,
      conflict: cleanDynamic || cleanIdea,
      promise: narrativePromise.trim() || cleanIdea || cleanDynamic,
      narrativePromise: narrativePromise.trim(),
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
      commercialAngle: narrativePromise.trim() || cleanDynamic || cleanIdea,
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

    const handoff = buildBookForgeHandoff("character-studio", payload);

    try {
      window.dispatchEvent(new Event("scriptora-character-bible-change"));
      window.dispatchEvent(
        new CustomEvent("scriptora-open-new-book-from-character-studio", {
          detail: { payload, handoff },
        }),
      );

      setSaved(true);
      onClose?.();

      navigate("/dashboard", {
        state: {
          openForge: true,
          bookForgeHandoff: handoff,
          source: "character-studio",
        },
      });

      toast.success("Personaggi collegati. Apro Book Forge con cast, genere, filone e tono già pronti.");
    } catch (error) {
      devOnlyDiagnostic("[CharacterStudio] open Book Forge failed", error);
      setSaved(true);
      toast.success("Cast salvato. Apri Book Forge dalla Dashboard per continuare.");
    }
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
    <div className="scriptora-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      {previewPanel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-card/95 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Character Studio
                </p>
                <h3 className="text-lg font-bold text-foreground">
                  {previewPanel === "idea" ? "Idea del romanzo" : "Character Bible canonica"}
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

        <div className="border-b border-border bg-muted/20 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ["identity", "1", "Fondamenta autore", "Voce e pseudonimo"],
              ["idea", "2", "Idea", "Premessa leggibile"],
              ["direction", "3", "Regia", "Genere, tono, dinamica"],
              ["bible", "4", "Cast canonico", "Bible e Book Forge"],
            ].map(([id, num, title, subtitle]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveStudioStep(id as typeof activeStudioStep)}
                className={`rounded-2xl border px-3 py-3 text-left transition ${
                  activeStudioStep === id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {num}
                  </span>
                  <span className="text-sm font-bold">{title}</span>
                </div>
                <p className="text-xs">{subtitle}</p>
              </button>
            ))}
          </div>
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
                  Salva e continua in Book Forge
                </button>
              )}
            </div>
          </div>
        </div>
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
                  Salva e continua in Book Forge
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="scriptora-modal-panel relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="z-10 flex shrink-0 items-center justify-between border-b border-border bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-pink-500/15 text-pink-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Scriptora Character Studio</h2>
              <p className="text-xs text-muted-foreground">
                Crea un nuovo cast canonico, genere, filone, tono e dinamica narrativa. Poi collegalo a Book Forge.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="scriptora-modal-body min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
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
                  value={displayChoiceLabel(directionSubgenreOptions, subcategory)}
                  readOnly
                  title={subcategory}
                  placeholder="Scegli il filone dalla Regia del romanzo"
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
                  value={displayChoiceLabel(directionToneOptions, tone)}
                  readOnly
                  title={tone}
                  placeholder="Scegli il tono dalla Regia del romanzo"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={generate} disabled={!canGenerate || loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                Genera personaggi con Scriptora
              </Button>

              <Button onClick={saveAndLink} disabled={loading || (!characterBible.trim() && !manualCharacterNames.trim())}>
                <Save className="h-4 w-4 mr-2" />
                Salva e continua in Book Forge
              </Button>

              <Button variant="ghost" onClick={clear}>
                Svuota
              </Button>
            </div>

            {saved && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <div>
                  <strong>Collegamento attivo.</strong> Quando apri “Book Forge”, Scriptora sa già che stai creando un romanzo di genere <strong>{genre}</strong>{subcategory ? ` / ${subcategory}` : ""} e userà questi personaggi come Character Lock.
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-5">
            <div>

          <section className="rounded-2xl border border-border bg-background/60 p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                DNA completo del libro
              </p>
              <h3 className="text-lg font-bold text-foreground">
                Impostazioni che Book Forge non dovrà più indovinare
              </h3>
              <p className="text-sm text-muted-foreground">
                Definisci formato, lunghezza, struttura, pubblico, promessa, finale e limiti narrativi prima del blueprint.
              </p>
            </div>

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
                <span className="text-xs font-semibold text-muted-foreground">Target lettore</span>
                <input
                  value={targetReader}
                  onChange={(event) => setTargetReader(event.target.value)}
                  placeholder="Es. lettrici 18–35 che amano horror gotico, tensione emotiva e misteri familiari"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Promessa narrativa</span>
                <textarea
                  value={narrativePromise}
                  onChange={(event) => setNarrativePromise(event.target.value)}
                  placeholder="Che esperienza promette il libro? Paura, redenzione, amore proibito, meraviglia, mistero..."
                  className="min-h-[90px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground">Ambientazione</span>
                <input
                  value={setting}
                  onChange={(event) => setSetting(event.target.value)}
                  placeholder="Es. conservatorio allagato, isola, città distopica, regno in rovina..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
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
                  placeholder="Es. non cambiare i nomi, niente triangolo amoroso, niente finale tragico, niente magia se non richiesta..."
                  className="min-h-[90px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

<p className="text-sm font-semibold">Regia del romanzo</p>
              <p className="text-xs text-muted-foreground">
                Scegli genere, filone, tono, intensità e dinamica narrativa. Scriptora userà queste coordinate per creare personaggi coerenti e agganciarli a Book Forge.
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
              options={directionSubgenreOptions}
              onChange={setSubcategory}
            />

            <ChoiceGrid
              label="Tono narrativo"
              value={tone}
              options={directionToneOptions}
              onChange={setTone}
            />

            <ChoiceGrid
              label="Intensità"
              value={intensity}
              options={directionIntensityOptions}
              onChange={setIntensity}
            />

            <ChoiceGrid
              label="Dinamica centrale"
              value={centralDynamic}
              options={directionDynamicOptions}
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
              rows={10}
              placeholder="Qui apparirà la Character Bible generata da Scriptora..."
              className="max-h-[32dvh] min-h-[120px] resize-y font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-primary mt-0.5" />
              <p>
                Dopo il salvataggio, Scriptora apre <strong>Book Forge</strong> con cast, filone, tono e continuità già collegati. Il motore non deve più inventare nomi a caso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
