import type { ForgeCharacter } from "./forge-evolution-types";
import type { GuidedInterviewState } from "./types";
import type { ExpressForgeInput } from "./express-forge-types";
import type { CompleteExpressBookPackage } from "./express-book-package";
import {
  isNonfictionExpressGenre,
  isPoetryExpressGenre,
  resolveExpressBookType,
} from "./express-genre-config";
import { isMetadataOnly } from "./blueprint-ready-summary";
import { getForgeMemory } from "./interview-memory";
import { advanceStoryRoomStage } from "./story-room-state-machine";
import {
  type FoundationCharacter,
  forgeCastToFoundation,
  foundationCastToForge,
  forgeCharacterToFoundation,
} from "./character-foundation-studio";
import { buildTitleV2Pipeline } from "@/lib/title-intelligence-v2";
import {
  filterValidTitleCandidates,
  isInvalidGeneratedTitle,
  regenerateTitleFromIdea,
} from "@/lib/title-intelligence-validation";
import { resolveNarrativePromise } from "@/lib/narrative-promise-intelligence";
import {
  buildSupernaturalThrillerSubtitle,
  buildTimeAnchoredTitle,
  hasSupernaturalThrillerSignals,
  isConceptDominanceSubtitle,
  sanitizeUserConceptInput,
  shouldPreserveConceptSubtitle,
} from "@/lib/concept-dominance";

export type BookLengthPreset = "breve" | "medio" | "lungo" | "epico";

export type LengthPresetConfig = {
  preset: BookLengthPreset;
  label: string;
  chapterCount: number;
  chapterRange: [number, number];
  expectedChapterLength: string;
  pacing: string;
  structureDepth: string;
  subchaptersDefault: boolean;
  castSizeDefault: number;
  moduleDepthDefault: string;
  description: string;
};

export const LENGTH_PRESET_CONFIGS: Record<BookLengthPreset, LengthPresetConfig> = {
  breve: {
    preset: "breve",
    label: "Breve",
    chapterCount: 10,
    chapterRange: [8, 12],
    expectedChapterLength: "rapido",
    pacing: "compatto",
    structureDepth: "essenziale",
    subchaptersDefault: false,
    castSizeDefault: 3,
    moduleDepthDefault: "essenziale",
    description: "Guida breve, novella, poesia, manuale pratico",
  },
  medio: {
    preset: "medio",
    label: "Medio",
    chapterCount: 20,
    chapterRange: [16, 24],
    expectedChapterLength: "standard",
    pacing: "sostenuto",
    structureDepth: "completa",
    subchaptersDefault: false,
    castSizeDefault: 4,
    moduleDepthDefault: "completa",
    description: "Romanzo standard, self-help completo, saggio divulgativo",
  },
  lungo: {
    preset: "lungo",
    label: "Lungo",
    chapterCount: 36,
    chapterRange: [30, 45],
    expectedChapterLength: "approfondito",
    pacing: "ampio",
    structureDepth: "profonda",
    subchaptersDefault: true,
    castSizeDefault: 6,
    moduleDepthDefault: "profonda",
    description: "Fantasy, thriller, romance complesso",
  },
  epico: {
    preset: "epico",
    label: "Epico",
    chapterCount: 60,
    chapterRange: [60, 80],
    expectedChapterLength: "esteso",
    pacing: "saga",
    structureDepth: "massima",
    subchaptersDefault: true,
    castSizeDefault: 10,
    moduleDepthDefault: "massima",
    description: "Saghe, fantasy epico, manuali completi, programmi avanzati",
  },
};

export type TitleSubtitleOption = {
  title: string;
  subtitle: string;
  commercialReason: string;
  toneFit: string;
  genreFit: string;
  risk: string;
  source?: "auto" | "user";
};

export type CommercialHookOption = {
  type: "emotional" | "commercial" | "cinematic";
  label: string;
  hook: string;
};

export type NonfictionFoundationSubjects = {
  idealReader?: string;
  readerProblem?: string;
  readerPain?: string;
  readerDesire?: string;
  readerFalseBelief?: string;
  methodFramework?: string;
  guideVoice?: string;
  caseStudyTypes?: string[];
  transformationArc?: string;
  transformationPromise?: string;
  exerciseStyle?: string;
};

export type FoundationFieldProvenance = {
  source: "auto" | "user";
  locked?: boolean;
};

export type ChapterStructureSeed = {
  chapter: number;
  title: string;
  purpose: string;
};

export type MissingFieldAction = {
  field: string;
  label: string;
  cta: string;
  action: "characters" | "titles" | "hook" | "structure" | "nonfiction" | "complete";
};

export type BookFoundationFlowStep = "setup" | "characters" | "titleHook" | "lock";

export type BookFoundationLock = {
  bookType: string;
  genre: string;
  subgenre: string;
  language: string;
  lengthPreset: BookLengthPreset;
  chapterCount: number;
  subchaptersEnabled: boolean;
  tone: string;
  title: string;
  subtitle: string;
  titleCandidates?: TitleSubtitleOption[];
  subtitleCandidates?: string[];
  commercialHook: string;
  hookCandidates?: CommercialHookOption[];
  targetAudience: string;
  marketPromise: string;
  characters: ForgeCharacter[];
  foundationCharacters?: FoundationCharacter[];
  nonfictionSubjects?: NonfictionFoundationSubjects;
  chapterStructure?: ChapterStructureSeed[];
  structurePreset: string;
  fieldProvenance?: Record<string, FoundationFieldProvenance>;
  confidence: number;
  missingFields: string[];
  locked: boolean;
  flowStep?: BookFoundationFlowStep;
};

export type FoundationGeneratorInput = {
  genre: string;
  subgenre?: string;
  language: string;
  bookType?: string;
  ideaSeed: string;
  tone: string;
  lengthPreset: BookLengthPreset;
  titleMode?: ExpressForgeInput["titleMode"];
  title?: string;
  controlLevel?: ExpressForgeInput["controlLevel"];
};

export function normalizeLengthPreset(value?: string): BookLengthPreset {
  const v = String(value || "medio").toLowerCase();
  if (v === "pro" || v === "epico") return "epico";
  if (v === "breve" || v === "short") return "breve";
  if (v === "lungo" || v === "long") return "lungo";
  return "medio";
}

export function resolveLengthPresetConfig(
  preset: BookLengthPreset,
  genre: string,
): LengthPresetConfig {
  const base = LENGTH_PRESET_CONFIGS[preset];
  if (isPoetryExpressGenre(genre)) {
    const sectionCount = preset === "breve" ? 4 : preset === "lungo" || preset === "epico" ? 7 : 5;
    const poemRange: [number, number] =
      preset === "breve" ? [35, 45] : preset === "lungo" || preset === "epico" ? [70, 90] : [50, 65];
    return {
      ...base,
      chapterCount: sectionCount,
      chapterRange: [sectionCount, sectionCount],
      expectedChapterLength: `${poemRange[0]}-${poemRange[1]} poesie totali`,
      pacing: "arco emotivo",
      structureDepth: "sezioni poetiche",
      subchaptersDefault: false,
      castSizeDefault: 1,
      moduleDepthDefault: "voce, immagini, ritmo",
      description: `${sectionCount} sezioni poetiche · circa ${poemRange[0]}-${poemRange[1]} poesie`,
    };
  }
  if (isNonfictionExpressGenre(genre) && preset === "breve") {
    return { ...base, subchaptersDefault: false };
  }
  if (isNonfictionExpressGenre(genre) && (preset === "lungo" || preset === "epico")) {
    return { ...base, subchaptersDefault: true };
  }
  return base;
}

function clean(value?: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isDarkRomance(genre: string): boolean {
  return /dark.?romance|romance.*dark/i.test(genre);
}

function isRomance(genre: string): boolean {
  return /romance/i.test(genre);
}

function isHorror(genre: string): boolean {
  return /horror|gotico|gothic|paura|soprannaturale/i.test(genre);
}

function isThriller(genre: string): boolean {
  return /thriller|crime|giallo|noir/i.test(genre);
}

function isFantasy(genre: string): boolean {
  return /fantasy|fantasi/i.test(genre);
}

function parseLeadName(seed: string): string {
  const words = seed.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-ZÀ-Ü]/.test(words[0]!)) return words[0]!;
  if (/restauratrice/i.test(seed)) return "Elena";
  if (/chef/i.test(seed)) return "Elena";
  if (/detective|ispettore/i.test(seed)) return "Luca";
  return "Elena";
}

function parseCounterpartName(genre: string): string {
  if (isDarkRomance(genre) || isRomance(genre)) return "Marco";
  if (isHorror(genre) || isThriller(genre)) return "Valerio";
  if (isFantasy(genre)) return "Kael";
  return "Marco";
}

function charId(role: string, index: number): string {
  return `foundation-${role}-${index}`;
}

function baseCharacter(
  role: ForgeCharacter["role"],
  name: string,
  fields: Partial<ForgeCharacter>,
): ForgeCharacter {
  return {
    id: charId(role, 0),
    role,
    name,
    wound: fields.wound,
    fear: fields.fear,
    desire: fields.desire,
    contradiction: fields.contradiction,
    obsession: fields.obsession,
    secret: fields.secret,
    arc: fields.arc,
    vulnerability: fields.vulnerability,
    dominantFlaw: fields.dominantFlaw,
    emotionalTriggers: fields.emotionalTriggers,
    recurringBehavior: fields.recurringBehavior,
    personalLanguage: fields.personalLanguage,
    blindSpot: fields.blindSpot,
  };
}

export function generateGenreAwareCharacters(input: FoundationGeneratorInput): ForgeCharacter[] {
  const seed = clean(input.ideaSeed);
  const genre = input.genre;
  const lead = parseLeadName(seed);
  const counterpart = parseCounterpartName(genre);

  if (isNonfictionExpressGenre(genre)) {
    const problem = seed || "blocco ricorrente che impedisce progresso concreto";
    const promise = `Trasformare ${problem.toLowerCase()} in azione sostenibile`;
    return [
      baseCharacter("protagonist", "Lettore ideale", {
        wound: problem,
        fear: "Investire tempo senza ottenere cambiamento reale",
        desire: promise,
        contradiction: "Vuole cambiare ma teme di fallire di nuovo",
        obsession: "Trovare un metodo che funzioni nella vita reale",
        secret: "Sa già cosa dovrebbe fare — ma non si fida",
        arc: "Da consapevolezza del problema a azione sostenuta",
        vulnerability: input.bookType || "Saggio o self-help",
        dominantFlaw: "Confonde prudenza e paralisi",
      }),
      baseCharacter("antagonist", "Ostacolo interno", {
        wound: "Paura del fallimento radicata nel passato",
        fear: "Esporsi e risultare inadeguato",
        desire: "Mantenere il controllo evitando il rischio",
        contradiction: "Protegge ma imprigiona",
        obsession: "Evitare il disagio a ogni costo",
        secret: "Il blocco è servito come scudo",
        arc: "Da voce critica dominante a segnale da integrare",
      }),
    ];
  }

  if (isPoetryExpressGenre(genre)) {
    return [
      baseCharacter("protagonist", "Voce lirica", {
        wound: seed.split(/[.!?]/)[0] || "Perdita e memoria",
        desire: "Dare forma poetica al tema",
        arc: "Da frammento a raccolta coerente",
      }),
    ];
  }

  if (isDarkRomance(genre)) {
    return [
      baseCharacter("protagonist", lead, {
        wound: "Colpa e bisogno di controllo mascherato da indipendenza",
        fear: "Perdere di nuovo ciò che ama e scoprire di averlo causato",
        desire: "Verità, giustizia e amore che non la distrugga",
        contradiction: "Vuole indipendenza ma cerca protezione dove è più pericoloso",
        obsession: "Ricostruire ciò che il passato ha cancellato",
        secret: "Tem di non resistere al desiderio che la tradisce",
        arc: "Da ferita paralizzante a scelta consapevole tra verità e sopravvivenza emotiva",
        vulnerability: "Memoria e paura di ricadere",
        dominantFlaw: "Confonde protezione e possesso",
      }),
      baseCharacter("antagonist", counterpart, {
        wound: "Colpa sepolta dietro controllo e fascino",
        fear: "Essere visto per ciò che ha fatto davvero",
        desire: "Possederla senza perderla",
        contradiction: "Offre salvezza ma agisce come minaccia",
        obsession: "Tenere chiuso il segreto che li lega",
        secret: "Attrazione proibita e trauma reciproco",
        arc: "Da custode del segreto a uomo costretto a scegliere tra perdita e redenzione",
      }),
      baseCharacter("supporting", "Il segreto della casa", {
        wound: "Trauma condiviso non nominato",
        desire: "Emergere e costringere una scelta",
        arc: "Escalation emotiva fino al confronto finale",
      }),
    ];
  }

  if (isHorror(genre)) {
    return [
      baseCharacter("protagonist", lead, {
        wound: "Trauma o colpa non elaborata",
        fear: "Che la minaccia abbia ragione su di lui",
        desire: "Sopravvivere e capire la verità",
        obsession: "Comprendere ciò che lo perseguita",
        arc: "Da negazione a confronto con la paura primaria",
      }),
      baseCharacter("antagonist", "La minaccia", {
        name: "La minaccia",
        wound: "Origine oscura legata al luogo",
        desire: "Consumare o rivelare la colpa",
        arc: "Escalation progressiva fino al climax",
      }),
      baseCharacter("supporting", "Sara", {
        wound: "Non crede finché non è troppo tardi",
        desire: "Proteggere il protagonista",
        contradiction: "Razionalità vs evidenza innegabile",
      }),
    ];
  }

  if (isRomance(genre)) {
    return [
      baseCharacter("protagonist", lead, {
        wound: "Falsa convinzione amorosa sul proprio valore",
        fear: "Essere abbandonata se mostra vulnerabilità",
        desire: "Connessione autentica senza perdere se stessa",
        arc: "Da difesa emotiva a intimità consapevole",
      }),
      baseCharacter("antagonist", counterpart, {
        wound: "Ostacolo emotivo mascherato da fascino",
        fear: "Aprirsi e perdere controllo",
        desire: "Vicinanza che supera la resistenza",
        arc: "Da attrazione complicata a scelta d'amore",
      }),
    ];
  }

  if (isFantasy(genre)) {
    return [
      baseCharacter("protagonist", lead, {
        wound: "Segreto di origine legato al potere",
        fear: "Il costo del potere superi il beneficio",
        desire: "Salvare ciò che ama senza perdere l'umanità",
        secret: "Segreto di origine legato al costo del potere",
        arc: "Da negazione del destino a ruolo nel mondo",
      }),
      baseCharacter("supporting", "Orin", {
        wound: "Ha già pagato il costo del potere",
        desire: "Guidare senza condannare",
        arc: "Da guida distante a alleato necessario",
      }),
      baseCharacter("antagonist", counterpart, {
        wound: "Legame con la forza oscura",
        fear: "Perdere il controllo sulla magia",
        desire: "Dominare il mondo o il protagonista",
        secret: "Limite del potere e prezzo da pagare",
        arc: "Da ombra a antagonista rivelato",
      }),
    ];
  }

  if (isThriller(genre)) {
    return [
      baseCharacter("protagonist", lead, {
        wound: "Segreto personale che compromette l'indagine",
        fear: "Che la verità distrugga ciò che protegge",
        desire: "Risolvere il caso prima che scada il tempo",
        arc: "Da investigatore segnato a verità inevitabile",
      }),
      baseCharacter("antagonist", counterpart, {
        wound: "Motivazione nascosta dietro la minaccia",
        desire: "Impedire che il caso si risolva",
        secret: "Falsa pista deliberata",
        arc: "Pressione crescente fino allo smascheramento",
      }),
      baseCharacter("supporting", "Caso centrale", {
        name: "La vittima",
        wound: "Verità sepolta nel passato",
        desire: "Giustizia postuma",
      }),
    ];
  }

  return [
    baseCharacter("protagonist", lead, {
      wound: "Ferita che definisce identità e scelte",
      fear: "Perdere ciò che rende la vita degna",
      desire: "Trasformazione concreta e verità",
      arc: "Da blocco a scelta irreversibile",
    }),
    baseCharacter("antagonist", counterpart, {
      wound: "Forza opposta allo status quo",
      desire: "Impedire o accelerare il cambiamento",
      arc: "Specchio e sfida del protagonista",
    }),
  ];
}

export function generateNonfictionSubjects(input: FoundationGeneratorInput): NonfictionFoundationSubjects {
  const seed = clean(input.ideaSeed);
  const problem =
    /bloccat|paura|fallimento/i.test(seed)
      ? seed.split(/[.!?]/)[0] || seed
      : `Il lettore si sente bloccato: ${seed || "mancanza di direzione"}`;
  return {
    idealReader: "Adulti 25–50 che cercano chiarezza e strumenti pratici",
    readerProblem: problem,
    readerPain: "Frustrazione, procrastinazione, autostima erosa",
    readerDesire: "Fiducia, disciplina e direzione misurabile",
    readerFalseBelief: "Devo essere perfetto per iniziare",
    methodFramework:
      input.lengthPreset === "epico"
        ? "Metodo ARC+: Awareness, Reframe, Commitment, Integration, Mastery"
        : "Framework 4D: Diagnosi, Decostruzione, Disciplina, Direzione",
    guideVoice: `Voce ${input.tone}, empatica ma orientata all'azione`,
    caseStudyTypes: ["Storie brevi", "Esercizi guidati", "Checklist settimanali"],
    transformationArc: "Da blocco a momentum sostenibile",
    transformationPromise: seed || "Un percorso concreto verso cambiamento misurabile",
  };
}

function uniqueTitleSubtitleOptions(options: TitleSubtitleOption[]): TitleSubtitleOption[] {
  const seen = new Set<string>();
  const out: TitleSubtitleOption[] = [];
  for (const option of options) {
    const key = option.title.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}

export function generateTitleSubtitleOptions(input: FoundationGeneratorInput): TitleSubtitleOption[] {
  const seed = clean(input.ideaSeed);
  const lead = parseLeadName(seed);
  const titleV2Input = {
    idea: seed,
    genre: input.genre,
    promise: resolveNarrativePromise(seed, input.genre, ""),
    language: input.language,
  };

  if (hasSupernaturalThrillerSignals(seed)) {
    const timeTitle = buildTimeAnchoredTitle(seed);
    const commercialSubtitle = buildSupernaturalThrillerSubtitle(seed, "commercial");
    return [
      {
        title: timeTitle || (lead ? `Le Visioni di ${lead}` : "Ogni Notte alle 03:17"),
        subtitle: commercialSubtitle,
        commercialReason: "Hook temporale + promessa di morte annunciata e ricordi dal futuro",
        toneFit: input.tone,
        genreFit: "supernatural thriller",
        risk: "Richiede coerenza su orario, paese e visioni nel blueprint",
      },
      {
        title: lead ? `Il Destino di ${lead}` : "La Profezia del Paese",
        subtitle: buildSupernaturalThrillerSubtitle(seed, "safe"),
        commercialReason: "Paese chiuso + tensione collettiva + destino personale",
        toneFit: input.tone,
        genreFit: "thriller soprannaturale",
        risk: "Meno distintivo se manca l'ancora temporale",
      },
      {
        title: timeTitle || "Ricordi dal Futuro",
        subtitle: buildSupernaturalThrillerSubtitle(seed, "bold"),
        commercialReason: "Versione più audace sulla profezia e sul costo del sapere",
        toneFit: input.tone,
        genreFit: "psychological thriller",
        risk: "Più rischiosa ma più memorabile",
      },
    ];
  }

  const titleV2 = buildTitleV2Pipeline(titleV2Input);
  const validPool = filterValidTitleCandidates(
    [...titleV2.finalists, ...titleV2.semifinalists, ...titleV2.allCandidates],
    seed,
  );
  const v2Options = uniqueTitleSubtitleOptions(validPool.map((candidate) => ({
    title: candidate.title,
    subtitle: candidate.subtitle,
    commercialReason: `Title Intelligence V2: specificita' ${candidate.scores.specificity}/100, originalita' ${candidate.scores.originality}/100, rischio generico ${candidate.scores.genericRisk}/100.`,
    toneFit: input.tone,
    genreFit: input.genre,
    risk: candidate.couldBelongToThousandBooks
      ? "Troppo generico: richiede un elemento distintivo in piu'"
      : `Elementi distintivi: ${candidate.usedDistinctiveElements.slice(0, 3).join(", ") || "tema principale"}`,
  })));
  if (v2Options.length >= 3) {
    return v2Options.slice(0, 3);
  }

  const regenerated = regenerateTitleFromIdea(titleV2Input);
  if (regenerated) {
    const extra = filterValidTitleCandidates(
      [...titleV2.semifinalists, ...titleV2.allCandidates].filter((c) => c.title !== regenerated.title),
      seed,
    ).slice(0, 2);
    const rebuilt = uniqueTitleSubtitleOptions([regenerated, ...extra].map((candidate) => ({
      title: candidate.title,
      subtitle: "subtitle" in candidate ? candidate.subtitle : "",
      commercialReason: "commercialReason" in candidate
        ? candidate.commercialReason
        : `Title Intelligence V2: originalita' ${candidate.scores.originality}/100.`,
      toneFit: input.tone,
      genreFit: input.genre,
      risk: `Elementi distintivi: ${"usedDistinctiveElements" in candidate ? candidate.usedDistinctiveElements.slice(0, 3).join(", ") : "ricostruiti dall'idea"}`,
    })));
    if (rebuilt.length >= 3) return rebuilt.slice(0, 3);
  }

  if (isNonfictionExpressGenre(input.genre)) {
    const theme = seed.split(/[.!?…]/)[0]?.trim() || seed || input.genre;
    return [
      {
        title: "Ricomincia da Te",
        subtitle: `Un metodo pratico in 30 giorni per superare ${theme.toLowerCase().slice(0, 60)} e ritrovare fiducia, disciplina e direzione`,
        commercialReason: "Promessa chiara + timeframe + beneficio triplo",
        toneFit: input.tone,
        genreFit: "self-help / manuale",
        risk: "Titolo comune — compensare con sottotitolo specifico",
      },
      {
        title: lead ? `Il Metodo di ${lead}` : "Oltre il Blocco",
        subtitle: `Guida ${input.tone} con esercizi, casi reali e piano settimanale misurabile`,
        commercialReason: "Specifico sul tema dell'utente",
        toneFit: input.tone,
        genreFit: input.genre,
        risk: "Meno brandabile se il tema è troppo lungo",
      },
      {
        title: "La Disciplina che Resta",
        subtitle: `Come trasformare ${theme.toLowerCase().slice(0, 50)} in abitudini concrete — senza motivazione vuota`,
        commercialReason: "Hook anti-cliché + promessa di sostenibilità",
        toneFit: input.tone,
        genreFit: "personal growth",
        risk: "Meno legato al seed se il tema è molto di nicchia",
      },
    ];
  }

  if (isDarkRomance(input.genre)) {
    return [
      {
        title: "Cenere e Colpa",
        subtitle: "Un dark romance di desiderio, segreti e redenzione impossibile",
        commercialReason: "Evocativo + promessa emotiva dark romance",
        toneFit: "oscuro, magnetico",
        genreFit: "dark romance",
        risk: "Meno distintivo se il mercato è saturo",
      },
      {
        title: "La Villa delle Ceneri",
        subtitle: `Quando ${lead} torna dove tutto è bruciato, il desiderio diventa la trappola più elegante`,
        commercialReason: "Setting + personaggio + tensione",
        toneFit: input.tone,
        genreFit: "dark romance",
        risk: "Più legato al seed villa/incendio",
      },
      {
        title: "Confine Proibito",
        subtitle: "Protezione, possesso e verità — un amore che costa troppo per essere sicuro",
        commercialReason: "Hook emotivo universale per il genere",
        toneFit: input.tone,
        genreFit: "romance",
        risk: "Meno specifico sul seed",
      },
    ];
  }

  if (isFantasy(input.genre)) {
    return [
      {
        title: `Il Destino di ${lead}`,
        subtitle: `Un ${input.genre} ${input.tone} dove il potere ha un prezzo e il mondo non perdona chi esita`,
        commercialReason: "Protagonista + costo del potere",
        toneFit: input.tone,
        genreFit: "fantasy",
        risk: "Nome generico se il seed non usa un nome proprio",
      },
      {
        title: "Cenere e Corona",
        subtitle: "Magia, tradimento e un segreto di origine che cambia ogni regola",
        commercialReason: "Immagini fantasy + posta in gioco",
        toneFit: input.tone,
        genreFit: "epic fantasy",
        risk: "Meno aderente al seed specifico",
      },
      {
        title: lead ? `Il Destino di ${lead}` : "Oltre la Soglia",
        subtitle: `Un mondo ${input.tone} dove una scelta irreversibile definisce chi sopravvive alla propria storia`,
        commercialReason: "Aderente all'idea breve dell'utente",
        toneFit: input.tone,
        genreFit: input.genre,
        risk: "Titolo meno commerciale se il tema è astratto",
      },
    ];
  }

  if (isHorror(input.genre)) {
    return [
      {
        title: "Ciò che Resta nel Buio",
        subtitle: `Horror ${input.tone} — paura primaria, colpa e una minaccia che non chiede perdono`,
        commercialReason: "Atmosfera + promessa horror",
        toneFit: input.tone,
        genreFit: "horror",
        risk: "Meno legato al seed",
      },
      {
        title: lead ? `La Stanza di ${lead}` : "La Stanza Chiusa",
        subtitle: "Un luogo-personaggio che conserva ciò che il protagonista ha deciso di non vedere",
        commercialReason: "Hook location-based forte per horror",
        toneFit: input.tone,
        genreFit: "horror",
        risk: "Richiede setting coerente",
      },
      {
        title: lead ? `La Stanza di ${lead}` : "Non Guardare Indietro",
        subtitle: "Ogni indizio aumenta la posta in gioco — finché la verità diventa insopportabile",
        commercialReason: "Tensione escalante",
        toneFit: input.tone,
        genreFit: "thriller horror",
        risk: "Titolo ancorato al protagonista dell'idea",
      },
    ];
  }

  const entityTitle = regenerateTitleFromIdea(titleV2Input);
  if (entityTitle && !isInvalidGeneratedTitle(entityTitle.title, seed)) {
    return [
      {
        title: entityTitle.title,
        subtitle: entityTitle.subtitle,
        commercialReason: entityTitle.commercialReason,
        toneFit: input.tone,
        genreFit: input.genre,
        risk: "Titolo ricostruito dagli elementi distintivi dell'idea",
      },
      {
        title: lead ? `Il Confine di ${lead}` : "Oltre il Confine",
        subtitle: "Desiderio, paura e una scelta che non può essere disfatta",
        commercialReason: "Hook emotivo universale",
        toneFit: input.tone,
        genreFit: input.genre,
        risk: "Meno specifico",
      },
      {
        title: "La Ferita che Ti Somiglia",
        subtitle: `Storia ${input.tone} dove ogni verità ha un prezzo — e qualcuno deve pagarlo`,
        commercialReason: "Alta tensione commerciale",
        toneFit: input.tone,
        genreFit: "fiction",
        risk: "Più generico",
      },
    ];
  }

  return [
    {
      title: lead ? `${lead} e il Segreto` : `Oltre il ${input.genre}`,
      subtitle: `Un ${input.genre} ${input.tone} con tensione emotiva e payoff memorabile`,
      commercialReason: "Aderente a genere e tono",
      toneFit: input.tone,
      genreFit: input.genre,
      risk: "Meno distintivo",
    },
    {
      title: lead ? `Il Confine di ${lead}` : "Oltre il Confine",
      subtitle: "Desiderio, paura e una scelta che non può essere disfatta",
      commercialReason: "Hook emotivo universale",
      toneFit: input.tone,
      genreFit: input.genre,
      risk: "Meno specifico",
    },
    {
      title: "La Ferita che Ti Somiglia",
      subtitle: `Storia ${input.tone} dove ogni verità ha un prezzo — e qualcuno deve pagarlo`,
      commercialReason: "Alta tensione commerciale",
      toneFit: input.tone,
      genreFit: "fiction",
      risk: "Più generico",
    },
  ];
}

export function generateCommercialHookOptions(input: FoundationGeneratorInput): CommercialHookOption[] {
  const seed = clean(input.ideaSeed);
  const lead = parseLeadName(seed);
  const counterpart = parseCounterpartName(input.genre);

  if (isNonfictionExpressGenre(input.genre)) {
    const problem = seed.split(/[.!?]/)[0] || "la paura del fallimento";
    return [
      {
        type: "emotional",
        label: "Hook empatico",
        hook: `Se ti riconosci in ${problem.toLowerCase()}, questo percorso ti guida con gentilezza ma senza scuse verso cambiamento reale.`,
      },
      {
        type: "commercial",
        label: "Hook commerciale",
        hook: `Un percorso pratico per trasformare ${problem.toLowerCase()} in disciplina quotidiana, concreta e sostenibile.`,
      },
      {
        type: "cinematic",
        label: "Hook ad alta tensione",
        hook: `Non è un altro libro di teoria: è un metodo ${input.tone} con esercizi, accountability e risultati misurabili in poche settimane.`,
      },
    ];
  }

  if (isFantasy(input.genre)) {
    return [
      {
        type: "emotional",
        label: "Hook emozionale",
        hook: `Quando ${lead} scopre che il destino della sua famiglia è legato a un potere che teme, dovrà scegliere tra salvarli o perdere se stessa.`,
      },
      {
        type: "commercial",
        label: "Hook commerciale",
        hook: `Un ${input.genre} ${input.tone} dove magia, tradimento e un segreto di origine cambiano ogni regola del mondo.`,
      },
      {
        type: "cinematic",
        label: "Hook cinematico",
        hook: `${lead} credeva di controllare la propria storia — finché il costo del potere non diventa più alto di quanto può pagare.`,
      },
    ];
  }

  if (isDarkRomance(input.genre)) {
    return [
      {
        type: "emotional",
        label: "Hook emozionale",
        hook: `Tornare dove sua sorella è morta non era mai stato sicuro — ma scoprire che ${counterpart} la desidera è la forma più pericolosa di colpa.`,
      },
      {
        type: "commercial",
        label: "Hook commerciale",
        hook: `Un dark romance ${input.tone} dove desiderio proibito, segreti familiari e redenzione impossibile si confondono fino all'ultima pagina.`,
      },
      {
        type: "cinematic",
        label: "Hook cinematico",
        hook: `${lead} cerca verità e giustizia; ${counterpart} le offre protezione solo finché non minaccia ciò che la casa nasconde.`,
      },
    ];
  }

  if (isHorror(input.genre)) {
    return [
      {
        type: "emotional",
        label: "Hook emozionale",
        hook: `${lead} crede di aver seppellito il passato — finché il luogo stesso inizia a restituire ciò che ha negato.`,
      },
      {
        type: "commercial",
        label: "Hook commerciale",
        hook: `Horror ${input.tone}: una minaccia che cresce capitolo dopo capitolo, finché la paura primaria diventa inevitabile.`,
      },
      {
        type: "cinematic",
        label: "Hook cinematico",
        hook: `Ogni notte il confine tra colpa e sopravvivenza si assottiglia — e ${lead} non sa più cosa è reale.`,
      },
    ];
  }

  return [
    {
      type: "emotional",
      label: "Hook emozionale",
      hook: `${lead} attraversa un ${input.genre} ${input.tone} dove desiderio, paura e verità si scontrano fino a una scelta irreversibile.`,
    },
    {
      type: "commercial",
      label: "Hook commerciale",
      hook: `Un ${input.genre} ad alta posta in gioco — promessa chiara, personaggi segnati e finale che resta addosso.`,
    },
    {
      type: "cinematic",
      label: "Hook cinematico",
      hook: `${lead} credeva di controllare la storia. ${seed.split(/[.!?]/)[0] || "Il mondo"} le dimostra il contrario.`,
    },
  ];
}

export function foundationInputFromState(state: GuidedInterviewState): FoundationGeneratorInput {
  const ex = state.extracted ?? {};
  const express = state.expressConfig;
  return {
    genre: clean(state.selectedGenre || ex.genre || express?.genre) || "fiction",
    subgenre: clean(ex.subgenre),
    language: clean(ex.language || express?.language) || "Italiano",
    bookType: clean(state.selectedBookType || ex.bookType) || resolveExpressBookType(clean(state.selectedGenre || ex.genre || "fiction")),
    ideaSeed: clean(ex.editorialSynopsis || ex.promise || express?.ideaSeed || state.messages.find((m) => m.role === "user")?.content),
    tone: clean(state.selectedTone || ex.emotionalTone || express?.tone) || "emozionale",
    lengthPreset: normalizeLengthPreset(state.selectedLength || ex.bookLength || express?.length),
    titleMode: express?.titleMode,
    title: clean(ex.bookTitle || express?.title),
    controlLevel: express?.controlLevel,
  };
}

export function buildExpressTitleGeneratorInput(
  fields: Pick<
    ExpressForgeInput,
    "genre" | "language" | "tone" | "length" | "ideaSeed" | "titleMode" | "title"
  > & { subtitle?: string },
): FoundationGeneratorInput {
  return {
    genre: fields.genre,
    language: fields.language,
    tone: fields.tone,
    lengthPreset: normalizeLengthPreset(fields.length),
    ideaSeed: clean(fields.ideaSeed) || "libro in lavorazione",
    bookType: resolveExpressBookType(fields.genre),
    titleMode: fields.titleMode,
    title: clean(fields.title) || undefined,
  };
}

export function buildBookFoundationFromExpressScenario(
  scenario: CompleteExpressBookPackage,
  expressInput?: ExpressForgeInput,
): BookFoundationLock {
  const lengthPreset = normalizeLengthPreset(expressInput?.length);
  const lengthConfig = resolveLengthPresetConfig(lengthPreset, scenario.genre);
  const genInput: FoundationGeneratorInput = {
    genre: scenario.genre,
    subgenre: scenario.subgenre,
    language: scenario.language,
    bookType: resolveExpressBookType(scenario.genre),
    ideaSeed: scenario.editorialSynopsis,
    tone: expressInput?.tone || scenario.atmosphere,
    lengthPreset,
    titleMode: expressInput?.titleMode,
    title: scenario.title,
    controlLevel: expressInput?.controlLevel,
  };

  const foundation: BookFoundationLock = {
    bookType: resolveExpressBookType(scenario.genre),
    genre: scenario.genre,
    subgenre: scenario.subgenre,
    language: scenario.language,
    lengthPreset,
    chapterCount: scenario.chapterCount || lengthConfig.chapterCount,
    subchaptersEnabled: scenario.subchaptersEnabled ?? lengthConfig.subchaptersDefault,
    tone: expressInput?.tone || scenario.atmosphere,
    title: scenario.title,
    subtitle: scenario.subtitle,
    commercialHook: scenario.hook,
    targetAudience: scenario.idealReader ?? scenario.targetAudience,
    marketPromise: scenario.transformationPromise ?? scenario.marketPromise,
    characters: scenario.characters?.length ? scenario.characters : generateGenreAwareCharacters(genInput),
    foundationCharacters: forgeCastToFoundation(
      scenario.characters?.length ? scenario.characters : generateGenreAwareCharacters(genInput),
      "auto",
    ),
    chapterStructure: generateChapterStructure(genInput, scenario.chapterCount || lengthConfig.chapterCount),
    titleCandidates: generateTitleSubtitleOptions(genInput),
    hookCandidates: generateCommercialHookOptions(genInput),
    structurePreset: scenario.structurePreference || `${lengthPreset} · ${lengthConfig.pacing}`,
    confidence: 0.88,
    missingFields: [],
    locked: false,
  };

  if (isNonfictionExpressGenre(scenario.genre)) {
    foundation.nonfictionSubjects = {
      idealReader: scenario.idealReader ?? scenario.targetAudience,
      readerProblem: scenario.readerProblem ?? scenario.centralConflict,
      readerPain: scenario.emotionalWound,
      readerDesire: scenario.desire,
      methodFramework: scenario.methodFramework,
      transformationPromise: scenario.transformationPromise,
      transformationArc: scenario.endingDirection,
      guideVoice: scenario.atmosphere,
      caseStudyTypes: scenario.exercises?.slice(0, 3),
    };
  }

  foundation.missingFields = validateBookFoundationFields(foundation);
  foundation.confidence = Math.max(0.4, 1 - foundation.missingFields.length * 0.08);
  return foundation;
}

export function buildBookFoundationLock(state: GuidedInterviewState): BookFoundationLock {
  const input = foundationInputFromState(state);
  const ex = state.extracted ?? {};

  if (state.bookFoundation) {
    const merged: BookFoundationLock = {
      ...state.bookFoundation,
      title: clean(ex.bookTitle) || state.bookFoundation.title,
      subtitle: clean(ex.bookSubtitle) || state.bookFoundation.subtitle,
      commercialHook: clean(ex.openingHook) || state.bookFoundation.commercialHook,
      targetAudience: clean(ex.targetReader) || state.bookFoundation.targetAudience,
      locked: Boolean(state.bookFoundationLocked),
    };
    merged.missingFields = validateBookFoundationFields(merged);
    merged.confidence = Math.max(0.35, 1 - merged.missingFields.length * 0.07);
    return merged;
  }

  const lengthConfig = resolveLengthPresetConfig(input.lengthPreset, input.genre);
  const memory =
    state.forgeMemory && Array.isArray(state.messages) ? getForgeMemory(state) : null;

  let characters = state.characters?.length ? [...state.characters] : generateGenreAwareCharacters(input);
  if (!characters.some((c) => clean(c.name).length >= 2)) {
    characters = generateGenreAwareCharacters(input);
  }

  const titleCandidates = generateTitleSubtitleOptions(input);
  const hookCandidates = generateCommercialHookOptions(input);

  const title =
    clean(ex.bookTitle) ||
    clean(state.titleIntelligence?.definitiveTitle) ||
    (memory ? clean(memory.slotValues.title) : "") ||
    (input.titleMode !== "suggest" ? clean(input.title) : "") ||
    titleCandidates[0]?.title ||
    "";

  const subtitle =
    clean(ex.bookSubtitle) ||
    clean(state.titleIntelligence?.subtitle) ||
    (memory ? clean(memory.slotValues.subtitle) : "") ||
    titleCandidates[0]?.subtitle ||
    "";

  const commercialHook =
    clean(ex.openingHook) ||
    clean(state.titleIntelligence?.commercialHook) ||
    hookCandidates[1]?.hook ||
    "";

  const chapterCount =
    Number(ex.chapterCount || memory.slotValues.chapterCount) ||
    lengthConfig.chapterCount;

  const foundation: BookFoundationLock = {
    bookType: input.bookType || resolveExpressBookType(input.genre),
    genre: input.genre,
    subgenre: clean(ex.subgenre) || input.subgenre || input.genre,
    language: input.language,
    lengthPreset: input.lengthPreset,
    chapterCount: chapterCount > 0 ? chapterCount : lengthConfig.chapterCount,
    subchaptersEnabled:
      ex.subchaptersPreference === "true" || Boolean(state.wantsSubchapters) || lengthConfig.subchaptersDefault,
    tone: clean(state.selectedTone || ex.emotionalTone || state.expressConfig?.tone) || input.tone,
    title,
    subtitle,
    titleCandidates,
    hookCandidates,
    commercialHook,
    targetAudience: clean(ex.targetReader) || (memory ? clean(memory.slotValues.audience) : "") || "",
    marketPromise: clean(ex.promise) || clean(ex.readerTransformation) || "",
    characters,
    foundationCharacters: forgeCastToFoundation(characters, "auto"),
    chapterStructure: generateChapterStructure(input, chapterCount > 0 ? chapterCount : lengthConfig.chapterCount),
    structurePreset: clean(ex.structurePreference) || `${input.lengthPreset} · ${lengthConfig.pacing}`,
    fieldProvenance: undefined,
    confidence: 0.5,
    missingFields: [],
    locked: Boolean(state.bookFoundationLocked),
    flowStep: undefined,
  };

  if (isNonfictionExpressGenre(input.genre)) {
    foundation.nonfictionSubjects = generateNonfictionSubjects(input);
  }

  foundation.missingFields = validateBookFoundationFields(foundation);
  foundation.confidence = Math.max(0.35, 1 - foundation.missingFields.length * 0.07);
  return foundation;
}

function hasNamedCharacter(characters: ForgeCharacter[]): boolean {
  return characters.some((c) => clean(c.name).length >= 2);
}

function hasProtagonist(characters: ForgeCharacter[]): boolean {
  return characters.some((c) => c.role === "protagonist" && clean(c.name).length >= 2);
}

function hasAntagonistOrCounterpart(characters: ForgeCharacter[]): boolean {
  return characters.some(
    (c) => (c.role === "antagonist" || c.role === "supporting") && clean(c.name).length >= 2,
  );
}

export function validateBookFoundationFields(foundation: BookFoundationLock): string[] {
  const missing: string[] = [];
  const genre = foundation.genre;

  if (!clean(foundation.genre)) missing.push("genre");
  if (!clean(foundation.language)) missing.push("language");
  if (!foundation.lengthPreset) missing.push("lengthPreset");
  if (!foundation.chapterCount || foundation.chapterCount < 1) missing.push("chapterCount");

  const hasTitle = clean(foundation.title).length >= 2;
  const hasTitleCandidates = (foundation.titleCandidates?.length ?? 0) >= 1;
  if (!hasTitle && !hasTitleCandidates) missing.push("title");

  const hasSubtitle = clean(foundation.subtitle).length >= 10;
  const hasSubtitleCandidates = foundation.titleCandidates?.some((t) => clean(t.subtitle).length >= 10);
  if (!hasSubtitle && !hasSubtitleCandidates) missing.push("subtitle");

  const hook = clean(foundation.commercialHook);
  if (!hook || hook.length < 20 || isMetadataOnly(hook)) missing.push("commercialHook");

  if (isNonfictionExpressGenre(genre)) {
    const nf = foundation.nonfictionSubjects;
    if (!clean(nf?.idealReader) && !clean(foundation.targetAudience)) missing.push("idealReader");
    if (!clean(nf?.readerProblem)) missing.push("readerProblem");
    if (!clean(nf?.methodFramework) && !clean(nf?.transformationPromise)) missing.push("methodFramework");
  } else if (isPoetryExpressGenre(genre)) {
    if (!hasNamedCharacter(foundation.characters)) missing.push("voice");
  } else if (isRomance(genre) || isDarkRomance(genre)) {
    if (!hasProtagonist(foundation.characters)) missing.push("protagonist");
    if (!hasAntagonistOrCounterpart(foundation.characters)) missing.push("loveInterest");
  } else if (isHorror(genre) || isThriller(genre)) {
    if (!hasProtagonist(foundation.characters)) missing.push("protagonist");
    if (!hasAntagonistOrCounterpart(foundation.characters)) missing.push("threat");
  } else if (isFantasy(genre)) {
    if (!hasProtagonist(foundation.characters)) missing.push("protagonist");
    if (foundation.characters.filter((c) => clean(c.name).length >= 2).length < 2) {
      missing.push("allyOrAntagonist");
    }
  } else {
    if (!hasProtagonist(foundation.characters)) missing.push("protagonist");
    if (!hasNamedCharacter(foundation.characters)) missing.push("characters");
  }

  return missing;
}

function parseChapterCountValue(value?: string): number {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function validateFoundationFieldsFromSeed(seed: {
  extracted?: Record<string, string | undefined>;
  characters?: ForgeCharacter[];
  titleIntelligence?: GuidedInterviewState["titleIntelligence"];
  bookFoundationLocked?: boolean;
  selectedGenre?: string;
}): string[] {
  const ex = seed.extracted ?? {};
  const genre = clean(seed.selectedGenre || ex.genre) || "fiction";
  const foundation: BookFoundationLock = {
    bookType: clean(ex.bookType) || resolveExpressBookType(genre),
    genre,
    subgenre: clean(ex.subgenre) || genre,
    language: clean(ex.language) || "Italian",
    lengthPreset: normalizeLengthPreset(ex.bookLength),
    chapterCount: parseChapterCountValue(ex.chapterCount) || LENGTH_PRESET_CONFIGS.medio.chapterCount,
    subchaptersEnabled: ex.subchaptersPreference === "true",
    title: clean(ex.bookTitle) || clean(seed.titleIntelligence?.definitiveTitle) || "",
    subtitle: clean(ex.bookSubtitle) || clean(seed.titleIntelligence?.subtitle) || "",
    commercialHook: clean(ex.openingHook) || clean(seed.titleIntelligence?.commercialHook) || "",
    targetAudience: clean(ex.targetReader) || "",
    marketPromise: clean(ex.promise) || clean(ex.readerTransformation) || "",
    characters: seed.characters ?? [],
    structurePreset: clean(ex.structurePreference) || "medio",
    confidence: 0.5,
    missingFields: [],
    locked: Boolean(seed.bookFoundationLocked),
  };
  if (isNonfictionExpressGenre(genre)) {
    foundation.nonfictionSubjects = {
      idealReader: clean(ex.targetReader),
      readerProblem: clean(ex.centralConflict),
      methodFramework: clean(ex.promise) || clean(ex.structurePreference),
      transformationPromise: clean(ex.readerTransformation) || clean(ex.promise),
    };
  }
  return validateBookFoundationFields(foundation);
}

export function validateBookFoundationLock(state: GuidedInterviewState): {
  complete: boolean;
  missingFields: string[];
  foundation: BookFoundationLock;
} {
  const foundation = buildBookFoundationLock(state);
  const missingFields = validateBookFoundationFields(foundation);
  return {
    complete: missingFields.length === 0 && Boolean(state.bookFoundationLocked),
    missingFields,
    foundation,
  };
}

export function isBookFoundationComplete(state: GuidedInterviewState): boolean {
  if (state.bookFoundation) {
    return validateBookFoundationFields(state.bookFoundation).length === 0;
  }
  const { missingFields } = validateBookFoundationLock(state);
  return missingFields.length === 0;
}

export function isBookFoundationLocked(state: GuidedInterviewState): boolean {
  return Boolean(state.bookFoundationLocked) && isBookFoundationComplete(state);
}

export function generateFoundationSuggestions(
  state: GuidedInterviewState,
): BookFoundationLock {
  const input = foundationInputFromState(state);
  const lengthConfig = resolveLengthPresetConfig(input.lengthPreset, input.genre);
  const characters = generateFoundationCast(input);
  const titleCandidates = generateTitleSubtitleOptions(input);
  const hookCandidates = generateCommercialHookOptions(input);
  const selectedTitle = titleCandidates[1] ?? titleCandidates[0]!;

  const foundation: BookFoundationLock = {
    bookType: input.bookType || resolveExpressBookType(input.genre),
    genre: input.genre,
    subgenre: input.subgenre || input.genre,
    language: input.language,
    lengthPreset: input.lengthPreset,
    chapterCount: lengthConfig.chapterCount,
    subchaptersEnabled: lengthConfig.subchaptersDefault,
    tone: input.tone,
    title: clean(input.title) || selectedTitle.title,
    subtitle: selectedTitle.subtitle,
    titleCandidates,
    hookCandidates,
    commercialHook: hookCandidates[1]?.hook || hookCandidates[0]!.hook,
    targetAudience: isNonfictionExpressGenre(input.genre)
      ? "Adulti che cercano strumenti pratici e risultati misurabili"
      : `Lettori di ${input.genre} attratti da tono ${input.tone}`,
    marketPromise: isNonfictionExpressGenre(input.genre)
      ? generateNonfictionSubjects(input).transformationPromise!
      : hookCandidates[0]!.hook,
    characters: foundationCastToForge(characters),
    foundationCharacters: characters,
    nonfictionSubjects: isNonfictionExpressGenre(input.genre)
      ? generateNonfictionSubjects(input)
      : undefined,
    chapterStructure: generateChapterStructure(input, lengthConfig.chapterCount),
    structurePreset: `${input.lengthPreset} · ${lengthConfig.pacing}`,
    confidence: 0.9,
    missingFields: [],
    locked: false,
  };
  foundation.missingFields = validateBookFoundationFields(foundation);
  return foundation;
}

export function applyBookFoundationToForgeMemory(
  state: GuidedInterviewState,
  foundation: BookFoundationLock,
): GuidedInterviewState {
  const memory = state.forgeMemory
    ? {
        ...state.forgeMemory,
        slotValues: { ...state.forgeMemory.slotValues },
        answeredSlots: { ...state.forgeMemory.answeredSlots },
      }
    : undefined;

  const ex = {
    ...state.extracted,
    genre: foundation.genre,
    subgenre: foundation.subgenre,
    language: foundation.language,
    bookLength: foundation.lengthPreset,
    chapterCount: String(foundation.chapterCount),
    subchaptersPreference: String(foundation.subchaptersEnabled),
    bookTitle: foundation.title,
    bookSubtitle: foundation.subtitle,
    openingHook: foundation.commercialHook,
    promise: foundation.marketPromise,
    targetReader: foundation.targetAudience,
    structurePreference: foundation.structurePreset,
    bookType: foundation.bookType,
    readerTransformation: foundation.nonfictionSubjects?.transformationPromise ?? state.extracted?.readerTransformation,
    centralConflict: foundation.nonfictionSubjects?.readerProblem ?? state.extracted?.centralConflict,
  };

  const titleIntelligence = {
    ...state.titleIntelligence,
    workingTitle: foundation.title,
    definitiveTitle: foundation.title,
    subtitle: foundation.subtitle,
    commercialHook: foundation.commercialHook,
    commercialPromise: foundation.marketPromise,
    approved: foundation.locked,
  };

  const next: GuidedInterviewState = {
    ...state,
    bookFoundation: foundation,
    bookFoundationLocked: foundation.locked,
    characters: foundation.characters,
    selectedGenre: foundation.genre,
    selectedBookType: foundation.bookType,
    selectedLength: foundation.lengthPreset,
    selectedTone: foundation.tone || state.selectedTone,
    wantsSubchapters: foundation.subchaptersEnabled,
    extracted: ex,
    titleIntelligence,
  };

  if (memory) {
    const slots: Array<[string, string | number | boolean]> = [
      ["genre", foundation.genre],
      ["subgenre", foundation.subgenre],
      ["language", foundation.language],
      ["bookType", foundation.bookType],
      ["title", foundation.title],
      ["subtitle", foundation.subtitle],
      ["promise", foundation.marketPromise],
      ["audience", foundation.targetAudience],
      ["chapterCount", String(foundation.chapterCount)],
      ["subchaptersEnabled", foundation.subchaptersEnabled],
      ["tone", state.selectedTone || ex.emotionalTone || ""],
      ["protagonist", foundation.characters.find((c) => c.role === "protagonist")?.name || ""],
      ["antagonist", foundation.characters.find((c) => c.role === "antagonist")?.name || ""],
    ];
    for (const [key, value] of slots) {
      if (value) {
        (memory.slotValues as Record<string, unknown>)[key] = value;
        (memory.answeredSlots as Record<string, boolean>)[key] = true;
      }
    }
    next.forgeMemory = memory;
  }

  return next;
}

export function confirmBookFoundationLock(
  state: GuidedInterviewState,
  foundation?: BookFoundationLock,
): GuidedInterviewState {
  const autoMode =
    state.expressConfig?.controlLevel === "auto" ||
    state.forgeMode === "express";
  let base = foundation ?? buildBookFoundationLock(state);
  if (autoMode) {
    base = autoCompleteMissingFoundationFields(state, base);
  }
  const missing = validateBookFoundationFields(base);
  if (missing.length > 0) {
    return {
      ...state,
      bookFoundation: { ...base, missingFields: missing, locked: false },
      bookFoundationLocked: false,
    };
  }
  let next = applyBookFoundationToForgeMemory(state, { ...base, locked: true, missingFields: [] });
  const memory = next.forgeMemory ?? getForgeMemory(next);
  next = {
    ...next,
    forgeMemory: advanceStoryRoomStage(memory, { forceStageId: "blueprintReady" }),
  };
  return next;
}

export function autoFillBookFoundationIfNeeded(state: GuidedInterviewState): GuidedInterviewState {
  const autoMode =
    state.expressConfig?.controlLevel === "auto" ||
    state.forgeMode === "express";
  if (!autoMode && isBookFoundationComplete(state)) return state;
  if (isBookFoundationLocked(state)) return state;

  const current = buildBookFoundationLock(state);
  if (current.missingFields.length === 0) {
    if (autoMode) {
      return applyBookFoundationToForgeMemory(state, { ...current, locked: true, missingFields: [] });
    }
    return state;
  }

  const merged = autoCompleteMissingFoundationFields(state, {
    ...current,
    title: clean(current.title) ? current.title : "",
    subtitle: clean(current.subtitle) ? current.subtitle : "",
    commercialHook: clean(current.commercialHook) ? current.commercialHook : "",
    characters: current.characters.filter((c) => clean(c.name).length >= 2).length
      ? current.characters
      : [],
    fieldProvenance: {
      ...current.fieldProvenance,
      ...(clean(current.title) ? { title: { source: "user" as const, locked: true } } : {}),
      ...(clean(current.subtitle) ? { subtitle: { source: "user" as const, locked: true } } : {}),
      ...(clean(current.commercialHook) ? { commercialHook: { source: "user" as const, locked: true } } : {}),
    },
  });

  if (autoMode && merged.missingFields.length === 0) {
    return applyBookFoundationToForgeMemory(state, { ...merged, locked: true });
  }
  return applyBookFoundationToForgeMemory(state, merged);
}

export const BOOK_FOUNDATION_ASSISTANT_MESSAGE =
  "Ho quasi tutto. Prima di scrivere il blueprint ti propongo personaggi, titolo e hook così non partiamo deboli.";

export const BOOK_FOUNDATION_MISSING_MESSAGE =
  "Prima blocchiamo le fondamenta del libro.";

const MISSING_FIELD_ACTION_MAP: Record<string, MissingFieldAction> = {
  genre: { field: "genre", label: "Genere mancante", cta: "Completa setup", action: "complete" },
  language: { field: "language", label: "Lingua mancante", cta: "Imposta lingua", action: "complete" },
  lengthPreset: { field: "lengthPreset", label: "Lunghezza mancante", cta: "Scegli preset", action: "structure" },
  chapterCount: { field: "chapterCount", label: "Capitoli mancanti", cta: "Genera struttura", action: "structure" },
  title: { field: "title", label: "Titolo mancante", cta: "Genera 3 titoli", action: "titles" },
  subtitle: { field: "subtitle", label: "Sottotitolo mancante", cta: "Genera sottotitolo", action: "titles" },
  commercialHook: { field: "commercialHook", label: "Hook mancante", cta: "Genera hook", action: "hook" },
  idealReader: { field: "idealReader", label: "Lettore ideale mancante", cta: "Genera lettore ideale", action: "nonfiction" },
  readerProblem: { field: "readerProblem", label: "Problema lettore mancante", cta: "Genera problema", action: "nonfiction" },
  methodFramework: { field: "methodFramework", label: "Metodo mancante", cta: "Genera metodo", action: "nonfiction" },
  protagonist: { field: "protagonist", label: "Protagonista mancante", cta: "Genera cast", action: "characters" },
  loveInterest: { field: "loveInterest", label: "Love interest mancante", cta: "Genera cast", action: "characters" },
  threat: { field: "threat", label: "Minaccia mancante", cta: "Genera cast", action: "characters" },
  allyOrAntagonist: { field: "allyOrAntagonist", label: "Alleato/antagonista mancante", cta: "Genera cast", action: "characters" },
  characters: { field: "characters", label: "Personaggi mancanti", cta: "Genera cast", action: "characters" },
  voice: { field: "voice", label: "Voce poetica mancante", cta: "Genera voce", action: "characters" },
};

export function getMissingFieldActions(missingFields: string[]): MissingFieldAction[] {
  return missingFields.map(
    (field) =>
      MISSING_FIELD_ACTION_MAP[field] ?? {
        field,
        label: `${field} mancante`,
        cta: "Genera automaticamente",
        action: "complete" as const,
      },
  );
}

export function generateFoundationCast(input: FoundationGeneratorInput): FoundationCharacter[] {
  const base = generateGenreAwareCharacters(input);
  let cast = forgeCastToFoundation(base, "auto");

  if (input.lengthPreset === "epico" && !isNonfictionExpressGenre(input.genre)) {
    const extras: FoundationCharacter[] = [
      {
        id: "fc-ally-2",
        name: "Lyra",
        role: "alleato",
        roleIndex: cast.length + 1,
        importance: "secondario",
        innerWound: "Lealtà divisa tra fazione e amicizia",
        desire: "Proteggere il protagonista senza tradire il proprio ordine",
        arcDirection: "Da alleato cauto a compagno indispensabile",
        source: "auto",
        locked: false,
      },
      {
        id: "fc-rival-1",
        name: "Darian",
        role: "rivale",
        roleIndex: cast.length + 2,
        importance: "secondario",
        innerWound: "Ambizione non riconosciuta",
        desire: "Dimostrare di meritare il destino del protagonista",
        conflictWithProtagonist: "Specchia ciò che il protagonista potrebbe diventare se cede alla paura",
        source: "auto",
        locked: false,
      },
      {
        id: "fc-traitor",
        name: "Mira",
        role: "traditore",
        roleIndex: cast.length + 3,
        importance: "secondario",
        secret: "Già legata alla forza oscura prima dell'inizio",
        arcDirection: "Tradimento che alza la posta in gioco al midpoint",
        source: "auto",
        locked: false,
      },
    ];
    cast = [...cast, ...extras];
  }

  return cast.map((c, i) => ({ ...c, roleIndex: i + 1 }));
}

export function generateChapterStructure(
  input: FoundationGeneratorInput,
  chapterCount?: number,
): ChapterStructureSeed[] {
  const config = resolveLengthPresetConfig(input.lengthPreset, input.genre);
  const count = chapterCount ?? config.chapterCount;
  if (isPoetryExpressGenre(input.genre)) {
    const labels = ["Origine", "Corpo", "Frattura", "Ritorno", "Eco", "Soglia", "Luce residua"];
    return Array.from({ length: count }, (_, index) => ({
      chapter: index + 1,
      title: `Sezione ${index + 1} — ${labels[index % labels.length]}`,
      purpose:
        index === 0
          ? "Aprire voce, tema e immagini ricorrenti della raccolta."
          : index === count - 1
            ? "Chiudere con eco emotiva e immagine finale memorabile."
            : "Variare il tema con ritmo, simboli e progressione emotiva.",
    }));
  }
  const acts = input.lengthPreset === "breve" ? 3 : input.lengthPreset === "epico" ? 5 : 4;
  const perAct = Math.max(2, Math.floor(count / acts));
  const seeds: ChapterStructureSeed[] = [];

  for (let i = 1; i <= count; i++) {
    const act = Math.min(acts, Math.ceil(i / perAct));
    let purpose = "Sviluppo e tensione";
    if (i === 1) purpose = "Setup, promessa e innesco";
    else if (i === Math.floor(count * 0.25)) purpose = "Primo punto di svolta";
    else if (i === Math.floor(count * 0.5)) purpose = "Midpoint — posta in gioco raddoppia";
    else if (i === Math.floor(count * 0.75)) purpose = "Crisi / dark moment";
    else if (i === count) purpose = "Climax e risoluzione";
    else if (act === acts) purpose = "Escalation verso il finale";

    seeds.push({
      chapter: i,
      title: `Capitolo ${i}`,
      purpose: `${purpose} · atto ${act} · ${config.pacing}`,
    });
  }
  return seeds;
}

export function applyBestTitleOption(options: TitleSubtitleOption[]): TitleSubtitleOption {
  return options.find((o) => o.risk && !/comune|generico|meno/i.test(o.risk)) ?? options[0]!;
}

function isFieldLocked(foundation: BookFoundationLock, field: string): boolean {
  return Boolean(foundation.fieldProvenance?.[field]?.locked);
}

function markField(
  provenance: Record<string, FoundationFieldProvenance>,
  field: string,
  source: "auto" | "user",
  locked = false,
): Record<string, FoundationFieldProvenance> {
  return { ...provenance, [field]: { source, locked } };
}

export function autoCompleteMissingFoundationFields(
  state: GuidedInterviewState,
  foundation?: BookFoundationLock,
): BookFoundationLock {
  const input = foundationInputFromState(state);
  const base = foundation ?? buildBookFoundationLock(state);
  const missing = validateBookFoundationFields(base);
  if (missing.length === 0) return base;

  let next: BookFoundationLock = { ...base };
  let provenance = { ...base.fieldProvenance };

  const lengthConfig = resolveLengthPresetConfig(
    next.lengthPreset || input.lengthPreset,
    next.genre || input.genre,
  );

  if (missing.includes("lengthPreset") && !isFieldLocked(next, "lengthPreset")) {
    next.lengthPreset = input.lengthPreset;
    provenance = markField(provenance, "lengthPreset", "auto");
  }

  if (missing.includes("chapterCount") && !isFieldLocked(next, "chapterCount")) {
    next.chapterCount = lengthConfig.chapterCount;
    next.chapterStructure = generateChapterStructure(input, next.chapterCount);
    next.structurePreset = `${next.lengthPreset} · ${lengthConfig.pacing}`;
    provenance = markField(provenance, "chapterCount", "auto");
    provenance = markField(provenance, "structurePreset", "auto");
  }

  const needsCharacters =
    missing.some((f) =>
      ["protagonist", "loveInterest", "threat", "allyOrAntagonist", "characters", "voice"].includes(f),
    );
  if (needsCharacters && !isFieldLocked(next, "characters")) {
    const cast = generateFoundationCast(input);
    const unlocked = (next.foundationCharacters ?? []).filter((c) => c.locked);
    const mergedCast =
      unlocked.length > 0
        ? [
            ...unlocked,
            ...cast.filter((c) => !unlocked.some((u) => u.role === c.role)),
          ]
        : cast;
    next.foundationCharacters = mergedCast;
    next.characters = foundationCastToForge(mergedCast);
    provenance = markField(provenance, "characters", "auto");
  }

  if (
    (missing.includes("idealReader") || missing.includes("readerProblem") || missing.includes("methodFramework")) &&
    !isFieldLocked(next, "nonfictionSubjects")
  ) {
    next.nonfictionSubjects = generateNonfictionSubjects(input);
    provenance = markField(provenance, "nonfictionSubjects", "auto");
    if (!clean(next.targetAudience)) {
      next.targetAudience = next.nonfictionSubjects.idealReader ?? "";
    }
  }

  const titleOptions = next.titleCandidates?.length
    ? next.titleCandidates
    : generateTitleSubtitleOptions(input);
  next.titleCandidates = titleOptions;

  if (missing.includes("title") && !isFieldLocked(next, "title") && !clean(next.title)) {
    const best = applyBestTitleOption(titleOptions);
    next.title = best.title;
    provenance = markField(provenance, "title", "auto");
  }

  if (missing.includes("subtitle") && !isFieldLocked(next, "subtitle") && !clean(next.subtitle)) {
    const best = applyBestTitleOption(titleOptions);
    next.subtitle = best.subtitle;
    provenance = markField(provenance, "subtitle", "auto");
  }

  const hookOptions = next.hookCandidates?.length
    ? next.hookCandidates
    : generateCommercialHookOptions(input);
  next.hookCandidates = hookOptions;

  if (missing.includes("commercialHook") && !isFieldLocked(next, "commercialHook")) {
    next.commercialHook = hookOptions[1]?.hook || hookOptions[0]?.hook || "";
    provenance = markField(provenance, "commercialHook", "auto");
  }

  if (!next.chapterStructure?.length && !isFieldLocked(next, "structurePreset")) {
    next.chapterStructure = generateChapterStructure(input, next.chapterCount);
    next.structurePreset = next.structurePreset || `${next.lengthPreset} · ${lengthConfig.pacing}`;
    provenance = markField(provenance, "structurePreset", "auto");
  }

  if (!clean(next.language) && !isFieldLocked(next, "language")) {
    next.language = input.language;
    provenance = markField(provenance, "language", "auto");
  }

  if (!clean(next.tone) && !isFieldLocked(next, "tone")) {
    next.tone = input.tone;
    provenance = markField(provenance, "tone", "auto");
  }

  next.fieldProvenance = provenance;
  next.missingFields = validateBookFoundationFields(next);
  next.confidence = Math.max(0.4, 1 - next.missingFields.length * 0.07);
  return next;
}

export function shouldShowFoundationFlow(state: GuidedInterviewState): boolean {
  if (state.bookFoundationLocked) return false;
  if (state.forgeMode === "express" && state.bookFoundation) return true;
  const genre = clean(state.selectedGenre || state.extracted?.genre);
  return Boolean(genre);
}

export function resolveFoundationFlowStep(foundation: BookFoundationLock): BookFoundationFlowStep {
  if (foundation.flowStep) return foundation.flowStep;
  if (!clean(foundation.language) || !foundation.lengthPreset) return "setup";
  const charMissing = foundation.missingFields.some((f) =>
    ["protagonist", "loveInterest", "threat", "allyOrAntagonist", "characters", "idealReader", "readerProblem", "methodFramework"].includes(f),
  );
  if (charMissing) return "characters";
  const titleMissing = foundation.missingFields.some((f) =>
    ["title", "subtitle", "commercialHook"].includes(f),
  );
  if (titleMissing) return "titleHook";
  return "lock";
}

export function advanceFoundationFlowStep(
  foundation: BookFoundationLock,
  step?: BookFoundationFlowStep,
): BookFoundationLock {
  const current = step ?? resolveFoundationFlowStep(foundation);
  const order: BookFoundationFlowStep[] = ["setup", "characters", "titleHook", "lock"];
  const idx = order.indexOf(current);
  const nextStep = order[Math.min(idx + 1, order.length - 1)]!;
  return { ...foundation, flowStep: nextStep };
}
