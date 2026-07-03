import type { Language } from "@/types/book";

export type TitleElementType =
  | "place"
  | "object"
  | "mystery"
  | "secret"
  | "symbol"
  | "trauma"
  | "relationship"
  | "keyword";

export interface DistinctiveTitleElement {
  text: string;
  type: TitleElementType;
  weight: number;
}

export interface TitleV2Scores {
  memorability: number;
  originality: number;
  emotionalStrength: number;
  specificity: number;
  dnaCoherence: number;
  genreCoherence: number;
  bestsellerPotential: number;
  clickPotential: number;
  amazonSeo: number;
  commercialHook: number;
  storyCoherence: number;
  genericRisk: number;
  finalScore: number;
}

export interface TitleV2Candidate {
  title: string;
  subtitle: string;
  angle: string;
  scores: TitleV2Scores;
  usedDistinctiveElements: string[];
  stage: "candidate" | "semifinalist" | "finalist";
  couldBelongToThousandBooks: boolean;
}

export interface TitleV2Input {
  titleSeed?: string;
  idea?: string;
  genre?: string;
  category?: string;
  subcategory?: string;
  subgenre?: string;
  targetAudience?: string;
  promise?: string;
  language?: Language | string;
}

export interface TitleV2Pipeline {
  distinctiveElements: DistinctiveTitleElement[];
  allCandidates: TitleV2Candidate[];
  semifinalists: TitleV2Candidate[];
  finalists: TitleV2Candidate[];
}

const GENERIC_TITLE_WORDS = new Set([
  "amore",
  "colpa",
  "passione",
  "destino",
  "segreti",
  "segreto",
  "trasformazione",
  "desiderio",
  "attrazione",
  "cuore",
  "anime",
  "ombra",
  "ombre",
  "verita",
  "verità",
  "promessa",
  "ferita",
  "confine",
  "notte",
  "baci",
  "impossibili",
  "love",
  "guilt",
  "passion",
  "destiny",
  "secrets",
  "desire",
  "attraction",
]);

const STOP_WORDS = new Set([
  "una",
  "uno",
  "un",
  "il",
  "lo",
  "la",
  "le",
  "gli",
  "i",
  "di",
  "del",
  "della",
  "delle",
  "degli",
  "dei",
  "da",
  "dal",
  "dallo",
  "dalla",
  "nella",
  "nel",
  "nei",
  "sul",
  "sulla",
  "e",
  "che",
  "con",
  "per",
  "tra",
  "fra",
  "storia",
  "romanzo",
  "libro",
  "scrivere",
  "creare",
  "racconta",
]);

const PARTICLES = new Set(["di", "del", "della", "delle", "degli", "dei", "e", "che", "con", "per", "tra", "fra", "sul", "sulla", "nel", "nella", "alla", "alle", "a", "da"]);
const DESCRIPTIVE_ENTITY_VERB_RE =
  /\b(appartiene|compare|comparsa|compareva|proveniente|trova|trovata|scopre|deve|dimostrare|salvare|decide|decidere|rivela|rivelare|nasconde|nascondere)\b/i;

function clean(value?: unknown): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^[#:"'\s-]+|[#:"'\s-]+$/g, "")
    .trim();
}

function normalize(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function titleCaseIt(value: string): string {
  return clean(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && PARTICLES.has(lower)) return lower;
      if (/^\d+$/.test(word)) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function sentenceCase(value: string): string {
  const text = clean(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isItalian(input: TitleV2Input): boolean {
  const value = normalize(String(input.language || ""));
  const hay = normalize([input.idea, input.titleSeed, input.promise].filter(Boolean).join(" "));
  return value.includes("ital") || /\b(una|uno|della|delle|che|per|scomparsa|lettere|camera)\b/.test(hay);
}

function genreFamily(input: TitleV2Input): "romance" | "thriller" | "fantasy" | "horror" | "self-help" | "memoir" | "literary" | "fiction" {
  const raw = normalize([input.genre, input.category, input.subcategory, input.subgenre].filter(Boolean).join(" "));
  if (/self|help|crescita|manual|guida|metodo|produttiv|business|educat|studio|study/.test(raw)) return "self-help";
  if (/dark romance|romance|romantasy/.test(raw)) return "romance";
  if (/thriller|crime|giallo|noir|mister/.test(raw)) return "thriller";
  if (/fantasy|magia|regno|drago|strega/.test(raw)) return "fantasy";
  if (/horror|paura|occult|gotic/.test(raw)) return "horror";
  if (/memoir|biograf|memoria/.test(raw)) return "memoir";
  if (/letterar|literary|narrativa/.test(raw)) return "literary";
  return "fiction";
}

function isDarkRomanceInput(input: TitleV2Input): boolean {
  const raw = normalize([input.genre, input.category, input.subcategory, input.subgenre].filter(Boolean).join(" "));
  return /\bdark romance\b/.test(raw);
}

function genericSubtitlePenalty(subtitle: string): number {
  const text = normalize(subtitle);
  if (!text) return 0;
  const generic = [
    /una storia d amore ad alta tensione emotiva/,
    /una storia di .*segreti.*trasformazione/,
    /un viaggio intenso/,
    /una vicenda che cambiera tutto/,
    /dove amore e destino/,
    /un libro che cambiera/,
  ];
  return generic.some((pattern) => pattern.test(text)) ? 24 : 0;
}

function genreCoherenceScore(input: TitleV2Input, title: string, subtitle: string): number {
  const family = genreFamily(input);
  const text = normalize(`${title} ${subtitle}`);
  if (isDarkRomanceInput(input)) {
    const romanceHits = ["attrazione", "desiderio", "relazione", "ferita", "colpa", "romance"].filter((term) => text.includes(term)).length;
    const mysteryHits = ["indagine", "testimone", "cold case", "prova", "procedura"].filter((term) => text.includes(term)).length;
    return clampScore(45 + romanceHits * 14 - mysteryHits * 10);
  }
  if (family === "horror") {
    const hits = ["paura", "inquietudine", "atmosfera", "ombra", "buio", "stanza", "casa", "voci"].filter((term) => text.includes(term)).length;
    return clampScore(50 + hits * 10 - (/\b(regno|corona|quest|magia epica)\b/.test(text) ? 18 : 0));
  }
  if (family === "self-help") {
    const hits = ["metodo", "pratica", "strumenti", "chiarezza", "esercizi", "guida", "sistema"].filter((term) => text.includes(term)).length;
    return clampScore(48 + hits * 9 - (/\b(trama|protagonista|romanzo)\b/.test(text) ? 24 : 0));
  }
  return clampScore(58 + (text.includes(normalize(String(input.genre || ""))) ? 14 : 0));
}

function addElement(
  list: DistinctiveTitleElement[],
  seen: Set<string>,
  raw: string,
  type: TitleElementType,
  weight: number,
) {
  const text = titleCaseIt(raw.replace(/\b(una|uno|un|il|lo|la|le|gli|i)\s+/i, ""));
  const key = normalize(text);
  if (!text || text.length < 3 || seen.has(key)) return;
  if ([...GENERIC_TITLE_WORDS].some((word) => key === normalize(word))) return;
  const words = key.split(/\s+/).filter(Boolean);
  const protectedSpecificPhrase =
    /^bottega delle chiavi perdute$/.test(key) ||
    /^chiavi? (?:delle )?scelte non compiut/.test(key) ||
    /^chiave (?:dal|del) futuro$/.test(key);
  if (!protectedSpecificPhrase && (DESCRIPTIVE_ENTITY_VERB_RE.test(text) || words.length > 4)) return;
  seen.add(key);
  list.push({ text, type, weight });
}

function collectMatches(text: string, regex: RegExp, type: TitleElementType, weight: number, list: DistinctiveTitleElement[], seen: Set<string>) {
  for (const match of text.matchAll(regex)) {
    addElement(list, seen, match[0], type, weight);
  }
}

export function extractDistinctiveTitleElements(input: TitleV2Input): DistinctiveTitleElement[] {
  const text = clean([
    input.titleSeed,
    input.idea,
    input.promise,
    input.targetAudience,
    input.subcategory,
    input.subgenre,
  ].filter(Boolean).join(" "));
  const list: DistinctiveTitleElement[] = [];
  const seen = new Set<string>();

  collectMatches(text, /\b(bottega\s+delle\s+chiavi\s+perdute)\b/gi, "place", 100, list, seen);
  collectMatches(text, /\b(chiavi?\s+(?:delle\s+)?scelte?\s+non\s+compiut\w*)\b/gi, "object", 99, list, seen);
  collectMatches(text, /\b(chiave\s+(?:dal|del)\s+futuro)\b/gi, "object", 98, list, seen);
  collectMatches(text, /\b(libero\s+arbitrio)\b/gi, "mystery", 90, list, seen);
  collectMatches(text, /\b(?:camera|stanza|room)\s*\d+\b/gi, "place", 98, list, seen);
  collectMatches(text, /\b\d{1,2}:\d{2}\b/g, "mystery", 96, list, seen);
  collectMatches(text, /\b(?:stazione|gallerie?|treno|ferrovia|binari?)\b(?:\s+(?:ferroviaria|abbandonata|inesistente|inesistenti|fantasma|nero|nera|[a-zA-ZÀ-ÿ0-9'-]+)){0,3}/gi, "place", 92, list, seen);
  collectMatches(text, /\b(?:hotel|albergo|villa|casa|castello|cattedrale|faro|isola|lago|bosco|collegio|orfanotrofio|ospedale|manicomio|biblioteca|libreria|museo|stazione|villaggio|paese|citta|città|regno|tempio|cripta|teatro)(?:\s+(?:sul|sulla|del|della|delle|di|dei|nel|nella|antico|antica|abbandonato|abbandonata|nero|nera|sepolto|sepolta|perduto|perduta|[a-zA-ZÀ-ÿ0-9'-]+)){0,4}/gi, "place", 88, list, seen);
  collectMatches(text, /\b(?:lettere|mappe|diario|anello|chiave|ritratto|fotografia|foto|orologio|specchio|maschera|carillon|registratore|corona|spada|reliquia|manoscritto|nastro|cassette|biglietto|archivio|codice|formula|algoritmo)(?:\s+(?:mai|antiche|antichi|rotto|rotta|segreto|segreta|perduto|perduta|spedite|spediti|dimenticate|dimenticati|nascosto|nascosta|[a-zA-ZÀ-ÿ0-9'-]+)){0,4}/gi, "object", 92, list, seen);
  collectMatches(text, /\b(?:donna|uomo|bambina|bambino|madre|padre|sorella|fratello|professore|medico|paziente|testimone|erede)\s+(?:scomparsa|scomparso|sparita|sparito|morta|morto|accusata|accusato|proibita|proibito)\b/gi, "mystery", 94, list, seen);
  collectMatches(text, /\b(?:madre|padre|sorella|fratello)\b/gi, "relationship", 84, list, seen);
  collectMatches(text, /\b(?:lettere mai spedite|mappe antiche|donna scomparsa|uomo scomparso|patto proibito|promessa infranta|cadavere nascosto|verita sepolta|verità sepolta|segreto di famiglia|profezia spezzata)\b/gi, "secret", 96, list, seen);
  collectMatches(text, /\b(?:incendio|naufragio|incidente|tradimento|processo|fuga|omicidio|sparizione|massacro|fallimento|divorzio|lutto|rapimento|esperimento)(?:\s+[a-zA-ZÀ-ÿ0-9'-]+){0,3}/gi, "trauma", 82, list, seen);
  collectMatches(text, /\b(?:nemici|rivali|ex|bodyguard|guardia del corpo|migliore amica|migliore amico|fratellastri|sorellastre|professore e studentessa|capo e assistente|medico e paziente)\b/gi, "relationship", 78, list, seen);
  collectMatches(text, /\b(?:medici specializzandi|studenti universitari|imprenditori|autori|manager|insegnanti|genitori|freelance|professionisti|creativi|studenti)(?:\s+[a-zA-ZÀ-ÿ0-9'-]+){0,2}/gi, "keyword", 76, list, seen);
  collectMatches(text, /\b(?:turni massacranti|stress clinico|memoria da esame|ansia da esame|burnout|procrastinazione cronica|caos mentale|disciplina gentile|focus profondo|studio intensivo)\b/gi, "keyword", 74, list, seen);

  const tokens = normalize(text)
    .replace(/[^a-z0-9àèéìòù'\s-]/gi, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 5 && !STOP_WORDS.has(x) && !GENERIC_TITLE_WORDS.has(x));
  for (const token of tokens) {
    if (list.length >= 14) break;
    addElement(list, seen, token, "keyword", 48);
  }

  return list.sort((a, b) => b.weight - a.weight).slice(0, 12);
}

function elementAt(elements: DistinctiveTitleElement[], index: number, fallback: string): string {
  return elements[index % Math.max(1, elements.length)]?.text || fallback;
}

function elementTextSet(elements: DistinctiveTitleElement[]): string[] {
  return elements.map((el) => normalize(el.text));
}

function titleUsesElements(title: string, subtitle: string, elements: DistinctiveTitleElement[]): string[] {
  const hay = normalize(`${title} ${subtitle}`);
  return elements
    .filter((el) => {
      const key = normalize(el.text);
      if (key.length < 4) return false;
      return hay.includes(key) || key.split(/\s+/).some((part) => part.length >= 5 && hay.includes(part));
    })
    .map((el) => el.text);
}

export function couldBelongToThousandBooks(title: string, subtitle: string, elements: DistinctiveTitleElement[]): boolean {
  const titleTokens = normalize(title).split(/\s+/).filter(Boolean);
  const genericCount = titleTokens.filter((token) => GENERIC_TITLE_WORDS.has(token)).length;
  const used = titleUsesElements(title, subtitle, elements);
  const tooAbstract = genericCount >= Math.max(2, Math.ceil(titleTokens.length * 0.45));
  const noSpecificAnchor = used.length === 0;
  return noSpecificAnchor && (tooAbstract || titleTokens.length <= 4);
}

function subtitleFor(input: TitleV2Input, title: string, elements: DistinctiveTitleElement[], offset: number): string {
  const family = genreFamily(input);
  const italian = isItalian(input);
  const e1 = elementAt(elements, offset, italian ? "il passato" : "the past");
  const e2 = elementAt(elements, offset + 1, italian ? "la verita" : "the truth");
  if (family === "self-help") {
    const audience = clean(input.targetAudience) || (italian ? "chi vuole risultati concreti" : "readers who want practical progress");
    return italian
      ? `Un metodo pratico per ${audience.toLowerCase()} senza perdersi nella teoria.`
      : `A practical method for ${audience.toLowerCase()} without getting lost in theory.`;
  }
  if (isDarkRomanceInput(input)) {
    const it = [
      `Quando ${e1} torna alla luce, desiderio e colpa trasformano ${e2.toLowerCase()} in una trappola.`,
      `Un dark romance di segreti concreti, attrazione pericolosa e verita' che chiedono un prezzo.`,
      `Prima di aprire ${e1.toLowerCase()}, nessuno sapeva quanto potesse costare desiderare la persona sbagliata.`,
      `Ogni indizio porta a ${e2.toLowerCase()}. Ogni risposta stringe il patto tra desiderio e colpa.`,
      `Il passato ha lasciato una traccia: ${e1.toLowerCase()}. Il romance comincia dove la salvezza diventa rischio.`,
    ];
    const en = [
      `When ${e1} resurfaces, desire and guilt turn ${e2.toLowerCase()} into a trap.`,
      `A dark romance of concrete secrets, dangerous attraction, and truths that demand a price.`,
      `Before ${e1.toLowerCase()} is opened, nobody knows the cost of wanting the wrong person.`,
      `Every clue leads to ${e2.toLowerCase()}. Every answer tightens the pact between desire and guilt.`,
      `The past left one trace behind: ${e1.toLowerCase()}. The romance begins where rescue becomes risk.`,
    ];
    return (italian ? it : en)[offset % 5];
  }
  const it = [
    `Quando ${e1} torna alla luce, ${e2.toLowerCase()} non puo' piu' restare sepolto.`,
    `Un segreto concreto. Una scelta impossibile. Una verita' che cambia tutto.`,
    `Prima di aprire ${e1.toLowerCase()}, nessuno sapeva quanto costasse ricordare.`,
    `Ogni indizio porta a ${e2.toLowerCase()}. Ogni risposta chiede un prezzo.`,
    `Il passato ha lasciato una traccia: ${e1.toLowerCase()}.`,
  ];
  const en = [
    `When ${e1} resurfaces, ${e2.toLowerCase()} can no longer stay buried.`,
    `A concrete secret. An impossible choice. A truth that changes everything.`,
    `Before ${e1.toLowerCase()} is opened, nobody knows the cost of remembering.`,
    `Every clue leads to ${e2.toLowerCase()}. Every answer demands a price.`,
    `The past left one trace behind: ${e1.toLowerCase()}.`,
  ];
  return (italian ? it : en)[offset % 5];
}

function candidateTemplates(input: TitleV2Input, elements: DistinctiveTitleElement[]): Array<{ title: string; angle: string }> {
  const family = genreFamily(input);
  const italian = isItalian(input);
  const e1 = elementAt(elements, 0, italian ? "La Stanza Chiusa" : "The Locked Room");
  const e2 = elementAt(elements, 1, italian ? "Le Lettere Perdute" : "The Lost Letters");
  const e3 = elementAt(elements, 2, italian ? "Il Lago Nero" : "The Black Lake");
  const e4 = elementAt(elements, 3, italian ? "La Donna Scomparsa" : "The Missing Woman");
  const e5 = elementAt(elements, 4, italian ? "Il Segreto" : "The Secret");

  if (family === "self-help") {
    return [
      { title: italian ? `Il Metodo ${e1}` : `The ${e1} Method`, angle: "method" },
      { title: italian ? `${e1} Senza Confusione` : `${e1} Without Confusion`, angle: "clarity" },
      { title: italian ? `La Mappa Pratica di ${e1}` : `The Practical Map of ${e1}`, angle: "map" },
      { title: italian ? `${e1} in Pratica` : `${e1} in Practice`, angle: "application" },
      { title: italian ? `Allenare ${e1}` : `Training ${e1}`, angle: "training" },
      { title: italian ? `Da Zero a ${e1}` : `From Zero to ${e1}`, angle: "progression" },
      { title: italian ? `Il Sistema ${e1}` : `The ${e1} System`, angle: "system" },
      { title: italian ? `${e1} per Chi Non Ha Tempo` : `${e1} for People Without Time`, angle: "audience" },
      { title: italian ? `Manuale Operativo di ${e1}` : `The Operating Manual for ${e1}`, angle: "handbook" },
      { title: italian ? `Sbloccare ${e1}` : `Unlocking ${e1}`, angle: "unlock" },
    ];
  }

  const sharedIt = [
    { title: `La Camera di ${e1}`, angle: "room hook" },
    { title: `${e1} e ${e2}`, angle: "dual symbol" },
    { title: `Le ${e2} di ${e1}`, angle: "object ownership" },
    { title: `La Donna di ${e3}`, angle: "mystery figure" },
    { title: `Quello che ${e1} Nasconde`, angle: "hidden truth" },
    { title: `L'Ultima Notte a ${e1}`, angle: "deadline" },
    { title: `Prima di Aprire ${e2}`, angle: "threshold" },
    { title: `Il Segreto della ${e1}`, angle: "secret anchor" },
    { title: `Dove ${e4} Non Torna`, angle: "missing person" },
    { title: `L'Archivio di ${e1}`, angle: "archive" },
    { title: `La Mappa di ${e3}`, angle: "map" },
    { title: `Nessuno Ricorda ${e1}`, angle: "memory" },
    { title: `La Promessa nella ${e1}`, angle: "promise" },
    { title: `${e2} sul ${e3}`, angle: "visual contrast" },
    { title: `Il Nome Scritto in ${e2}`, angle: "named clue" },
  ];

  const genreIt: Record<string, Array<{ title: string; angle: string }>> = {
    romance: [
      { title: `Baci nella ${e1}`, angle: "romance setting" },
      { title: `La Regola della ${e1}`, angle: "forbidden rule" },
      { title: `Le Lettere che Non Dovevamo Spedire`, angle: "romance object" },
      { title: `Il Patto della ${e3}`, angle: "romantic pact" },
      { title: `Quando ${e2} Tornano`, angle: "return hook" },
    ],
    thriller: [
      { title: `Il Caso della ${e1}`, angle: "case" },
      { title: `La Prova in ${e2}`, angle: "evidence" },
      { title: `Nessuno Esce da ${e1}`, angle: "trap" },
      { title: `Il Testimone di ${e3}`, angle: "witness" },
      { title: `Ultima Traccia: ${e2}`, angle: "last clue" },
    ],
    fantasy: [
      { title: `La Corona di ${e1}`, angle: "crown" },
      { title: `Il Regno di ${e3}`, angle: "kingdom" },
      { title: `La Porta delle ${e2}`, angle: "portal" },
      { title: `Il Giuramento di ${e4}`, angle: "oath" },
      { title: `L'Atlante di ${e1}`, angle: "atlas" },
    ],
    horror: [
      { title: `La Stazione delle ${e2}`, angle: "haunted station" },
      { title: `Alle ${e3}`, angle: "deadline time" },
      { title: `Il Treno di ${e1}`, angle: "ghost train" },
      { title: `La Stanza ${e1}`, angle: "haunted room" },
      { title: `Il Carillon di ${e3}`, angle: "haunted object" },
      { title: `Non Entrare in ${e1}`, angle: "warning" },
      { title: `Le Voci della ${e2}`, angle: "voices" },
      { title: `Dove ${e5} Respira`, angle: "living threat" },
    ],
    memoir: [
      { title: `La Mappa di ${e1}`, angle: "memory map" },
      { title: `Quello che Resta di ${e2}`, angle: "remains" },
    ],
    literary: [
      { title: `Inventario di ${e1}`, angle: "literary inventory" },
      { title: `Geografia delle ${e2}`, angle: "literary geography" },
    ],
    fiction: [],
  };

  const sharedEn = [
    { title: `The Room of ${e1}`, angle: "room hook" },
    { title: `${e1} and ${e2}`, angle: "dual symbol" },
    { title: `The Letters of ${e1}`, angle: "object ownership" },
    { title: `What ${e1} Hides`, angle: "hidden truth" },
    { title: `Before Opening ${e2}`, angle: "threshold" },
    { title: `No One Remembers ${e1}`, angle: "memory" },
  ];

  if (!italian) return sharedEn.concat((genreIt[family] || genreIt.fiction).map((item) => ({ ...item, title: item.title.replace(/^Il |^La |^Le |^L'/, "The ") })));
  return sharedIt.concat(genreIt[family] || genreIt.fiction);
}

function expandCandidates(input: TitleV2Input, elements: DistinctiveTitleElement[]): Array<{ title: string; subtitle: string; angle: string }> {
  const templates = candidateTemplates(input, elements);
  const expanded: Array<{ title: string; subtitle: string; angle: string }> = [];
  for (let i = 0; i < templates.length; i += 1) {
    const base = templates[i];
    expanded.push({
      title: titleCaseIt(base.title),
      subtitle: subtitleFor(input, base.title, elements, i),
      angle: base.angle,
    });
  }
  for (let i = 0; expanded.length < 34; i += 1) {
    const a = elementAt(elements, i, isItalian(input) ? "La Storia" : "The Story");
    const b = elementAt(elements, i + 1, isItalian(input) ? "Il Segreto" : "The Secret");
    expanded.push({
      title: titleCaseIt(isItalian(input) ? `${a}: ${b}` : `${a}: ${b}`),
      subtitle: subtitleFor(input, `${a}: ${b}`, elements, i + 7),
      angle: "specific fallback",
    });
  }
  return expanded;
}

function scoreCandidate(input: TitleV2Input, title: string, subtitle: string, elements: DistinctiveTitleElement[]): TitleV2Scores {
  const used = titleUsesElements(title, subtitle, elements);
  const titleWords = normalize(title).split(/\s+/).filter(Boolean);
  const genericCount = titleWords.filter((token) => GENERIC_TITLE_WORDS.has(token)).length;
  const hasNumber = /\d/.test(title);
  const topWeight = used.reduce((max, text) => {
    const el = elements.find((item) => item.text === text);
    return Math.max(max, el?.weight || 0);
  }, 0);
  const thousand = couldBelongToThousandBooks(title, subtitle, elements);
  const family = genreFamily(input);
  const familyBoost =
    family === "self-help" && /\b(metodo|mappa|manuale|sistema|pratica|method|system|guide)\b/i.test(title) ? 10 :
    family === "thriller" && /\b(caso|prova|testimone|traccia|case|witness|clue)\b/i.test(title) ? 8 :
    family === "romance" && /\b(baci|lettere|patto|promessa|kiss|letters|pact)\b/i.test(title) ? 7 :
    family === "fantasy" && /\b(regno|corona|porta|atlante|kingdom|crown|gate)\b/i.test(title) ? 8 :
    family === "horror" && /\b(stanza|carillon|voci|non entrare|room|voices)\b/i.test(title) ? 8 :
    0;
  const specificity = clampScore(42 + used.length * 18 + topWeight * 0.24 + (hasNumber ? 10 : 0) - genericCount * 9);
  const originality = clampScore(55 + used.length * 12 + (hasNumber ? 8 : 0) + Math.min(10, title.length / 7) - genericCount * 8 - (thousand ? 25 : 0));
  const memorability = clampScore(68 + (titleWords.length >= 3 && titleWords.length <= 7 ? 12 : -8) + used.length * 7 + (hasNumber ? 5 : 0) - genericCount * 4);
  const emotionalStrength = clampScore(58 + (/\b(non|mai|ultima|segreto|scomparsa|prezzo|proib|dimentic|last|missing|secret|forbidden)\b/i.test(`${title} ${subtitle}`) ? 18 : 0) + used.length * 5);
  const amazonSeo = clampScore(52 + used.length * 10 + familyBoost + (clean(input.targetAudience) ? 5 : 0));
  const commercialHook = clampScore(55 + (/\b(quello che|prima di|quando|nessuno|non|ultima|what|before|when|no one)\b/i.test(title) ? 15 : 0) + used.length * 7 + familyBoost);
  const storyCoherence = clampScore(50 + used.length * 16 + familyBoost + (used.length >= 2 ? 8 : 0));
  const dnaCoherence = clampScore(45 + used.length * 16 + topWeight * 0.16 + (used.length >= 2 ? 10 : 0));
  const genreCoherence = genreCoherenceScore(input, title, subtitle);
  const clickPotential = clampScore(48 + commercialHook * 0.28 + memorability * 0.22 + specificity * 0.18 - genericSubtitlePenalty(subtitle));
  const bestsellerPotential = clampScore(42 + genreCoherence * 0.25 + dnaCoherence * 0.24 + originality * 0.18 + amazonSeo * 0.12 + commercialHook * 0.14);
  const genericRisk = clampScore((thousand ? 78 : 28) + genericCount * 12 - used.length * 15 + genericSubtitlePenalty(subtitle));
  const finalScore = clampScore(
    memorability * 0.15 +
      originality * 0.16 +
      emotionalStrength * 0.14 +
      specificity * 0.19 +
      dnaCoherence * 0.12 +
      genreCoherence * 0.12 +
      bestsellerPotential * 0.1 +
      clickPotential * 0.08 +
      amazonSeo * 0.12 +
      commercialHook * 0.14 +
      storyCoherence * 0.16 -
      genericRisk * 0.12,
  );
  return {
    memorability,
    originality,
    emotionalStrength,
    specificity,
    dnaCoherence,
    genreCoherence,
    bestsellerPotential,
    clickPotential,
    amazonSeo,
    commercialHook,
    storyCoherence,
    genericRisk,
    finalScore,
  };
}

function uniqueCandidates(items: Array<{ title: string; subtitle: string; angle: string }>): Array<{ title: string; subtitle: string; angle: string }> {
  const seen = new Set<string>();
  const out: Array<{ title: string; subtitle: string; angle: string }> = [];
  for (const item of items) {
    const key = normalize(item.title);
    if (!item.title || seen.has(key)) continue;
    seen.add(key);
    out.push({
      title: titleCaseIt(item.title),
      subtitle: sentenceCase(item.subtitle),
      angle: item.angle,
    });
  }
  return out;
}

export function buildTitleV2Pipeline(input: TitleV2Input): TitleV2Pipeline {
  const distinctiveElements = extractDistinctiveTitleElements(input);
  const fallbackTopic = clean(input.titleSeed || input.idea || input.promise || input.genre || "Scriptora");
  const elements = distinctiveElements.length
    ? distinctiveElements
    : [{ text: titleCaseIt(fallbackTopic.split(/\s+/).filter((w) => w.length >= 4).slice(0, 2).join(" ") || "Segreto"), type: "keyword" as const, weight: 45 }];
  let raw = uniqueCandidates(expandCandidates(input, elements));
  const fillAngles = isItalian(input)
    ? ["Senza Rumore", "In Pratica", "Che Resta", "Sotto Pressione", "Per Giorni Difficili", "Metodo Essenziale", "Mappa Operativa", "Prima della Svolta"]
    : ["Without Noise", "In Practice", "That Lasts", "Under Pressure", "For Hard Days", "Essential Method", "Operating Map", "Before the Turn"];
  for (let i = 0; raw.length < 30 && i < 80; i += 1) {
    const a = elementAt(elements, i, isItalian(input) ? "Tema" : "Theme");
    const suffix = fillAngles[i % fillAngles.length];
    raw = uniqueCandidates([
      ...raw,
      {
        title: `${a} ${suffix}`,
        subtitle: subtitleFor(input, `${a} ${suffix}`, elements, i + 11),
        angle: "candidate expansion",
      },
    ]);
  }
  const scored = raw
    .map((item) => {
      const scores = scoreCandidate(input, item.title, item.subtitle, elements);
      const usedDistinctiveElements = titleUsesElements(item.title, item.subtitle, elements);
      const could = couldBelongToThousandBooks(item.title, item.subtitle, elements);
      return {
        ...item,
        scores,
        usedDistinctiveElements,
        stage: "candidate" as const,
        couldBelongToThousandBooks: could,
      };
    })
    .sort((a, b) => b.scores.finalScore - a.scores.finalScore || b.scores.specificity - a.scores.specificity);
  const strongEditorialCandidates = scored.filter((item) =>
    item.scores.originality >= 70 &&
    item.scores.dnaCoherence >= 65 &&
    item.scores.genreCoherence >= 60 &&
    item.scores.bestsellerPotential >= 60 &&
    !item.couldBelongToThousandBooks,
  );
  const preferred = strongEditorialCandidates.length >= 10
    ? strongEditorialCandidates
    : scored.filter((item) => !item.couldBelongToThousandBooks || item.usedDistinctiveElements.length >= 1);
  const preferredKeys = new Set(preferred.map((item) => normalize(item.title)));
  const filled = [
    ...preferred,
    ...scored.filter((item) => !preferredKeys.has(normalize(item.title))),
  ];
  const allCandidates = filled.slice(0, 30);
  const semifinalists = allCandidates.slice(0, 10).map((item) => ({ ...item, stage: "semifinalist" as const }));
  const finalists = semifinalists.slice(0, 5).map((item) => ({ ...item, stage: "finalist" as const }));
  return { distinctiveElements: elements, allCandidates, semifinalists, finalists };
}

export function scoreTitleAgainstStory(input: TitleV2Input, title: string, subtitle = ""): TitleV2Candidate {
  const elements = extractDistinctiveTitleElements(input);
  const effectiveElements = elements.length ? elements : [{ text: titleCaseIt(clean(input.idea || input.promise || input.genre || "Tema")), type: "keyword" as const, weight: 45 }];
  const scores = scoreCandidate(input, title, subtitle, effectiveElements);
  const usedDistinctiveElements = titleUsesElements(title, subtitle, effectiveElements);
  const could = couldBelongToThousandBooks(title, subtitle, effectiveElements);
  return {
    title: clean(title),
    subtitle: clean(subtitle),
    angle: "audit",
    scores,
    usedDistinctiveElements,
    stage: "candidate",
    couldBelongToThousandBooks: could,
  };
}
