import type { BookLength, Genre, Language } from "@/types/book";

export interface BookObjective {
  id: string;
  label: string;
  subtitle: string;
  genre: Genre;
  subcategory: string;
  tone: string;
  authorStyle: string;
  bookLength: BookLength;
  numberOfChapters: number;
}

export const BOOK_OBJECTIVES: BookObjective[] = [
  {
    id: "commercial-bestseller",
    label: "Bestseller commerciale",
    subtitle: "Hook forte, ritmo serrato, payoff chiari",
    genre: "thriller",
    subcategory: "Psychological",
    tone: "tensione alta, frasi incalzanti, cliffhanger",
    authorStyle: "Netflix Thriller",
    bookLength: "medium",
    numberOfChapters: 18,
  },
  {
    id: "romance-emotional",
    label: "Romance emozionale",
    subtitle: "Slow burn, vulnerabilità, desiderio",
    genre: "romance",
    subcategory: "Contemporary",
    tone: "intimo, emotivo, cinematografico",
    authorStyle: "Colleen Hoover Emotion",
    bookLength: "medium",
    numberOfChapters: 20,
  },
  {
    id: "dark-romance",
    label: "Dark Romance Premium",
    subtitle: "Attrito, tabù, tensione magnetica",
    genre: "dark-romance",
    subcategory: "Morally grey",
    tone: "oscurità elegante, desiderio pericoloso",
    authorStyle: "Dark Romance Premium",
    bookLength: "medium",
    numberOfChapters: 22,
  },
  {
    id: "fantasy-immersive",
    label: "Fantasy immersivo",
    subtitle: "Mondo vivo, magia con regole, epica personale",
    genre: "fantasy",
    subcategory: "Epic",
    tone: "cinematografico, sensoriale, epico",
    authorStyle: "Fantasy Cinematic",
    bookLength: "long",
    numberOfChapters: 24,
  },
  {
    id: "self-help-authority",
    label: "Self-help autorevole",
    subtitle: "Chiarezza, trasformazione, credibilità",
    genre: "self-help",
    subcategory: "Personal Growth",
    tone: "diretto, empatico, trasformativo",
    authorStyle: "style-conversational",
    bookLength: "short",
    numberOfChapters: 10,
  },
  {
    id: "booktok-viral",
    label: "BookTok viral",
    subtitle: "Emozione immediata, tropes forti, ritmo veloce",
    genre: "romance",
    subcategory: "BookTok",
    tone: "emotivo, diretto, altamente condivisibile",
    authorStyle: "Livia Emerson Romance",
    bookLength: "short",
    numberOfChapters: 16,
  },
  {
    id: "long-series",
    label: "Serie lunga",
    subtitle: "Arco esteso, mondo espandibile, cliffhanger seriali",
    genre: "fantasy",
    subcategory: "Series",
    tone: "epico, stratificato, hook seriali",
    authorStyle: "Stephen King Style",
    bookLength: "long",
    numberOfChapters: 28,
  },
];

export interface WritingStyleProfile {
  voiceIntensity: number;
  emotionalIntensity: number;
  poeticLevel: number;
  dialogueLevel: number;
  slowBurn: number;
  tensionIntensity: number;
  psychologicalDepth: number;
  showDontTell: number;
  narrativePace: number;
  presetId?: string;
}

export const STYLE_PRESETS: Array<{ id: string; label: string; profile: Partial<WritingStyleProfile> }> = [
  { id: "stephen-king", label: "Stephen King Style", profile: { narrativePace: 70, tensionIntensity: 80, psychologicalDepth: 75 } },
  { id: "colleen-hoover", label: "Colleen Hoover Emotion", profile: { emotionalIntensity: 90, dialogueLevel: 75, slowBurn: 65 } },
  { id: "netflix-thriller", label: "Netflix Thriller", profile: { tensionIntensity: 85, narrativePace: 80, showDontTell: 70 } },
  { id: "livia-emerson", label: "Livia Emerson Romance", profile: { emotionalIntensity: 85, slowBurn: 70, poeticLevel: 60 } },
  { id: "fantasy-cinematic", label: "Fantasy Cinematic", profile: { poeticLevel: 75, showDontTell: 80, psychologicalDepth: 65 } },
  { id: "dark-romance-premium", label: "Dark Romance Premium", profile: { slowBurn: 80, tensionIntensity: 75, emotionalIntensity: 85 } },
];

export function profileToStyleDirective(profile: WritingStyleProfile): string {
  const parts = [
    `Voce autore: ${profile.voiceIntensity}%`,
    `Intensità emotiva: ${profile.emotionalIntensity}%`,
    `Livello poetico: ${profile.poeticLevel}%`,
    `Dialoghi: ${profile.dialogueLevel}%`,
    `Slow burn: ${profile.slowBurn}%`,
    `Tensione: ${profile.tensionIntensity}%`,
    `Profondità psicologica: ${profile.psychologicalDepth}%`,
    `Show don't tell: ${profile.showDontTell}%`,
    `Ritmo narrativo: ${profile.narrativePace}%`,
  ];
  return parts.join(" · ");
}

export const IDEA_EXAMPLES = [
  "Una chef di Milano scopre che il suo ristorante nasconde un segreto di famiglia",
  "Due rivali in un reality di cucina si innamorano nel momento peggiore possibile",
  "Un detective indaga su sparizioni in una città dove nessuno ricorda i propri sogni",
];

export const DEFAULT_STYLE_PROFILE: WritingStyleProfile = {
  voiceIntensity: 60,
  emotionalIntensity: 65,
  poeticLevel: 50,
  dialogueLevel: 60,
  slowBurn: 55,
  tensionIntensity: 60,
  psychologicalDepth: 55,
  showDontTell: 70,
  narrativePace: 60,
};

export function objectiveById(id: string): BookObjective | undefined {
  return BOOK_OBJECTIVES.find((o) => o.id === id);
}

export function defaultLanguage(): Language {
  return "Italian";
}
