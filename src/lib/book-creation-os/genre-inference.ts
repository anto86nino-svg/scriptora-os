import type { Genre } from "@/types/book";
import { studioGenresFromRegistry } from "@/lib/book-type-engine";
import { resolveLevel1FromBookTypeId } from "@/lib/book-config-engine";
import type { Level1BookType } from "@/lib/book-config-engine/types";

export type GenreInference = {
  bookTypeId: string;
  genre: Genre;
  category: string;
  subcategory: string;
  subgenre: string;
  tone: string;
  targetReader: string;
  narrativePromise: string;
  commercialGoal: string;
  level1: Level1BookType;
  confidence: "high" | "medium" | "low";
  label: string;
  suggestedChapters: number;
};

type Signal = {
  id: string;
  test: RegExp;
  weight: number;
  inference: Omit<GenreInference, "confidence" | "label" | "suggestedChapters"> & { label: string; chapters: number };
};

const STUDIO = studioGenresFromRegistry();

function studioMeta(bookTypeId: string) {
  return STUDIO.find((g) => g.id === bookTypeId) || STUDIO.find((g) => g.id === "literary")!;
}

const SIGNALS: Signal[] = [
  {
    id: "horror",
    test: /horror|dark horror|folk horror|gotico|gothic|disturb|inquiet|paura|mostr|fantasm|occult|supernatural|paranormal(?!\s*romance)|casa sotto|madri del buio|sangue|abisso|notte|buio profondo|spavent/i,
    weight: 12,
    inference: {
      label: "Horror / Dark",
      bookTypeId: "horror",
      genre: "horror",
      category: "Fiction",
      subcategory: "Horror",
      subgenre: "dark horror / psychological horror",
      tone: "oscuro, claustrofobico, disturbante, cinematografico",
      targetReader: "Lettori horror adulti che cercano tensione, mistero e atmosfera inquietante.",
      narrativePromise: "Mistero disturbante con rivelazione progressiva e pressione emotiva crescente.",
      commercialGoal: "Posizionamento dark horror / gothic suspense su Amazon e BookTok horror.",
      level1: "romanzo",
      chapters: 28,
    },
  },
  {
    id: "dark-romance",
    test: /dark romance|romance dark|enemies to lovers|morally grey|ossessione|desiderio pericoloso/i,
    weight: 11,
    inference: {
      label: "Dark Romance",
      bookTypeId: "dark-romance",
      genre: "dark-romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: "dark romance psicologico",
      tone: "oscuro, sensuale, trattenuto, cinematografico",
      targetReader: "Lettrici romance adulte che amano tensione, ambiguità morale e slow burn.",
      narrativePromise: "Attrazione pericolosa, vulnerabilità progressiva e conseguenze emotive.",
      commercialGoal: "Alta tensione emotiva e posizionamento BookTok dark romance.",
      level1: "romanzo",
      chapters: 24,
    },
  },
  {
    id: "thriller",
    test: /thriller|noir|mistero|indagine|omicid|serial killer|sospett|crime|giallo/i,
    weight: 10,
    inference: {
      label: "Thriller",
      bookTypeId: "thriller",
      genre: "thriller",
      category: "Fiction",
      subcategory: "Thriller",
      subgenre: "psychological thriller",
      tone: "teso, serrato, sospeso, cinematografico",
      targetReader: "Lettori thriller che amano ritmo, indizi e capitoli a gancio.",
      narrativePromise: "Pericolo crescente, segreti e inversioni fino alla rivelazione finale.",
      commercialGoal: "Retention alta e hook per ogni capitolo su KDP thriller.",
      level1: "romanzo",
      chapters: 26,
    },
  },
  {
    id: "fantasy",
    test: /fantasy|fantasia|magia|regno|elf|drago|portal|epic fantasy|mondo immagin/i,
    weight: 10,
    inference: {
      label: "Fantasy",
      bookTypeId: "fantasy",
      genre: "fantasy",
      category: "Fiction",
      subcategory: "Fantasy",
      subgenre: "epic fantasy",
      tone: "mitico, immersivo, sensoriale, cinematografico",
      targetReader: "Lettori fantasy adulti che cercano worldbuilding e personaggi credibili.",
      narrativePromise: "Viaggio in un mondo con regole, costo e scelta impossibile.",
      commercialGoal: "Fantasy immersivo con promessa forte e cover direction epica.",
      level1: "romanzo",
      chapters: 30,
    },
  },
  {
    id: "romance",
    test: /romance|slow burn|love story|storia d'amore|relazione|cuore/i,
    weight: 8,
    inference: {
      label: "Romance",
      bookTypeId: "romance",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      subgenre: "contemporary romance",
      tone: "intimo, emotivo, cinematografico, slow burn",
      targetReader: "Lettrici romance che cercano chimica, vulnerabilità e payoff emotivo.",
      narrativePromise: "Due persone che si avvicinano nonostante ostacoli credibili.",
      commercialGoal: "Romance commerciale con hook emotivo e sottotitolo memorabile.",
      level1: "romanzo",
      chapters: 22,
    },
  },
  {
    id: "self-help",
    test: /self.?help|crescita personal|mindset|produttiv|abitudin|disciplina|motivaz|benessere|ansia|overthinking|ritrovare sé|tornare a sé|guida pratica|trasformaz/i,
    weight: 11,
    inference: {
      label: "Self-help",
      bookTypeId: "self-help",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Mindset",
      subgenre: "crescita personale pratica",
      tone: "chiaro, autorevole, caldo, pratico",
      targetReader: "Persone che cercano strumenti concreti, esempi semplici e trasformazione realistica.",
      narrativePromise: "Dal caos mentale a una pratica quotidiana sostenibile.",
      commercialGoal: "Promessa chiara, capitoli pratici e posizionamento Amazon self-help.",
      level1: "self-help",
      chapters: 12,
    },
  },
  {
    id: "business",
    test: /business|marketing|leadership|imprend|startup|vendite|brand/i,
    weight: 9,
    inference: {
      label: "Business",
      bookTypeId: "business",
      genre: "business",
      category: "Non-Fiction",
      subcategory: "Business",
      subgenre: "business strategy",
      tone: "autorevole, diretto, orientato al risultato",
      targetReader: "Professionisti e imprenditori che cercano metodo e casi pratici.",
      narrativePromise: "Framework applicabile per decisioni e crescita commerciale.",
      commercialGoal: "Autorità, promessa netta e posizionamento business su KDP.",
      level1: "business",
      chapters: 14,
    },
  },
  {
    id: "education",
    test: /scuol|universit|didatt|dispens|esercizi|manuale di studio|studiare|esame/i,
    weight: 9,
    inference: {
      label: "Educazione / Studio",
      bookTypeId: "education",
      genre: "education",
      category: "Non-Fiction",
      subcategory: "Education",
      subgenre: "studio e didattica",
      tone: "chiaro, didattico, progressivo",
      targetReader: "Studenti e docenti che cercano struttura, esempi e ritenzione.",
      narrativePromise: "Percorso progressivo con concetti chiari e applicazione immediata.",
      commercialGoal: "Manuale didattico con struttura modulare e titoli capitolo espliciti.",
      level1: "educazione",
      chapters: 16,
    },
  },
];

const GENERIC_SELF_HELP_TITLES = /^(il viaggio interiore|rinascere|la forza dentro di te|torna a te|ritrova te stesso|il potere di)$/i;

export function inferGenreFromText(title: string, idea = ""): GenreInference {
  const hay = `${title} ${idea}`.toLowerCase();
  let best: { score: number; signal: Signal } | null = null;

  for (const signal of SIGNALS) {
    if (!signal.test.test(hay)) continue;
    const score = signal.weight + (hay.length > 40 ? 2 : 0);
    if (!best || score > best.score) best = { score, signal };
  }

  if (best) {
    const meta = studioMeta(best.signal.inference.bookTypeId);
    return {
      ...best.signal.inference,
      category: meta.category,
      subcategory: best.signal.inference.subcategory || meta.defaultSubcategory,
      level1: resolveLevel1FromBookTypeId(best.signal.inference.bookTypeId),
      confidence: best.score >= 11 ? "high" : "medium",
      suggestedChapters: best.signal.inference.chapters,
    };
  }

  const looksFictionTitle = /la |le |il |lo |una |un |casa|notte|sangue|ombra|madre|anima|morte|segreto/i.test(title)
    && !/guida|manuale|metodo|abitudin|disciplina/i.test(hay);

  if (looksFictionTitle || GENERIC_SELF_HELP_TITLES.test(title.trim())) {
    const meta = studioMeta("literary");
    return {
      label: "Narrativa letteraria",
      bookTypeId: "literary",
      genre: "philosophy",
      category: meta.category,
      subcategory: "Literary",
      subgenre: "romanzo contemporaneo",
      tone: "cinematografico, emotivo, concreto",
      targetReader: "Lettori di narrativa che cercano atmosfera, personaggi e tensione credibile.",
      narrativePromise: "Una storia che resta addosso con rivelazioni progressive.",
      commercialGoal: "Romanzo commerciale con titolo memorabile e promessa chiara.",
      level1: "romanzo",
      confidence: "low",
      suggestedChapters: 24,
    };
  }

  const meta = studioMeta("literary");
  return {
    label: "Romanzo (default narrativo)",
    bookTypeId: "literary",
    genre: "philosophy",
    category: meta.category,
    subcategory: "Literary",
    subgenre: "romanzo contemporaneo",
    tone: "editoriale, chiaro, coinvolgente",
    targetReader: "Lettori di narrativa contemporanea.",
    narrativePromise: "Storia con personaggi credibili e progressione emotiva.",
    commercialGoal: "Romanzo commerciale su Amazon.",
    level1: "romanzo",
    confidence: "low",
    suggestedChapters: 20,
  };
}

export function isConfigIncoherentWithInference(
  inference: GenreInference,
  category: string,
  genre: Genre,
  subcategory: string,
): boolean {
  const hay = `${category} ${subcategory} ${genre}`.toLowerCase();
  const fictionInference = inference.level1 === "romanzo";
  const nonfictionHay = /self.?help|mindset|non.?fiction|business|productiv|wellness/i.test(hay);
  const fictionHay = /fiction|horror|thriller|romance|fantasy|literary/i.test(hay) || ["horror", "thriller", "romance", "fantasy", "dark-romance", "philosophy", "sci-fi", "historical"].includes(genre);

  if (fictionInference && nonfictionHay && /mindset|self.?help|productiv/i.test(hay)) return true;
  if (!fictionInference && fictionHay && inference.level1 === "self-help") return true;

  if (inference.bookTypeId === "horror" && /mindset|self.?help|wellness/i.test(hay)) return true;
  if (inference.bookTypeId === "self-help" && /horror|thriller|dark romance|gothic/i.test(hay)) return true;

  return inference.genre !== genre && inference.confidence === "high";
}

export function getGuidedGenreAlternatives(inference: GenreInference): GenreInference[] {
  const alts: GenreInference[] = [inference];
  if (inference.bookTypeId === "horror") {
    alts.push({ ...inferGenreFromText("thriller psicologico gotico", ""), confidence: "medium" });
    alts.push({ ...inferGenreFromText("dark romance", ""), confidence: "low" });
  }
  if (inference.bookTypeId === "self-help") {
    alts.push({ ...inferGenreFromText("produttività abitudini", ""), confidence: "medium" });
  }
  return alts.slice(0, 3);
}

/** Fill missing genre fields from title/idea — never defaults to Self-help for fiction. */
export function fillMissingGenreFromInference(
  config: { title?: string; idea?: string; category?: string; subcategory?: string; genre?: Genre; bookTypeId?: string; subgenre?: string; tone?: string },
): void {
  if (config.category && config.subcategory && config.genre) return;
  const inf = inferGenreFromText(config.title || "", config.idea || "");
  if (!config.category) config.category = inf.category;
  if (!config.subcategory) config.subcategory = inf.subcategory;
  if (!config.genre) config.genre = inf.genre;
  if (!config.bookTypeId) config.bookTypeId = inf.bookTypeId;
  if (!config.subgenre) config.subgenre = inf.subgenre;
  if (!config.tone) config.tone = inf.tone;
}
