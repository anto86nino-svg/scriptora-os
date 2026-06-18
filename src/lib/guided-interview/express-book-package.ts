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
import type { ExpressForgeInput, ForgeFieldProvenance } from "./express-forge-types";
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

export type ExpressScenarioVariant = "safe" | "commercial" | "bold";

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
  manuale: { subgenre: "practical guide", normalizedGenre: "manual" },
  poesia: { subgenre: "lyric poetry", normalizedGenre: "poetry" },
};

const LENGTH_CHAPTERS: Record<ExpressForgeInput["length"], number> = {
  breve: 8,
  medio: 12,
  lungo: 18,
  pro: 24,
};

const VARIANT_META: Record<
  ExpressScenarioVariant,
  { label: string; pitch: string; risk: string; intensity: number }
> = {
  safe: {
    label: "Libro A — Safe",
    pitch: "Solido, coerente, payoff chiaro",
    risk: "Meno memorabile ma più stabile sul mercato.",
    intensity: 0.85,
  },
  commercial: {
    label: "Libro B — Commercial",
    pitch: "Hook forte, ritmo alto, promessa vendibile",
    risk: "Più commerciale, meno sperimentale.",
    intensity: 1,
  },
  bold: {
    label: "Libro C — Bold",
    pitch: "Intenso, memorabile, atmosfera forte",
    risk: "Più rischioso ma più distintivo.",
    intensity: 1.2,
  },
};

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
  if (input.titleMode === "provided" && input.title?.trim()) return input.title.trim();
  if (input.titleMode === "provisional" && input.title?.trim()) return input.title.trim();
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

export function buildCompleteExpressBookPackage(
  input: ExpressForgeInput,
  variant: ExpressScenarioVariant = "commercial",
): CompleteExpressBookPackage {
  const meta = VARIANT_META[variant];
  const genreMeta = GENRE_META[input.genre.toLowerCase()] ?? {
    subgenre: input.genre,
    normalizedGenre: input.genre,
  };
  const seed = ideaCore(input);
  const lead = parseProtagonistLabel(seed);
  const counterpart = parseCounterpart(input.genre, variant);
  const setting = parseSetting(seed, input.genre);
  const chapterCount = LENGTH_CHAPTERS[input.length];
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
  const subtitle = isDarkRomance(input.genre)
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
    protagonist: `${lead.name} — ${lead.role}`,
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
    subchaptersEnabled: input.length === "pro" || input.length === "lungo",
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

export function buildExpressBookScenarios(input: ExpressForgeInput): ExpressBookScenario[] {
  return (["safe", "commercial", "bold"] as ExpressScenarioVariant[]).map((variant) =>
    buildCompleteExpressBookPackage(input, variant),
  );
}

function fillMemoryFromPackage(memory: ForgeInterviewMemory, pkg: CompleteExpressBookPackage): void {
  const slots: Array<[keyof ForgeInterviewMemory["slotValues"], string | number | boolean]> = [
    ["rawIdea", pkg.editorialSynopsis],
    ["language", pkg.language],
    ["genre", pkg.genre],
    ["subgenre", pkg.subgenre],
    ["bookType", "Romanzo"],
    ["tone", pkg.atmosphere],
    ["audience", pkg.targetAudience],
    ["promise", pkg.marketPromise],
    ["protagonist", pkg.protagonist],
    ["antagonist", pkg.antagonistOrLoveInterest],
    ["loveInterest", pkg.antagonistOrLoveInterest],
    ["centralConflict", pkg.centralConflict],
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
    ["pov", "Terza persona limitata"],
    ["indexOutline", pkg.chapterBlueprintSeeds.map((c) => `${c.chapter}. ${c.title}`).join(" · ")],
    ["antiDriftRules", pkg.antiDriftRules.join(" · ")],
    ["forbiddenElements", "Deus ex machina, toni incoerenti, finali gratuiti"],
    ["narrativeArc", pkg.midpoint],
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
    advanced.storyRoomMachine.currentStageId = "blueprintReady";
    advanced.storyRoomMachine.completedStageIds = STORY_ROOM_STAGE_DEFS.map((s) => s.id) as StoryRoomStageId[];
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
    selectedBookType: "Romanzo",
    extracted: {
      ...state.extracted,
      genre: scenario.genre,
      subgenre: scenario.subgenre,
      language: scenario.language,
      bookTitle: scenario.title,
      bookSubtitle: scenario.subtitle,
      openingHook: scenario.hook,
      promise: scenario.marketPromise,
      centralConflict: scenario.centralConflict,
      protagonistWound: scenario.emotionalWound,
      antagonist: scenario.antagonistOrLoveInterest,
      targetReader: scenario.targetAudience,
      emotionalTone: scenario.atmosphere,
      setting: scenario.setting,
      readerTransformation: scenario.finalEmotion,
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
