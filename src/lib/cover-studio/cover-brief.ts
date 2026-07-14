import type { CoverBrief, CoverBriefInput } from "./cover-types";
import { inferGenreFamily } from "./cover-templates";

type CoverBriefCopy = Omit<
  CoverBrief,
  "title" | "author" | "subtitle" | "genre" | "language" | "marketplace" | "genreFamily"
>;

const BRIEF_COPY: Record<
  ReturnType<typeof inferGenreFamily>,
  { it: CoverBriefCopy; en: CoverBriefCopy }
> = {
  "dark-romance": {
    it: {
      targetReader: "Lettrici romance 20-40, BookTok",
      visualPromise: "Lusso scuro, desiderio proibito, titolo grande",
      emotionalTone: "Sensuale, premium, ossessiva",
      avoidList: ["estetica self-help", "colori pastello infantili", "titolo illeggibile"],
    },
    en: {
      targetReader: "Romance readers 20-40, BookTok",
      visualPromise: "Dark luxury, forbidden desire, big title",
      emotionalTone: "Sensual, premium, obsessive",
      avoidList: ["self-help aesthetic", "childish pastels", "illegible title"],
    },
  },
  "luxury-romance": {
    it: {
      targetReader: "Lettrici romance emotive",
      visualPromise: "Eleganza, passione, contrasto morbido",
      emotionalTone: "Emotivo, elegante",
      avoidList: ["noir thriller", "business minimal"],
    },
    en: {
      targetReader: "Emotional romance readers",
      visualPromise: "Elegance, passion, soft contrast",
      emotionalTone: "Emotional, elegant",
      avoidList: ["noir thriller", "business minimal"],
    },
  },
  "psychological-thriller": {
    it: {
      targetReader: "Lettrici thriller domestico",
      visualPromise: "Tensione, mistero, thumbnail forte",
      emotionalTone: "Inquietante, domestica, paranoia",
      avoidList: ["romance rosa", "coach aesthetic"],
    },
    en: {
      targetReader: "Domestic thriller readers",
      visualPromise: "Tension, mystery, strong thumbnail",
      emotionalTone: "Unsettling, domestic, paranoia",
      avoidList: ["pink romance", "coach aesthetic"],
    },
  },
  "mystery-crime": {
    it: {
      targetReader: "Lettori giallo/crime",
      visualPromise: "Noir, indagine, contrasto alto",
      emotionalTone: "Teso, investigativo",
      avoidList: ["fantasy glow", "self-help ivory"],
    },
    en: {
      targetReader: "Crime/mystery readers",
      visualPromise: "Noir, investigation, high contrast",
      emotionalTone: "Tense, investigative",
      avoidList: ["fantasy glow", "self-help ivory"],
    },
  },
  "self-help": {
    it: {
      targetReader: "Lettori self-help pratici",
      visualPromise: "Promessa chiara, pulizia, fiducia",
      emotionalTone: "Rassicurante, commerciale",
      avoidList: ["dark romance", "thriller noir"],
    },
    en: {
      targetReader: "Practical self-help readers",
      visualPromise: "Clear promise, clean, trust",
      emotionalTone: "Reassuring, commercial",
      avoidList: ["dark romance", "thriller noir"],
    },
  },
  "kdp-nonfiction": {
    it: {
      targetReader: "Acquirenti nonfiction KDP",
      visualPromise: "Autorevolezza, beneficio visibile",
      emotionalTone: "Professionale, diretto",
      avoidList: ["romance mood", "fantasy whimsy"],
    },
    en: {
      targetReader: "KDP nonfiction buyers",
      visualPromise: "Authority, visible benefit",
      emotionalTone: "Professional, direct",
      avoidList: ["romance mood", "fantasy whimsy"],
    },
  },
  "study-manual": {
    it: {
      targetReader: "Studenti e genitori",
      visualPromise: "Ordine, metodo, credibilità",
      emotionalTone: "Didattico, moderno",
      avoidList: ["romance", "dark luxury"],
    },
    en: {
      targetReader: "Students and parents",
      visualPromise: "Order, method, credibility",
      emotionalTone: "Educational, modern",
      avoidList: ["romance", "dark luxury"],
    },
  },
  "cozy-fantasy": {
    it: {
      targetReader: "BookTok cozy fantasy",
      visualPromise: "Calore, magia morbida, bookshop",
      emotionalTone: "Whimsical, accogliente",
      avoidList: ["epic dark", "business tech"],
    },
    en: {
      targetReader: "BookTok cozy fantasy",
      visualPromise: "Warmth, soft magic, bookshop",
      emotionalTone: "Whimsical, cozy",
      avoidList: ["epic dark", "business tech"],
    },
  },
  "fantasy-cinematic": {
    it: {
      targetReader: "Lettori fantasy saga",
      visualPromise: "Epico, glow, simbolo centrale",
      emotionalTone: "Cinematico, avventura",
      avoidList: ["self-help minimal", "thriller smoke"],
    },
    en: {
      targetReader: "Epic fantasy readers",
      visualPromise: "Epic, glow, central symbol",
      emotionalTone: "Cinematic, adventure",
      avoidList: ["self-help minimal", "thriller smoke"],
    },
  },
  "business-ai": {
    it: {
      targetReader: "Solopreneur, founder, creator",
      visualPromise: "Tech pulito, ROI, sistemi",
      emotionalTone: "Autorevole, moderno",
      avoidList: ["romance dusk", "cozy pastel fantasy"],
    },
    en: {
      targetReader: "Solopreneur, founder, creator",
      visualPromise: "Clean tech, ROI, systems",
      emotionalTone: "Authoritative, modern",
      avoidList: ["romance dusk", "cozy pastel fantasy"],
    },
  },
  general: {
    it: {
      targetReader: "Lettore target da definire",
      visualPromise: "Titolo leggibile, genere chiaro",
      emotionalTone: "Coerente col genere",
      avoidList: ["generic stock look"],
    },
    en: {
      targetReader: "Target reader to define",
      visualPromise: "Readable title, clear genre",
      emotionalTone: "Genre-coherent",
      avoidList: ["generic stock look"],
    },
  },
};

export function isItalianLanguage(language?: string): boolean {
  const n = String(language || "").trim().toLowerCase();
  return n.startsWith("it") || n.includes("ital");
}

export function buildCoverBrief(input: CoverBriefInput): CoverBrief {
  const italian = isItalianLanguage(input.language);
  const family = inferGenreFamily(input.genre, input.title, input.subtitle);
  const copy = BRIEF_COPY[family][italian ? "it" : "en"];

  return {
    title: input.title?.trim() || (italian ? "Senza titolo" : "Untitled"),
    author: input.author?.trim() || "",
    subtitle: input.subtitle?.trim() || "",
    genre: input.genre?.trim() || (italian ? "Generale" : "General"),
    language: input.language || (italian ? "Italian" : "English"),
    marketplace: input.marketplace || (italian ? "amazon.it" : "amazon.com"),
    targetReader: input.targetReader?.trim() || copy.targetReader,
    visualPromise: copy.visualPromise,
    emotionalTone: input.mood?.trim() || copy.emotionalTone,
    avoidList: copy.avoidList,
    genreFamily: family,
  };
}
