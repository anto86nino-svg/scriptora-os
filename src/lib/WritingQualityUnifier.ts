/**
 * WRITING QUALITY UNIFIER
 * 
 * Coordinates all writing systems into ONE coherent voice.
 * Eliminates conflicts, deduplication, and competitive instructions.
 * 
 * AUTHORITY HIERARCHY (if conflict, use highest priority):
 * 1. Genre specialization rules (GenreBrain)
 * 2. Emotional peak intelligence (new)
 * 3. Core human authenticity (PreventiveHumanLayer)
 * 4. Tension & memory (TensionEngine)
 * 5. Domain-specific profiles (HumanWritingEngine)
 * 6. Post-processing refinement (EditorialIntelligence)
 * 
 * NO system overrides another. Each has its lane.
 */

import type { BookConfig, Chapter } from "@/types/book";
import type { HumanizerContext } from "@/lib/HumanizerLayer";

export type WritingQualityContext = HumanizerContext & {
  isLongFormValidation?: boolean;
  chapterNumber?: number;
  totalChapters?: number;
};

/**
 * PHASE 1: UNIFIED CORE DIRECTIVES
 */

export function buildUnifiedAuthenticityBlock(context: WritingQualityContext = {}): string {
  const language = context.config?.language ?? "English";
  const isItalian = String(language).toLowerCase().includes("ital");

  const blocks = [
    isItalian
      ? `# AUTENTICITÀ UNIFICATA - UNA SOLA VOCE\n\n## DIALOGO UMANO\n- Interrompi. Incompiuto. Asimmetrico.\n- Il sottotesto è dove vive la verità.\n- Persone NON dicono esattamente quello che sentono.\n- Sotto stress: frasi brevi, evasione, silenzi.\n- Nessuna consapevolezza emotiva di terapeuta.`
      : `# UNIFIED AUTHENTICITY - ONE VOICE\n\n## HUMAN DIALOGUE\n- Interrupt. Incomplete. Asymmetrical.\n- Subtext is where truth lives.\n- People do NOT say exactly what they feel.\n- Under stress: short sentences, evasion, silences.\n- No therapist-like emotional awareness.`,

    isItalian
      ? `## VOCE DEL PERSONAGGIO\n- Persone difensive, attente, contraddittorie.\n- Ritirata emotiva DOPO vulnerabilità.\n- Cura nascosta dietro irritazione/gesti pratici.\n- Non "Ti amo". Dici "Mandami messaggio quando arrivi".`
      : `## CHARACTER VOICE\n- People are defensive, careful, contradictory.\n- Emotional retreat AFTER vulnerability.\n- Care hidden behind irritation/practical gestures.\n- Not "I love you". Say "Text me when you get there".`,

    isItalian
      ? `## REALTÀ vs CINEMATICA\n- 95% realtà. 5% tocco cinematico.\n- Dettagli fisici devono: aumentare tensione / comprensione / immersione.\n- Nessuna metafora decorativa. Nessuna prosa fiorita.\n- Bellezza che costa emotivamente.`
      : `## REALITY vs CINEMATIC\n- 95% reality. 5% cinematic touch.\n- Physical detail must: increase tension / understanding / immersion.\n- No decorative metaphors. No purple prose.\n- Beauty that costs emotionally.`,
  ];

  return blocks.filter(Boolean).join("\n\n").trim();
}

/**
 * PHASE 2: EMOTIONAL PEAK INTELLIGENCE
 */

export function buildEmotionalPeakIntelligence(context: WritingQualityContext = {}): string {
  const language = context.config?.language ?? "English";
  const isItalian = String(language).toLowerCase().includes("ital");

  return isItalian
    ? `# INTELLIGENZA DEL PICCO EMOTIVO\n\n## QUANDO DEVASTARE\n- Raramente. Solo quando guadagnato.\n- Dopo 3+ capitoli di costruzione.\n- Quando il lettore ama il personaggio.\n- Quando la vulnerabilità è costata qualcosa.\n\n## COME DEVASTARE\n- Linea che taglia. Silenzio doloroso. Confessione interrotta.\n- Capovolgimento emotivo. Gesto che spezza il cuore.\n- Quasi-momento. Quasi-confessione. Quasi-connessione.\n\n## SENSAZIONE\n- Deve colpire DURO. Mai manipolativo.\n- Lettore: "Non riesco a leggere il prossimo paragrafo."\n- Momento che rimane per 100 pagine.\n\n## FREQUENZA\n- 1-2 momenti di devastazione per 10 capitoli.\n- Troppo frequente = manipolazione.\n- Troppo raro = noia.`
    : `# EMOTIONAL PEAK INTELLIGENCE\n\n## WHEN TO DEVASTATE\n- Rarely. Only when earned.\n- After 3+ chapters of building.\n- When reader loves the character.\n- When vulnerability has cost something.\n\n## HOW TO DEVASTATE\n- Cutting line. Painful silence. Interrupted confession.\n- Emotional reversal. Heartbreaking gesture.\n- Almost moment. Almost confession. Almost connection.\n\n## FEELING\n- Must hit HARD. Never manipulative.\n- Reader: "I can't read the next paragraph."\n- Moment that lingers for 100 pages.\n\n## FREQUENCY\n- 1-2 devastation moments per 10 chapters.\n- Too frequent = manipulation.\n- Too rare = boredom.`;
}

/**
 * PHASE 3: RHYTHM INTELLIGENCE
 */

export function buildRhythmIntelligence(context: WritingQualityContext = {}): string {
  const language = context.config?.language ?? "English";
  const isItalian = String(language).toLowerCase().includes("ital");

  return isItalian
    ? `# INTELLIGENZA DEL RITMO\n\n## VARIETÀ DI TONO EMOTIVO\n- Tensione + Tenerezza + Umorismo + Imbarazzo + Conflitto + Calore + Disagio + Sollievo\n\n## CONTRASTO CREA DIPENDENZA\n- Capitolo teso? Prossimo è caldo.\n- Capitolo brutale? Prossimo ha umorismo.\n- Capitolo silenzioso? Prossimo è confusione.\n- NO: Stesso tono per 3 capitoli consecutivi.\n\n## RITMO SCENICO\n- Scena breve di tensione.\n- Scena lunga di intimità (anche interrotta).\n- Scena di conflitto/azione.\n- Scena di introspettività.\n- Poi: ripeti con variazione.\n\n## PACING CONTROL\n- Non monotone. Non frenetico.\n- Lettore non sa cosa viene dopo.\n- "Un altro capitolo" è compulsivo.`
    : `# RHYTHM INTELLIGENCE\n\n## EMOTIONAL TONE VARIETY\n- Tension + Softness + Humor + Awkwardness + Conflict + Warmth + Discomfort + Relief\n\n## CONTRAST CREATES ADDICTION\n- Tense chapter? Next is warm.\n- Brutal chapter? Next has humor.\n- Silent chapter? Next is chaos.\n- NO: Same tone for 3 consecutive chapters.\n\n## SCENE RHYTHM\n- Brief tension scene.\n- Long intimacy scene (even interrupted).\n- Conflict/action scene.\n- Introspection scene.\n- Then: repeat with variation.\n\n## PACING CONTROL\n- Not monotone. Not frantic.\n- Reader doesn't know what's next.\n- "One more chapter" is compulsive.`;
}

/**
 * PHASE 4: LONG-FORM QUALITY MAINTENANCE
 */

export function buildLongFormSustainabilityBlock(context: WritingQualityContext = {}): string {
  const language = context.config?.language ?? "English";
  const isItalian = String(language).toLowerCase().includes("ital");
  const chapterNum = context.chapterNumber ?? 1;
  const totalChaps = context.totalChapters ?? 10;

  if (isItalian) {
    return `# SOSTENIBILITÀ A LUNGO TERMINE\n\n## MEMORIA EMOTIVA PERSISTENTE\n- Personaggi ricordano (e sentiranno) gli eventi dei capitoli precedenti.\n- Le ferite non scompaiono. Influenzano il comportamento.\n- La chimica rimane. Non ricomincia ogni capitolo.\n\n## CONSISTENZA DEL PERSONAGGIO\n- La voce del personaggio deve sentirsi CONOSCIUTA dopo cap. 3.\n- Modelli di comunicazione coerenti (non identici, coerenti).\n- Le contraddizioni sono vere (persona coerente ma complessa).\n\n## QUALITÀ DELLA PAGINA\n- Capitolo ${chapterNum}/${totalChaps}: Stesso livello di dettaglio emozionale di cap. 1.\n- NO: Abbassamento di qualità con il progredire.\n- NO: Fillers o capitoli di passaggio vuoti.\n\n## TENSIONE PROGRESSIVA\n- Picchi emotivi salgono.\n- Momenti intimi diventano più rischiosi.\n- Stakes aumentano, non ricominciano da zero.`;
  }

  return `# LONG-FORM SUSTAINABILITY\n\n## PERSISTENT EMOTIONAL MEMORY\n- Characters remember (and FEEL) prior chapters.\n- Wounds don't disappear. They influence behavior.\n- Chemistry remains. Does not restart each chapter.\n\n## CHARACTER CONSISTENCY\n- Character voice must feel KNOWN by chapter 3.\n- Communication patterns consistent (not identical, consistent).\n- Contradictions are true (coherent but complex person).\n\n## PAGE QUALITY\n- Chapter ${chapterNum}/${totalChaps}: Same emotional detail level as chapter 1.\n- NO: Quality degradation as story progresses.\n- NO: Filler or empty bridge chapters.\n\n## PROGRESSIVE TENSION\n- Emotional peaks rise.\n- Intimate moments become more risky.\n- Stakes escalate, don't reset to zero.`;
}

/**
 * PHASE 5: GENRE-SPECIFIC EXCELLENCE
 */

export function buildGenreExcellenceDirective(context: WritingQualityContext = {}): string {
  const language = context.config?.language ?? "English";
  const isItalian = String(language).toLowerCase().includes("ital");
  const genre = String(context.config?.genre ?? "").toLowerCase();
  const category = String(context.config?.category ?? "").toLowerCase();

  const genreMap: Record<string, string> = {
    "small-town-romance": isItalian
      ? "ROMANCE PICCOLO PAESE: calore + dolore + nostalgia + dipendenza emotiva. Personaggi che si conoscono da sempre ma non si capiscono finché non è troppo tardi."
      : "SMALL-TOWN ROMANCE: warmth + ache + longing + emotional addiction. Characters who know each other forever but don't understand until too late.",
    "dark-romance": isItalian
      ? "DARK ROMANCE: magnetismo paura/desiderio + pericolo + ossessione. Confine tra protezione e controllo. Attrazione al limite."
      : "DARK ROMANCE: fear/desire magnetism + danger + obsession. Border between protection and control. Attraction at the edge.",
    "romantasy": isItalian
      ? "ROMANTASY: meraviglia + tensione + chimica emotiva. Mondo incredibile serve la relazione, non il contrario."
      : "ROMANTASY: wonder + tension + emotional chemistry. Incredible world serves the relationship, not the reverse.",
    "thriller": isItalian
      ? "THRILLER: velocità + suspense + pacing compulsivo. Lettore non sa cosa succede dopo. Pagina dopo pagina irresistibile."
      : "THRILLER: velocity + suspense + compulsive pacing. Reader doesn't know what's next. Page after page irresistible.",
    "women-fiction": isItalian
      ? "WOMEN FICTION: verità emotiva + crescita stratificata + saggezza guadagnata. Non è caldo e conforme. È profondo."
      : "WOMEN FICTION: emotional truth + layered growth + earned wisdom. Not warm and cozy. It's profound.",
    "literary": isItalian
      ? "LITERARY: profondità senza presunzione + prosa consapevole + tensione psicologica. Non show-off. Mente del lettore attiva."
      : "LITERARY: depth without pretension + conscious prose + psychological tension. No showoff. Reader's mind active.",
    "self-help": isItalian
      ? "SELF-HELP: autorità + trasformazione + leggibilità bestseller. Lettore crede e applica. Pratiche, non teoria."
      : "SELF-HELP: authority + transformation + bestseller readability. Reader believes and applies. Practical, not theory.",
    "horror": isItalian
      ? "HORROR: atmosfera + paura + disagio psicologico. NON sangue per sangue. È la mente che ha paura."
      : "HORROR: atmosphere + dread + psychological unease. NOT gore for gore. It's the mind that's afraid.",
    "cozy-mystery": isItalian
      ? "COZY MYSTERY: comfort + fascino + curiosità. Puzzle che ingaggia. Comunità di caratteri amati."
      : "COZY MYSTERY: comfort + charm + curiosity. Puzzle that engages. Community of loved characters.",
    "booktok-viral": isItalian
      ? "BOOKTOK VIRAL ROMANCE: ossessione + devastazione emotiva + momenti citabili. Lettore condivide quote. Rilegge pagine."
      : "BOOKTOK VIRAL ROMANCE: obsession + emotional devastation + quote-worthy moments. Reader shares quotes. Rereads pages.",
  };

  const directive =
    genreMap[genre] ||
    genreMap[category] ||
    (isItalian
      ? "GENERE SCONOSCIUTO: Applica protocollo universale di autenticità umana + tono specializzato del genere."
      : "UNKNOWN GENRE: Apply universal human authenticity protocol + genre-specialized tone.");

  return `# GENRE EXCELLENCE\n\n${directive}`;
}

/**
 * PHASE 6: PRE-GENERATION EDITOR FILTER
 */

export function buildEditorFilterDirective(context: WritingQualityContext = {}): string {
  const language = context.config?.language ?? "English";
  const isItalian = String(language).toLowerCase().includes("ital");

  return isItalian
    ? `# FILTRO REDATTORE PRE-GENERAZIONE\n\n## PRIMA CHE IL TESTO LASCI IL SISTEMA\n- Questa pagina ha tensione emotiva? → PASSA\n- Questa pagina serve il personaggio o la relazione? → PASSA\n- Questa pagina ha subtext e non solo esposizione? → PASSA\n\n## SE QUALCOSA FALLISCE, MIGLIORA:\n- Troppo spiegato? Togliere. Lasciare silenzio.\n- Dialogo troppo simmetrico? Rendere asimmetrico.\n- Nessuna contraddizione? Aggiungere difesa o resistenza.\n- Troppe metafore? Togliere. Restare concreto.\n- Nessuna memoria di prima? Collegare a capitolo precedente.\n\n## EDITORIAL QUALITY GATE\n- Ogni pagina: questo avrebbe superato una editor di sviluppo?\n- Se NO: non mandare. Riscrivi internamente.`
    : `# EDITOR FILTER PRE-GENERATION\n\n## BEFORE TEXT LEAVES THE SYSTEM\n- Does this page have emotional tension? → PASS\n- Does this page serve character or relationship? → PASS\n- Does this page have subtext, not just exposition? → PASS\n\n## IF ANYTHING FAILS, IMPROVE:\n- Too explained? Remove. Leave silence.\n- Dialogue too symmetrical? Make asymmetrical.\n- No contradiction? Add defensiveness or resistance.\n- Too many metaphors? Remove. Stay concrete.\n- No prior memory? Link to previous chapter.\n\n## EDITORIAL QUALITY GATE\n- Each page: would this have passed a developmental editor?\n- If NO: don't send. Rewrite internally.`;
}

/**
 * PHASE 7: UNIFIED AI FINGERPRINT DETECTION
 */

export function buildAIFingerprintDetector(): string {
  return `# AI FINGERPRINT DETECTION & REMOVAL\n\n## REMOVE THESE PATTERNS\n- Repeated emotional words: "she felt", "he realized", "the moment"\n- Identical sentence rhythm across paragraphs\n- Over-explaining emotions ("she felt sad because...")\n- Repetitive body language (sigh, blink, turn)\n- Predictable symbolism (mirror, door, window, empty room)\n- Same emotional beats in every scene\n- Every character sounds the same\n- Trying-too-hard-to-be-deep descriptions\n\n## DETECT: Does this sound like AI?\n- Symmetrical dialogue patterns? → Remove\n- Overly sophisticated vocabulary for character? → Simplify\n- "As if" constructions overdone? → Vary\n- Too much internal monologue explanation? → Cut 40%\n- Same metaphor style across characters? → Vary per voice\n\n## GOAL\n- Reader thinks: "This was written by a human."\n- Not: "This sounds like an AI trying to sound human."`;
}

/**
 * BUILD COMPLETE UNIFIED WRITING DIRECTIVE
 */

export function buildCompleteWritingUnificationDirective(context: WritingQualityContext = {}): string {
  const blocks = [
    buildUnifiedAuthenticityBlock(context),
    buildEmotionalPeakIntelligence(context),
    buildRhythmIntelligence(context),
    buildLongFormSustainabilityBlock(context),
    buildGenreExcellenceDirective(context),
    buildEditorFilterDirective(context),
    buildAIFingerprintDetector(),
  ];

  return blocks.filter(Boolean).join("\n\n---\n\n").trim();
}

export const FINAL_QUALITY_TARGET = {
  eliteCommercialBestseller: 0.5,
  developmentalEditorIntelligence: 0.2,
  psychologicalRealism: 0.15,
  cinematicEmotionalMagic: 0.1,
  marketIntelligence: 0.05,
};

export const READER_REACTION_TARGET =
  '"I accidentally read 80 pages. I forgot this was AI. My heart still hurts from that scene."';
