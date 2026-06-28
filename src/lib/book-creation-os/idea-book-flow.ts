import type { BookConfig, BookLength, Genre, Language } from "@/types/book";
import { DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { inferGenreFromText, type InferredBookFormat } from "./genre-inference";

export type IdeaBookDraft = {
  originalIdea: string;
  title: string;
  subtitle: string;
  language: Language;
  bookFormat: InferredBookFormat;
  bookTypeId: string;
  genre: Genre;
  category: string;
  subcategory: string;
  subgenre: string;
  tone: string;
  bookLength: BookLength;
  chaptersCount: number;
  subchaptersEnabled: boolean;
  subchaptersPerChapter: number;
  targetReader: string;
  promise: string;
  structureMode: string;
};

type IdeaBookDraftOptions = {
  language?: Language;
  planIsFree?: boolean;
};

function normalized(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function has(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function cleanIdea(rawIdea: string): string {
  return rawIdea.trim().replace(/\s+/g, " ");
}

function fallbackTitleFromIdea(idea: string): string {
  const cleaned = cleanIdea(idea)
    .replace(/^un[ao]? libro su(?:lla|lle|gli|l|i|l')?\s*/i, "")
    .replace(/^un[ao]? romanzo su(?:lla|lle|gli|l|i|l')?\s*/i, "")
    .replace(/^un[ao]? manuale su(?:lla|lle|gli|l|i|l')?\s*/i, "")
    .replace(/^un[ao]? saggio breve su(?:lla|lle|gli|l|i|l')?\s*/i, "")
    .replace(/^un[ao]? raccolta poetica su(?:lla|lle|gli|l|i|l')?\s*/i, "");
  const words = cleaned.split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return "Libro senza titolo";
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function withFreeLength(bookLength: BookLength, planIsFree?: boolean): BookLength {
  return planIsFree ? "short" : bookLength;
}

export function buildIdeaBookDraft(rawIdea: string, options: IdeaBookDraftOptions = {}): IdeaBookDraft {
  const originalIdea = cleanIdea(rawIdea);
  const hay = normalized(originalIdea);
  const language = options.language || "Italian";
  const inference = inferGenreFromText("", originalIdea);

  if (has(hay, /\braccolta poetica\b|\blibro poetico\b|\bpoesia\b|\bprosa poetica\b|\bprosa lirica\b|\bvoce autentica\b/)) {
    return {
      originalIdea,
      title: "La Voce ai Margini",
      subtitle: "Frammenti sulla verita che non sappiamo ascoltare",
      language,
      bookFormat: inference.bookFormat === "novel" ? "poetry_collection" : inference.bookFormat,
      bookTypeId: "poetry",
      genre: "poetry",
      category: "Poesia",
      subcategory: "Poesia contemporanea",
      subgenre: "raccolta poetica / prosa lirica",
      tone: "lirico, intimo, meditativo",
      bookLength: withFreeLength("short", options.planIsFree),
      chaptersCount: 7,
      subchaptersEnabled: false,
      subchaptersPerChapter: 0,
      targetReader: "Lettori di poesia contemporanea, testi introspettivi e prosa lirica.",
      promise: "Un percorso in sezioni e frammenti sulla voce autentica, il silenzio e la verita interiore.",
      structureMode: "sections",
    };
  }

  if (has(hay, /\bdark romance\b|\bromance\b|\benemies to lovers\b|\bstoria d'amore\b|\bamore\b|\brelazione\b|\bcoppia\b|\bbacio\b|\bpassione\b|\battrazione\b|\blove story\b/)) {
    return {
      originalIdea,
      title: fallbackTitleFromIdea(originalIdea),
      subtitle: "Un legame pericoloso, un desiderio che chiede un prezzo.",
      language,
      bookFormat: "novel",
      bookTypeId: inference.bookTypeId === "dark-romance" ? "dark-romance" : "romance",
      genre: inference.genre === "dark-romance" ? "dark-romance" : "romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: inference.subgenre || "romance contemporaneo",
      tone: inference.tone || "intenso, emotivo, cinematografico",
      bookLength: withFreeLength("medium", options.planIsFree),
      chaptersCount: 22,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      targetReader: inference.targetReader,
      promise: inference.narrativePromise,
      structureMode: "chapters",
    };
  }

  if (has(hay, /\bmanuale\b|\bguida\b|\bcoltivazione\b|\bpomodori\b|\borto\b|\bgiardinaggio\b/)) {
    return {
      originalIdea,
      title: has(hay, /\bpomodori\b/) ? "Pomodori Perfetti" : fallbackTitleFromIdea(originalIdea),
      subtitle: has(hay, /\bpomodori\b/) ? "Guida pratica dalla semina al raccolto" : "Guida pratica passo dopo passo",
      language,
      bookFormat: has(hay, /\bguida\b/) ? "guide" : "manual",
      bookTypeId: "manual",
      genre: "manual",
      category: "Manuali",
      subcategory: has(hay, /\bpomodori|orto|giardinaggio\b/) ? "Giardinaggio / Orto" : "Manuale pratico",
      subgenre: has(hay, /\bpomodori\b/) ? "coltivazione dei pomodori" : "guida pratica",
      tone: "pratico, chiaro, operativo",
      bookLength: withFreeLength("short", options.planIsFree),
      chaptersCount: 10,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      targetReader: "Lettori che vogliono istruzioni concrete, esempi e passaggi applicabili subito.",
      promise: has(hay, /\bpomodori\b/)
        ? "Imparare a coltivare pomodori sani dalla semina al raccolto."
        : "Trasformare un tema pratico in un metodo chiaro, ordinato e utilizzabile.",
      structureMode: "lessons",
    };
  }

  if (has(hay, /\bseconda guerra mondiale\b|\bguerra mondiale\b|\bstoria\b|\bstorico\b/)) {
    return {
      originalIdea,
      title: "Il Secolo in Fiamme",
      subtitle: "Storie, cause e ferite della Seconda guerra mondiale",
      language,
      bookFormat: "historical_essay",
      bookTypeId: "history-school",
      genre: "education",
      category: "Non-Fiction",
      subcategory: "Storia",
      subgenre: "saggio storico divulgativo",
      tone: "documentato, narrativo, accessibile",
      bookLength: withFreeLength("medium", options.planIsFree),
      chaptersCount: 12,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      targetReader: "Lettori e studenti che cercano una ricostruzione storica chiara, leggibile e affidabile.",
      promise: "Comprendere cause, snodi, conseguenze e ferite della Seconda guerra mondiale con linguaggio accessibile.",
      structureMode: "lessons",
    };
  }

  if (has(hay, /\bnarcisismo\b|\bnarcisista\b|\bdipendenz[ae]\b|\btossic[ao]\b|\bpsicologia\b/)) {
    const addiction = has(hay, /\bdipendenz[ae]\b/);
    return {
      originalIdea,
      title: addiction ? "La Catena Invisibile" : "Dentro lo Specchio",
      subtitle: addiction
        ? "Capire le dipendenze senza giudizio"
        : "Capire il narcisismo, riconoscere le dinamiche tossiche e ritrovare la propria voce",
      language,
      bookFormat: addiction || has(hay, /\bsaggio breve\b/) ? "short_essay" : "self_help",
      bookTypeId: "psychology",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: addiction ? "Psicologia / Societa / Salute divulgativa" : "Crescita personale / Psicologia divulgativa",
      subgenre: addiction ? "saggio breve psicologico" : "self-help psicologico",
      tone: addiction ? "sobrio, empatico, riflessivo" : "chiaro, empatico, diretto",
      bookLength: withFreeLength(addiction ? "short" : "medium", options.planIsFree),
      chaptersCount: addiction ? 8 : 12,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      targetReader: addiction
        ? "Lettori che vogliono capire le dipendenze con uno sguardo umano e non giudicante."
        : "Persone che vogliono riconoscere dinamiche narcisistiche e recuperare confini, lucidita e voce personale.",
      promise: addiction
        ? "Capire le dipendenze senza giudizio e riconoscere i meccanismi che le mantengono."
        : "Riconoscere il narcisismo, proteggersi dalle dinamiche tossiche e ritrovare la propria voce.",
      structureMode: "lessons",
    };
  }

  if (has(hay, /\bbambin[io]\b|\bpaura del buio\b|\bfavola\b|\bfiaba\b/)) {
    return {
      originalIdea,
      title: has(hay, /\bpaura del buio\b/) ? "La Piccola Luce" : fallbackTitleFromIdea(originalIdea),
      subtitle: "Una storia gentile per attraversare la paura",
      language,
      bookFormat: "children_book",
      bookTypeId: "children",
      genre: "children",
      category: "Bambini",
      subcategory: "3-6 anni",
      subgenre: "albo narrativo",
      tone: "dolce, rassicurante, immaginativo",
      bookLength: withFreeLength("short", options.planIsFree),
      chaptersCount: 8,
      subchaptersEnabled: false,
      subchaptersPerChapter: 0,
      targetReader: "Bambini e genitori che cercano una storia semplice, rassicurante e memorabile.",
      promise: "Aiutare i bambini a dare un nome alla paura e attraversarla con immaginazione.",
      structureMode: "chapters",
    };
  }

  if (has(hay, /\bfantasy\b|\bregno\b|\bmagia\b|\bcristallo\b/)) {
    return {
      originalIdea,
      title: has(hay, /\bcristallo\b/) ? "Il Regno di Cristallo" : fallbackTitleFromIdea(originalIdea),
      subtitle: "Quando il potere si incrina, ogni scelta puo cambiare il destino del regno",
      language,
      bookFormat: "novel",
      bookTypeId: "fantasy",
      genre: "fantasy",
      category: "Fiction",
      subcategory: "Fantasy",
      subgenre: "fantasy epico",
      tone: has(hay, /\bpoetic[ao]\b/) ? "epico, lirico, avventuroso" : "epico, immersivo, avventuroso",
      bookLength: withFreeLength("medium", options.planIsFree),
      chaptersCount: 20,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      targetReader: "Lettori fantasy che cercano worldbuilding, mistero e personaggi in trasformazione.",
      promise: "Entrare in un regno fragile dove magia, potere e identita hanno un costo narrativo reale.",
      structureMode: "chapters",
    };
  }

  return {
    originalIdea,
    title: fallbackTitleFromIdea(originalIdea),
    subtitle: inference.narrativePromise,
    language,
    bookFormat: inference.bookFormat,
    bookTypeId: inference.bookTypeId,
    genre: inference.genre,
    category: inference.category,
    subcategory: inference.subcategory,
    subgenre: inference.subgenre,
    tone: inference.tone,
    bookLength: withFreeLength(inference.suggestedChapters <= 10 ? "short" : "medium", options.planIsFree),
    chaptersCount: inference.suggestedChapters,
    subchaptersEnabled: inference.bookTypeId !== "poetry",
    subchaptersPerChapter: inference.bookTypeId === "poetry" ? 0 : DEFAULT_SUBCHAPTERS_PER_CHAPTER,
    targetReader: inference.targetReader,
    promise: inference.narrativePromise,
    structureMode: inference.bookTypeId === "poetry" ? "sections" : "chapters",
  };
}

export function ideaBookDraftToConfig(draft: IdeaBookDraft): BookConfig {
  const now = new Date().toISOString();
  return {
    title: draft.title,
    subtitle: draft.subtitle,
    idea: draft.originalIdea,
    originalIdea: draft.originalIdea,
    language: draft.language,
    titleLanguage: draft.language,
    bookFormat: draft.bookFormat,
    bookTypeId: draft.bookTypeId,
    generatedFrom: "idea-book",
    genre: draft.genre,
    category: draft.category,
    subcategory: draft.subcategory,
    subgenre: draft.subgenre,
    tone: draft.tone,
    targetReader: draft.targetReader,
    promise: draft.promise,
    authorStyle: draft.tone,
    chapterLength: "medium",
    bookLength: draft.bookLength,
    numberOfChapters: draft.chaptersCount,
    chaptersCount: draft.chaptersCount,
    structureMode: draft.structureMode,
    subchaptersEnabled: draft.subchaptersEnabled,
    subchaptersPerChapter: draft.subchaptersEnabled ? draft.subchaptersPerChapter : 0,
    configStatus: "validated",
    publishingMetadata: {
      targetReader: draft.targetReader,
      commercialPromise: draft.promise,
      commercialAngle: draft.subtitle,
      sourceTools: ["idea-book"],
      updatedAt: now,
    },
  };
}
