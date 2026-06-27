import type { Language } from "@/types/book";
import { inferGenreFromText, type GenreInference } from "./genre-inference";
import { buildTitleV2Pipeline, type TitleV2Candidate } from "@/lib/title-intelligence-v2";

export const WIZARD_TITLE_FREE_REGENS = 3;
const FREE_REGENS_KEY = "scriptora-wizard-title-free-regens";

export type TitleProposalBadge =
  | "Più dark"
  | "Più commerciale"
  | "Più poetico"
  | "Più BookTok"
  | "Più KDP"
  | "Più pratico"
  | "Più metodo"
  | "Più chiaro";

export type TitleProposal = {
  title: string;
  subtitle: string;
  perceivedGenre: string;
  editorialPromise: string;
  hookScore: number;
  titleScore?: number;
  memorabilityScore?: number;
  originalityScore?: number;
  specificityScore?: number;
  amazonSeoScore?: number;
  commercialHookScore?: number;
  storyCoherenceScore?: number;
  genericRisk?: number;
  usedDistinctiveElements?: string[];
  rationale: string;
  badge: TitleProposalBadge;
  inference: GenreInference;
};

export type TitleForgeContext = {
  bookTypeId?: string;
  level1BookType?: string;
  forgePresetId?: string | null;
  category?: string;
  subcategory?: string;
  subgenre?: string;
};

export const TITLE_FORGE_PHASES = [
  "Sto leggendo il DNA commerciale della tua idea…",
  "Sto cercando il titolo che resta addosso…",
  "Sto allineando genere, promessa e mercato…",
  "Sto modellando sottotitoli ad alta retention…",
  "Quasi pronto: seleziona il titolo che ti chiama.",
] as const;

function hashSeed(input: string): number {
  return Array.from(input).reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function pick<T>(list: T[], seed: number, offset = 0): T {
  return list[(seed + offset) % list.length];
}

const FORBIDDEN_ABUSED_TITLES = new Set([
  "ombre che bruciano",
  "il patto delle ombre",
]);

const STOP_TITLE_WORDS = new Set([
  "una","uno","un","il","lo","la","le","gli","i","di","del","della","delle","degli","dei","da","dal","dallo","dalla","nelle","nella","nel","nei",
  "e","che","con","per","tra","fra","sul","sulla","sulle","sui","suo","sua","sue","suo","mio","mia","tuo","tua","loro",
  "storia","romanzo","libro","racconto","scrivi","scrivere","voglio","vorrei","crea","genera",
  "dark","romance","thriller","fantasy","horror","self","help","manuale","guida",
]);

function titleCaseIt(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (["di","del","della","delle","degli","dei","e","che","con","per","tra","fra"].includes(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitleKeywords(idea: string, context?: TitleForgeContext): string[] {
  const raw = `${idea} ${context?.category || ""} ${context?.subcategory || ""} ${context?.subgenre || ""}`;
  const tokens = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9àèéìòù'\s-]/gi, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 4 && !STOP_TITLE_WORDS.has(x));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
    if (out.length >= 12) break;
  }
  return out;
}

function hasSemanticPermissionForAbusedTitle(title: string, idea: string): boolean {
  const t = title.trim().toLowerCase();
  if (!FORBIDDEN_ABUSED_TITLES.has(t)) return true;
  const hay = idea.toLowerCase();
  return /\b(ombra|ombre|brucia|bruciano|fuoco|fiamma|fiamme|cenere|incendio|ustione|rogo)\b/i.test(hay);
}

function buildIdeaDrivenTitlePool(idea: string, inference: GenreInference, seed: number, context?: TitleForgeContext): string[] {
  const keywords = extractTitleKeywords(idea, context);
  const k1 = titleCaseIt(keywords[0] || inference.subcategory || inference.category || "Segreto");
  const k2 = titleCaseIt(keywords[1] || inference.tone || "Verità");
  const k3 = titleCaseIt(keywords[2] || inference.targetReader || "Confine");
  const k4 = titleCaseIt(keywords[3] || "Destino");

  const darkNouns = ["Segreto", "Confine", "Cicatrice", "Promessa", "Stanza", "Verità", "Notte", "Patto", "Silenzio", "Ferita", "Maschera", "Soglia"];
  const literaryNouns = ["Geografia", "Mappa", "Atlante", "Anatomia", "Teoria", "Liturgia", "Inventario", "Grammatica"];
  const commercialHooks = ["Non Dovevi", "Prima dell'Ultima", "Tutto Quello che", "La Versione che", "L'Errore di", "La Legge di"];
  const endings = [k1, k2, k3, k4].filter(Boolean);

  const pool = [
    `La ${pick(literaryNouns, seed, 1)} di ${k1}`,
    `Il ${pick(darkNouns, seed, 2)} di ${k1}`,
    `${k1} nella ${pick(darkNouns, seed, 3)}`,
    `${pick(commercialHooks, seed, 4)} ${k1}`,
    `Dove ${k1} Non Torna`,
    `La ${pick(darkNouns, seed, 5)} delle ${k2}`,
    `Tutto il ${k1} che Resta`,
    `Le ${k2} di ${k1}`,
    `Prima che ${k1} Scompaia`,
    `Il Nome Segreto di ${k1}`,
    `La Soglia di ${k1}`,
    `Quello che ${k1} Nasconde`,
    `Nessuno Ricorda ${k1}`,
    `L'Ultima ${k2}`,
    `${k1} Senza Perdono`,
    `La Casa di ${k1}`,
    `Il Giorno delle ${k2}`,
    `Quando ${k1} Chiama`,
    `La Promessa di ${k1}`,
    `L'Atlante delle ${k2}`,
  ];

  if (inference.level1 === "self-help" || inference.bookTypeId === "manual") {
    return [
      `Il Metodo ${k1}`,
      `${k1} Senza Confusione`,
      `La Mappa di ${k1}`,
      `Da Zero a ${k1}`,
      `${k1} in Pratica`,
      `Il Sistema ${k1}`,
      `Manuale Chiaro di ${k1}`,
      `La Guida Essenziale a ${k1}`,
      `Capire ${k1}`,
      `Allenare ${k1}`,
    ];
  }

  if (inference.bookTypeId === "fantasy") {
    return [
      `La Corona di ${k1}`,
      `Il Regno di ${k1}`,
      `La Porta delle ${k2}`,
      `L'Atlante dei Nomi Perduti`,
      `Il Giuramento di ${k1}`,
      `La Città che Ricorda ${k1}`,
      `Il Sangue delle ${k2}`,
      `La Stirpe di ${k1}`,
      `Dove Dormono le ${k2}`,
      `L'Ultimo Custode di ${k1}`,
    ];
  }

  return pool.concat(endings.map((e, idx) => `${e}: ${pick(["Una Verità Proibita", "Il Patto Nascosto", "La Ferita Segreta", "La Notte Finale"], seed, idx)}`));
}

function uniqueAllowedTitles(titles: string[], idea: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const title of titles) {
    const clean = title.replace(/\s+/g, " ").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    if (!hasSemanticPermissionForAbusedTitle(clean, idea)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}


export function getWizardTitleFreeRegensRemaining(): number {
  if (typeof window === "undefined") return WIZARD_TITLE_FREE_REGENS;
  try {
    const raw = sessionStorage.getItem(FREE_REGENS_KEY);
    if (raw === null) return WIZARD_TITLE_FREE_REGENS;
    const used = Number(raw);
    if (!Number.isFinite(used)) return WIZARD_TITLE_FREE_REGENS;
    return Math.max(0, WIZARD_TITLE_FREE_REGENS - used);
  } catch {
    return WIZARD_TITLE_FREE_REGENS;
  }
}

export function consumeWizardTitleFreeRegen(): number {
  const before = getWizardTitleFreeRegensRemaining();
  if (before <= 0) return 0;
  try {
    const used = WIZARD_TITLE_FREE_REGENS - before + 1;
    sessionStorage.setItem(FREE_REGENS_KEY, String(used));
  } catch {
    /* noop */
  }
  return getWizardTitleFreeRegensRemaining();
}

const HORROR_TITLES = [
  "La Casa Sotto la Pelle",
  "Le Madri del Buio",
  "Quello che la Notte Conserva",
  "I Segni nel Sangue Silente",
  "La Stanza che Non Dimentica",
  "Dietro l'Ombra delle Madri",
  "Il Villaggio che Sussurra",
  "Nessuno Torna dal Fiume Nero",
];

const HORROR_SUBS = [
  "Un mistero disturbante che non lascia più dormire.",
  "Quando il paese nasconde ciò che le madri non possono dire.",
  "Ogni segreto ha un odore. Ogni verità ha un prezzo.",
  "La paura non arriva di colpo: si installa sotto la pelle.",
  "Un horror psicologico che stringe piano, fino a spezzare.",
];

const ROMANCE_TITLES = [
  "Il Patto delle Cose Spezzate",
  "Quando il Desiderio Fa Male",
  "La Stanza dei Segreti Dolci",
  "La Regola dei Cuori Proibiti",
  "Tutto Quello che Non Dovevamo",
  "La Ferita che Ti Somiglia",
  "Il Confine del Desiderio",
  "Prima che Tu Mi Salvi",
  "La Verità tra le Tue Mani",
  "Nessuna Promessa Innocente",
];
const THRILLER_TITLES = [
  "La Verità che Non Aspetta",
  "Ombre sul Confine",
  "Il Silenzio del Testimone",
  "L'Ultima Versione dei Fatti",
  "Il Testimone Sbagliato",
  "La Città dei Colpevoli",
  "Nessuno Deve Sapere",
  "La Prova Mancante",
  "Il Caso che Respira",
  "Prima della Confessione",
];
const SELF_HELP_TITLES = ["L'Arte di Tornare a Sé", "Disciplina Senza Violenza", "Piccoli Passi, Grande Direzione"];
const FANTASY_TITLES = [
  "La Cattedrale delle Anime Dimenticate",
  "Il Regno delle Ombre Lente",
  "La Porta dei Nomi Persi",
  "La Corona dei Giuramenti Spezzati",
  "L'Atlante delle Città Sepolte",
  "Il Custode delle Stelle Cadute",
  "La Stirpe del Vento Nero",
  "Il Trono delle Maree Silenti",
  "La Lingua degli Dei Perduti",
  "Il Patto delle Rune Vive",
];

const MANUAL_TITLES = [
  "La Guida Essenziale",
  "Il Metodo Chiaro",
  "Manuale Pratico per Cominciare",
  "Dal Problema al Metodo",
  "Capire, Applicare, Migliorare",
  "La Mappa Pratica",
  "Il Sistema Semplice",
  "Guida Operativa Passo Dopo Passo",
];

const MANUAL_SUBS = [
  "Un percorso pratico per capire le basi, evitare errori comuni e applicare subito il metodo.",
  "Strategie, esempi e passaggi chiari per trasformare la teoria in pratica.",
  "Una guida concreta per orientarti, decidere meglio e costruire risultati misurabili.",
  "Dalle prime nozioni agli strumenti operativi: tutto quello che serve, senza confusione.",
  "Checklist, spiegazioni semplici ed esempi applicabili per passare dall'idea all'azione.",
];

const BADGES: TitleProposalBadge[] = ["Più dark", "Più commerciale", "Più poetico", "Più BookTok", "Più KDP"];
const MANUAL_BADGES: TitleProposalBadge[] = ["Più pratico", "Più metodo", "Più chiaro", "Più commerciale", "Più KDP"];

const MANUAL_CONTEXT_IDS = new Set([
  "manuale",
  "manual",
  "technical-manual",
  "software-guide",
  "ai-tools-guide",
  "handbook",
  "guide",
  "guida",
  "workbook",
  "study",
  "educational",
  "education",
  "cookbook",
]);

function cleanContextToken(value?: string | null): string {
  return String(value || "").trim().toLowerCase();
}

function isManualTitleForgeContext(ctx?: TitleForgeContext, titleSeed = "", idea = ""): boolean {
  const tokens = [
    ctx?.level1BookType,
    ctx?.bookTypeId,
    ctx?.forgePresetId,
    ctx?.category,
    ctx?.subcategory,
    ctx?.subgenre,
  ].map(cleanContextToken);

  if (tokens.some((token) => MANUAL_CONTEXT_IDS.has(token))) return true;

  const hay = `${titleSeed} ${idea} ${tokens.join(" ")}`.toLowerCase();
  return /\b(manuale|manual|guida|guide|handbook|workbook|tutorial|istruzioni|technical|software|didattic|educational|study|studio|corso|course|ricettario|cookbook)\b/i.test(hay);
}

function buildManualInference(idea: string, ctx?: TitleForgeContext): GenreInference {
  const base = inferGenreFromText("manuale guida metodo", `${idea} manuale guida metodo ${ctx?.category || ""} ${ctx?.subcategory || ""}`);

  return {
    ...base,
    bookTypeId: "manual",
    level1: "manuale",
    genre: "manual",
    category: "Manuali",
    subcategory: ctx?.subcategory || "Manuale pratico",
    subgenre: ctx?.subgenre || "guida pratica",
    label: "Manuale / guida",
    tone: "pratico, chiaro, orientato all'applicazione",
    targetReader: "Lettori che cercano un metodo chiaro, applicabile e concreto.",
    narrativePromise: "Un percorso pratico per capire, applicare e ottenere un risultato concreto.",
    commercialGoal: "Promessa chiara, beneficio immediato, struttura leggibile su Amazon/KDP.",
  } as GenreInference;
}

function titlesForInference(inference: GenreInference): string[] {
  if (inference.bookTypeId === "horror" || inference.genre === "horror") return HORROR_TITLES;
  if (inference.bookTypeId === "dark-romance") return ROMANCE_TITLES;
  if (inference.bookTypeId === "thriller") return THRILLER_TITLES;
  if (inference.level1 === "self-help") return SELF_HELP_TITLES;
  if (inference.bookTypeId === "fantasy") return FANTASY_TITLES;
  return [...HORROR_TITLES, ...THRILLER_TITLES, ...ROMANCE_TITLES].slice(0, 6);
}

function subtitlesForInference(inference: GenreInference): string[] {
  if (inference.bookTypeId === "horror") return HORROR_SUBS;
  if (inference.level1 === "self-help") {
    return [
      "Una guida pratica per ritrovare calma, direzione e presenza.",
      "Strumenti concreti per uscire dal caos mentale.",
      "Dal sovraccarico a una pratica quotidiana sostenibile.",
    ];
  }
  return [
    inference.narrativePromise,
    "Una storia che resta addosso fino all'ultima pagina.",
    "Promessa editoriale forte, hook immediato, payoff memorabile.",
  ];
}

function rationaleFor(badge: TitleProposalBadge, inference: GenreInference): string {
  const map: Record<TitleProposalBadge, string> = {
    "Più dark": "Suona inquietante e memorabile per lettori horror/thriller.",
    "Più commerciale": "Titolo scannable su Amazon con promessa chiara nel sottotitolo.",
    "Più poetico": "Immagini forti senza perdere leggibilità commerciale.",
    "Più BookTok": "Hook emotivo adatto a clip, citazioni e tensione visiva.",
    "Più KDP": "Keyword naturali e posizionamento categoria coerente.",
    "Più pratico": "Promette utilità concreta, non atmosfera narrativa.",
    "Più metodo": "Comunica percorso, struttura e applicazione pratica.",
    "Più chiaro": "Riduce ambiguità e rende subito leggibile il beneficio.",
  };
  return `${map[badge]} Filone: ${inference.label}.`;
}

function manualRationaleFor(badge: TitleProposalBadge, inference: GenreInference): string {
  const map: Record<TitleProposalBadge, string> = {
    "Più dark": "Bloccato: un manuale non deve essere venduto come horror o thriller.",
    "Più commerciale": "Titolo scannable su Amazon con beneficio pratico nel sottotitolo.",
    "Più poetico": "Leggero tono evocativo, ma sempre dentro una promessa pratica.",
    "Più BookTok": "Angolo comunicabile in clip senza trasformare il libro in romanzo.",
    "Più KDP": "Keyword naturali per manuale, guida, metodo e applicazione.",
    "Più pratico": "Promette utilità concreta, non atmosfera narrativa.",
    "Più metodo": "Comunica percorso, struttura e applicazione pratica.",
    "Più chiaro": "Riduce ambiguità e rende subito leggibile il beneficio.",
  };
  return `${map[badge]} Filone: ${inference.label}.`;
}

function proposalFromV2(
  candidate: TitleV2Candidate,
  index: number,
  inference: GenreInference,
  badges: TitleProposalBadge[],
  manual = false,
): TitleProposal {
  const badge = badges[index % badges.length];
  const score = candidate.scores;
  const elementLabel = candidate.usedDistinctiveElements.length
    ? ` Elementi usati: ${candidate.usedDistinctiveElements.slice(0, 3).join(", ")}.`
    : "";
  const genericLabel = candidate.couldBelongToThousandBooks
    ? " Scartabile se non viene reso più specifico."
    : " Supera il controllo: non sembra appartenere a mille libri diversi.";
  return {
    title: candidate.title,
    subtitle: candidate.subtitle,
    perceivedGenre: inference.label,
    editorialPromise: inference.narrativePromise,
    hookScore: score.commercialHook,
    titleScore: score.finalScore,
    memorabilityScore: score.memorability,
    originalityScore: score.originality,
    specificityScore: score.specificity,
    amazonSeoScore: score.amazonSeo,
    commercialHookScore: score.commercialHook,
    storyCoherenceScore: score.storyCoherence,
    genericRisk: score.genericRisk,
    usedDistinctiveElements: candidate.usedDistinctiveElements,
    rationale: `${manual ? manualRationaleFor(badge, inference) : rationaleFor(badge, inference)}${elementLabel}${genericLabel}`,
    badge,
    inference,
  };
}

export function generateWizardTitleProposals(
  titleSeed: string,
  idea: string,
  language: Language,
  regenSalt = "",
  context?: TitleForgeContext,
): TitleProposal[] {
  const seed = hashSeed(`${titleSeed}|${idea}|${language}|${regenSalt}|${Date.now()}`);

  if (isManualTitleForgeContext(context, titleSeed, idea)) {
    const manualInference = buildManualInference(idea, context);
    const pipeline = buildTitleV2Pipeline({
      titleSeed,
      idea,
      genre: manualInference.genre,
      category: manualInference.category,
      subcategory: manualInference.subcategory,
      subgenre: manualInference.subgenre,
      targetAudience: manualInference.targetReader,
      promise: manualInference.narrativePromise,
      language,
    });
    return pipeline.finalists
      .map((candidate, index) => proposalFromV2(candidate, index, manualInference, MANUAL_BADGES, true))
      .filter((p, idx, arr) => arr.findIndex((x) => x.title.toLowerCase() === p.title.toLowerCase()) === idx);
  }

  const inference = inferGenreFromText(titleSeed || idea, idea);
  const pipeline = buildTitleV2Pipeline({
    titleSeed,
    idea,
    genre: inference.genre,
    category: inference.category,
    subcategory: inference.subcategory,
    subgenre: inference.subgenre,
    targetAudience: inference.targetReader,
    promise: inference.narrativePromise,
    language,
  });
  if (pipeline.finalists.length) {
    return pipeline.finalists
      .map((candidate, index) => proposalFromV2(candidate, index, inference, BADGES))
      .filter((p, idx, arr) => arr.findIndex((x) => x.title.toLowerCase() === p.title.toLowerCase()) === idx);
  }

  const ideaDrivenTitles = buildIdeaDrivenTitlePool(idea, inference, seed, context);
  const titles = uniqueAllowedTitles([...ideaDrivenTitles, ...titlesForInference(inference)], idea);
  const subs = subtitlesForInference(inference);

  if (titles.length === 0) titles.push("La Verità che Resta");

  const cleanSeedTitle = titleSeed.trim();
  const canUseSeedTitle =
    cleanSeedTitle.length >= 4 &&
    hasSemanticPermissionForAbusedTitle(cleanSeedTitle, idea) &&
    !titles.some((candidate) => candidate.toLowerCase() === cleanSeedTitle.toLowerCase());

  if (canUseSeedTitle) {
    titles.unshift(cleanSeedTitle);
  }

  const proposals: TitleProposal[] = [];
  for (let i = 0; i < 5; i += 1) {
    const badge = BADGES[i % BADGES.length];
    const title = i === 0 && cleanSeedTitle.length >= 4 && hasSemanticPermissionForAbusedTitle(cleanSeedTitle, idea)
      ? cleanSeedTitle
      : pick(titles, seed, i * 7);
    const subtitle = pick(subs, seed, i * 5 + 1);
    const hookScore = Math.min(98, 72 + ((seed + i * 7) % 22));
    proposals.push({
      title,
      subtitle,
      perceivedGenre: inference.label,
      editorialPromise: inference.narrativePromise,
      hookScore,
      rationale: rationaleFor(badge, inference),
      badge,
      inference,
    });
  }

  return proposals.filter((p, idx, arr) => arr.findIndex((x) => x.title.toLowerCase() === p.title.toLowerCase()) === idx);
}

export async function runTitleForgeAnimation(
  onPhase: (index: number, text: string) => void,
  msPerPhase = 520,
): Promise<void> {
  for (let i = 0; i < TITLE_FORGE_PHASES.length; i += 1) {
    onPhase(i, TITLE_FORGE_PHASES[i]);
    await new Promise((r) => window.setTimeout(r, msPerPhase));
  }
}
