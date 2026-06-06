import type { Genre } from "@/types/book";
import { getWritingBrain } from "./brains";
import type {
  BookDomain,
  BookIntelligenceInput,
  BookIntelligenceLayers,
  BookIntelligenceReport,
  BookIntelligenceSnapshot,
  WritingBrainId,
} from "./types";

type SignalRule = {
  id: string;
  weight: number;
  pattern: RegExp;
  domain: BookDomain;
  primaryGenre: string;
  subgenre: string;
  archetype: string;
  brainId: WritingBrainId;
  resolvedGenre: Genre;
  tone: string;
};

const FICTION_SIGNALS: SignalRule[] = [
  { id: "dark-romance", weight: 12, pattern: /\b(dark romance|dark-romance|romance oscur[oa]|ossessione|possessiv[oa]|booktok|slow burn|slow-burn)\b/i, domain: "fiction", primaryGenre: "romance", subgenre: "dark romance", archetype: "forbidden desire arc", brainId: "dark-romance-brain", resolvedGenre: "dark-romance", tone: "intense" },
  { id: "mafia", weight: 11, pattern: /\b(mafia|cartel|mob|crime family|famiglia criminale|boss mafioso|don\b|camorra|ndrangheta)\b/i, domain: "fiction", primaryGenre: "crime", subgenre: "mafia", archetype: "empire and forbidden bond", brainId: "mafia-brain", resolvedGenre: "crime", tone: "intense" },
  { id: "enemies-lovers", weight: 10, pattern: /\b(enemies to lovers|nemici.*amanti|hatelove|rivali.*amore)\b/i, domain: "fiction", primaryGenre: "romance", subgenre: "enemies to lovers", archetype: "antagonistic chemistry arc", brainId: "enemies-to-lovers-brain", resolvedGenre: "romance", tone: "intense" },
  { id: "cozy-mystery", weight: 10, pattern: /\b(cozy mystery|mistero cozy|amateur sleuth|detective dilettante|village mystery)\b/i, domain: "fiction", primaryGenre: "mystery", subgenre: "cozy mystery", archetype: "community puzzle", brainId: "cozy-mystery-brain", resolvedGenre: "mystery", tone: "warm" },
  { id: "psych-thriller", weight: 10, pattern: /\b(psychological thriller|thriller psicologico|unreliable narrator|narratore inaffidabile)\b/i, domain: "fiction", primaryGenre: "thriller", subgenre: "psychological thriller", archetype: "mind fracture arc", brainId: "psychological-thriller-brain", resolvedGenre: "thriller", tone: "intense" },
  { id: "epic-fantasy", weight: 9, pattern: /\b(epic fantasy|high fantasy|fantasy epica|saga fantasy|chosen one|eroe prescelto)\b/i, domain: "fiction", primaryGenre: "fantasy", subgenre: "epic fantasy", archetype: "mythic quest", brainId: "epic-fantasy-brain", resolvedGenre: "fantasy", tone: "narrative" },
  { id: "paranormal", weight: 9, pattern: /\b(paranormal|vampire|vampir[oi]|werewolf|licantrop|witch|strega|supernatural)\b/i, domain: "fiction", primaryGenre: "fantasy", subgenre: "paranormal", archetype: "supernatural bond", brainId: "paranormal-brain", resolvedGenre: "fantasy", tone: "intense" },
  { id: "dystopian", weight: 9, pattern: /\b(dystopi[ac]|distopi[ac]|totalitarian|totalitari[oa]|post-apocalyptic|post apocalittic)\b/i, domain: "fiction", primaryGenre: "sci-fi", subgenre: "dystopian", archetype: "system resistance", brainId: "dystopian-brain", resolvedGenre: "sci-fi", tone: "intense" },
  { id: "ya", weight: 8, pattern: /\b(young adult|\bya\b|teen|adolescent| liceo|superiori)\b/i, domain: "fiction", primaryGenre: "literary-fiction", subgenre: "young adult", archetype: "coming of age", brainId: "ya-brain", resolvedGenre: "literary-fiction", tone: "warm" },
  { id: "horror", weight: 9, pattern: /\b(horror|orrore|haunted|infestat|possession|demone|slasher|cosmic horror)\b/i, domain: "fiction", primaryGenre: "horror", subgenre: "horror", archetype: "dread escalation", brainId: "horror-brain", resolvedGenre: "horror", tone: "intense" },
  { id: "sci-fi", weight: 8, pattern: /\b(sci-fi|sci fi|science fiction|fantascienza|space opera|alien|robot|cyborg|colony)\b/i, domain: "fiction", primaryGenre: "sci-fi", subgenre: "science fiction", archetype: "speculative consequence", brainId: "sci-fi-brain", resolvedGenre: "sci-fi", tone: "narrative" },
  { id: "crime", weight: 8, pattern: /\b(crime novel|noir|detective|police procedural|indagine|omicidio|serial killer)\b/i, domain: "fiction", primaryGenre: "crime", subgenre: "crime fiction", archetype: "investigation arc", brainId: "crime-brain", resolvedGenre: "crime", tone: "intense" },
  { id: "mystery", weight: 7, pattern: /\b(mystery|mistero|whodunit|enigma|clue|indagine)\b/i, domain: "fiction", primaryGenre: "mystery", subgenre: "mystery", archetype: "fair-play puzzle", brainId: "mystery-brain", resolvedGenre: "mystery", tone: "narrative" },
  { id: "thriller", weight: 7, pattern: /\b(thriller|suspense|conspiracy|manhunt|cospirazione)\b/i, domain: "fiction", primaryGenre: "thriller", subgenre: "thriller", archetype: "ticking clock", brainId: "thriller-brain", resolvedGenre: "thriller", tone: "intense" },
  { id: "fantasy", weight: 7, pattern: /\b(fantasy|magia|magic|dragon|drago|wizard|mago|realm|reame|portal)\b/i, domain: "fiction", primaryGenre: "fantasy", subgenre: "fantasy", archetype: "hero journey", brainId: "fantasy-brain", resolvedGenre: "fantasy", tone: "narrative" },
  { id: "romance", weight: 6, pattern: /\b(romance|love story|storia d'amore|enemies|attrazione|cuore|bacio)\b/i, domain: "fiction", primaryGenre: "romance", subgenre: "romance", archetype: "relationship arc", brainId: "romance-brain", resolvedGenre: "romance", tone: "warm" },
];

const NONFICTION_SIGNALS: SignalRule[] = [
  { id: "horticulture", weight: 14, pattern: /\b(grow tomatoes|coltivare pomodor|pomodoro|orto|giardin|garden|gardening|horticultur|agricol|coltivaz|potatura|seme|irrigaz|compost|ortaggi|frutteto|vigna|apiario|pollice verde)\b/i, domain: "nonfiction", primaryGenre: "practical guide", subgenre: "agriculture / gardening", archetype: "horticultural manual", brainId: "horticultural-guide-brain", resolvedGenre: "gardening", tone: "instructional" },
  { id: "beekeeping", weight: 13, pattern: /\b(beekeeping|apicoltur|alveare|api\b|miele|varroa|arnia)\b/i, domain: "nonfiction", primaryGenre: "practical guide", subgenre: "beekeeping manual", archetype: "seasonal operational manual", brainId: "horticultural-guide-brain", resolvedGenre: "beekeeping", tone: "instructional" },
  { id: "cookbook", weight: 13, pattern: /\b(cookbook|ricettario|recipe book|ricette|ingredient|forno|bake|preheat|serves)\b/i, domain: "nonfiction", primaryGenre: "practical guide", subgenre: "cookbook", archetype: "recipe collection", brainId: "cookbook-brain", resolvedGenre: "cookbook", tone: "instructional" },
  { id: "technical-manual", weight: 12, pattern: /\b(technical manual|manuale tecnico|software guide|guida software|api docs|configuration|installazione|troubleshoot)\b/i, domain: "nonfiction", primaryGenre: "technical guide", subgenre: "technical manual", archetype: "reference manual", brainId: "technical-manual-brain", resolvedGenre: "technical-manual", tone: "instructional" },
  { id: "ai-tools", weight: 11, pattern: /\b(ai tools|prompt engineering|chatgpt guide|guida ai|llm|machine learning guide)\b/i, domain: "nonfiction", primaryGenre: "technical guide", subgenre: "AI tools guide", archetype: "workflow manual", brainId: "technical-manual-brain", resolvedGenre: "ai-tools-guide", tone: "instructional" },
  { id: "productivity", weight: 11, pattern: /\b(productivity|produttivit|deep work|atomic habits|habit formation|time management|gestione del tempo|gt\b|second brain|focus system)\b/i, domain: "nonfiction", primaryGenre: "productivity", subgenre: "behavioral systems", archetype: "systems playbook", brainId: "productivity-brain", resolvedGenre: "productivity", tone: "practical" },
  { id: "psychology", weight: 10, pattern: /\b(psychology|psicolog|overthink\w*|ansia|anxiety|cognitive|trauma|emotional regulation|regolazione emotiva|cbt|mindfulness clinic)\b/i, domain: "nonfiction", primaryGenre: "psychology", subgenre: "emotional regulation", archetype: "psychology guide", brainId: "psychology-brain", resolvedGenre: "psychology", tone: "conversational" },
  { id: "self-help", weight: 9, pattern: /\b(self-help|self help|personal growth|crescita personale|mindset|motivaz|transform your life|cambia la tua vita|inner work)\b/i, domain: "nonfiction", primaryGenre: "self help", subgenre: "personal transformation", archetype: "transformation guide", brainId: "self-help-brain", resolvedGenre: "self-help", tone: "conversational" },
  { id: "spirituality", weight: 10, pattern: /\b(spirituality|spiritual|meditaz|mindfulness|chakra|sacred|sacral|faith|fede|soul journey|anima)\b/i, domain: "nonfiction", primaryGenre: "spirituality", subgenre: "contemplative practice", archetype: "spiritual guide", brainId: "spirituality-brain", resolvedGenre: "spirituality", tone: "warm" },
  { id: "memoir", weight: 10, pattern: /\b(memoir|autobiograph|autobiograf|my story|mia storia|ricordi di|vita mia)\b/i, domain: "nonfiction", primaryGenre: "memoir", subgenre: "personal narrative", archetype: "memoir arc", brainId: "memoir-brain", resolvedGenre: "memoir", tone: "narrative" },
  { id: "biography", weight: 9, pattern: /\b(biography|biograf|life of|vita di|storia di)\b/i, domain: "nonfiction", primaryGenre: "biography", subgenre: "documentary life", archetype: "biography arc", brainId: "biography-brain", resolvedGenre: "biography", tone: "narrative" },
  { id: "business", weight: 9, pattern: /\b(business|startup|marketing|sales|vendite|entrepreneur|imprenditor|leadership|strategy|strategia)\b/i, domain: "nonfiction", primaryGenre: "business", subgenre: "business strategy", archetype: "business playbook", brainId: "business-brain", resolvedGenre: "business", tone: "practical" },
  { id: "finance", weight: 9, pattern: /\b(finance|finanz|invest|budget|money management|gestione denaro|wealth|patrimonio)\b/i, domain: "nonfiction", primaryGenre: "finance", subgenre: "personal finance", archetype: "finance guide", brainId: "finance-brain", resolvedGenre: "business", tone: "practical" },
  { id: "fitness", weight: 9, pattern: /\b(fitness|workout|allenamento|training program|hypertrophy|powerlifting|gym\b)\b/i, domain: "nonfiction", primaryGenre: "fitness", subgenre: "training program", archetype: "fitness manual", brainId: "fitness-brain", resolvedGenre: "fitness", tone: "instructional" },
  { id: "health", weight: 8, pattern: /\b(health|wellness|salute|medicina|medical|nutrition|nutrizione|dieta|diet)\b/i, domain: "nonfiction", primaryGenre: "health", subgenre: "health guide", archetype: "evidence protocol", brainId: "health-brain", resolvedGenre: "health-medicine", tone: "academic" },
  { id: "education", weight: 8, pattern: /\b(education|educazione|study guide|guida allo studio|exam prep|corso|lesson|lezione|textbook)\b/i, domain: "nonfiction", primaryGenre: "education", subgenre: "learning guide", archetype: "pedagogical guide", brainId: "education-brain", resolvedGenre: "education", tone: "instructional" },
  { id: "parenting", weight: 8, pattern: /\b(parenting|genitori|mamma|papà|bambini|child development|neonat|adolescen)\b/i, domain: "nonfiction", primaryGenre: "parenting", subgenre: "parenting guide", archetype: "parenting playbook", brainId: "parenting-brain", resolvedGenre: "education", tone: "warm" },
  { id: "practical-howto", weight: 7, pattern: /\b(how to|come fare|step by step|passo passo|manual|manuale|guida pratica|tutorial|checklist|troubleshoot)\b/i, domain: "nonfiction", primaryGenre: "practical guide", subgenre: "how-to manual", archetype: "practical manual", brainId: "practical-manual-brain", resolvedGenre: "manual", tone: "instructional" },
];

const GENRE_HINTS: Partial<Record<string, { brainId: WritingBrainId; resolvedGenre: Genre; domain: BookDomain }>> = {
  gardening: { brainId: "horticultural-guide-brain", resolvedGenre: "gardening", domain: "nonfiction" },
  beekeeping: { brainId: "horticultural-guide-brain", resolvedGenre: "beekeeping", domain: "nonfiction" },
  "dark-romance": { brainId: "dark-romance-brain", resolvedGenre: "dark-romance", domain: "fiction" },
  romance: { brainId: "romance-brain", resolvedGenre: "romance", domain: "fiction" },
  "self-help": { brainId: "self-help-brain", resolvedGenre: "self-help", domain: "nonfiction" },
  productivity: { brainId: "productivity-brain", resolvedGenre: "productivity", domain: "nonfiction" },
  psychology: { brainId: "psychology-brain", resolvedGenre: "psychology", domain: "nonfiction" },
  spirituality: { brainId: "spirituality-brain", resolvedGenre: "spirituality", domain: "nonfiction" },
  memoir: { brainId: "memoir-brain", resolvedGenre: "memoir", domain: "nonfiction" },
  business: { brainId: "business-brain", resolvedGenre: "business", domain: "nonfiction" },
  education: { brainId: "education-brain", resolvedGenre: "education", domain: "nonfiction" },
  health: { brainId: "health-brain", resolvedGenre: "health", domain: "nonfiction" },
  "health-medicine": { brainId: "health-brain", resolvedGenre: "health-medicine", domain: "nonfiction" },
  fitness: { brainId: "fitness-brain", resolvedGenre: "fitness", domain: "nonfiction" },
  cookbook: { brainId: "cookbook-brain", resolvedGenre: "cookbook", domain: "nonfiction" },
  "technical-manual": { brainId: "technical-manual-brain", resolvedGenre: "technical-manual", domain: "nonfiction" },
  manual: { brainId: "practical-manual-brain", resolvedGenre: "manual", domain: "nonfiction" },
  thriller: { brainId: "thriller-brain", resolvedGenre: "thriller", domain: "fiction" },
  fantasy: { brainId: "fantasy-brain", resolvedGenre: "fantasy", domain: "fiction" },
  mystery: { brainId: "mystery-brain", resolvedGenre: "mystery", domain: "fiction" },
  crime: { brainId: "crime-brain", resolvedGenre: "crime", domain: "fiction" },
  horror: { brainId: "horror-brain", resolvedGenre: "horror", domain: "fiction" },
  "sci-fi": { brainId: "sci-fi-brain", resolvedGenre: "sci-fi", domain: "fiction" },
};

function combineText(input: BookIntelligenceInput): string {
  return [input.idea, input.title, input.genre, input.category, input.subcategory]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreSignals(text: string, rules: SignalRule[]): Array<{ rule: SignalRule; matched: boolean }> {
  return rules.map((rule) => ({ rule, matched: rule.pattern.test(text) }));
}

function pickBestMatch(
  text: string,
  explicitGenre?: string,
): { rule: SignalRule | null; score: number; signals: string[] } {
  const signals: string[] = [];
  let best: SignalRule | null = null;
  let bestScore = 0;

  const allRules = [...NONFICTION_SIGNALS, ...FICTION_SIGNALS];
  for (const { rule, matched } of scoreSignals(text, allRules)) {
    if (!matched) continue;
    signals.push(rule.id);
    if (rule.weight > bestScore) {
      bestScore = rule.weight;
      best = rule;
    }
  }

  const genreKey = (explicitGenre || "").toLowerCase().trim();
  const hint = GENRE_HINTS[genreKey];
  if (hint && bestScore < 10) {
    const hintedRule = allRules.find((r) => r.brainId === hint.brainId);
    if (hintedRule) {
      signals.push(`genre-hint:${genreKey}`);
      return { rule: hintedRule, score: Math.max(bestScore, 10), signals };
    }
  }

  return { rule: best, score: bestScore, signals };
}

function buildLayers(rule: SignalRule): BookIntelligenceLayers {
  const brain = getWritingBrain(rule.brainId);
  return {
    domain: rule.domain,
    primaryGenre: rule.primaryGenre,
    subgenre: rule.subgenre,
    archetype: rule.archetype,
    readerExpectations: brain.readerExpectations,
    commercialStructure: brain.commercialStructure,
    writingBrainId: rule.brainId,
    bestsellerMode: brain.bestsellerMode,
  };
}

function fallbackReport(input: BookIntelligenceInput): BookIntelligenceReport {
  const genre = (input.genre || "").toLowerCase();
  const hint = GENRE_HINTS[genre];
  const brainId = hint?.brainId || "general-narrative-brain";
  const brain = getWritingBrain(brainId);
  const domain: BookDomain =
    hint?.domain ||
    (/\b(novel|romance|thriller|fantasy|story|storia)\b/i.test(combineText(input)) ? "fiction" : "nonfiction");
  const resolvedGenre: Genre = hint?.resolvedGenre || (domain === "fiction" ? "literary-fiction" : "manual");

  return {
    layers: {
      domain,
      primaryGenre: input.genre || (domain === "fiction" ? "fiction" : "practical guide"),
      subgenre: input.subcategory || "general",
      archetype: domain === "fiction" ? "narrative arc" : "practical guide",
      readerExpectations: brain.readerExpectations,
      commercialStructure: brain.commercialStructure,
      writingBrainId: brainId,
      bestsellerMode: brain.bestsellerMode,
    },
    resolvedGenre,
    subcategory: input.subcategory || "general",
    tone: input.tone || (domain === "fiction" ? "narrative" : "instructional"),
    confidence: 0.35,
    signals: ["fallback"],
    structureElements: brain.structureElements,
    avoidPatterns: brain.avoidPatterns,
  };
}

/** Multi-layer Book Intelligence Detection Engine V2 */
export function detectBookIntelligence(input: BookIntelligenceInput): BookIntelligenceReport {
  const text = combineText(input);
  if (!text.trim()) return fallbackReport(input);

  const { rule, score, signals } = pickBestMatch(text, input.genre);
  if (!rule || score < 6) return fallbackReport(input);

  const brain = getWritingBrain(rule.brainId);
  const confidence = Math.min(0.98, 0.45 + score * 0.04);

  return {
    layers: buildLayers(rule),
    resolvedGenre: rule.resolvedGenre,
    subcategory: input.subcategory?.trim() || rule.subgenre,
    tone: input.tone?.trim() || rule.tone,
    confidence,
    signals,
    structureElements: brain.structureElements,
    avoidPatterns: brain.avoidPatterns,
  };
}

export function buildBookIntelligenceSnapshot(input: BookIntelligenceInput): BookIntelligenceSnapshot {
  const report = detectBookIntelligence(input);
  return {
    version: 2,
    layers: report.layers,
    resolvedGenre: report.resolvedGenre,
    subcategory: report.subcategory,
    tone: report.tone,
    confidence: report.confidence,
    lockedAt: new Date().toISOString(),
  };
}

export function buildBookIntelligencePromptBlock(snapshot: BookIntelligenceSnapshot): string {
  const brain = getWritingBrain(snapshot.layers.writingBrainId);
  return `BOOK INTELLIGENCE ENGINE V2 — LOCKED
Domain: ${snapshot.layers.domain}
Primary genre: ${snapshot.layers.primaryGenre}
Subgenre: ${snapshot.layers.subgenre}
Archetype: ${snapshot.layers.archetype}
Writing brain: ${brain.label}
Tone directive: ${brain.tone}
Commercial structure: ${snapshot.layers.commercialStructure}
Bestseller mode: ${snapshot.layers.bestsellerMode}

READER EXPECTATIONS (honor all):
${snapshot.layers.readerExpectations.map((item) => `• ${item}`).join("\n")}

STRUCTURE ELEMENTS (use as scaffold, never label in prose):
${brain.structureElements.map((item, index) => `${index + 1}. ${item}`).join("\n")}

NEVER DO (critical — these destroy genre trust):
${brain.avoidPatterns.map((item) => `• ${item}`).join("\n")}`;
}

/** Refine API-detected intent with client-side intelligence (fixes macro-genre misclassification) */
export function refineDetectedGenre(input: {
  idea: string;
  genre: string;
  subcategory?: string;
  tone?: string;
}): { genre: string; subcategory: string; tone: string; confidence: number; brainId: WritingBrainId } {
  const report = detectBookIntelligence({
    idea: input.idea,
    genre: input.genre,
    subcategory: input.subcategory,
    tone: input.tone,
  });

  const horticultureOverride =
    input.genre === "self-help" && report.layers.writingBrainId === "horticultural-guide-brain";

  const shouldOverride =
    report.confidence >= 0.65 &&
    report.resolvedGenre !== input.genre &&
    report.layers.writingBrainId !== "self-help-brain";

  if (horticultureOverride || shouldOverride) {
    return {
      genre: report.resolvedGenre,
      subcategory: report.subcategory,
      tone: report.tone,
      confidence: report.confidence,
      brainId: report.layers.writingBrainId,
    };
  }

  return {
    genre: input.genre,
    subcategory: input.subcategory || report.subcategory,
    tone: input.tone || report.tone,
    confidence: report.confidence,
    brainId: report.layers.writingBrainId,
  };
}
