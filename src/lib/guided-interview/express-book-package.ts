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
  isNonfictionExpressGenre,
  isPoetryExpressGenre,
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
import { buildForgeInterviewSeed,
  validateForgeHandoffForBlueprint,
} from "./forge-blueprint-handoff";
import { applyBlueprintReadySummaryToState } from "./blueprint-ready-summary";
import { isMetadataOnly } from "./blueprint-ready-summary";
import { validateBookReadinessForBlueprint } from "@/lib/book-config-engine/blueprint-readiness";
import { enrichBookConfigFromForgeSeed } from "./forge-writer-bridge";
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
  thriller: { subgenre: "psychological thriller", normalizedGenre: "thriller" },
  horror: { subgenre: "supernatural horror", normalizedGenre: "horror" },
  fantasy: { subgenre: "epic fantasy", normalizedGenre: "fantasy" },
  "self-help": { subgenre: "personal growth", normalizedGenre: "self-help" },
  business: { subgenre: "business growth", normalizedGenre: "business" },
  manuale: { subgenre: "practical guide", normalizedGenre: "manual" },
  saggio: { subgenre: "essay", normalizedGenre: "essay" },
  educational: { subgenre: "educational", normalizedGenre: "educational" },
  poesia: { subgenre: "lyric poetry", normalizedGenre: "poetry" },
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
  return (input.ideaSeed || input.protagonistSeed || "").trim();
}

function isDarkRomance(genre: string): boolean {
  return /dark.?romance|romance.*dark/i.test(genre);
}

function isRomance(genre: string): boolean {
  return /romance/i.test(genre);
}

function parseProtagonistLabel(seed: string): { name: string; role: string } {
  const lower = seed.toLowerCase();
  if (/restauratrice|restauratore/i.test(seed)) {
    return { name: "Elena", role: "restauratrice" };
  }
  if (/chef/i.test(seed)) {
    return { name: "Elena", role: "chef tormentata" };
  }
  if (/detective|ispettore/i.test(seed)) {
    return { name: "Luca", role: "detective segnato dal passato" };
  }
  const words = seed.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-ZÀ-Ü]/.test(words[0]!)) {
    return { name: words[0]!, role: seed };
  }
  return { name: "Elena", role: seed || "protagonista segnato dal passato" };
}

function parseCounterpart(genre: string, variant: ExpressScenarioVariant): { name: string; role: string } {
  if (isDarkRomance(genre)) {
    return variant === "bold"
      ? { name: "Marco", role: "proprietario magnetico, colpevole e irresistibile" }
      : { name: "Marco", role: "proprietario affascinante e pericoloso" };
  }
  if (/thriller|horror/i.test(genre)) {
    return { name: "Valerio", role: "figura che conosce troppo e nasconde la verità" };
  }
  return { name: "Marco", role: "forza antagonica che specchia e sfida il protagonista" };
}

function parseSetting(seed: string, genre: string): string {
  if (/villa|incendio|restauratrice/i.test(seed)) {
    return "Villa decadente sulle colline, segnata da un incendio doloso e da stanze che conservano cenere e silenzi";
  }
  if (/città|metropoli|urban/i.test(seed)) {
    return "Metropoli notturna, quartieri che cambiano volto tra luci al neon e ombre che non perdonano";
  }
  if (isDarkRomance(genre)) {
    return "Maniero isolato, muri umidi e stanze chiuse dove ogni oggetto sembra custodire un segreto";
  }
  return "Ambientazione claustrofobica e sensoriale, costruita per amplificare desiderio, paura e verità negata";
}

function buildTitle(input: ExpressForgeInput, variant: ExpressScenarioVariant): string {
  if (input.title?.trim()) return input.title.trim();
  const seed = ideaCore(input);
  if (/villa|incendio|restauratrice/i.test(seed)) {
    return variant === "bold" ? "Cenere tra le Dita" : "La Villa delle Ceneri";
  }
  if (isDarkRomance(input.genre)) {
    return variant === "commercial" ? "Confine Proibito" : "Ombre che Bruciano";
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

function buildChapterSeeds(count: number, genre: string, variant: ExpressScenarioVariant, setting: string): ChapterBlueprintSeed[] {
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
  const labels =
    isRomance(genre) || /thriller|horror/i.test(genre)
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
    centralConflict,
    emotionalWound,
    desire,
    fear,
    stakes,
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
    endingDirection,
    finalEmotion,
    frontMatter: "Prefazione — perché questo metodo · Come usare il libro · Nota dell'autore",
    backMatter: "Workbook sintetico · Risorse consigliate · Ringraziamenti · Prossimi passi",
    authorName: "Da definire",
    copyright: `© ${new Date().getFullYear()} — titolare da confermare`,
    commercialPitch: meta.pitch,
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

export function buildCompleteExpressBookPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant = "commercial",
): CompleteExpressBookPackage {
  if (isNonfictionExpressGenre(input.genre)) {
    return buildNonfictionExpressPackage(input, variant);
  }
  if (isPoetryExpressGenre(input.genre)) {
    return buildPoetryExpressPackage(input, variant);
  }

  const meta = getExpressVariantMeta(input.genre, variant);
  const genreMeta = GENRE_META[input.genre.toLowerCase()] ?? {
    subgenre: input.genre,
    normalizedGenre: input.genre,
  };
  const seed = ideaCore(input);
  const lead = parseProtagonistLabel(seed);
  const counterpart = parseCounterpart(input.genre, variant);
  const setting = parseSetting(seed, input.genre);
  const chapterCount = chapterCountForInput(input);
  const language = normalizeLanguage(input.language);

  const emotionalWound = isDarkRomance(input.genre)
    ? "Colpa per la morte della sorella e bisogno di controllo come unica difesa"
    : "Ferita antica che lega identità, desiderio e paura di essere tradita di nuovo";
  const desire = isDarkRomance(input.genre)
    ? "Scoprire la verità sull'incendio senza perdere se stessa"
    : "Trasformazione concreta e relazione che non la annulli";
  const fear = isDarkRomance(input.genre)
    ? "Ricordare troppo — e desiderare chi dovrebbe temere"
    : "Perdere controllo, verità e ciò che rende la vita degna di essere vissuta";
  const centralConflict = isDarkRomance(input.genre)
    ? `${lead.name} cerca verità e giustizia, ma ${counterpart.name} le offre protezione solo finché non minaccia ciò che la casa nasconde`
    : `${lead.name} deve scegliere tra ciò che desidera e ciò che teme di perdere, mentre ${counterpart.name} amplifica ogni contraddizione`;
  const stakes = isDarkRomance(input.genre)
    ? "Memoria, identità, cuore — e la possibilità che amare significhi tradire i morti"
    : "Identità, relazioni e futuro — ciò che si perde non torna indietro";
  const marketPromise = isDarkRomance(input.genre)
    ? "Un dark romance claustrofobico dove colpa, desiderio e redenzione sporca si confondono, finché amare qualcuno significa scegliere se bruciare con lui o salvarsi dalle sue fiamme."
    : `Un ${input.genre} ${input.tone} che promette tensione emotiva, payoff memorabile e una storia che resta addosso dopo l'ultima pagina.`;
  const hook = isDarkRomance(input.genre)
    ? `Tornare nella villa dove sua sorella è morta non era mai stato sicuro — ma scoprire che ${counterpart.name} la desidera è la forma più pericolosa di colpa.`
    : `${lead.name} credeva di controllare la storia. ${setting.split(",")[0]} le dimostra il contrario.`;
  const subtitle = input.subtitle?.trim()
    ? input.subtitle.trim()
    : isDarkRomance(input.genre)
    ? variant === "bold"
      ? "Quando il desiderio brucia più forte della verità"
      : "Quando la verità è più pericolosa del fuoco"
    : `Un ${input.genre} ${input.tone} — promessa, tensione e payoff`;
  const title = buildTitle(input, variant);
  const editorialSynopsis = buildEditorialSynopsis(input, variant, lead, counterpart, setting);
  const endingDirection = isDarkRomance(input.genre)
    ? variant === "bold"
      ? "Finale devastante: redenzione possibile solo attraverso una scelta che brucia qualcosa per sempre"
      : "Finale emotivo che paga la promessa — verità, desiderio e crepa aperta"
    : "Finale coerente con la promessa — trasformazione visibile e payoff emotivo";
  const finalEmotion =
    variant === "bold" ? "Catharsis intensa, crepa aperta, eco lunga" : "Soddisfazione emotiva e senso di completamento";
  const midpoint = "La verità parziale sull'incendio / sul passato ribalta fiducia e desiderio";
  const climax = "Confronto nella casa — verità, possesso e scelta irreversibile";

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

  const characters = buildCharacters(lead, counterpart, partial, input.genre);
  const chapterBlueprintSeeds = buildChapterSeeds(chapterCount, input.genre, variant, setting);
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
    relationship: isRomance(input.genre) ? [`Tensione tra ${lead.name} e ${counterpart.name} fino al payoff`] : [],
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
    hook,
    logline: `${lead.name} vs ${counterpart.name}: ${centralConflict.slice(0, 120)}…`,
    editorialSynopsis,
    genre: genreMeta.normalizedGenre,
    subgenre: genreMeta.subgenre,
    language,
    targetAudience: isDarkRomance(input.genre)
      ? "Lettrici 25–45 che cercano dark romance intenso, slow burn e payoff emotivo"
      : `Lettori di ${input.genre} attratti da tono ${input.tone} e storia ad alta posta in gioco`,
    marketPromise,
    protagonist: lead.name,
    antagonistOrLoveInterest: `${counterpart.name} — ${counterpart.role}`,
    secondaryCharacters: ["Sorella (memoria/assenza)", "Comunità locale che custodisce silenzi"],
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
      "Non trasformare il dark romance in fantasy o thriller generico",
      "Ogni capitolo deve aumentare desiderio, verità o posta in gioco",
      "Il finale deve pagare la promessa emotiva del setup",
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
    whyItSells: isDarkRomance(input.genre)
      ? "Dark romance con hook territoriale, segreto familiare e tensione slow burn ad alto engagement"
      : `${meta.pitch} — promessa chiara e personaggi con ferita riconoscibile`,
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
  if (isNonfictionExpressGenre(scenario.genre) || isPoetryExpressGenre(scenario.genre)) return scenario;

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
  return enforceExpressScenarioDivergence(
    (["safe", "commercial", "bold"] as ExpressScenarioVariant[]).map((variant) =>
      buildCompleteExpressBookPackage(input, variant),
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
        genre: String(memory.slotValues.genre ?? "dark romance"),
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
      genre: String(memory.slotValues.genre ?? "dark romance"),
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
      genre: String(memory.slotValues.genre ?? "dark romance"),
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

export function ensureExpressWriterReadiness(
  state: GuidedInterviewState,
  baseConfig?: Partial<BookConfig>,
): {
  state: GuidedInterviewState;
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
} {
  let next = ensureExpressBookPackageCompleteness(state);
  next = applyBlueprintReadySummaryToState(next);
  const seed = buildForgeInterviewSeed(next);
  const handoff = validateForgeHandoffForBlueprint(seed);
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
  const report = validateBookReadinessForBlueprint(config);
  const packageSeeds = next.forgeMemory?.slotValues?.indexOutline;
  const warnings: string[] = [];
  if (!packageSeeds && !next.extracted?.structurePreference) {
    warnings.push("Struttura capitoli inferita — verrà normalizzata al blueprint.");
  }
  return {
    state: next,
    ready: handoff.ready && report.blockingIssues.length === 0,
    blockingIssues: [...handoff.missing, ...report.blockingIssues, ...report.missingFields],
    warnings,
  };
}

/** @deprecated use buildExpressBookScenarios */
export function buildBlueprintScenariosFromExpress(input: ExpressForgeInput) {
  return buildExpressBookScenarios(input);
}
