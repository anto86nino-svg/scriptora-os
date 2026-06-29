import type { GuidedInterviewState } from "./types";
import type {
  BookPromises,
  ForgeCharacter,
  ForgeScene,
  NarrativeArcBeat,
  StoryEndingVision,
  StoryRoomState,
  StoryFutureState,
  TitleIntelligence,
} from "./forge-evolution-types";
import type { ExpressForgeInput } from "./express-forge-types";
import {
  getExpressVariantMeta,
  isMemoirExpressGenre,
  isNonfictionExpressGenre,
  isPoetryExpressGenre,
  isStudyMaterialExpressGenre,
  isWorkbookExpressGenre,
  resolveExpressBookType,
  type ExpressScenarioVariant,
} from "./express-genre-config";
import {
  autoFillBookFoundationIfNeeded,
  buildBookFoundationFromExpressScenario,
  confirmBookFoundationLock,
  normalizeLengthPreset,
  resolveLengthPresetConfig,
} from "./book-foundation-lock";
import { buildEntityAwareChapterScaffold, hasRichIdeaEntities } from "@/lib/blueprint-entity-enrichment";
import {
  buildSupernaturalThrillerSecondaryCast,
  buildSupernaturalThrillerSubtitle,
  buildTimeAnchoredTitle,
  extractConceptProtagonist,
  extractTimeAnchor,
  hasSupernaturalThrillerSignals,
  resolveConceptDominance,
  sanitizeUserConceptInput,
} from "@/lib/concept-dominance";
import { resolveNarrativePromise } from "@/lib/narrative-promise-intelligence";
import { regenerateTitleFromIdea } from "@/lib/title-intelligence-validation";

export type { ExpressScenarioVariant } from "./express-genre-config";
import {
  createEmptyForgeMemory,
  getCriticalMissingSlots,
  getForgeMemory,
  type ForgeInterviewMemory,
} from "./interview-memory";
import {
  advanceStoryRoomStage,
  STORY_ROOM_STAGE_DEFS,
  type StoryRoomStageId,
} from "./story-room-state-machine";
import { buildCanonFromState, lockCanonMaster } from "./canon-genesis-engine";
import { buildDnaLockFromInterviewState } from "./dna-lock";
import { finalizeForgeForBlueprint } from "./forge-evolution-engine";
import { buildForgeInterviewSeed,
  validateForgeHandoffForBlueprint,
} from "./forge-blueprint-handoff";
import { applyBlueprintReadySummaryToState } from "./blueprint-ready-summary";
import { isMetadataOnly } from "./blueprint-ready-summary";
import { validateBookReadinessForBlueprint } from "@/lib/book-config-engine/blueprint-readiness";
import { enrichBookConfigFromForgeSeed } from "./forge-writer-bridge";
import {
  applyGreatnessGateToConfig,
  enforceKernelGreatnessBeforeForge,
} from "@/lib/book-intelligence";
import { applyFormatDominance } from "@/lib/book-format-dominance";
import type { BookConfig } from "@/types/book";

export type ChapterBlueprintSeed = {
  id: string;
  chapter: number;
  title: string;
  summary: string;
  purpose: string;
  goal: string;
  conflict: string;
  hook: string;
  expectedSetting: string;
  subchapters: [];
};

export type ExpressKeyScene = {
  role: "opening" | "crisis" | "climax" | "closing";
  beat: string;
  stakes: string;
};

export type CompleteExpressBookPackage = {
  id: string;
  variant: ExpressScenarioVariant;
  label: string;
  title: string;
  subtitle: string;
  hook: string;
  logline: string;
  editorialSynopsis: string;
  genre: string;
  subgenre: string;
  language: string;
  targetAudience: string;
  marketPromise: string;
  protagonist: string;
  antagonistOrLoveInterest: string;
  secondaryCharacters: string[];
  setting: string;
  atmosphere: string;
  centralConflict: string;
  emotionalWound: string;
  desire: string;
  fear: string;
  stakes: string;
  moralBoundary: string;
  antiDriftRules: string[];
  structurePreference: string;
  chapterCount: number;
  subchaptersEnabled: boolean;
  chapterBlueprintSeeds: ChapterBlueprintSeed[];
  keyScenes: ExpressKeyScene[];
  midpoint: string;
  climax: string;
  endingDirection: string;
  finalEmotion: string;
  frontMatter: string;
  backMatter: string;
  authorName: string;
  copyright: string;
  commercialPitch: string;
  editorialRisks: string[];
  whyItSells: string;
  /** Nonfiction: problema concreto del lettore */
  readerProblem?: string;
  /** Nonfiction: promessa di trasformazione */
  transformationPromise?: string;
  /** Nonfiction: metodo o framework operativo */
  methodFramework?: string;
  /** Nonfiction: esercizi pratici */
  exercises?: string[];
  /** Nonfiction: domande di riflessione */
  reflectionPrompts?: string[];
  /** Nonfiction: pubblico ideale */
  idealReader?: string;
  characters: ForgeCharacter[];
  storyRoom: StoryRoomState;
  storyFuture: StoryFutureState;
  bookPromises: BookPromises;
  blueprintReadiness: "complete";
};

export type ExpressBookScenario = CompleteExpressBookPackage;

const GENRE_META: Record<string, { subgenre: string; normalizedGenre: string }> = {
  romance: { subgenre: "contemporary romance", normalizedGenre: "romance" },
  "dark romance": { subgenre: "dark romance", normalizedGenre: "dark-romance" },
  "friends to lovers": { subgenre: "friends to lovers", normalizedGenre: "romance" },
  "friends-to-lovers": { subgenre: "friends to lovers", normalizedGenre: "romance" },
  "enemies to lovers": { subgenre: "enemies to lovers", normalizedGenre: "romance" },
  "enemies-to-lovers": { subgenre: "enemies to lovers", normalizedGenre: "romance" },
  thriller: { subgenre: "psychological thriller", normalizedGenre: "thriller" },
  mystery: { subgenre: "mystery", normalizedGenre: "thriller" },
  horror: { subgenre: "supernatural horror", normalizedGenre: "horror" },
  fantasy: { subgenre: "epic fantasy", normalizedGenre: "fantasy" },
  "sci-fi": { subgenre: "science fiction", normalizedGenre: "sci-fi" },
  "science fiction": { subgenre: "science fiction", normalizedGenre: "sci-fi" },
  fantascienza: { subgenre: "science fiction", normalizedGenre: "sci-fi" },
  "self-help": { subgenre: "personal growth", normalizedGenre: "self-help" },
  business: { subgenre: "business growth", normalizedGenre: "business" },
  manuale: { subgenre: "practical guide", normalizedGenre: "manual" },
  saggio: { subgenre: "essay", normalizedGenre: "essay" },
  educational: { subgenre: "educational", normalizedGenre: "educational" },
  poesia: { subgenre: "lyric poetry", normalizedGenre: "poetry" },
  memoir: { subgenre: "reflective memoir", normalizedGenre: "memoir" },
  workbook: { subgenre: "practical workbook", normalizedGenre: "workbook" },
  study_material: { subgenre: "structured study", normalizedGenre: "study_material" },
  cookbook: { subgenre: "ricettario pratico", normalizedGenre: "cookbook" },
  ricettario: { subgenre: "ricettario pratico", normalizedGenre: "cookbook" },
  ricette: { subgenre: "ricettario pratico", normalizedGenre: "cookbook" },
};

function chapterCountForInput(input: ExpressForgeInput): number {
  const preset = normalizeLengthPreset(input.length);
  return resolveLengthPresetConfig(preset, input.genre).chapterCount;
}

function poetrySectionCountForInput(input: ExpressForgeInput): number {
  const preset = normalizeLengthPreset(input.length);
  if (preset === "breve") return 4;
  if (preset === "lungo" || preset === "epico") return 7;
  return 5;
}

function poetryPoemEstimateForInput(input: ExpressForgeInput): number {
  const preset = normalizeLengthPreset(input.length);
  if (preset === "breve") return 40;
  if (preset === "lungo" || preset === "epico") return 80;
  return 60;
}

function normalizePoetryToneLabel(tone: string): string {
  const normalized = tone.trim().toLowerCase();
  if (!normalized) return "lirica";
  const first = normalized.split(/[,/·-]/)[0]?.trim() || normalized;
  const feminine: Record<string, string> = {
    lirico: "lirica",
    poetico: "poetica",
    intimo: "intima",
    crudo: "cruda",
    contemplativo: "contemplativa",
    visivo: "visiva",
    minimalista: "minimalista",
    emotivo: "emotiva",
  };
  const firstWord = first.split(/\s+/)[0]?.trim() || first;
  return feminine[first] || feminine[firstWord] || firstWord.replace(/ico\b/, "ica").replace(/oso\b/, "osa");
}

function normalizePoetryTheme(theme: string): string {
  return theme
    .replace(/^(una\s+)?raccolta\s+(poetica|di\s+poesie)\s+(su|sulla|sulle|sul)?\s*/i, "")
    .trim();
}

function normalizeLanguage(language: string): string {
  const map: Record<string, string> = {
    Italiano: "Italian",
    Inglese: "English",
    Spagnolo: "Spanish",
    Francese: "French",
    Tedesco: "German",
    Auto: "Italian",
  };
  return map[language] ?? language;
}

function ideaCore(input: ExpressForgeInput): string {
  return sanitizeUserConceptInput(input.ideaSeed || input.protagonistSeed || "");
}

function isDarkRomance(genre: string): boolean {
  return /dark.?romance|romance.*dark/i.test(genre);
}

function isFriendsToLoversGenre(genre: string): boolean {
  return /friends to lovers|friends-to-lovers|amici ad amanti/i.test(genre);
}

function isEnemiesToLoversGenre(genre: string): boolean {
  return /enemies to lovers|enemies-to-lovers|nemici che si innamorano|nemici ad amanti/i.test(genre);
}

function isRomanceSubgenre(genre: string): boolean {
  return isFriendsToLoversGenre(genre) || isEnemiesToLoversGenre(genre);
}

function isRomance(genre: string): boolean {
  return /romance/i.test(genre) && !isDarkRomance(genre);
}

function isScifiGenre(genre: string): boolean {
  return /sci\s*fi|science fiction|fantascienza|cyberpunk|distopi/i.test(genre);
}

function isFantasyGenre(genre: string): boolean {
  return /fantasy|epic|magia|magico|urbanfantasy/i.test(genre);
}

function isThrillerGenre(genre: string): boolean {
  return /thriller|giallo|noir|crime|mystery/i.test(genre);
}

function isHorrorGenre(genre: string): boolean {
  return /horror|gotico|gothic|paura|soprannaturale/i.test(genre);
}

function isCookbookGenre(genre: string): boolean {
  return /cookbook|ricettario|ricette|cucina/i.test(genre);
}

function defaultLeadForGenre(genre: string): { name: string; role: string } {
  if (isScifiGenre(genre)) {
    return { name: "Lena", role: "ingegnera di bordo costretta a scegliere tra protocollo e sopravvivenza" };
  }
  if (isFantasyGenre(genre)) {
    return { name: "Arianna", role: "erede di un potere antico che non ha mai chiesto" };
  }
  if (isThrillerGenre(genre)) {
    return { name: "Marta", role: "investigatrice costretta a riaprire un caso sepolto" };
  }
  if (isHorrorGenre(genre)) {
    return { name: "Iris", role: "sopravvissuta attratta da una verità proibita" };
  }
  if (isDarkRomance(genre) || isRomance(genre) || isRomanceSubgenre(genre)) {
    return { name: "Elena", role: "protagonista segnata dal passato" };
  }
  return { name: "Arianna", role: "protagonista chiamata a una scelta irreversibile" };
}

function defaultCounterpartForGenre(
  genre: string,
  variant: ExpressScenarioVariant,
): { name: string; role: string } {
  if (isScifiGenre(genre)) {
    return variant === "bold"
      ? { name: "Kael", role: "ex ufficiale della flotta con un segreto che può spegnere la colonia" }
      : { name: "Kael", role: "comandante di missione con agenda nascosta" };
  }
  if (isFantasyGenre(genre)) {
    return variant === "bold"
      ? { name: "Kael", role: "principe esiliato legato alla stessa maledizione" }
      : { name: "Kael", role: "custode ambiguo di una magia proibita" };
  }
  if (isThrillerGenre(genre)) {
    return { name: "Neri", role: "antagonista invisibile che manipola prove e colpe" };
  }
  if (isHorrorGenre(genre)) {
    return { name: "La Casa", role: "presenza antagonica che divora memoria e identità" };
  }
  if (isDarkRomance(genre) || isRomance(genre) || isRomanceSubgenre(genre)) {
    return variant === "bold"
      ? { name: "Marco", role: "proprietario magnetico, colpevole e irresistibile" }
      : isFriendsToLoversGenre(genre)
        ? { name: "Marco", role: "migliore amico diventato confine emotivo impossibile" }
        : isEnemiesToLoversGenre(genre)
          ? { name: "Marco", role: "rivale ostile con una ferita speculare alla sua" }
          : { name: "Marco", role: "proprietario affascinante e pericoloso" };
  }
  return { name: "La Forza Opposta", role: "forza antagonica che specchia e sfida il protagonista" };
}

function defaultSettingForGenre(genre: string): string {
  if (isScifiGenre(genre)) {
    return "Stazione orbitale e colonia al limite del sistema, dove tecnologia, protocollo e sopravvivenza si scontrano";
  }
  if (isFantasyGenre(genre)) {
    return "Regno diviso tra città di cenere, foreste incantate e una corona legata a una magia proibita";
  }
  if (isThrillerGenre(genre)) {
    return "Città contemporanea attraversata da archivi nascosti, strade notturne e verità cancellate";
  }
  if (isHorrorGenre(genre)) {
    return "Luogo isolato dove il confine tra memoria, colpa e presenza soprannaturale si assottiglia";
  }
  if (isDarkRomance(genre) || isRomance(genre) || isRomanceSubgenre(genre)) {
    return isFriendsToLoversGenre(genre)
      ? "Contesto quotidiano condiviso — lavoro, città, amicizia — dove ogni prossimità diventa confine"
      : isEnemiesToLoversGenre(genre)
        ? "Arena di conflitto professionale o familiare dove attrito e desiderio convivono"
        : "Maniero isolato, muri umidi e stanze chiuse dove ogni oggetto sembra custodire un segreto";
  }
  return "Mondo narrativo ad alta tensione costruito intorno alla scelta irreversibile della protagonista";
}

function defaultTitleForGenre(input: ExpressForgeInput, variant: ExpressScenarioVariant): string {
  if (input.title?.trim()) return input.title.trim();

  const seed = ideaCore(input);
  const timeTitle = buildTimeAnchoredTitle(seed);
  if (timeTitle && isThrillerGenre(input.genre) && hasSupernaturalThrillerSignals(seed)) {
    return timeTitle;
  }

  const regenerated = regenerateTitleFromIdea({
    idea: seed,
    genre: input.genre,
    language: input.language,
  });
  if (regenerated?.title) return regenerated.title;

  if (isScifiGenre(input.genre)) {
    return variant === "bold"
      ? "Orbita dei Fantasmi"
      : variant === "commercial"
        ? "Il Codice dell'Ultima Alba"
        : "Memoria delle Stelle";
  }

  if (isFantasyGenre(input.genre)) {
    return variant === "bold"
      ? "Cenere e Corona"
      : variant === "commercial"
        ? "La Corona delle Ombre"
        : "Il Patto della Magia Perduta";
  }

  if (isThrillerGenre(input.genre)) {
    return variant === "bold"
      ? "La Verità Sepolta"
      : variant === "commercial"
        ? "Il Codice del Silenzio"
        : "L'Ultima Prova";
  }

  if (isHorrorGenre(input.genre)) {
    return variant === "bold"
      ? "La Casa che Ricorda"
      : variant === "commercial"
        ? "Dove Dormono le Ombre"
        : "Il Buio Dietro la Porta";
  }

  return buildTitle(input, variant);
}

function buildGenreAwareVariantCopy(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
  protagonist: string,
  counterpart: string,
  setting: string,
): {
  hook?: string;
  editorialSynopsis?: string;
  centralConflict?: string;
  stakes?: string;
  endingDirection?: string;
  finalEmotion?: string;
  commercialPitch?: string;
  whyItSells?: string;
} {
  if (isDarkRomance(input.genre) || isRomance(input.genre) || isRomanceSubgenre(input.genre)) {
    return {};
  }

  if (isScifiGenre(input.genre)) {
    if (variant === "safe") {
      return {
        hook: `${protagonist} scopre che la missione nasconde un protocollo che nessuno doveva attivare.`,
        editorialSynopsis: `La versione più stabile dello sci-fi: mondo credibile, tecnologia comprensibile, posta in gioco chiara. ${protagonist} affronta ${setting.toLowerCase()} dove ogni sistema può salvare o condannare la colonia.`,
        centralConflict: `${protagonist} deve rispettare il protocollo mentre ${counterpart} rivela che la minaccia è più vicina del previsto.`,
        stakes: "Sopravvivenza, identità, futuro della colonia e verità sepolta.",
        endingDirection: "Finale risolutivo: scelta tecnologica irreversibile con costo umano visibile.",
        finalEmotion: "Meraviglia speculativa, tensione e senso di conseguenza.",
        commercialPitch: "Sci-fi stabile: worldbuilding, tech stakes e payoff chiaro.",
        whyItSells: "Promessa sci-fi leggibile: futuro possibile, dilemma morale e tensione crescente.",
      };
    }
    if (variant === "commercial") {
      return {
        hook: `Ogni allarme che ${protagonist} spegne sembra risolvere il problema — finché capisce che il sistema è stato progettato per fallire.`,
        editorialSynopsis: `La versione più vendibile dello sci-fi: hook immediato, rivelazioni a strati, tech stakes e capitoli ad alta tensione. Il lettore continua perché ogni risposta cambia la posta in gioco della missione.`,
        centralConflict: `${protagonist} deve distinguere guasto tecnico e sabotaggio prima che la colonia ceda.`,
        stakes: "Vita dell'equipaggio, verità della missione, futuro del sistema solare.",
        endingDirection: "Finale ad alto impatto: verità rivelata e scelta che ridefinisce il futuro.",
        finalEmotion: "Adrenalina speculativa e eco di conseguenza.",
        commercialPitch: "Sci-fi commerciale: ritmo, tech stakes e cliffhanger puliti.",
        whyItSells: "Alta leggibilità, worldbuilding vendibile e promessa di dilemma morale forte.",
      };
    }
    return {
      hook: `La tecnologia non tradisce ${protagonist}: le tradisce ciò che ha deciso di non vedere.`,
      editorialSynopsis: `La versione più audace dello sci-fi: ambiguità morale, futuro instabile, identità e sistema come specchi. La missione non chiede solo sopravvivenza — chiede chi merita di continuare.`,
      centralConflict: `${protagonist} deve scegliere tra protocollo e verità, rischiando di diventare ciò che combatte.`,
      stakes: "Identità, memoria, futuro dell'umanità e contagio della scelta.",
      endingDirection: "Finale disturbante: vittoria possibile, ma nessuna innocenza resta intatta.",
      finalEmotion: "Inquietudine speculativa, shock e domanda finale.",
      commercialPitch: "Sci-fi bold: moralità ambigua, tech e finale memorabile.",
      whyItSells: "Più distintivo: ideale per sci-fi adulto con posta in gioco alta.",
    };
  }

  if (isHorrorGenre(input.genre)) {
    if (variant === "safe") {
      return {
        hook: `${protagonist} entra in un luogo che non vuole essere ricordato — e ogni notte restituisce qualcosa che avrebbe dovuto restare morto.`,
        editorialSynopsis: `La versione più stabile dell'horror: atmosfera densa, minaccia progressiva, mistero leggibile e paura crescente. ${protagonist} affronta ${setting.toLowerCase()}, dove memoria, colpa e presenza soprannaturale diventano una sola trappola.`,
        centralConflict: `${protagonist} vuole capire cosa infesta il luogo, ma ogni risposta indebolisce il confine tra realtà, ricordo e possessione.`,
        stakes: "Sanità mentale, identità, sopravvivenza e verità sepolta.",
        endingDirection: "Finale catartico e inquieto: la verità emerge, ma lascia una cicatrice viva.",
        finalEmotion: "Paura trattenuta, sollievo amaro e ultima ombra.",
        commercialPitch: "Horror atmosferico: minaccia chiara, mistero forte e payoff disturbante.",
        whyItSells: "Promessa horror leggibile: luogo malato, paura progressiva e finale che resta addosso.",
      };
    }

    if (variant === "commercial") {
      return {
        hook: `${protagonist} scopre che la casa non è vuota: sta solo aspettando che qualcuno le dia di nuovo un nome.`,
        editorialSynopsis: `La versione più vendibile dell'horror: capitoli aggancianti, rivelazioni a strati, oggetti maledetti, apparizioni controllate e una minaccia che si avvicina scena dopo scena. Il lettore resta perché ogni porta aperta peggiora la precedente.`,
        centralConflict: `${protagonist} deve sopravvivere a una presenza che usa memoria e colpa come esche.`,
        stakes: "Corpo, mente, verità familiare e possibilità di uscire ancora intera dal luogo.",
        endingDirection: "Finale ad alto impatto: la fonte dell'orrore viene rivelata, ma il prezzo non è innocente.",
        finalEmotion: "Terrore, rivelazione e brivido finale.",
        commercialPitch: "Horror commerciale: hook immediato, escalation, apparizioni e cliffhanger puliti.",
        whyItSells: "Alta leggibilità, paura crescente e promessa di mistero soprannaturale forte.",
      };
    }

    return {
      hook: `Il vero orrore non è ciò che ${protagonist} vede: è ciò che il luogo riesce a farle ricordare come se fosse sempre stato suo.`,
      editorialSynopsis: `La versione più audace dell'horror: ambiguità psicologica, soprannaturale non addomesticato, corpo e memoria come campi di battaglia. La storia non consola: scava, contamina e lascia il lettore con il dubbio peggiore.`,
      centralConflict: `${protagonist} deve decidere se distruggere la verità o lasciarsi trasformare da ciò che la abita.`,
      stakes: "Identità, realtà, memoria e contagio dell'orrore oltre l'ultima pagina.",
      endingDirection: "Finale disturbante: la minaccia viene compresa troppo tardi o sopravvive in una forma nuova.",
      finalEmotion: "Inquietudine lunga, shock silenzioso ed eco disturbante.",
      commercialPitch: "Horror bold: atmosfera autoriale, ambiguità e immagine finale memorabile.",
      whyItSells: "Più rischioso, ma più riconoscibile: ideale per un horror che vuole restare nella pelle.",
    };
  }

  if (isFantasyGenre(input.genre)) {
    if (variant === "safe") {
      return {
        hook: `${protagonist} scopre che il potere capace di salvare il regno può anche distruggerla.`,
        editorialSynopsis: `La versione più stabile del fantasy: mondo chiaro, magia comprensibile, minaccia crescente e arco emotivo forte. ${protagonist} entra in ${setting.toLowerCase()} e deve scegliere se accettare un'eredità che pretende un prezzo.`,
        centralConflict: `${protagonist} deve reclamare un potere proibito mentre ${counterpart} custodisce una verità che può salvarla o tradirla.`,
        stakes: "Regno, magia, libertà e identità della protagonista.",
        endingDirection: "Finale epico e leggibile: scelta irreversibile, minaccia affrontata e nuova identità conquistata.",
        finalEmotion: "Meraviglia, tensione e rinascita.",
        commercialPitch: "Fantasy stabile: magia, destino, posta in gioco chiara e payoff emotivo.",
        whyItSells: "Promessa fantasy classica ma forte: potere, regno, tradimento e trasformazione.",
      };
    }

    if (variant === "commercial") {
      return {
        hook: `${protagonist} deve allearsi con chi conosce il segreto della corona, anche se quel segreto potrebbe condannarla.`,
        editorialSynopsis: `La versione più vendibile del fantasy: magia proibita, alleanze instabili, tradimenti, rivelazioni progressive e capitoli con forte senso di meraviglia. Ogni scelta aumenta il costo del potere.`,
        centralConflict: `${protagonist} deve salvare il regno senza diventare l'arma che il nemico aspettava.`,
        stakes: "Corona, sangue, alleanze, memoria e sopravvivenza del mondo magico.",
        endingDirection: "Finale ad alta posta in gioco: battaglia, verità sul potere e prezzo personale.",
        finalEmotion: "Epicità, perdita e promessa di grandezza.",
        commercialPitch: "Fantasy commerciale: magia, tradimento, corona e bingeability.",
        whyItSells: "Hook immediato, mondo vendibile e conflitto chiaro tra potere e identità.",
      };
    }

    return {
      hook: `La magia non sceglie ${protagonist} per salvarla: la sceglie perché sa cosa può strapparle.`,
      editorialSynopsis: `La versione più audace del fantasy: magia moralmente ambigua, eredità sporca, alleati instabili e una scelta finale che non lascia innocenti. Il destino del regno diventa una domanda scomoda: chi merita davvero il potere?`,
      centralConflict: `${protagonist} deve decidere se rompere la maledizione o usarla, rischiando di diventare ciò che combatte.`,
      stakes: "Destino del regno, corruzione del potere, identità e memoria.",
      endingDirection: "Finale potente e agrodolce: vittoria possibile, innocenza perduta.",
      finalEmotion: "Grandezza, ferita e senso di mito.",
      commercialPitch: "Fantasy bold: magia oscura, moralità ambigua e finale memorabile.",
      whyItSells: "Più distintivo: adatto a un fantasy oscuro con identità forte.",
    };
  }

  if (isThrillerGenre(input.genre)) {
    if (variant === "safe") {
      return {
        hook: `${protagonist} riapre una verità archiviata e capisce che qualcuno ha costruito il silenzio con precisione chirurgica.`,
        editorialSynopsis: `La versione più stabile del thriller: indagine chiara, tensione progressiva, prove mancanti e minaccia credibile. Ogni scoperta avvicina ${protagonist} a una verità che qualcuno ha protetto troppo a lungo.`,
        centralConflict: `${protagonist} deve seguire una pista cancellata mentre l'antagonista trasforma ogni prova in un rischio personale.`,
        stakes: "Verità, reputazione, giustizia e sopravvivenza.",
        endingDirection: "Finale risolutivo con twist controllato e verità pagata a caro prezzo.",
        finalEmotion: "Tensione sciolta, sospetto residuo e giustizia imperfetta.",
        commercialPitch: "Thriller stabile: indagine, pressione e twist leggibile.",
        whyItSells: "Promessa chiara: mistero forte, ritmo e payoff.",
      };
    }

    if (variant === "commercial") {
      return {
        hook: `Ogni prova che ${protagonist} trova sembra salvarla, finché non capisce che è stata messa lì per guidarla nella trappola.`,
        editorialSynopsis: `La versione più vendibile del thriller: cliffhanger, piste false, rivelazioni a strati, pressione temporale e antagonista sempre un passo avanti. Il lettore continua perché ogni risposta cambia la domanda.`,
        centralConflict: `${protagonist} deve distinguere prove vere e prove costruite prima che la trappola si chiuda.`,
        stakes: "Vita, verità pubblica, colpa e possibilità di fermare il colpevole.",
        endingDirection: "Finale ad alta tensione: twist, confronto e ribaltamento dell'ultima prova.",
        finalEmotion: "Scarica di adrenalina e sospetto finale.",
        commercialPitch: "Thriller commerciale: twist, ritmo e alta leggibilità.",
        whyItSells: "Bingeability alta, capitoli-gancio e promessa di colpo di scena.",
      };
    }

    return {
      hook: `Il caso non vuole essere risolto: vuole dimostrare che ${protagonist} è parte della menzogna.`,
      editorialSynopsis: `La versione più audace del thriller: paranoia, colpa, verità instabile e antagonista speculare. L'indagine non porta solo al colpevole, ma alla domanda più pericolosa: quanto della verità può sopravvivere a chi la racconta?`,
      centralConflict: `${protagonist} deve scoprire il colpevole senza diventare la prossima menzogna del caso.`,
      stakes: "Identità morale, verità, memoria e giustizia contaminata.",
      endingDirection: "Finale ambiguo e tagliente: verità rivelata, ma nessuno resta pulito.",
      finalEmotion: "Paranoia elegante, amarezza e ultima domanda.",
      commercialPitch: "Thriller bold: psicologico, morale, memorabile.",
      whyItSells: "Più rischioso ma più riconoscibile: ideale per thriller psicologico adulto.",
    };
  }

  return {};
}

function buildGenreAwareEditorialSynopsis(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
  lead: { name: string; role: string },
  counterpart: { name: string; role: string },
  setting: string,
): string {
  if (isFantasyGenre(input.genre)) {
    const intensity =
      variant === "bold"
        ? "La versione più audace: magia proibita, moralità ambigua, eredità sporca e una scelta finale che cambia il destino del regno."
        : variant === "commercial"
          ? "La versione più vendibile: potere nascosto, alleanze instabili, tradimenti, rivelazioni progressive e capitoli con forte senso di meraviglia."
          : "La versione più stabile: una protagonista riconoscibile, un mondo magico chiaro, una minaccia crescente e un arco emotivo leggibile.";
    return `${intensity} ${lead.name} entra in ${setting.toLowerCase()} e scopre che il potere non è un dono: è un debito. ${counterpart.name} può guidarla o tradirla, ma ogni passo verso la corona pretende memoria, sangue e identità.`;
  }

  if (isScifiGenre(input.genre)) {
    return `Uno sci-fi ${input.tone} costruito su tecnologia, protocollo e posta in gioco speculativa. ${lead.name} deve navigare ${setting.toLowerCase()} mentre ${counterpart.name} rivela che la minaccia non è solo esterna — è nel design della missione stessa.`;
  }

  if (isThrillerGenre(input.genre)) {
    return `Un thriller ${input.tone} costruito su prove mancanti, colpe sepolte e pressione crescente. ${lead.name} deve seguire una pista che qualcuno ha cancellato, mentre ${counterpart.name} trasforma ogni risposta in una minaccia più vicina.`;
  }

  if (isHorrorGenre(input.genre)) {
    return `Un horror ${input.tone} dove il luogo non è semplice ambientazione, ma predatore. ${lead.name} attraversa segni, presenze e memorie deformate finché la verità smette di essere liberazione e diventa contagio.`;
  }

  return buildEditorialSynopsis(input, variant, lead, counterpart, setting);
}

function parseProtagonistLabel(seed: string, genre = ""): { name: string; role: string } {
  const sanitized = sanitizeUserConceptInput(seed);
  const extracted = extractConceptProtagonist(sanitized);
  if (extracted) {
    const role = /insegnante/i.test(sanitized)
      ? "insegnante nel miraggio di ricordi che anticipano la morte"
      : defaultLeadForGenre(genre).role;
    return { name: extracted, role };
  }
  if (/restauratrice/i.test(sanitized)) return { name: "Elena", role: "restauratrice" };
  if (/chef/i.test(sanitized)) return { name: "Elena", role: "chef tormentata" };
  return defaultLeadForGenre(genre);
}

function parseCounterpart(
  genre: string,
  variant: ExpressScenarioVariant,
  seed = "",
): { name: string; role: string } {
  if (hasSupernaturalThrillerSignals(seed)) {
    return variant === "bold"
      ? {
          name: "L'Uomo del Futuro",
          role: "figura che annuncia la morte nelle visioni e stringe il tempo attorno al paese",
        }
      : {
          name: "Primo uomo del futuro",
          role: "presenza enigmatica che invia ricordi dal futuro e nasconde il vero costo del destino",
        };
  }
  return defaultCounterpartForGenre(genre, variant);
}

function parseSetting(seed: string, genre = ""): string {
  if (/\b(paese|villaggio|piccolo\s+paese)\b/i.test(seed) && (isThrillerGenre(genre) || hasSupernaturalThrillerSignals(seed))) {
    return "Piccolo paese chiuso nel silenzio, dove ogni abitante custodisce un pezzo della verità";
  }
  if (/villa|incendio|restauratrice/i.test(seed) && (isDarkRomance(genre) || isRomance(genre))) {
    return "Villa decadente sulle colline, segnata da un incendio doloso e da stanze che conservano cenere e silenzi";
  }
  if (/regno|corona|magia|drago|incantesimo|foresta|impero/i.test(seed)) {
    return "Regno antico attraversato da magia proibita, alleanze spezzate e poteri che chiedono un prezzo";
  }
  return defaultSettingForGenre(genre);
}

function buildTitle(input: ExpressForgeInput, variant: ExpressScenarioVariant): string {
  if (input.title?.trim()) return input.title.trim();
  const seed = ideaCore(input);
  if (/villa|incendio|restauratrice/i.test(seed)) {
    return variant === "bold" ? "Cenere tra le Dita" : "La Villa delle Ceneri";
  }
  if (isDarkRomance(input.genre)) {
    return variant === "commercial" ? "Confine Proibito" : "La Ferita che Ti Somiglia";
  }
  return `${input.genre} — ${parseProtagonistLabel(seed).name}`;
}

function buildEditorialSynopsis(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
  lead: { name: string; role: string },
  counterpart: { name: string; role: string },
  setting: string,
): string {
  const seed = ideaCore(input);
  if (/villa|incendio|restauratrice/i.test(seed) || (isDarkRomance(input.genre) && /villa|restaur/i.test(seed))) {
    const extra =
      variant === "bold"
        ? " Ogni stanza rivelata è una trappola: più Elena si avvicina alla verità, più il desiderio diventa la forma più elegante della autodistruzione."
        : variant === "commercial"
          ? " Ogni indizio aumenta la tensione: il lettore capisce prima di Elena quanto sia pericoloso restare."
          : " La verità non arriva in un colpo solo: si insinua, divide, costringe a scegliere tra memoria e sopravvivenza.";
    return `Una restauratrice torna nella villa dove sua sorella è morta in un incendio doloso. Il proprietario, un uomo affascinante e pericoloso, le offre protezione ma inizia a riscrivere ogni confine della sua vita. Più lei indaga, più scopre che la casa non conserva solo cenere: conserva una colpa che li lega entrambi. Lei vuole la verità. Lui vuole impedirle di ricordare. Ma il desiderio più pericoloso non è quello che nasce tra loro: è la parte di lei che comincia a sentirsi al sicuro dentro la gabbia.${extra}`;
  }

  if (isDarkRomance(input.genre)) {
    return `${lead.name}, ${lead.role}, viene risucchiata in un mondo di desiderio proibito quando incontra ${counterpart.name}, ${counterpart.role}. ${setting}. Lei cerca controllo per non bruciarsi di nuovo. Lui offre protezione ma chiede in cambio ciò che teme di perdere: la verità. Più si avvicinano, più il confine tra cura e possesso si dissolve. Il lettore resta per capire se l'amore può redimere — o se condannare entrambi.`;
  }

  if (/thriller|horror/i.test(input.genre)) {
    return `${lead.name}, ${lead.role}, crede di controllare la situazione finché ${setting.toLowerCase()} non rivela una verità sepolta. ${counterpart.name} non è solo un ostacolo: è lo specchio di ciò che ${lead.name} ha deciso di non vedere. Ogni indizio aumenta la posta in gioco. Ogni scelta accorcia la distanza tra scoperta e distruzione.`;
  }

  return `${lead.name}, ${lead.role}, attraversa ${setting.toLowerCase()} in un ${input.genre} ${input.tone}. Desiderio, paura e verità si scontrano finché una scelta irreversibile definisce chi sopravvive alla propria storia — e che emozione resta al lettore nell'ultima pagina.`;
}

function buildCharacters(
  lead: { name: string; role: string },
  counterpart: { name: string; role: string },
  pkg: Partial<CompleteExpressBookPackage>,
  genre: string,
): ForgeCharacter[] {
  const protagonist: ForgeCharacter = {
    id: "express-protagonist",
    role: "protagonist",
    name: lead.name,
    wound: pkg.emotionalWound ?? "Colpa e bisogno di controllo mascherato da indipendenza",
    fear: pkg.fear ?? "Perdere di nuovo ciò che ama e scoprire di averlo causato",
    desire: pkg.desire ?? "Verità, giustizia e una forma di amore che non la distrugga",
    contradiction: "Vuole indipendenza ma cerca protezione dove è più pericoloso",
    obsession: "Ricostruire ciò che il fuoco ha cancellato",
    secret: "Tem di non resistere al desiderio che la tradisce",
    arc: pkg.endingDirection
      ? `Da ${lead.role} paralizzata dal passato a donna costretta a scegliere tra verità e sopravvivenza emotiva`
      : "Trasformazione da controllo a scelta consapevole",
    vulnerability: "La memoria della sorella e la paura di ricadere",
    dominantFlaw: "Confonde protezione e possesso",
  };

  const antagonistRole = isRomance(genre) ? ("antagonist" as const) : ("antagonist" as const);
  const antagonist: ForgeCharacter = {
    id: "express-counterpart",
    role: antagonistRole,
    name: counterpart.name,
    wound: "Colpa sepolta dietro controllo e fascino",
    fear: "Essere visto per ciò che ha fatto davvero",
    desire: isRomance(genre) ? "Possederla senza perderla" : "Impedire che la verità emerga",
    contradiction: "Offre salvezza ma agisce come minaccia",
    obsession: "Tenere chiusa la casa — e ciò che custodisce",
    secret: "È legato all'incendio più di quanto ammetta",
    arc: "Da custode del segreto a uomo costretto a scegliere tra perdita e redenzione",
  };

  return [protagonist, antagonist];
}

function buildSupernaturalThrillerCharacters(
  lead: { name: string; role: string },
  counterpart: { name: string; role: string },
  pkg: Partial<CompleteExpressBookPackage>,
): ForgeCharacter[] {
  const protagonist: ForgeCharacter = {
    id: "express-protagonist",
    role: "protagonist",
    name: lead.name,
    wound: "Visioni notturne che anticipano eventi impossibili e una morte che sembra già scritta",
    fear: "Che i ricordi dal futuro siano una condanna, non un avvertimento",
    desire: "Capire chi le invia le visioni e se può ancora cambiare il destino",
    contradiction: "Vuole proteggere il paese ma ogni visione la avvicina alla propria fine",
    obsession: "Decifrare il significato delle immagini che arrivano ogni notte",
    secret: "Ha già visto la propria morte e non sa a chi dirlo",
    arc: pkg.endingDirection
      ? `Da ${lead.role} paralizzata dalle visioni a donna costretta a scegliere se credere al futuro o combatterlo`
      : "Trasformazione da testimone passivo a chi decide se il destino si può riscrivere",
    vulnerability: "Il legame con gli abitanti e la paura di diventare la profezia che tutti temono",
    dominantFlaw: "Confonde premonizione e paranoia finché il paese non le lascia più margine",
  };

  const antagonist: ForgeCharacter = {
    id: "express-counterpart",
    role: "antagonist",
    name: counterpart.name,
    wound: "Esiste fuori dal tempo che gli altri conoscono",
    fear: "Che qualcuno impedisca il futuro che ha già visto",
    desire: "Far accettare al paese — e a Marta — il destino che le visioni mostrano",
    contradiction: "Avverte e condanna con la stessa voce",
    obsession: "Tenere aperto il corridoio tra presente e futuro",
    secret: "Non è il primo a inviare ricordi dal futuro in quel paese",
    arc: "Da voce lontana nelle visioni a presenza che costringe una scelta irreversibile",
  };

  const sheriff: ForgeCharacter = {
    id: "express-sheriff",
    role: "supporting",
    name: "Sceriffo locale",
    wound: "Anni di silenzi imposti dal paese su eventi inspiegabili",
    fear: "Che le visioni dividano definitivamente la comunità",
    desire: "Mantenere l'ordine senza ammettere ciò che non può spiegare",
    contradiction: "Deve proteggere tutti ma non crede a nessuna versione della verità",
    obsession: "Tenere chiuso il paese prima che le visioni diventino panico",
    secret: "Ha ricevuto anch'egli frammenti di futuro che non ha mai confessato",
    arc: "Da custode del silenzio a uomo costretto a scegliere da che parte stare",
  };

  const villagers: ForgeCharacter = {
    id: "express-villagers",
    role: "supporting",
    name: "Abitanti che ricevono visioni",
    wound: "Condividono incubi che nessuno osa nominare ad alta voce",
    fear: "Che il futuro mostrato nelle visioni sia già iniziato",
    desire: "Capire se sono testimoni o complici del destino di Marta",
    contradiction: "Cercano protezione nel gruppo ma alimentano il panico collettivo",
    obsession: "Interpretare ogni segno come conferma o smentita della morte annunciata",
    secret: "Alcuni hanno già visto la stessa scena della fine",
    arc: "Da coro sussurrante a massa che spinge Marta verso la profezia o la ribellione",
  };

  return [protagonist, antagonist, sheriff, villagers];
}

function buildChapterSeeds(count: number, genre: string, variant: ExpressScenarioVariant, setting: string, ideaSeed?: string): ChapterBlueprintSeed[] {
  if (ideaSeed && hasRichIdeaEntities(ideaSeed)) {
    return buildEntityAwareChapterScaffold(ideaSeed, count).map((beat, i) => ({
      id: `express-ch-${i + 1}`,
      chapter: i + 1,
      title: beat.title,
      summary: beat.summary,
      purpose: beat.summary,
      goal: beat.summary,
      conflict: beat.summary,
      hook: beat.summary,
      expectedSetting: setting,
      subchapters: [] as [],
    }));
  }

  const romanceArc = [
    "Arrivo e attrazione pericolosa",
    "Confini che cedono",
    "Primo segreto rivelato",
    "Desiderio vs controllo",
    "Midpoint — verità parziale",
    "Tradimento percepito",
    "Crisi e isolamento",
    "Confronto con la ferita",
    "Scelta irreversibile",
    "Climax emotivo",
    "Aftermath",
    "Finale e nuovo equilibrio",
  ];
  const horrorArc = [
    "Arrivo nel luogo malato",
    "Primi segni e presenze",
    "Segreto che contamina",
    "Inquietudine crescente",
    "Midpoint — origine della minaccia",
    "Isolamento e decadenza",
    "Confronto con la paura",
    "Rivelazione disturbante",
    "Escalation soprannaturale",
    "Climax nel cuore del buio",
    "Contagio e conseguenza",
    "Finale inquieto",
  ];
  const labels =
    isHorrorGenre(genre)
      ? horrorArc
      : isRomance(genre) || /thriller/i.test(genre)
        ? romanceArc
        : Array.from({ length: count }, (_, i) => `Atto ${i + 1} — escalation narrativa`);

  return Array.from({ length: count }, (_, i) => {
    const title = labels[i % labels.length] ?? `Capitolo ${i + 1}`;
    const purpose =
      variant === "commercial" && i === 0
        ? "Hook immediato, tono, promessa e conflitto visibile entro poche pagine"
        : i === Math.floor(count / 2)
          ? "Midpoint che ribalta ciò che il protagonista credeva vero"
          : i === count - 1
            ? "Payoff emotivo e chiusura coerente con la promessa"
            : `Sviluppa tensione, personaggi e posta in gioco nel capitolo ${i + 1}`;
    const summary = purpose;
    return {
      id: `express-ch-${i + 1}`,
      chapter: i + 1,
      title,
      summary,
      purpose,
      goal: purpose,
      conflict: i === 0 ? "Primo attrito tra desiderio e pericolo" : "Escalation del conflitto centrale",
      hook: i === 0 ? "Apertura che aggancia subito tono e posta in gioco" : `Svolta nel capitolo ${i + 1}`,
      expectedSetting: setting,
      subchapters: [] as [],
    };
  });
}

function buildKeyScenes(pkg: Partial<CompleteExpressBookPackage>): ExpressKeyScene[] {
  return [
    {
      role: "opening",
      beat: pkg.hook ?? "Il mondo ordinario si incrina con un incontro che cambia ogni regola",
      stakes: "Il protagonista entra in uno spazio emotivo pericoloso",
    },
    {
      role: "crisis",
      beat: pkg.midpoint ?? "Una verità parziale distrugge la fiducia e alza la posta in gioco",
      stakes: "Restare significa rischiare identità, memoria e cuore",
    },
    {
      role: "climax",
      beat: pkg.climax ?? "Confronto finale tra desiderio, colpa e scelta irreversibile",
      stakes: "Nessuno può uscire indenne dalla verità",
    },
    {
      role: "closing",
      beat: pkg.endingDirection ?? "Finale che paga la promessa emotiva del libro",
      stakes: pkg.finalEmotion ?? "Catharsis, crepa aperta o redenzione costosa",
    },
  ];
}

function parseNonfictionSeed(seed: string): {
  readerProblem: string;
  transformationPromise: string;
  theme: string;
} {
  const trimmed = seed.trim();
  const theme = trimmed.split(/[.!?…]/)[0]?.trim() || trimmed;
  const readerProblem =
    /bloccat|paura|fallimento|ansia|procrastin|insicurezz|stress|burnout/i.test(trimmed)
      ? theme
      : `Il lettore si sente bloccato da un pattern ricorrente: ${theme}`;
  const transformationPromise =
    /ricostruir|trasform|30 giorni|fiducia|disciplina|direzione|liber/i.test(trimmed)
      ? trimmed
      : `Un percorso concreto per uscire dal blocco e costruire ${theme.toLowerCase()} con passi misurabili.`;
  return { readerProblem, transformationPromise, theme };
}

function buildNonfictionTitle(input: ExpressForgeInput, variant: ExpressScenarioVariant, theme: string): string {
  if (input.title?.trim()) return input.title.trim();
  const short = theme.split(/\s+/).slice(0, 4).join(" ");
  if (variant === "bold") return `Oltre il blocco: ${short}`;
  if (variant === "commercial") return `30 giorni per ${short.toLowerCase()}`;
  return `Guida pratica: ${short}`;
}

function buildNonfictionSubtitle(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
  transformationPromise: string,
): string {
  if (input.subtitle?.trim()) return input.subtitle.trim();
  const snippet = transformationPromise.slice(0, 72).replace(/\s+\S*$/, "");
  if (variant === "bold") return `${snippet} — un metodo profondo per cambiare identità e abitudini`;
  if (variant === "commercial") return `${snippet} — passi chiari, esercizi e risultati misurabili`;
  return `${snippet} — strumenti semplici per iniziare subito`;
}

function buildNonfictionEditorialSynopsis(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
  readerProblem: string,
  transformationPromise: string,
  methodFramework: string,
): string {
  const tone = input.tone;
  const extra =
    variant === "bold"
      ? " Ogni capitolo approfondisce identità, resistenze interne e integrazione — non solo tattiche."
      : variant === "commercial"
        ? " Ritmo sostenuto, esempi concreti e payoff visibili capitolo dopo capitolo."
        : " Linguaggio chiaro, esercizi immediati e progressione accessibile anche a chi parte da zero.";
  return `Questo ${input.genre} ${tone} parte da un problema reale: ${readerProblem}. La promessa è ${transformationPromise} Il metodo — ${methodFramework} — guida il lettore attraverso diagnosi, pratica e integrazione, con esercizi e domande di riflessione che trasformano insight in azione.${extra}`;
}

function buildNonfictionChapterSeeds(
  count: number,
  variant: ExpressScenarioVariant,
  methodFramework: string,
): ChapterBlueprintSeed[] {
  const arc = [
    "Il problema che il lettore riconosce",
    "Perché restare bloccati costa caro",
    "Il framework — fondamenti",
    "Miti da smontare",
    "Strumento pratico 1",
    "Micro-abitudine quotidiana",
    "Svolta — applicazione reale",
    "Resistenza interna e auto-sabotaggio",
    "Strumento pratico 2",
    "Accountability e misura dei progressi",
    "Integrazione nel contesto di vita",
    "Piano 30 giorni e chiusura",
    "Appendice — checklist e risorse",
    "Caso studio guidato",
    "Domande frequenti e troubleshooting",
    "Manutenzione a lungo termine",
    "Comunità e supporto",
    "Revisione del metodo",
    "Prossimi passi e continuità",
    "Epilogo — la nuova normalità",
    "Workbook — esercizi avanzati",
    "Diario di bordo",
    "Metriche e celebrazione",
    "Lettera al lettore del futuro",
  ];
  return Array.from({ length: count }, (_, i) => {
    const title = arc[i] ?? `Capitolo ${i + 1} — progressione del metodo`;
    const purpose =
      i === 0
        ? "Hook empatico: il lettore si riconosce nel problema entro poche pagine"
        : i === Math.floor(count / 2)
          ? "Midpoint: il framework diventa operativo con esercizio centrale"
          : i === count - 1
            ? "Payoff: piano d'azione, celebrazione e prossimi passi concreti"
            : `Avanza il metodo (${methodFramework}) nel capitolo ${i + 1}`;
    return {
      id: `express-nf-ch-${i + 1}`,
      chapter: i + 1,
      title,
      summary: purpose,
      purpose,
      goal: purpose,
      conflict: i === 0 ? "Negazione del problema vs desiderio di cambiare" : "Resistenza interna vs applicazione pratica",
      hook: i === 0 ? "Apertura che nomina il blocco e promette una via d'uscita" : `Esercizio o insight nel capitolo ${i + 1}`,
      expectedSetting: "Contesto quotidiano del lettore — lavoro, relazioni, abitudini",
      subchapters: [] as [],
    };
  });
}

function buildNonfictionExercises(seed: string, variant: ExpressScenarioVariant): string[] {
  const base = [
    "Diario della verità: annota 3 situazioni recenti in cui il blocco si è manifestato",
    "Audit settimanale delle scelte evitate per paura del fallimento",
    "Riscrittura del dialogo interno: da giudizio a coaching",
    "Micro-azione da 10 minuti da completare entro 24 ore",
    "Mappa delle persone o contesti che amplificano o riducono il blocco",
    "Checklist serale: 3 prove concrete di progresso, per quanto piccole",
  ];
  if (variant === "bold") {
    base.push("Lettera al sé del passato: cosa avresti voluto sapere prima del blocco");
    base.push("Rituale di chiusura identitaria: cosa smetti di credere su te stesso");
  }
  if (/30 giorni|disciplina|fiducia/i.test(seed)) {
    base.unshift("Calendario 30 giorni: un'azione misurabile al giorno");
  }
  return base;
}

function buildNonfictionReflectionPrompts(variant: ExpressScenarioVariant): string[] {
  const prompts = [
    "Cosa stai evitando di ammettere sul costo del blocco?",
    "Quale piccola vittoria potresti ottenere entro domani?",
    "Chi beneficerebbe se tu cambiassi questo pattern?",
    "Quale credenza limitante suona più vera della realtà?",
  ];
  if (variant !== "safe") {
    prompts.push("Quale versione di te emerge se il problema non fosse più un'identità?");
  }
  return prompts;
}

function buildNonfictionCharacters(
  idealReader: string,
  readerProblem: string,
  transformationPromise: string,
): ForgeCharacter[] {
  return [
    {
      id: "express-reader-archetype",
      role: "protagonist",
      name: "Lettore ideale",
      wound: readerProblem,
      fear: "Fallire di nuovo e confermare la narrativa limitante",
      desire: transformationPromise.slice(0, 120),
      contradiction: "Vuole cambiare ma teme di perdere ciò che lo protegge",
      obsession: "Trovare una via praticabile fuori dal blocco",
      secret: "Sa già cosa dovrebbe fare — ma non si fida abbastanza",
      arc: "Da consapevolezza del problema a azione sostenuta e identità rinnovata",
      vulnerability: idealReader,
      dominantFlaw: "Confonde prudenza e paralisi",
    },
    {
      id: "express-inner-obstacle",
      role: "antagonist",
      name: "Ostacolo interno",
      wound: "Paura del fallimento radicata in esperienze passate",
      fear: "Esporsi e risultare inadeguato",
      desire: "Mantenere il controllo evitando il rischio",
      contradiction: "Protegge ma imprigiona",
      obsession: "Evitare il disagio a ogni costo",
      secret: "Il blocco è servito come scudo — ora non serve più",
      arc: "Da voce critica dominante a segnale da ascoltare e integrare",
    },
  ];
}


function buildNonfictionVariantCopy(input: ExpressForgeInput, variant: ExpressScenarioVariant): {
  centralConflict?: string;
  stakes?: string;
  endingDirection?: string;
  finalEmotion?: string;
  commercialPitch?: string;
} {
  const theme = String(input.ideaSeed || input.genre || "crescita personale").trim() || "crescita personale";

  if (variant === "bold") {
    return {
      centralConflict: `Il lettore vuole cambiare, ma continua a rimandare perché ${theme} sembra troppo grande da affrontare.`,
      stakes: "Restare fermi significa perdere fiducia, tempo e direzione.",
      endingDirection: "Il lettore chiude il percorso con una prima pratica concreta già avviata.",
      finalEmotion: "fiducia lucida, non euforia finta",
      commercialPitch: `Un metodo concreto per trasformare ${theme} in azioni quotidiane misurabili.`,
    };
  }

  if (variant === "commercial") {
    return {
      centralConflict: `Trasformare ${theme} da problema confuso a percorso pratico e misurabile.`,
      stakes: "Senza un sistema semplice, il lettore ricade nei vecchi schemi.",
      endingDirection: "Il lettore ottiene una mappa ripetibile, applicabile anche dopo l'ultima pagina.",
      finalEmotion: "chiarezza, controllo, sollievo operativo",
      commercialPitch: `Guida pratica a ${theme}: strumenti semplici, esempi e progressione reale.`,
    };
  }

  return {
    centralConflict: `Capire ${theme} senza perdersi in teoria, colpa o motivazione vuota.`,
    stakes: "Il rischio è confondere ispirazione momentanea con cambiamento reale.",
    endingDirection: "Dal blocco alla prima azione concreta, sostenibile e verificabile.",
    finalEmotion: "calma, direzione, possibilità",
    commercialPitch: `Un percorso chiaro per affrontare ${theme} senza promesse miracolose.`,
  };
}

function buildNonfictionExpressPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
): CompleteExpressBookPackage {
  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META[input.genre.toLowerCase()] ?? {
    subgenre: input.genre,
    normalizedGenre: input.genre,
  };
  const seed = ideaCore(input);
  const { readerProblem, transformationPromise, theme } = parseNonfictionSeed(seed);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);
  const methodFramework =
    variant === "bold"
      ? "Metodo ARC: Awareness → Reframe → Commitment → Integration"
      : variant === "commercial"
        ? "Framework 4D: Diagnosi, Decostruzione, Disciplina, Direzione"
        : "Percorso 3P: Problema, Pratica, Progresso misurabile";
  const idealReader =
    /business|manuale|manual/i.test(input.genre)
      ? "Professionisti e imprenditori che vogliono risultati concreti senza teoria vuota"
      : "Adulti 25–50 che cercano chiarezza, strumenti pratici e un percorso sostenibile";
  const exercises = buildNonfictionExercises(seed, variant);
  const reflectionPrompts = buildNonfictionReflectionPrompts(variant);
  const title = buildNonfictionTitle(input, variant, theme);
  const subtitle = buildNonfictionSubtitle(input, variant, transformationPromise);
  const editorialSynopsis = buildNonfictionEditorialSynopsis(
    input,
    variant,
    readerProblem,
    transformationPromise,
    methodFramework,
  );
  const hook =
    variant === "commercial"
      ? `Se ${readerProblem.toLowerCase()}, questo metodo ti guida passo passo — senza motivazione vuota.`
      : `Non è un altro libro di teoria: è un percorso per ${transformationPromise.slice(0, 80).toLowerCase()}…`;
  const marketPromise = `${transformationPromise} Con tono ${input.tone}, esercizi applicabili e capitoli progressivi che trasformano insight in abitudini.`;
  const centralConflict = `${readerProblem} vs la versione di sé che il lettore vuole diventare`;
  const emotionalWound = readerProblem;
  const desire = transformationPromise;
  const fear = "Investire tempo ed energia senza ottenere cambiamento reale";
  const stakes = "Identità, autostima, relazioni e risultati concreti nella vita quotidiana";
  const endingDirection =
    variant === "bold"
      ? "Il lettore chiude con identità rinnovata, piano d'azione e senso profondo di agency"
      : "Il lettore chiude con strumenti, chiarezza e primi risultati misurabili";
  const finalEmotion =
    variant === "bold" ? "Empowerment profondo e senso di direzione" : "Speranza pratica e momentum";
  const midpoint = "Il framework diventa operativo: il lettore applica il primo ciclo completo del metodo";
  const climax = "Integrazione: il lettore supera la resistenza interna con accountability e celebrazione";
  const chapterBlueprintSeeds = buildNonfictionChapterSeeds(chapterCount, variant, methodFramework);
  const partial = { hook, midpoint, climax, endingDirection, finalEmotion };
  const keyScenes = buildKeyScenes(partial).map((s, i) =>
    i === 0
      ? { ...s, beat: hook, stakes: "Il lettore riconosce il proprio blocco e accetta la promessa" }
      : i === 3
        ? { ...s, beat: endingDirection, stakes: finalEmotion }
        : s,
  );
  const characters = buildNonfictionCharacters(idealReader, readerProblem, transformationPromise);
  const storyRoom: StoryRoomState = {
    scenes: keyScenes.map((s, i) => ({
      id: `express-nf-scene-${i}`,
      role: s.role,
      beat: s.beat,
      stakes: s.stakes,
    })),
    arcBeats: [
      { id: "arc-1", act: "setup", label: "Diagnosi", change: "Il lettore riconosce il problema e la promessa" },
      { id: "arc-2", act: "pressure", label: "Pratica", change: "Esercizi e framework aumentano agency" },
      { id: "arc-3", act: "break", label: "Resistenza", change: midpoint },
      { id: "arc-4", act: "finale", label: "Integrazione", change: endingDirection },
    ],
    ending: {
      tone: input.tone,
      protagonistFate: endingDirection,
      readerFeeling: finalEmotion,
      irreversibleChoice: climax,
    },
  };
  const storyFuture: StoryFutureState = {
    endingTone: input.tone,
    lastPageFeeling: finalEmotion,
    hopeOrDread: "hope",
  };
  const bookPromises: BookPromises = {
    emotional: [transformationPromise],
    relationship: [],
    plot: [methodFramework, ...exercises.slice(0, 2)],
    character: [`Trasformazione del lettore: ${readerProblem} → ${finalEmotion}`],
    scene: reflectionPrompts,
  };

  const variantCopy = buildNonfictionVariantCopy(input, variant);

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook,
    logline: `${readerProblem.slice(0, 100)} → ${transformationPromise.slice(0, 80)}…`,
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: idealReader,
    marketPromise,
    protagonist: idealReader,
    antagonistOrLoveInterest: "Ostacoli interni: paura, procrastinazione, narrativa limitante",
    secondaryCharacters: ["Mentor implicito (voce autoriale)", "Comunità o accountability partner"],
    setting: "Contesto quotidiano del lettore — lavoro, relazioni, abitudini",
    atmosphere: `${input.tone}, chiaro, empatico, orientato all'azione`,
    centralConflict: variantCopy.centralConflict ?? centralConflict,
    emotionalWound,
    desire,
    fear,
    stakes: variantCopy.stakes ?? stakes,
    moralBoundary: "Niente promesse miracle, niente colpe al lettore, niente consigli medici o legali non qualificati",
    antiDriftRules: [
      `Mantieni il genere ${genreMeta.subgenre} e il tono ${input.tone}`,
      "Ogni capitolo deve avanzare metodo, esercizio o integrazione",
      "Non trasformare il self-help in narrativa fiction",
      "Il finale deve pagare la promessa di trasformazione del setup",
    ],
    structurePreference: `${chapterCount} capitoli · ${input.length === "breve" ? "guida rapida" : input.length === "epico" || input.length === "pro" ? "programma con esercizi" : "metodo progressivo"}`,
    chapterCount,
    subchaptersEnabled: input.length === "epico" || input.length === "pro" || input.length === "lungo",
    chapterBlueprintSeeds,
    keyScenes,
    midpoint,
    climax,
    endingDirection: variantCopy.endingDirection ?? endingDirection,
    finalEmotion: variantCopy.finalEmotion ?? finalEmotion,
    frontMatter: "Prefazione — perché questo metodo · Come usare il libro · Nota dell'autore",
    backMatter: "Workbook sintetico · Risorse consigliate · Ringraziamenti · Prossimi passi",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: variantCopy.commercialPitch ?? meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells: `${meta.pitch} — promessa chiara, problema riconoscibile, esercizi concreti`,
    readerProblem,
    transformationPromise,
    methodFramework,
    exercises,
    reflectionPrompts,
    idealReader,
    characters,
    storyRoom,
    storyFuture,
    bookPromises,
    blueprintReadiness: "complete",
  };
}

function buildCookbookExpressPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
): CompleteExpressBookPackage {
  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META.cookbook;
  const seed = ideaCore(input);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);
  const theme = seed.split(/[.!?…]/)[0]?.trim() || "cucina pratica";
  const title = input.title?.trim() || `Ricettario: ${theme.slice(0, 36)}`;
  const subtitle =
    input.subtitle?.trim() ||
    (variant === "commercial"
      ? "Ricette, ingredienti, tecniche e menu pronti"
      : "Ricette testate con tempi, dosi e varianti");
  const methodFramework = "Struttura RITM: Ricetta, Ingredienti, Tecnica, Menu";
  const hook = `Dal mercato alla tavola: ${theme.toLowerCase()} con ricette ripetibili e tecniche chiare.`;
  const editorialSynopsis =
    `${seed || subtitle} Ricettario pratico in ${chapterCount} sezioni con Ingredienti precisi, Ricette passo-passo, Tecniche fondamentali e Menu completi. ` +
    "Nessuna deriva narrativa o filosofica: solo cucina applicabile, varianti e servizio.";
  const marketPromise = editorialSynopsis.slice(0, 220);
  const cookbookArc = [
    "Ingredienti base",
    "Tecniche fondamentali",
    "Ricette rapide",
    "Ricette complete",
    "Menu settimanali",
    "Varianti e sostituzioni",
    "Errori comuni",
    "Servizio e impiattamento",
  ];
  const chapterBlueprintSeeds = buildFormatChapterSeeds(chapterCount, cookbookArc, variant, "Sezione ricettario").map(
    (chapter, i) => ({
      ...chapter,
      title: `Sezione ${i + 1} — ${cookbookArc[i % cookbookArc.length]}`,
      summary: "Ingredienti, Ricette, Tecniche e menu operativi con tempi e porzioni.",
      goal: "Far replicare il risultato al lettore in cucina.",
    }),
  );
  const partial = {
    hook,
    midpoint: "Le tecniche base diventano ricette complete con varianti.",
    climax: "Composizione di menu completi con timing e servizio.",
    endingDirection: "Il lettore chiude con menu replicabili e autonomia in cucina.",
    finalEmotion: "Fiducia operativa ai fornelli",
  };
  const keyScenes = buildKeyScenes(partial);

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook,
    logline: hook,
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: "Lettori che vogliono cucinare ricette affidabili con tecniche chiare",
    marketPromise,
    protagonist: "Lettore-cuoco",
    antagonistOrLoveInterest: "Errori tecnici e confusione in cucina",
    secondaryCharacters: [],
    setting: "Cucina domestica",
    atmosphere: `${input.tone}, pratico, sensoriale, preciso`,
    centralConflict: `Trasformare ${theme.toLowerCase()} in ricette ripetibili e menu concreti`,
    emotionalWound: `Incertezza su ${theme.toLowerCase()}`,
    desire: "Cucinare con sicurezza risultati costanti",
    fear: "Sprecare ingredienti senza ottenere il risultato",
    stakes: "Tempo, budget e qualità del risultato in tavola",
    moralBoundary: "Niente quantità vaghe, niente passaggi ambigui, niente derive narrative",
    antiDriftRules: [
      "Mantieni formato cookbook: Ingredienti, Ricette, Tecniche, Menu",
      "Niente Tradizione filosofica o Implicazione esistenziale",
      "Niente protagonista fiction, romance arc o plot twist",
    ],
    structurePreference: `${chapterCount} sezioni · ricettario con tecniche e menu`,
    chapterCount,
    subchaptersEnabled: true,
    chapterBlueprintSeeds,
    keyScenes,
    midpoint: partial.midpoint,
    climax: partial.climax,
    endingDirection: partial.endingDirection,
    finalEmotion: partial.finalEmotion,
    frontMatter: "Come usare il ricettario · Attrezzatura · Pantry essenziale",
    backMatter: "Conversioni · Sostituzioni · Indice ingredienti · Menu stagionali",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells: "Ricettario ad alta usabilità con schema Ingredienti/Ricette/Tecniche/Menu",
    readerProblem: `Difficoltà nel preparare ${theme.toLowerCase()} in modo affidabile`,
    transformationPromise: "Passare dall'improvvisazione a ricette replicabili con metodo.",
    methodFramework,
    exercises: ["Checklist mise en place", "Piano prep settimanale", "Scheda controllo tempi e porzioni"],
    reflectionPrompts: ["Quale tecnica vuoi padroneggiare questa settimana?"],
    idealReader: "Home cook che cerca ricette chiare e pratiche.",
    characters: [],
    storyRoom: {
      scenes: keyScenes.map((s, i) => ({ id: `express-cb-scene-${i}`, role: s.role, beat: s.beat, stakes: s.stakes })),
      arcBeats: [
        { id: "arc-1", act: "setup", label: "Fondamenti", change: "Ingredienti e basi" },
        { id: "arc-2", act: "pressure", label: "Tecnica", change: partial.midpoint },
        { id: "arc-4", act: "finale", label: "Menu", change: partial.endingDirection },
      ],
      ending: {
        tone: input.tone,
        protagonistFate: partial.endingDirection,
        readerFeeling: partial.finalEmotion,
        irreversibleChoice: partial.climax,
      },
    },
    storyFuture: {
      endingTone: input.tone,
      lastPageFeeling: partial.finalEmotion,
      hopeOrDread: "hope",
    },
    bookPromises: {
      emotional: [marketPromise],
      relationship: [],
      plot: [methodFramework, "Tecniche ripetibili", "Menu bilanciati"],
      character: ["Progressione del lettore-cuoco"],
      scene: chapterBlueprintSeeds.slice(0, 3).map((seedItem) => seedItem.title),
    },
    blueprintReadiness: "complete",
  };
}

function buildPoetryExpressPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
): CompleteExpressBookPackage {
  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META.poesia;
  const seed = ideaCore(input);
  const chapterCount = poetrySectionCountForInput(input);
  const poemEstimate = poetryPoemEstimateForInput(input);
  const language = normalizeLanguage(input.language);
  const rawTheme = seed.split(/[.!?…]/)[0]?.trim() || seed;
  const theme =
    normalizePoetryTheme(rawTheme) ||
    "voce, memoria e trasformazione emotiva";
  const toneLabel = normalizePoetryToneLabel(input.tone);
  const title =
    input.title?.trim()
      ? input.title.trim()
      : variant === "bold"
        ? `Cenere e luce: ${theme.slice(0, 30)}`
        : theme.slice(0, 40) || "Raccolta poetica";
  const subtitle = input.subtitle?.trim()
    ? input.subtitle.trim()
    : variant === "bold"
      ? "Voci che restano quando il resto svanisce"
      : seed.trim()
        ? `Una raccolta ${toneLabel} su ${theme.toLowerCase()}.`
        : "Una raccolta lirica costruita intorno alla voce, alla memoria e alla trasformazione emotiva.";
  const editorialSynopsis = `${seed || subtitle} Una raccolta poetica ${toneLabel} organizzata in ${chapterCount} sezioni e circa ${poemEstimate} poesie: immagini ricorrenti, silenzi, ritmo e una progressione emotiva che attraversa ${theme.toLowerCase()} senza trasformarsi in trama da romanzo.`;
  const hook = `Versi su ${theme.toLowerCase()} — voce ${toneLabel}, immagini nette, eco lunga.`;
  const marketPromise = editorialSynopsis.slice(0, 200);
  const partial = {
    hook,
    midpoint: "Svolta tematica al centro della raccolta",
    climax: "Sezione più intensa — immagine-sintesi",
    endingDirection: "Eco finale che restituisce luce o crepa aperta coerente con il tema",
    finalEmotion: variant === "bold" ? "Scossa lirica e silenzio" : "Malinconia luminosa",
  };
  const chapterBlueprintSeeds = buildNonfictionChapterSeeds(chapterCount, variant, "Arco poetico").map((c, i) => ({
    ...c,
    id: `express-po-ch-${i + 1}`,
    title: `Sezione ${i + 1} — ${["Origine", "Corpo", "Frattura", "Ritorno", "Eco", "Soglia", "Luce residua"][i % 7]}`,
    summary: `Sezione poetica dedicata a ${theme.toLowerCase()}: variazione di immagini, ritmo e voce.`,
    purpose: `Porta avanti l'arco emotivo della raccolta, non una trama da romanzo.`,
    goal: `Costruire una tappa della progressione poetica con immagini concrete e silenzi.`,
    conflict: "Tensione emotiva tra memoria, assenza e possibilità di nominare il dolore.",
    hook: `Immagine-soglia o verso memorabile per aprire la sezione ${i + 1}.`,
    expectedSetting: "Spazio lirico — città, corpo, memoria",
  }));
  const characters = buildNonfictionCharacters(
    "Lettori di poesia contemporanea",
    theme,
    "Attraversare il tema con nuove immagini",
  );
  const keyScenes = buildKeyScenes(partial);
  const storyRoom: StoryRoomState = {
    scenes: keyScenes.map((s, i) => ({ id: `express-po-scene-${i}`, role: s.role, beat: s.beat, stakes: s.stakes })),
    arcBeats: [
      { id: "arc-1", act: "setup", label: "Apertura", change: "Voce e tema" },
      { id: "arc-2", act: "pressure", label: "Intensità", change: partial.midpoint },
      { id: "arc-4", act: "finale", label: "Eco finale", change: partial.endingDirection },
    ],
    ending: {
      tone: toneLabel,
      protagonistFate: partial.endingDirection,
      readerFeeling: partial.finalEmotion,
      irreversibleChoice: partial.climax,
    },
  };

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook,
    logline: seed.slice(0, 120),
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: "Lettori di poesia contemporanea e lirica accessibile",
    marketPromise,
    protagonist: `Voce poetica — ${toneLabel}`,
    antagonistOrLoveInterest: "Silenzio, distanza, assenza",
    secondaryCharacters: [],
    setting: "Spazi lirici — città, corpo, memoria",
    atmosphere: `${toneLabel}, visiva, sensoriale`,
    centralConflict: `Tensione emotiva: ${theme} contro ciò che resta indicibile`,
    emotionalWound: theme,
    desire: "Dare forma al tema attraverso immagini",
    fear: "Ripetizione e cliché lirici",
    stakes: "Autenticità della voce e impatto dell'immagine",
    moralBoundary: "Niente pastiche gratuiti, niente pathos forzato",
    antiDriftRules: [
      `Mantieni tono ${toneLabel} e coerenza tematica`,
      "Non introdurre forced proximity, love interest pericolosi, baci-trappola o payoff romantici se l'utente ha chiesto poesia.",
      "Struttura la raccolta in sezioni poetiche, non in capitoli con cliffhanger da romanzo.",
    ],
    structurePreference: `${chapterCount} sezioni poetiche · circa ${poemEstimate} poesie`,
    chapterCount,
    subchaptersEnabled: false,
    chapterBlueprintSeeds,
    keyScenes,
    midpoint: partial.midpoint,
    climax: partial.climax,
    endingDirection: partial.endingDirection,
    finalEmotion: partial.finalEmotion,
    frontMatter: "Nota sulla raccolta · Dedica",
    backMatter: "Ringraziamenti · Note sui testi",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells: meta.pitch,
    characters,
    storyRoom,
    storyFuture: { endingTone: toneLabel, lastPageFeeling: partial.finalEmotion, hopeOrDread: "hope" },
    bookPromises: {
      emotional: [marketPromise],
      relationship: [],
      plot: [`Arco poetico: ${theme}`],
      character: [`Voce ${toneLabel}`],
      scene: keyScenes.map((s) => s.beat),
    },
    blueprintReadiness: "complete",
  };
}

function buildFormatChapterSeeds(
  count: number,
  labels: string[],
  variant: ExpressScenarioVariant,
  purposePrefix: string,
): ChapterBlueprintSeed[] {
  return Array.from({ length: count }, (_, i) => {
    const title = labels[i % labels.length] ?? `Sezione ${i + 1}`;
    return {
      id: `express-fmt-ch-${i + 1}`,
      chapter: i + 1,
      title,
      summary: `${purposePrefix}: ${title.toLowerCase()}.`,
      purpose: purposePrefix,
      goal: `Completare la tappa ${i + 1} con chiarezza e continuità.`,
      conflict: variant === "bold" ? "Resistenza interna e verità difficile da nominare" : "Gap tra intenzione e pratica",
      hook: `Apertura operativa per ${title.toLowerCase()}.`,
      expectedSetting: "Contesto del lettore / autore",
      subchapters: [],
    };
  });
}

function buildMemoirExpressPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
): CompleteExpressBookPackage {
  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META.memoir;
  const seed = ideaCore(input);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);
  const lifeTheme = seed.split(/[.!?…]/)[0]?.trim() || "crisi, perdita e ricostruzione";
  const title = input.title?.trim() || (variant === "bold" ? "Ciò che resta dopo" : `Memorie di ${lifeTheme.slice(0, 32)}`);
  const subtitle =
    input.subtitle?.trim() ||
    (variant === "bold"
      ? "Un viaggio interiore senza maschere"
      : `Un memoir riflessivo su ${lifeTheme.toLowerCase()}.`);
  const editorialSynopsis = `${seed || subtitle} Un memoir strutturato in fasi di vita: origine, frattura, svolta e integrazione. Voce autentica, arco riflessivo e scene di memoria — non trama da romanzo né payoff romance.`;
  const hook = `Un memoir su ${lifeTheme.toLowerCase()} — memoria, verità e ricostruzione dell'identità.`;
  const marketPromise = editorialSynopsis.slice(0, 220);
  const centralConflict = `Riconciliare ${lifeTheme.toLowerCase()} con la versione di sé che emerge dal racconto`;
  const emotionalWound = lifeTheme;
  const desire = "Dare forma alla propria storia senza tradire la verità vissuta";
  const fear = "Esporsi e scoprire che il passato non può essere riscritto";
  const stakes = "Identità, memoria, relazioni e senso di continuità";
  const endingDirection =
    variant === "bold"
      ? "Integrazione lucida: il passato resta, ma cambia il modo di portarlo"
      : "Chiusura riflessiva con senso di direzione e verità nominata";
  const finalEmotion = variant === "bold" ? "Catarsi sobria e eco lunga" : "Chiarezza emotiva e accettazione";
  const midpoint = "Svolta centrale: la frattura diventa punto di non ritorno nel racconto";
  const climax = "Confronto con la verità più scomoda del periodo narrato";
  const memoirArc = [
    "Origine e contesto",
    "Prima crepa",
    "Periodo di crisi",
    "Incontro decisivo",
    "Svolta interiore",
    "Perdita o limite",
    "Riconoscimento",
    "Ricostruzione",
    "Nuovo equilibrio",
    "Integrazione",
    "Eco finale",
    "Lettera al lettore",
  ];
  const chapterBlueprintSeeds = buildFormatChapterSeeds(
    chapterCount,
    memoirArc,
    variant,
    "Fase di vita nel memoir",
  );
  const partial = { hook, midpoint, climax, endingDirection, finalEmotion };
  const keyScenes = buildKeyScenes(partial).map((s, i) =>
    i === 0
      ? { ...s, beat: "Scena di apertura — memoria che ancora pesa", stakes: "Il lettore entra nel periodo vissuto" }
      : i === 3
        ? { ...s, beat: endingDirection, stakes: finalEmotion }
        : { ...s, beat: s.beat.replace(/conflitto|verità/i, "momento di memoria"), stakes: "Verità riflessiva, non cliffhanger narrativo" },
  );
  const storyRoom: StoryRoomState = {
    scenes: keyScenes.map((s, i) => ({
      id: `express-memoir-scene-${i}`,
      role: s.role,
      beat: s.beat,
      stakes: s.stakes,
    })),
    arcBeats: [
      { id: "arc-1", act: "setup", label: "Origine", change: "Contesto e voce del racconto" },
      { id: "arc-2", act: "pressure", label: "Frattura", change: midpoint },
      { id: "arc-4", act: "finale", label: "Integrazione", change: endingDirection },
    ],
    ending: {
      tone: input.tone,
      protagonistFate: endingDirection,
      readerFeeling: finalEmotion,
      irreversibleChoice: climax,
    },
  };

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook,
    logline: seed.slice(0, 120) || hook,
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: "Lettori di memoir e narrativa autobiografica riflessiva",
    marketPromise,
    protagonist: "Voce autoriale in prima persona",
    antagonistOrLoveInterest: "Passato, vergogna e narrativa limitante",
    secondaryCharacters: ["Figure del passato", "Alleato di fase", "Specchio critico"],
    setting: "Luoghi e periodi della vita reale raccontata",
    atmosphere: `${input.tone}, intimo, riflessivo, autentico`,
    centralConflict,
    emotionalWound,
    desire,
    fear,
    stakes,
    moralBoundary: "Niente invenzioni su fatti verificabili, niente payoff romance forzato",
    antiDriftRules: [
      "Mantieni il formato memoir: fasi di vita, non trama da romanzo",
      "Niente restauratrice, love interest o tropi dark romance",
      "Ogni capitolo avanza l'arco riflessivo, non un cliffhanger narrativo",
      "Il finale integra verità e memoria, non payoff romantico",
    ],
    structurePreference: `${chapterCount} capitoli · arco di vita riflessivo`,
    chapterCount,
    subchaptersEnabled: input.length === "epico" || input.length === "pro" || input.length === "lungo",
    chapterBlueprintSeeds,
    keyScenes,
    midpoint,
    climax,
    endingDirection,
    finalEmotion,
    frontMatter: "Nota dell'autore · Avvertenza su memoria e verità · Dediche",
    backMatter: "Ringraziamenti · Nota sul processo · Domande per il lettore",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells: "Memoir autentico con arco riflessivo riconoscibile e voce distintiva",
    reflectionPrompts: [
      "Quale verità stai evitando di nominare?",
      "Cosa è cambiato nel modo in cui racconti questa fase?",
      "Quale relazione o luogo ancora pesa di più?",
    ],
    characters: [],
    storyRoom,
    storyFuture: {
      endingTone: input.tone,
      lastPageFeeling: finalEmotion,
      hopeOrDread: variant === "bold" ? "dread" : "hope",
    },
    bookPromises: {
      emotional: [marketPromise],
      relationship: [],
      plot: memoirArc.slice(0, 4),
      character: ["Arco riflessivo della voce autoriale"],
      scene: keyScenes.map((s) => s.beat),
    },
    blueprintReadiness: "complete",
  };
}

function buildWorkbookExpressPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
): CompleteExpressBookPackage {
  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META.workbook;
  const seed = ideaCore(input);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);
  const theme = seed.split(/[.!?…]/)[0]?.trim() || "crescita personale operativa";
  const methodFramework =
    variant === "bold"
      ? "Tracker ARC: Awareness → Routine → Checkpoint"
      : variant === "commercial"
        ? "Framework 4S: Setup, Scheda, Svolgimento, Sintesi"
        : "Percorso 3T: Tema, Task, Tracciamento";
  const exercises = buildNonfictionExercises(seed, variant);
  const title = input.title?.trim() || `Workbook: ${theme.slice(0, 36)}`;
  const subtitle =
    input.subtitle?.trim() ||
    (variant === "commercial"
      ? "Esercizi, tracker e progressione settimanale"
      : "Quaderno operativo con schede e checkpoint");
  const editorialSynopsis = `${seed || subtitle} Workbook pratico con moduli, esercizi guidati, tracker di progressione e checkpoint misurabili — nessuna trama narrativa.`;
  const hook = `Workbook operativo su ${theme.toLowerCase()} — esercizi, tracker e progressione concreta.`;
  const marketPromise = editorialSynopsis.slice(0, 220);
  const workbookArc = [
    "Diagnosi iniziale",
    "Setup e tracker",
    "Modulo 1 — esercizi base",
    "Checkpoint settimana 1",
    "Modulo 2 — pratica guidata",
    "Scheda operativa",
    "Checkpoint intermedio",
    "Modulo 3 — consolidamento",
    "Tracker avanzato",
    "Revisione risultati",
    "Piano di mantenimento",
    "Chiusura e prossimi passi",
  ];
  const chapterBlueprintSeeds = buildFormatChapterSeeds(
    chapterCount,
    workbookArc,
    variant,
    "Modulo workbook",
  );
  const partial = {
    hook,
    midpoint: "Checkpoint intermedio: il lettore misura progressi con tracker e scheda",
    climax: "Integrazione: routine sostenibile e piano di mantenimento",
    endingDirection: "Il lettore chiude con tracker compilato e prossima azione pianificata",
    finalEmotion: "Agency operativa e chiarezza",
  };
  const keyScenes = buildKeyScenes(partial);

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook,
    logline: hook,
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: "Lettori che vogliono risultati pratici con esercizi e tracker",
    marketPromise,
    protagonist: "Lettore-operatore del workbook",
    antagonistOrLoveInterest: "Procrastinazione e abitudini che sabotano la pratica",
    secondaryCharacters: [],
    setting: "Contesto quotidiano del lettore — casa, lavoro, routine",
    atmosphere: `${input.tone}, operativo, chiaro, orientato all'azione`,
    centralConflict: `Trasformare ${theme.toLowerCase()} da intenzione a pratica tracciata`,
    emotionalWound: `Blocco su ${theme.toLowerCase()}`,
    desire: "Avanzare con esercizi misurabili e tracker visibili",
    fear: "Compilare schede senza cambiare comportamento reale",
    stakes: "Tempo, disciplina e risultati concreti",
    moralBoundary: "Niente promesse miracle; esercizi realistici e tracciabili",
    antiDriftRules: [
      "Mantieni il formato workbook: esercizi, tracker, checkpoint",
      "Niente protagonista fiction, love interest o scene narrative",
      "Ogni capitolo include task operativo o scheda",
      "Il finale chiude con piano di mantenimento misurabile",
    ],
    structurePreference: `${chapterCount} moduli · workbook con tracker`,
    chapterCount,
    subchaptersEnabled: true,
    chapterBlueprintSeeds,
    keyScenes,
    midpoint: partial.midpoint,
    climax: partial.climax,
    endingDirection: partial.endingDirection,
    finalEmotion: partial.finalEmotion,
    frontMatter: "Come usare il workbook · Legenda tracker · Nota dell'autore",
    backMatter: "Schede ripetibili · Tracker sintetico · Risorse",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells: "Workbook con progressione chiara, esercizi e tracker — facile da posizionare",
    methodFramework,
    exercises,
    reflectionPrompts: buildNonfictionReflectionPrompts(variant),
    idealReader: "Adulti che vogliono strumenti pratici, non teoria",
    characters: [],
    storyRoom: {
      scenes: keyScenes.map((s, i) => ({
        id: `express-wb-scene-${i}`,
        role: s.role,
        beat: s.beat,
        stakes: s.stakes,
      })),
      arcBeats: [
        { id: "arc-1", act: "setup", label: "Setup", change: "Diagnosi e tracker iniziale" },
        { id: "arc-2", act: "pressure", label: "Pratica", change: partial.midpoint },
        { id: "arc-4", act: "finale", label: "Mantenimento", change: partial.endingDirection },
      ],
      ending: {
        tone: input.tone,
        protagonistFate: partial.endingDirection,
        readerFeeling: partial.finalEmotion,
        irreversibleChoice: partial.climax,
      },
    },
    storyFuture: {
      endingTone: input.tone,
      lastPageFeeling: partial.finalEmotion,
      hopeOrDread: "hope",
    },
    bookPromises: {
      emotional: [marketPromise],
      relationship: [],
      plot: [methodFramework, ...exercises.slice(0, 2)],
      character: ["Progressione del lettore via tracker"],
      scene: exercises.slice(0, 3),
    },
    blueprintReadiness: "complete",
  };
}

function buildStudyMaterialExpressPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant,
): CompleteExpressBookPackage {
  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META.study_material;
  const seed = ideaCore(input);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);
  const subject = seed.split(/[.!?…]/)[0]?.trim() || "materia da apprendere";
  const methodFramework =
    variant === "bold"
      ? "Moduli MLO: Modulo → Learning objectives → Output"
      : variant === "commercial"
        ? "Struttura LEAP: Learn, Example, Apply, Practice"
        : "Schema 3O: Obiettivo, Spiegazione, Verifica";
  const title = input.title?.trim() || `Materiale di studio: ${subject.slice(0, 36)}`;
  const subtitle =
    input.subtitle?.trim() ||
    (variant === "commercial"
      ? "Moduli, obiettivi e verifiche per modulo"
      : "Apprendimento strutturato con quiz e sintesi");
  const editorialSynopsis = `${seed || subtitle} Materiale di studio organizzato in moduli con obiettivi di apprendimento, esempi, quiz e sintesi — senza trama narrativa.`;
  const hook = `Materiale di studio su ${subject.toLowerCase()} — moduli chiari e obiettivi misurabili.`;
  const marketPromise = editorialSynopsis.slice(0, 220);
  const studyArc = [
    "Introduzione e obiettivi generali",
    "Modulo 1 — fondamenti",
    "Esempi guidati",
    "Quiz modulo 1",
    "Modulo 2 — applicazione",
    "Esercizi di verifica",
    "Sintesi intermedia",
    "Modulo 3 — casi pratici",
    "Checklist di ripasso",
    "Simulazione d'esame",
    "Errori frequenti",
    "Recap finale",
  ];
  const chapterBlueprintSeeds = buildFormatChapterSeeds(
    chapterCount,
    studyArc,
    variant,
    "Modulo di studio",
  ).map((chapter, i) => ({
    ...chapter,
    goal: `Obiettivo di apprendimento modulo ${i + 1}: comprensione e verifica`,
    summary: `Modulo ${i + 1} con obiettivi, spiegazione, esempi e verifica.`,
  }));
  const partial = {
    hook,
    midpoint: "Verifica intermedia: il lettore testa comprensione con quiz e sintesi",
    climax: "Simulazione finale e recap degli obiettivi",
    endingDirection: "Il lettore chiude con checklist di ripasso e autovalutazione",
    finalEmotion: "Sicurezza operativa sul contenuto",
  };
  const keyScenes = buildKeyScenes(partial);

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook,
    logline: hook,
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: "Studenti e professionisti che preparano esami o certificazioni",
    marketPromise,
    protagonist: "Studente / professionista in formazione",
    antagonistOrLoveInterest: "Gap di comprensione e overload informativo",
    secondaryCharacters: [],
    setting: "Contesto formativo — corso, esame, aggiornamento professionale",
    atmosphere: `${input.tone}, chiaro, didattico, progressivo`,
    centralConflict: `Padroneggiare ${subject.toLowerCase()} con moduli verificabili`,
    emotionalWound: `Incertezza su ${subject.toLowerCase()}`,
    desire: "Comprendere, applicare e superare la verifica",
    fear: "Studiare senza sapere se si è pronti",
    stakes: "Esito dell'esame, competenza professionale, tempo investito",
    moralBoundary: "Niente contenuti inventati su normative o procedure critiche",
    antiDriftRules: [
      "Mantieni il formato study material: moduli e obiettivi di apprendimento",
      "Niente trama fiction, love interest o scene narrative",
      "Ogni modulo chiude con verifica o sintesi",
      "Il finale offre recap e autovalutazione",
    ],
    structurePreference: `${chapterCount} moduli · materiale di studio`,
    chapterCount,
    subchaptersEnabled: true,
    chapterBlueprintSeeds,
    keyScenes,
    midpoint: partial.midpoint,
    climax: partial.climax,
    endingDirection: partial.endingDirection,
    finalEmotion: partial.finalEmotion,
    frontMatter: "Come usare il materiale · Obiettivi generali · Prerequisiti",
    backMatter: "Glossario · Checklist finale · Risorse",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells: "Materiale strutturato con obiettivi chiari e verifiche — adatto a formazione ed esami",
    methodFramework,
    exercises: [
      "Quiz a risposta multipla per modulo",
      "Esercizi di applicazione guidata",
      "Checklist di autovalutazione finale",
      "Sintesi operativa per ripasso veloce",
    ],
    reflectionPrompts: [
      "Quali obiettivi del modulo hai già raggiunto?",
      "Dove serve un secondo passaggio di studio?",
      "Quali errori frequenti devi evitare in verifica?",
    ],
    idealReader: "Chi prepara esami o certificazioni con poco tempo",
    characters: [],
    storyRoom: {
      scenes: keyScenes.map((s, i) => ({
        id: `express-study-scene-${i}`,
        role: s.role,
        beat: s.beat,
        stakes: s.stakes,
      })),
      arcBeats: [
        { id: "arc-1", act: "setup", label: "Fondamenti", change: "Obiettivi e modulo 1" },
        { id: "arc-2", act: "pressure", label: "Verifica", change: partial.midpoint },
        { id: "arc-4", act: "finale", label: "Recap", change: partial.endingDirection },
      ],
      ending: {
        tone: input.tone,
        protagonistFate: partial.endingDirection,
        readerFeeling: partial.finalEmotion,
        irreversibleChoice: partial.climax,
      },
    },
    storyFuture: {
      endingTone: input.tone,
      lastPageFeeling: partial.finalEmotion,
      hopeOrDread: "hope",
    },
    bookPromises: {
      emotional: [marketPromise],
      relationship: [],
      plot: [methodFramework, "Obiettivi di apprendimento per modulo"],
      character: ["Progressione dello studente"],
      scene: studyArc.slice(0, 4),
    },
    blueprintReadiness: "complete",
  };
}

export function buildCompleteExpressBookPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant = "commercial",
): CompleteExpressBookPackage {
  if (isCookbookGenre(input.genre) || input.bookFormat === "cookbook") {
    return buildCookbookExpressPackage(input, variant);
  }
  if (isMemoirExpressGenre(input.genre) || input.bookFormat === "memoir") {
    return buildMemoirExpressPackage(input, variant);
  }
  if (isWorkbookExpressGenre(input.genre) || input.bookFormat === "workbook") {
    return buildWorkbookExpressPackage(input, variant);
  }
  if (isStudyMaterialExpressGenre(input.genre) || input.bookFormat === "study_material") {
    return buildStudyMaterialExpressPackage(input, variant);
  }
  if (isNonfictionExpressGenre(input.genre)) {
    return buildNonfictionExpressPackage(input, variant);
  }
  if (isPoetryExpressGenre(input.genre)) {
    return buildPoetryExpressPackage(input, variant);
  }

  const meta = getExpressVariantMeta(input.genre, variant);
  const seed = ideaCore(input);
  const isSupernaturalThriller =
    hasSupernaturalThrillerSignals(seed) && isThrillerGenre(input.genre);
  const genreMeta = isSupernaturalThriller
    ? { subgenre: "supernatural psychological thriller", normalizedGenre: "thriller" }
    : GENRE_META[input.genre.toLowerCase()] ?? {
        subgenre: input.genre,
        normalizedGenre: input.genre,
      };
  const lead = parseProtagonistLabel(seed, input.genre);
  const counterpart = parseCounterpart(input.genre, variant, seed);
  const setting = parseSetting(seed, input.genre);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);

  const emotionalWound = isDarkRomance(input.genre)
    ? "Colpa per la morte della sorella e bisogno di controllo come unica difesa"
    : isFriendsToLoversGenre(input.genre)
      ? "Paura di perdere l'amicizia più importante trasformandola in qualcosa di irreversibile"
      : isEnemiesToLoversGenre(input.genre)
        ? "Ferita da tradimento passato che le fa confondere attrito con protezione"
        : isScifiGenre(input.genre)
          ? "Trauma da un fallimento di missione che la lega al protocollo più di quanto le faccia bene"
          : isFantasyGenre(input.genre)
      ? "Eredità magica rifiutata e paura che il potere riveli una parte mostruosa di sé"
      : isHorrorGenre(input.genre)
        ? "Memoria distorta e colpa legata a un luogo che non ha mai lasciato andarla"
        : "Ferita antica che lega identità, desiderio e paura di essere tradita di nuovo";
  const desire = isDarkRomance(input.genre)
    ? "Scoprire la verità sull'incendio senza perdere se stessa"
    : isFriendsToLoversGenre(input.genre)
      ? "Capire se l'amicizia può diventare amore senza distruggere ciò che le tiene in piedi"
      : isEnemiesToLoversGenre(input.genre)
        ? "Vincere il conflitto senza cedere al desiderio che la tradisce"
        : isScifiGenre(input.genre)
          ? "Salvare la missione e la colonia senza ripetere l'errore del passato"
          : isFantasyGenre(input.genre)
      ? "Spezzare la maledizione del regno senza diventare lo strumento della corona"
      : isHorrorGenre(input.genre)
        ? "Capire cosa infesta il luogo prima che la minaccia la scelga definitivamente"
        : "Trasformazione concreta e relazione che non la annulli";
  const fear = isDarkRomance(input.genre)
    ? "Ricordare troppo — e desiderare chi dovrebbe temere"
    : isFantasyGenre(input.genre)
      ? "Usare la magia e scoprire che il prezzo richiesto è la propria identità"
      : isHorrorGenre(input.genre)
        ? "Perdere il confine tra ricordo, presenza e realtà"
        : "Perdere controllo, verità e ciò che rende la vita degna di essere vissuta";
  const centralConflict = isSupernaturalThriller
    ? `${lead.name} riceve ogni notte ricordi dal futuro che annunciano la sua morte, mentre ${counterpart.name} e gli abitanti del paese stringono il cerchio tra profezia e panico`
    : isDarkRomance(input.genre)
    ? `${lead.name} cerca verità e giustizia, ma ${counterpart.name} le offre protezione solo finché non minaccia ciò che la casa nasconde`
    : isFantasyGenre(input.genre)
      ? `${lead.name} deve scegliere se reclamare un potere proibito per salvare il regno, mentre ${counterpart.name} custodisce una verità che può incoronarla o distruggerla`
      : isHorrorGenre(input.genre)
        ? `${lead.name} cerca la verità sepolta nel luogo, ma ${counterpart.name} la trascina sempre più dentro una presenza che non perdona`
        : `${lead.name} deve scegliere tra ciò che desidera e ciò che teme di perdere, mentre ${counterpart.name} amplifica ogni contraddizione`;
  const stakes = isDarkRomance(input.genre)
    ? "Memoria, identità, cuore — e la possibilità che amare significhi tradire i morti"
    : isFantasyGenre(input.genre)
      ? "Corona, magia, libertà del regno e identità della protagonista"
      : isHorrorGenre(input.genre)
        ? "Sanità mentale, identità, sopravvivenza e verità sepolta"
        : "Identità, relazioni e futuro — ciò che si perde non torna indietro";
  const marketPromise = resolveNarrativePromise(
    ideaCore(input),
    input.genre,
    isDarkRomance(input.genre)
    ? "Un dark romance claustrofobico dove colpa, desiderio e redenzione sporca si confondono, finché amare qualcuno significa scegliere se bruciare con lui o salvarsi dalle sue fiamme."
    : isFriendsToLoversGenre(input.genre)
      ? `Un romance ${input.tone} friends-to-lovers dove amicizia, prossimità e tensione emotiva costruiscono un payoff credibile — senza tropi dark romance.`
      : isEnemiesToLoversGenre(input.genre)
        ? `Un romance ${input.tone} enemies-to-lovers dove attrito, attrazione e conflitto emotivo si trasformano in relazione — senza deriva dark romance.`
        : isScifiGenre(input.genre)
          ? `Uno sci-fi ${input.tone} dove worldbuilding, tech stakes e dilemma morale costruiscono una promessa speculativa con payoff forte.`
          : isFantasyGenre(input.genre)
      ? `Un fantasy ${input.tone} dove magia, tradimento e costo del potere costruiscono una promessa epica con payoff emotivo.`
      : isHorrorGenre(input.genre)
        ? `Un horror ${input.tone} dove atmosfera, decadenza e paura crescente trasformano il luogo in minaccia viva e la verità in contagio.`
        : `Un ${input.genre} ${input.tone} che promette tensione emotiva, payoff memorabile e una storia che resta addosso dopo l'ultima pagina.`,
  );
  const hook = isSupernaturalThriller
    ? (() => {
        const time = extractTimeAnchor(seed);
        const timeClause = time ? ` alle ${time}` : "";
        return `Ogni notte${timeClause} ${lead.name} riceve una visione più precisa della precedente — e l'ultima mostra la sua morte nel paese che credeva di conoscere.`;
      })()
    : isDarkRomance(input.genre)
    ? `Tornare nella villa dove sua sorella è morta non era mai stato sicuro — ma scoprire che ${counterpart.name} la desidera è la forma più pericolosa di colpa.`
    : isFantasyGenre(input.genre)
      ? `${lead.name} scopre che la magia capace di salvare il regno è la stessa che può trasformarla nel suo prossimo tiranno.`
      : isHorrorGenre(input.genre)
        ? `${lead.name} entra in un luogo che non vuole essere ricordato — e ogni notte restituisce qualcosa che avrebbe dovuto restare sepolto.`
        : `${lead.name} credeva di controllare la storia. ${setting.split(",")[0]} le dimostra il contrario.`;
  const subtitle = input.subtitle?.trim()
    ? input.subtitle.trim()
    : isSupernaturalThriller
      ? buildSupernaturalThrillerSubtitle(seed, variant)
    : isFriendsToLoversGenre(input.genre) || isEnemiesToLoversGenre(input.genre) || isRomance(input.genre)
    ? variant === "bold"
      ? "Quando l'amicizia diventa confine — e il confine diventa desiderio"
      : "Quando la relazione cambia tutto — senza tornare indietro"
    : isDarkRomance(input.genre)
    ? variant === "bold"
      ? "Quando il desiderio brucia più forte della verità"
      : "Quando la verità è più pericolosa del fuoco"
    : `Un ${input.genre} ${input.tone} — promessa, tensione e payoff`;
  const title = defaultTitleForGenre(input, variant);
  const editorialSynopsis = buildGenreAwareEditorialSynopsis(input, variant, lead, counterpart, setting);
  const endingDirection = isDarkRomance(input.genre)
    ? variant === "bold"
      ? "Finale devastante: redenzione possibile solo attraverso una scelta che brucia qualcosa per sempre"
      : "Finale emotivo che paga la promessa — verità, desiderio e crepa aperta"
    : "Finale coerente con la promessa — trasformazione visibile e payoff emotivo";
  const finalEmotion =
    variant === "bold" ? "Catharsis intensa, crepa aperta, eco lunga" : "Soddisfazione emotiva e senso di completamento";
  const midpoint = isDarkRomance(input.genre)
    ? "La verità parziale sull'incendio / sul passato ribalta fiducia e desiderio"
    : isFantasyGenre(input.genre)
      ? "Rivelazione sul vero costo della magia e sul tradimento dietro la corona"
      : isThrillerGenre(input.genre)
        ? "La prova decisiva ribalta il sospetto e rende personale la minaccia"
        : isHorrorGenre(input.genre)
          ? "La presenza mostra la propria origine e lega la protagonista al luogo"
          : "Rivelazione centrale che ribalta obiettivo, fiducia e posta in gioco";
  const climax = isDarkRomance(input.genre)
    ? "Confronto nella casa — verità, possesso e scelta irreversibile"
    : isFantasyGenre(input.genre)
      ? "Scelta finale davanti al potere proibito — salvare il regno o conservare se stessa"
      : isThrillerGenre(input.genre)
        ? "Confronto finale con il colpevole e ribaltamento dell'ultima prova"
        : isHorrorGenre(input.genre)
          ? "Confronto con la presenza nel punto più malato del luogo"
          : "Confronto finale — verità, prezzo e scelta irreversibile";

  const partial = {
    emotionalWound,
    desire,
    fear,
    centralConflict,
    endingDirection,
    hook,
    midpoint,
    climax,
    finalEmotion,
  };

  const variantCopy = buildGenreAwareVariantCopy(
    input,
    variant,
    lead.name,
    counterpart.name,
    setting,
  );

  if (variantCopy.hook) partial.hook = variantCopy.hook;
  if (variantCopy.centralConflict) partial.centralConflict = variantCopy.centralConflict;
  if (variantCopy.endingDirection) partial.endingDirection = variantCopy.endingDirection;
  if (variantCopy.finalEmotion) partial.finalEmotion = variantCopy.finalEmotion;

  const characters = isSupernaturalThriller
    ? buildSupernaturalThrillerCharacters(lead, counterpart, partial)
    : buildCharacters(lead, counterpart, partial, input.genre);
  const chapterBlueprintSeeds = buildChapterSeeds(chapterCount, input.genre, variant, setting, ideaCore(input));
  const keyScenes = buildKeyScenes(partial);

  const storyRoom: StoryRoomState = {
    scenes: keyScenes.map((s, i) => ({
      id: `express-scene-${i}`,
      role: s.role,
      beat: s.beat,
      stakes: s.stakes,
    })),
    arcBeats: [
      { id: "arc-1", act: "setup", label: "Setup", change: "Il mondo ordinario cede al desiderio e al mistero" },
      { id: "arc-2", act: "pressure", label: "Pressione", change: "Confini e segreti aumentano la posta in gioco" },
      { id: "arc-3", act: "break", label: "Rottura", change: midpoint },
      { id: "arc-4", act: "finale", label: "Finale", change: endingDirection },
    ],
    ending: {
      tone: input.tone,
      protagonistFate: endingDirection,
      readerFeeling: finalEmotion,
      irreversibleChoice: climax,
    },
  };

  const storyFuture: StoryFutureState = {
    endingTone: input.tone,
    lastPageFeeling: finalEmotion,
    hopeOrDread: variant === "bold" ? "dread" : "hope",
  };

  const bookPromises: BookPromises = {
    emotional: [marketPromise],
    relationship: isRomance(input.genre) || isRomanceSubgenre(input.genre) || isDarkRomance(input.genre)
      ? [`Tensione tra ${lead.name} e ${counterpart.name} fino al payoff`]
      : [],
    plot: [centralConflict],
    character: [`Arco di ${lead.name}: da ferita a scelta consapevole`],
    scene: keyScenes.map((s) => s.beat),
  };

  return {
    id: `express-${variant}`,
    variant,
    label: meta.label,
    title,
    subtitle,
    hook: variantCopy.hook ?? hook,
    logline: `${lead.name} vs ${counterpart.name}: ${(variantCopy.centralConflict ?? centralConflict).slice(0, 120)}…`,
    editorialSynopsis: variantCopy.editorialSynopsis ?? editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: isDarkRomance(input.genre)
      ? "Lettrici 25–45 che cercano dark romance intenso, slow burn e payoff emotivo"
      : isFriendsToLoversGenre(input.genre) || isEnemiesToLoversGenre(input.genre)
        ? `Lettori di romance ${input.tone} attratti da payoff emotivo credibile e dinamica di coppia riconoscibile`
        : isScifiGenre(input.genre)
          ? `Lettori sci-fi attratti da worldbuilding, tech stakes e dilemmi morali ${input.tone}`
          : `Lettori di ${input.genre} attratti da tono ${input.tone} e storia ad alta posta in gioco`,
    marketPromise,
    protagonist: lead.name,
    antagonistOrLoveInterest: `${counterpart.name} — ${counterpart.role}`,
    secondaryCharacters: isSupernaturalThriller
      ? buildSupernaturalThrillerSecondaryCast()
      : isDarkRomance(input.genre)
      ? ["Sorella (memoria/assenza)", "Comunità locale che custodisce silenzi"]
      : isFantasyGenre(input.genre)
        ? ["Consiglio della corona", "Ordine dei maghi", "Popolo del regno"]
        : isThrillerGenre(input.genre)
          ? ["Testimone ambiguo", "Archivista", "Figura istituzionale corrotta"]
          : isHorrorGenre(input.genre)
            ? ["Presenza", "Vicino che sa troppo", "Voce nei muri"]
            : ["Alleato ambiguo", "Custode del segreto"],
    setting,
    atmosphere: `${input.tone}, claustrofobico, sensoriale, ${variant === "bold" ? "inquietante" : "magnetico"}`,
    centralConflict,
    emotionalWound,
    desire,
    fear,
    stakes,
    moralBoundary: "Niente consenso ambiguo gratuitamente, niente abuso romanticizzato, niente deus ex machina",
    antiDriftRules: [
      `Mantieni il genere ${genreMeta.subgenre} e il tono ${input.tone}`,
      isDarkRomance(input.genre)
        ? "Non trasformare il dark romance in fantasy o thriller generico"
        : isHorrorGenre(input.genre)
          ? "Non contaminare l'horror con tropi romance, slow burn o payoff emotivo da dark romance"
          : isFriendsToLoversGenre(input.genre) || isEnemiesToLoversGenre(input.genre)
            ? "Non contaminare il romance con tropi dark romance, villa o incendio se l'utente non li ha richiesti"
            : isScifiGenre(input.genre)
              ? "Non contaminare lo sci-fi con tropi fantasy medievale o dark romance"
              : `Non contaminare ${input.genre} con tropi dark romance se l'utente non li ha richiesti`,
      isHorrorGenre(input.genre)
        ? "Ogni capitolo deve aumentare inquietudine, minaccia o decadenza del luogo"
        : "Ogni capitolo deve aumentare desiderio, verità o posta in gioco",
      isHorrorGenre(input.genre)
        ? "Il finale deve pagare la promessa di paura e atmosfera del setup"
        : "Il finale deve pagare la promessa emotiva del setup",
    ],
    structurePreference: `${chapterCount} capitoli · ${input.length === "breve" ? "ritmo compatto" : "ritmo sostenuto"}`,
    chapterCount,
    subchaptersEnabled: input.length === "epico" || input.length === "pro" || input.length === "lungo",
    chapterBlueprintSeeds,
    keyScenes,
    midpoint,
    climax,
    endingDirection,
    finalEmotion,
    frontMatter: "Prefazione breve + dedica + nota dell'autore",
    backMatter: "Ringraziamenti + nota editoriale + teaser opzionale",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
    editorialRisks: [meta.risk],
    whyItSells:
      variantCopy.whyItSells ??
      (isDarkRomance(input.genre)
        ? "Dark romance con hook territoriale, segreto familiare e tensione slow burn ad alto engagement"
        : `${meta.pitch} — promessa chiara e personaggi con ferita riconoscibile`),
    characters,
    storyRoom,
    storyFuture,
    bookPromises,
    blueprintReadiness: "complete",
  };
}



function cleanExpressPersonName(value?: string): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+—\s+protagonista\s+segnat[oa]\s+dal\s+passato/gi, "")
    .replace(/\s+—\s+protagonista\b.*$/gi, "")
    .replace(/\s+—\s+personaggio\b.*$/gi, "")
    .replace(/\s+—\s+$/g, "")
    .trim();
}

function cleanExpressScenarioPeople(scenario: ExpressBookScenario): ExpressBookScenario {
  if (
    isNonfictionExpressGenre(scenario.genre) ||
    isPoetryExpressGenre(scenario.genre) ||
    isMemoirExpressGenre(scenario.genre) ||
    isWorkbookExpressGenre(scenario.genre) ||
    isStudyMaterialExpressGenre(scenario.genre)
  ) {
    return scenario;
  }

  const protagonist = cleanExpressPersonName(scenario.protagonist);
  const loveInterest = cleanExpressPersonName(scenario.antagonistOrLoveInterest);

  return {
    ...scenario,
    protagonist: protagonist || scenario.protagonist,
    antagonistOrLoveInterest: loveInterest || scenario.antagonistOrLoveInterest,
  };
}


function strengthenScenarioDivergence(
  scenario: ExpressBookScenario,
): ExpressBookScenario {
  const protagonist = cleanExpressPersonName(scenario.protagonist) || "la protagonista";
  const setting = scenario.setting || "un luogo pieno di segreti";

  if (
    isMemoirExpressGenre(scenario.genre) ||
    isWorkbookExpressGenre(scenario.genre) ||
    isStudyMaterialExpressGenre(scenario.genre)
  ) {
    return scenario;
  }

  if (isNonfictionExpressGenre(scenario.genre)) {
    if (scenario.variant === "safe") {
      return {
        ...scenario,
        hook: scenario.hook || "Un percorso chiaro e progressivo per ottenere una trasformazione concreta.",
        editorialSynopsis:
          "Una versione stabile e accessibile del libro: promessa chiara, passaggi ordinati, esempi concreti e progressione pensata per non perdere mai il lettore. L’obiettivo è rendere il cambiamento comprensibile, applicabile e credibile.",
        marketPromise:
          "Un libro pratico, leggibile e facile da posizionare per chi cerca chiarezza e risultati concreti.",
        editorialRisks: ["Meno sorprendente, ma più stabile e comprensibile."],
      };
    }

    if (scenario.variant === "commercial") {
      return {
        ...scenario,
        hook:
          "Un metodo diretto, vendibile e orientato al risultato, costruito per dare valore già dalle prime pagine.",
        editorialSynopsis:
          "Una versione più commerciale: promessa immediata, framework forte, esercizi brevi, esempi riconoscibili e capitoli pensati per creare momentum. Ogni sezione deve far percepire al lettore un avanzamento pratico e misurabile.",
        marketPromise:
          "Posizionamento più forte: beneficio chiaro, struttura ad alta conversione e promessa leggibile dallo scaffale digitale.",
        editorialRisks: ["Più vendibile e diretta, meno contemplativa."],
      };
    }

    return {
      ...scenario,
      hook:
        "Una versione più profonda e distintiva: non solo risolvere un problema, ma cambiare il modo in cui il lettore interpreta se stesso.",
      editorialSynopsis:
        "Una versione più audace e autoriale: meno manuale neutro, più viaggio trasformativo. Usa idee forti, domande scomode, passaggi memorabili e una voce più riconoscibile per lasciare un’impronta più profonda.",
      marketPromise:
        "Identità più memorabile, adatta a lettori che cercano una voce forte e non un manuale qualunque.",
      editorialRisks: ["Più rischioso e meno neutro, ma più riconoscibile."],
    };
  }

  if (isPoetryExpressGenre(scenario.genre)) {
    return scenario;
  }

  const isRomanceFiction =
    isRomance(scenario.genre) ||
    isDarkRomance(scenario.genre) ||
    isRomanceSubgenre(scenario.genre);

  if (!isRomanceFiction) {
    return scenario;
  }

  if (scenario.variant === "safe") {
    return {
      ...scenario,
      editorialSynopsis:
        `La versione più stabile del romanzo: ${protagonist} entra in una storia di desiderio, segreti e ferite antiche, ma il percorso resta emotivamente chiaro. Il mistero cresce gradualmente, la tensione non tradisce la promessa romantica e il finale offre un payoff intenso ma leggibile.`,
      centralConflict:
        `${protagonist} vuole scoprire la verità, ma ogni risposta la avvicina alla persona che potrebbe ferirla di più.`,
      emotionalWound:
        "Una ferita passata che rende difficile fidarsi, amare e lasciare andare il controllo.",
      stakes:
        scenario.stakes || "Verità, cuore, memoria e possibilità di ricominciare senza tradire il passato.",
      finalEmotion:
        "Soddisfazione emotiva, verità rivelata e chiusura romantica intensa.",
      whyItSells:
        "Versione stabile: trope chiari, promessa leggibile, tensione slow burn e payoff emotivo forte.",
      editorialRisks: ["Meno memorabile, ma più stabile sul mercato."],
    };
  }

  if (scenario.variant === "commercial") {
    return {
      ...scenario,
      hook:
        `Costretta a restare vicino all’uomo che dovrebbe temere, ${protagonist} scopre che ogni risposta pretende un prezzo — e ogni bacio può diventare una trappola.`,
      editorialSynopsis:
        `La versione più vendibile e bingeable: forced proximity, protezione pericolosa, desiderio negato, segreti rivelati a strati e cliffhanger di capitolo. Il lettore resta agganciato perché ogni scena promette una scoperta, una minaccia o un passo in più verso un amore sbagliato ma irresistibile.`,
      centralConflict:
        `${protagonist} deve fidarsi dell’uomo più pericoloso della storia per sopravvivere, ma ogni prova di protezione aumenta anche il suo potere su di lei.`,
      emotionalWound:
        "Paura di desiderare proprio ciò che potrebbe distruggerla, unita al bisogno di sentirsi finalmente scelta.",
      stakes:
        "Desiderio, controllo, verità, reputazione e sopravvivenza emotiva.",
      finalEmotion:
        "Payoff romantico ad alta tensione, con rivelazione forte e finale emotivamente appagante.",
      whyItSells:
        "Versione commerciale: trope forti, hook immediato, cliffhanger, protezione/possesso e alta bingeability.",
      editorialRisks: ["Più commerciale, meno sperimentale."],
    };
  }

  return {
    ...scenario,
    hook:
      "Il vero pericolo non è scoprire cosa è successo: è capire che l’uomo che la risveglia potrebbe essere parte della ferita che l’ha distrutta.",
    editorialSynopsis:
      `La versione più audace e memorabile: il romance diventa una zona morale instabile. La figura maschile non è solo protettiva e pericolosa: potrebbe essere colpevole, complice o legata in modo proibito alla ferita originaria. Il mistero non serve solo a risolvere un trauma, ma a costringere i personaggi a scegliere tra verità, desiderio e rovina.`,
    centralConflict:
      `${protagonist} deve decidere se la persona che la fa sentire viva è anche quella che ha contribuito a distruggere la sua famiglia.`,
    emotionalWound:
      "Una colpa che si trasforma in ossessione: amare potrebbe significare tradire i morti.",
    stakes:
      "Identità, memoria, desiderio, giustizia e possibilità di amare qualcuno senza assolverlo.",
    finalEmotion:
      "Catharsis intensa, crepa aperta, eco lunga.",
    whyItSells:
      "Versione distintiva: moralità ambigua, twist più forte, identità più memorabile e finale che resta addosso.",
    editorialRisks: ["Più rischioso, ma molto più riconoscibile."],
  };
}

function scenarioBodySignature(scenario: ExpressBookScenario): string {
  return [
    scenario.hook,
    scenario.editorialSynopsis,
    scenario.centralConflict,
    scenario.emotionalWound,
    scenario.stakes,
    scenario.finalEmotion,
    scenario.whyItSells,
    scenario.editorialRisks?.[0],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function enforceExpressScenarioDivergence(
  scenarios: ExpressBookScenario[],
): ExpressBookScenario[] {
  const next = scenarios.map((scenario) => cleanExpressScenarioPeople(strengthenScenarioDivergence(scenario)));
  const signatures = next.map(scenarioBodySignature);

  if (new Set(signatures).size === next.length) return next;

  return next.map((scenario, index) => ({
    ...scenario,
    hook: `${scenario.hook} ${
      index === 0
        ? "Versione stabile."
        : index === 1
          ? "Versione più vendibile."
          : "Versione più rischiosa."
    }`,
  }));
}


export function buildExpressBookScenarios(input: ExpressForgeInput): ExpressBookScenario[] {
  const sanitizedIdea = sanitizeUserConceptInput(input.ideaSeed || input.protagonistSeed || "");
  const dominance = resolveConceptDominance(sanitizedIdea, { genre: input.genre });
  const normalizedInput: ExpressForgeInput = {
    ...input,
    ideaSeed: sanitizedIdea,
    genre: dominance.genre || input.genre,
    tone:
      input.tone ||
      (dominance.genre === "thriller" && hasSupernaturalThrillerSignals(sanitizedIdea)
        ? "misterioso, inquietante, claustrofobico"
        : input.tone),
  };

  const explicitPoetryCollection =
    normalizedInput.bookFormat === "poetry_collection" ||
    /\b(poesia|raccolta\s+poetica|silloge|liriche|versi)\b/i.test(
      `${normalizedInput.genre} ${normalizedInput.ideaSeed}`,
    );

  if (explicitPoetryCollection && normalizedInput.genre !== "poesia") {
    return buildExpressBookScenarios({
      ...normalizedInput,
      genre: "poesia",
      tone: normalizedInput.tone || "poetico",
    });
  }

  return enforceExpressScenarioDivergence(
    (["safe", "commercial", "bold"] as ExpressScenarioVariant[]).map((variant) =>
      buildCompleteExpressBookPackage(normalizedInput, variant),
    ),
  );
}

function fillMemoryFromPackage(memory: ForgeInterviewMemory, pkg: CompleteExpressBookPackage): void {
  const bookType = resolveExpressBookType(pkg.genre);
  const slots: Array<[keyof ForgeInterviewMemory["slotValues"], string | number | boolean]> = [
    ["rawIdea", pkg.editorialSynopsis],
    ["language", pkg.language],
    ["genre", pkg.genre],
    ["subgenre", pkg.subgenre],
    ["bookType", bookType],
    ["tone", pkg.atmosphere],
    ["audience", pkg.targetAudience],
    ["promise", pkg.transformationPromise ?? pkg.marketPromise],
    ["protagonist", pkg.idealReader ?? pkg.protagonist],
    ["antagonist", pkg.antagonistOrLoveInterest],
    ["loveInterest", pkg.antagonistOrLoveInterest],
    ["centralConflict", pkg.readerProblem ?? pkg.centralConflict],
    ["stakes", pkg.stakes],
    ["setting", pkg.setting],
    ["endingDirection", pkg.endingDirection],
    ["chapterCount", String(pkg.chapterCount)],
    ["subchaptersEnabled", pkg.subchaptersEnabled],
    ["title", pkg.title],
    ["subtitle", pkg.subtitle],
    ["frontMatter", pkg.frontMatter],
    ["backMatter", pkg.backMatter],
    ["authorName", pkg.authorName],
    ["marketplace", "Amazon KDP"],
    ["pov", isNonfictionExpressGenre(pkg.genre) ? "Seconda persona / guida diretta" : "Terza persona limitata"],
    ["indexOutline", pkg.chapterBlueprintSeeds.map((c) => `${c.chapter}. ${c.title}`).join(" · ")],
    ["antiDriftRules", pkg.antiDriftRules.join(" · ")],
    ["forbiddenElements", "Deus ex machina, toni incoerenti, finali gratuiti"],
    ["narrativeArc", pkg.methodFramework ?? pkg.midpoint],
  ];
  for (const [key, value] of slots) {
    memory.slotValues[key] = value;
    memory.answeredSlots[key] = true;
  }
}

export function applyExpressScenarioToState(
  state: GuidedInterviewState,
  scenario: ExpressBookScenario,
): GuidedInterviewState {
  const memory = state.forgeMemory
    ? { ...state.forgeMemory, slotValues: { ...state.forgeMemory.slotValues }, answeredSlots: { ...state.forgeMemory.answeredSlots } }
    : createEmptyForgeMemory();
  fillMemoryFromPackage(memory, scenario);

  let advanced = advanceStoryRoomStage(memory);
  for (let i = 0; i < 20; i += 1) {
    const before = advanced.storyRoomMachine?.currentStageId;
    advanced = advanceStoryRoomStage(advanced);
    if (before === advanced.storyRoomMachine?.currentStageId) break;
  }
  if (advanced.storyRoomMachine) {
    advanced.storyRoomMachine.currentStageId = "bookFoundationLock";
    const completed = STORY_ROOM_STAGE_DEFS.map((s) => s.id).filter(
      (id) => id !== "blueprintReady",
    ) as StoryRoomStageId[];
    advanced.storyRoomMachine.completedStageIds = completed;
  }

  const titleIntelligence: TitleIntelligence = {
    workingTitle: scenario.title,
    definitiveTitle: scenario.title,
    subtitle: scenario.subtitle,
    commercialHook: scenario.hook,
    commercialPromise: scenario.marketPromise,
    approved: true,
  };

  let next: GuidedInterviewState = {
    ...state,
    forgeMode: "express",
    selectedBlueprintScenarioId: scenario.id,
    blueprintScenarios: state.blueprintScenarios,
    forgeMemory: advanced,
    characters: scenario.characters,
    storyRoom: scenario.storyRoom,
    storyFuture: scenario.storyFuture,
    bookPromises: scenario.bookPromises,
    titleIntelligence,
    selectedGenre: scenario.genre,
    selectedTone: scenario.atmosphere,
    selectedBookType: resolveExpressBookType(scenario.genre),
    extracted: {
      ...state.extracted,
      genre: scenario.genre,
      subgenre: scenario.subgenre,
      language: scenario.language,
      bookTitle: scenario.title,
      bookSubtitle: scenario.subtitle,
      openingHook: scenario.hook,
      promise: scenario.transformationPromise ?? scenario.marketPromise,
      centralConflict: scenario.readerProblem ?? scenario.centralConflict,
      protagonistWound: scenario.emotionalWound,
      antagonist: scenario.antagonistOrLoveInterest,
      targetReader: scenario.idealReader ?? scenario.targetAudience,
      emotionalTone: scenario.atmosphere,
      setting: scenario.setting,
      readerTransformation: scenario.transformationPromise ?? scenario.finalEmotion,
      narrativeDrive: scenario.endingDirection,
      chapterCount: String(scenario.chapterCount),
      subchaptersPreference: String(scenario.subchaptersEnabled),
      frontMatter: scenario.frontMatter,
      backMatter: scenario.backMatter,
      authorName: scenario.authorName,
      marketplace: "Amazon KDP",
      structurePreference: scenario.structurePreference,
      stakes: scenario.stakes,
      editorialSynopsis: scenario.editorialSynopsis,
    },
    messages: [
      ...state.messages,
      {
        id: `express-selected-${Date.now()}`,
        role: "assistant" as const,
        content: `Ho costruito il libro «${scenario.title}». Ecco la sinossi editoriale — conferma o correggi prima del blueprint.`,
        createdAt: Date.now(),
      },
    ],
  };

  next = ensureExpressBookPackageCompleteness(next);

  const foundation = buildBookFoundationFromExpressScenario(scenario, state.expressConfig);
  next = {
    ...next,
    bookFoundation: foundation,
    bookFoundationLocked: false,
  };

  if (state.expressConfig?.controlLevel === "auto") {
    next = autoFillBookFoundationIfNeeded(next);
  }

  next = applyBlueprintReadySummaryToState(next);
  next = {
    ...next,
    dnaLock: buildDnaLockFromInterviewState(next),
    canon: lockCanonMaster(buildCanonFromState(next)),
    canonLocked: true,
    completed: false,
    confidence: 0.92,
    forgePhase: "review",
  };
  return next;
}

function resolveExpressMemoryGenre(memory: ReturnType<typeof getForgeMemory>): string {
  const genre = String(memory.slotValues.genre ?? "").trim();
  if (genre) return genre;
  const subgenre = String(memory.slotValues.subgenre ?? "").trim();
  if (subgenre) return subgenre;
  return "narrativa";
}

export function ensureExpressBookPackageCompleteness(
  state: GuidedInterviewState,
): GuidedInterviewState {
  let next = { ...state };
  const memory = getForgeMemory(next);
  const ex = { ...(next.extracted ?? {}) };
  const ti = { ...(next.titleIntelligence ?? {}) };

  if (!ex.bookTitle && memory.slotValues.title) ex.bookTitle = String(memory.slotValues.title);
  if (!ex.bookSubtitle && !ti.subtitle) {
    const sub = buildCompleteExpressBookPackage(
      {
        genre: resolveExpressMemoryGenre(memory),
        language: ex.language ?? "Italian",
        titleMode: "suggest",
        ideaSeed: String(memory.slotValues.rawIdea ?? memory.slotValues.protagonist ?? ""),
        tone: String(memory.slotValues.tone ?? "oscuro"),
        length: "medio",
        controlLevel: "auto",
      },
      "commercial",
    ).subtitle;
    ex.bookSubtitle = sub;
    ti.subtitle = sub;
  }
  if (!ex.openingHook && !ti.commercialHook) {
    const hook = String(memory.slotValues.promise ?? "").slice(0, 120);
    if (hook && !isMetadataOnly(hook)) {
      ex.openingHook = hook;
      ti.commercialHook = hook;
    }
  }
  if (!ex.promise || isMetadataOnly(ex.promise)) {
    ex.promise = String(memory.slotValues.promise ?? ex.promise ?? "");
  }
  if (!ex.centralConflict || isMetadataOnly(ex.centralConflict)) {
    ex.centralConflict = String(memory.slotValues.centralConflict ?? "");
  }
  if (!ex.setting) ex.setting = String(memory.slotValues.setting ?? "");
  if (!ex.targetReader) ex.targetReader = String(memory.slotValues.audience ?? "");

  if (!next.characters?.length) {
    const pkg = buildCompleteExpressBookPackage({
      genre: resolveExpressMemoryGenre(memory),
      language: ex.language ?? "Italian",
      titleMode: "provisional",
      title: ex.bookTitle,
      ideaSeed: String(memory.slotValues.protagonist ?? memory.slotValues.rawIdea ?? ""),
      tone: String(memory.slotValues.tone ?? "oscuro"),
      length: "medio",
      controlLevel: "auto",
    });
    next.characters = pkg.characters;
    next.storyRoom = pkg.storyRoom;
    next.storyFuture = pkg.storyFuture;
    next.bookPromises = pkg.bookPromises;
  }

  if (!next.storyRoom?.scenes?.length && next.characters?.length) {
    next.storyRoom = buildCompleteExpressBookPackage({
      genre: resolveExpressMemoryGenre(memory),
      language: ex.language ?? "Italian",
      titleMode: "provisional",
      ideaSeed: String(memory.slotValues.protagonist ?? ""),
      tone: String(memory.slotValues.tone ?? "oscuro"),
      length: "medio",
      controlLevel: "auto",
    }).storyRoom;
  }

  next = {
    ...next,
    extracted: ex,
    titleIntelligence: ti,
    forgeMemory: memory,
    canon: buildCanonFromState({ ...next, extracted: ex, characters: next.characters }),
  };

  const seed = buildForgeInterviewSeed(next);
  const handoff = validateForgeHandoffForBlueprint(seed);
  if (!handoff.ready) {
    const canon = lockCanonMaster(buildCanonFromState(next));
    if (!canon.story.facts.length) {
      canon.story.facts.push(`Promessa: ${ex.promise}`);
      canon.story.facts.push(`Conflitto: ${ex.centralConflict}`);
    }
    if (!canon.ending.facts.length) {
      canon.ending.facts.push(String(ex.narrativeDrive ?? memory.slotValues.endingDirection ?? "Finale coerente"));
    }
    next = { ...next, canon };
  }

  return next;
}

export function validateExpressPackageReadiness(state: GuidedInterviewState): {
  ready: boolean;
  missing: string[];
  handoffMissing: string[];
  criticalSlots: string[];
} {
  const memory = getForgeMemory(state);
  const seed = buildForgeInterviewSeed(state);
  const handoff = validateForgeHandoffForBlueprint(seed);
  return {
    ready: handoff.ready && getCriticalMissingSlots(memory).length === 0,
    missing: getCriticalMissingSlots(memory).map(String),
    handoffMissing: handoff.missing,
    criticalSlots: getCriticalMissingSlots(memory).map(String),
  };
}

/** Auto-repair incomplete forge DNA before blueprint generation. */
export function repairForgeHandoffSeedForBlueprint(
  seed: ReturnType<typeof buildForgeInterviewSeed>,
): ReturnType<typeof buildForgeInterviewSeed> {
  let state = {
    messages: [],
    ...(seed as GuidedInterviewState),
  } as GuidedInterviewState;
  if (!Array.isArray(state.messages)) {
    state = { ...state, messages: [] };
  }
  state = ensureExpressBookPackageCompleteness(state);
  state = applyBlueprintReadySummaryToState(state);
  state = finalizeForgeForBlueprint(state);
  return buildForgeInterviewSeed(state);
}

export function ensureExpressWriterReadiness(
  state: GuidedInterviewState,
  baseConfig?: Partial<BookConfig>,
): {
  state: GuidedInterviewState;
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
  config: BookConfig;
} {
  let next = ensureExpressBookPackageCompleteness(state);
  next = applyBlueprintReadySummaryToState(next);
  const seed = buildForgeInterviewSeed(next);
  const handoff = validateForgeHandoffForBlueprint(seed);
  const preservedFormat = baseConfig?.bookFormat;
  const preservedBookTypeId = baseConfig?.bookTypeId;
  const config = enrichBookConfigFromForgeSeed(
    {
      title: next.extracted?.bookTitle ?? "Romanzo",
      subtitle: next.extracted?.bookSubtitle ?? "",
      language: next.extracted?.language ?? "Italian",
      genre: next.selectedGenre ?? next.extracted?.genre ?? "fiction",
      subcategory: next.extracted?.subgenre ?? next.selectedGenre ?? "",
      subgenre: next.extracted?.subgenre ?? "",
      idea: next.extracted?.editorialSynopsis ?? next.extracted?.promise ?? "",
      targetReader: next.extracted?.targetReader ?? "",
      tone: next.extracted?.emotionalTone ?? next.selectedTone ?? "",
      numberOfChapters: Number(next.extracted?.chapterCount ?? next.selectedLength ?? 12) || 12,
      subchaptersEnabled: next.extracted?.subchaptersPreference === "true",
      subchaptersPerChapter: 0,
      authorStyle: "Autorevole ma umano",
      configStatus: "validated",
      ...baseConfig,
    } as BookConfig,
    seed,
  );
  const dominantConfig = applyFormatDominance({
    ...config,
    bookFormat: preservedFormat ?? config.bookFormat,
    bookTypeId: preservedBookTypeId ?? config.bookTypeId,
  }) as BookConfig;
  const report = validateBookReadinessForBlueprint(dominantConfig);
  const greatnessGate = enforceKernelGreatnessBeforeForge({ config: dominantConfig });
  const packageSeeds = next.forgeMemory?.slotValues?.indexOutline;
  const warnings: string[] = [];
  if (!packageSeeds && !next.extracted?.structurePreference) {
    warnings.push("Struttura capitoli inferita — verrà normalizzata al blueprint.");
  }
  if (greatnessGate.refined) {
    warnings.push("Concept rafforzato automaticamente prima del Blueprint.");
  }
  const gatedConfig = applyGreatnessGateToConfig(dominantConfig, greatnessGate);
  return {
    state: greatnessGate.refined
      ? {
        ...next,
        extracted: {
          ...next.extracted,
          editorialSynopsis: greatnessGate.conceptText || next.extracted?.editorialSynopsis,
          promise: next.extracted?.promise || greatnessGate.conceptText,
        },
      }
      : next,
    ready: handoff.ready && report.blockingIssues.length === 0 && greatnessGate.allowed,
    blockingIssues: [
      ...handoff.missing,
      ...report.blockingIssues,
      ...report.missingFields,
      ...(greatnessGate.allowed ? [] : [greatnessGate.message]),
    ],
    warnings,
    config: gatedConfig,
  };
}

/** @deprecated use buildExpressBookScenarios */
export function buildBlueprintScenariosFromExpress(input: ExpressForgeInput) {
  return buildExpressBookScenarios(input);
}
