import type { Language } from "@/types/book";

export type ForgePresetId =
  | "poetry"
  | "novel"
  | "manual"
  | "essay"
  | "history"
  | "philosophy"
  | "math"
  | "physics"
  | "songs"
  | "children"
  | "self_help"
  | "business";

export type ForgePreset = {
  id: ForgePresetId;
  label: string;
  subtitle: string;
  family: "creative" | "nonfiction" | "academic" | "music" | "children";
  icon: string;
  defaultChapters: number;
  defaultLanguage: Language;
  structureMode: "chapters" | "sections" | "poems" | "lessons" | "songs";
  tone: string;
  promise: string;
  blueprintHint: string;
};

export const FORGE_PRESETS: ForgePreset[] = [
  {
    id: "poetry",
    label: "Poesie",
    subtitle: "Raccolta poetica, sezioni liriche, versi e immagini.",
    family: "creative",
    icon: "✨",
    defaultChapters: 6,
    defaultLanguage: "Italian",
    structureMode: "poems",
    tone: "lirico, essenziale, emotivo, contemporaneo",
    promise: "Trasformare emozioni, silenzi e immagini in una raccolta poetica coerente.",
    blueprintHint:
      "Crea una raccolta di poesie, non un romanzo e non un saggio. Usa sezioni poetiche, titoli evocativi, versi liberi, spazio bianco, immagini concrete e pochissima spiegazione."
  },
  {
    id: "novel",
    label: "Romanzo",
    subtitle: "Narrativa completa con personaggi, trama e capitoli.",
    family: "creative",
    icon: "📖",
    defaultChapters: 18,
    defaultLanguage: "Italian",
    structureMode: "chapters",
    tone: "narrativo, immersivo, cinematografico",
    promise: "Costruire un romanzo leggibile, emotivo e coerente.",
    blueprintHint:
      "Crea un romanzo con arco narrativo, personaggi, conflitto, tensione, scene e capitoli progressivi."
  },
  {
    id: "manual",
    label: "Manuale",
    subtitle: "Metodo pratico, capitoli operativi, esercizi.",
    family: "nonfiction",
    icon: "🛠️",
    defaultChapters: 12,
    defaultLanguage: "Italian",
    structureMode: "lessons",
    tone: "chiaro, pratico, autorevole",
    promise: "Trasformare una competenza in un metodo utilizzabile.",
    blueprintHint:
      "Crea un manuale pratico con moduli, spiegazioni semplici, esempi, checklist, esercizi e riepiloghi."
  },
  {
    id: "essay",
    label: "Saggio",
    subtitle: "Argomentazione forte, idee, capitoli tematici.",
    family: "nonfiction",
    icon: "🧠",
    defaultChapters: 10,
    defaultLanguage: "Italian",
    structureMode: "chapters",
    tone: "profondo, chiaro, argomentativo",
    promise: "Sviluppare una tesi forte in modo leggibile.",
    blueprintHint:
      "Crea un saggio con tesi centrale, argomentazioni, esempi, controargomentazioni e conclusione forte."
  },
  {
    id: "history",
    label: "Storia",
    subtitle: "Eventi, epoche, contesto, cronologia.",
    family: "academic",
    icon: "🏛️",
    defaultChapters: 14,
    defaultLanguage: "Italian",
    structureMode: "chapters",
    tone: "divulgativo, accurato, ordinato",
    promise: "Raccontare un periodo storico con chiarezza e ritmo.",
    blueprintHint:
      "Crea un libro di storia con cronologia, contesto, cause, conseguenze, protagonisti, mappe concettuali e box di approfondimento."
  },
  {
    id: "philosophy",
    label: "Filosofia",
    subtitle: "Concetti, domande, pensatori, vita quotidiana.",
    family: "academic",
    icon: "🕯️",
    defaultChapters: 12,
    defaultLanguage: "Italian",
    structureMode: "chapters",
    tone: "profondo, accessibile, meditativo",
    promise: "Rendere idee complesse vive e comprensibili.",
    blueprintHint:
      "Crea un libro filosofico accessibile con domande guida, concetti, esempi concreti, pensatori e riflessioni senza diventare confuso."
  },
  {
    id: "math",
    label: "Matematica",
    subtitle: "Teoria, esempi svolti, esercizi e soluzioni.",
    family: "academic",
    icon: "➗",
    defaultChapters: 10,
    defaultLanguage: "Italian",
    structureMode: "lessons",
    tone: "didattico, preciso, progressivo",
    promise: "Spiegare la matematica passo passo.",
    blueprintHint:
      "Crea un libro didattico di matematica con teoria, formule, esempi svolti, esercizi graduati e soluzioni."
  },
  {
    id: "physics",
    label: "Fisica",
    subtitle: "Concetti, formule, esperimenti, problemi.",
    family: "academic",
    icon: "⚛️",
    defaultChapters: 10,
    defaultLanguage: "Italian",
    structureMode: "lessons",
    tone: "scientifico, chiaro, visuale",
    promise: "Rendere la fisica comprensibile e applicabile.",
    blueprintHint:
      "Crea un libro didattico di fisica con concetti, formule, esempi reali, problemi risolti, esperimenti e sintesi."
  },
  {
    id: "songs",
    label: "Canzoni",
    subtitle: "Testi musicali, strofe, ritornelli, bridge.",
    family: "music",
    icon: "🎵",
    defaultChapters: 8,
    defaultLanguage: "Italian",
    structureMode: "songs",
    tone: "musicale, emotivo, memorabile",
    promise: "Creare testi cantabili con identità e ritornelli forti.",
    blueprintHint:
      "Crea una raccolta di canzoni con tema, mood, strofe, ritornelli, bridge, hook cantabile e coerenza sonora."
  },
  {
    id: "children",
    label: "Bambini",
    subtitle: "Storie semplici, morali, immagini e dolcezza.",
    family: "children",
    icon: "🧸",
    defaultChapters: 8,
    defaultLanguage: "Italian",
    structureMode: "chapters",
    tone: "semplice, caldo, immaginifico",
    promise: "Creare una storia adatta ai bambini, chiara e tenera.",
    blueprintHint:
      "Crea un libro per bambini con linguaggio semplice, ritmo, immagini forti, morale delicata e capitoli brevi."
  },
  {
    id: "self_help",
    label: "Self-help",
    subtitle: "Trasformazione personale, metodo, esercizi.",
    family: "nonfiction",
    icon: "🌱",
    defaultChapters: 12,
    defaultLanguage: "Italian",
    structureMode: "lessons",
    tone: "motivazionale, umano, pratico",
    promise: "Accompagnare il lettore verso un cambiamento concreto.",
    blueprintHint:
      "Crea un libro self-help con promessa chiara, metodo, storie, esercizi, riflessioni e piano d'azione."
  },
  {
    id: "business",
    label: "Business",
    subtitle: "Strategia, mercato, metodo, casi pratici.",
    family: "nonfiction",
    icon: "💼",
    defaultChapters: 12,
    defaultLanguage: "Italian",
    structureMode: "chapters",
    tone: "autorevole, concreto, commerciale",
    promise: "Trasformare una strategia in un libro utile e vendibile.",
    blueprintHint:
      "Crea un libro business con problema, framework, casi pratici, esempi, checklist e capitoli orientati al risultato."
  }
];

export function getForgePreset(id: ForgePresetId): ForgePreset {
  return FORGE_PRESETS.find((item) => item.id === id) || FORGE_PRESETS[0];
}
