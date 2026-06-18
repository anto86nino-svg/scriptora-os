import type { BookBlueprint, BookChapterOutline, BookConfig, Chapter } from "@/types/book";

export type ChapterWritingPlan = {
  chapterIndex: number;
  chapterTitle: string;
  chapterPurpose: string;
  sceneGoal: string;
  emotionalConflict: string;
  externalConflict: string;
  revelation: string;
  characterBehavior: string;
  subtext: string;
  worldSpecificity: string[];
  antiClicheRules: string[];
  forbiddenPhrases: string[];
  rhythmDirective: string;
  endingHook: string;
  sceneBeats: string[];
  dialogueRules: string[];
  forbiddenPatterns: string[];
};

const DEFAULT_FORBIDDEN_PHRASES = [
  "annuì",
  "il silenzio cadde",
  "il silenzio si allungò",
  "per un istante",
  "qualcosa dentro di lei",
  "qualcosa dentro di lui",
  "come se",
  "gli occhi grigi",
  "la voce era bassa",
  "non era paura, era",
  "non era odio, era",
  "sentì un nodo alla gola",
  "una certezza fredda",
  "come un coltello",
  "strinse la mascella",
  "abbassò lo sguardo",
];

const FANTASY_GENERIC_CLICHES = [
  "foresta proibita",
  "sigillo antico",
  "uomo misterioso",
  "mantello scuro",
  "potere nascosto risvegliato",
  "occhi grigi",
  "cacciatore oscuro",
  "magia corrotta",
  "destino antico",
  "profecia antica",
];

const MAGIC_COST_MARKERS = [
  "costo",
  "prezzo",
  "dolore",
  "sangue",
  "debole",
  "bruci",
  "consum",
  "limite",
  "conseguen",
  "ferita",
  "radic",
  "ven",
  "corpo",
  "sacrific",
];

const INFODUMP_MARKERS = [
  "la magia è",
  "il mondo è",
  "devi sapere che",
  "ti spiego",
  "in realtà è",
  "tuo fratello è in pericolo",
  "il regno è",
  "la profezia dice",
];

function clean(value?: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isFantasyGenre(config: BookConfig): boolean {
  const bag = [config.genre, config.subcategory, config.subgenre, config.bookTypeId]
    .map((v) => clean(v).toLowerCase())
    .join(" ");
  return /fantasy|epic|urban fantasy|high fantasy|dark fantasy|fiab/.test(bag);
}

function isRomanceGenre(config: BookConfig): boolean {
  const bag = [config.genre, config.subcategory, config.subgenre].map((v) => clean(v).toLowerCase()).join(" ");
  return /romance|dark romance|romantasy/.test(bag);
}

function protagonist(config: BookConfig) {
  return (config.characters ?? []).find((c) =>
    /protagonist|protagonista|hero|eroina/i.test(clean(c.role)),
  ) ?? config.characters?.[0];
}

function counterpart(config: BookConfig) {
  return (config.characters ?? []).find((c) =>
    /antagonist|antagonista|love|interesse|interesse amoroso|counterpart/i.test(clean(c.role)),
  ) ?? config.characters?.[1];
}

function arcPhase(chapterIndex: number, total: number): "opening" | "rising" | "midpoint" | "crisis" | "climax" | "resolution" {
  const ratio = total > 1 ? chapterIndex / (total - 1) : 0;
  if (ratio < 0.2) return "opening";
  if (ratio < 0.45) return "rising";
  if (ratio < 0.55) return "midpoint";
  if (ratio < 0.75) return "crisis";
  if (ratio < 0.92) return "climax";
  return "resolution";
}

function extractSettingSeeds(config: BookConfig): string[] {
  const sources = [
    config.idea,
    config.forgeCanonBrief,
    config.forgeStoryArchitecture,
    config.subgenre,
    config.targetReader,
  ]
    .map(clean)
    .filter(Boolean);

  const joined = sources.join(" ");
  const tokens = joined
    .split(/[,;.\n·]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 120);

  return [...new Set(tokens)].slice(0, 5);
}

export function buildGenreAntiClicheRules(config: BookConfig): string[] {
  const rules: string[] = [
    "Niente spiegazioni dirette al lettore: mostra con azione, oggetto, conseguenza.",
    "Niente figure intercambiabili: ogni personaggio deve avere un modo di parlare riconoscibile.",
    "Niente gesti melodrammatici a catena (silenzio che cade, annuire, sguardo basso).",
    "Ogni scena deve cambiare qualcosa — nessuna scena solo 'atmosfera'.",
  ];

  if (isFantasyGenre(config)) {
    rules.push(
      "VIETATO usare 'foresta proibita' generica: se c'è un bosco, dargli una regola proprietaria (suono, odore, tabù locale).",
      "VIETATO 'sigillo antico' senza costo fisico, limite e conseguenza immediata.",
      "VIETATO 'uomo misterioso col mantello' come figura standard: deve avere un dettaglio umano concreto e un interesse preciso.",
      "VIETATO 'potere nascosto risvegliato' senza prezzo pagato nel corpo o nella relazione.",
      "Ogni magia deve avere costo, limite, sensazione fisica e conseguenza narrativa.",
      "Ogni luogo deve avere un dettaglio non intercambiabile (non 'foresta oscura' ma un segno preciso).",
      "Ogni rivelazione deve creare un problema nuovo, non solo spiegare lore.",
      "Se usi la parola 'sigillo', mostra anche costo/limite/conseguenza nella stessa scena.",
    );
  }

  if (isRomanceGenre(config)) {
    rules.push(
      "VIETATO love interest solo enigmatico: deve volere qualcosa di concreto che contrasta col protagonista.",
      "Desiderio e paura devono entrare in conflitto in ogni scena, non solo attrazione descritta.",
    );
  }

  return rules;
}

export function buildCharacterBehaviorRules(config: BookConfig): string[] {
  const lead = protagonist(config);
  const other = counterpart(config);
  const rules: string[] = [
    "I personaggi non spiegano tutto: difendono, omettono, mentono per omissione, cambiano argomento.",
    "Ogni battuta deve contenere almeno uno tra: difesa, omissione, attrito, micro-potere, sottotesto.",
    "Niente infodump in dialogo: se un personaggio sa qualcosa, lo rivela a pezzi o per proteggere qualcuno.",
  ];

  if (lead?.name) {
    rules.push(
      `${lead.name} deve agire secondo ferita (${clean(lead.wound) || "ferita canon"}) e desiderio (${clean(lead.externalDesire) || "desiderio canon"}), non spiegare emozioni in etichette.`,
      `${lead.name} reagisce con comportamento ricorrente proprietario, non gesti AI generici.`,
    );
  }
  if (other?.name) {
    rules.push(
      `${other.name} non fa monologhi espositivi: ogni risposta protegge un segreto (${clean(other.secret) || "segreto canon"}) o sposta il potere.`,
    );
  }

  return rules;
}

export function buildChapterForbiddenPatterns(config: BookConfig): string[] {
  const patterns = [...DEFAULT_FORBIDDEN_PHRASES];
  if (isFantasyGenre(config)) {
    patterns.push(...FANTASY_GENERIC_CLICHES);
  }
  return [...new Set(patterns.map((p) => p.toLowerCase()))];
}

export function buildChapterSpecificitySeeds(
  config: BookConfig,
  outline: BookChapterOutline,
  chapterIndex: number,
): string[] {
  const settingSeeds = extractSettingSeeds(config);
  const lead = protagonist(config);
  const title = clean(config.title);
  const specificity: string[] = [];

  if (settingSeeds[0]) {
    specificity.push(`Dettaglio luogo proprietario: ${settingSeeds[0]} — non genericizzare.`);
  } else if (isFantasyGenre(config)) {
    specificity.push(
      `Dettaglio luogo proprietario: un segno locale legato a «${title || "questo mondo"}» (suono, odore, tabù) — mai 'foresta proibita' generica.`,
    );
  }

  if (lead?.name) {
    specificity.push(
      `Dettaglio corpo/oggetto legato a ${lead.name}: qualcosa che solo lui/lei nota (cicatrice, gesto, oggetto tenuto male).`,
    );
  } else {
    specificity.push("Dettaglio sensoriale unico: un suono o odore che non potrebbe esistere in un'altra storia.");
  }

  const beat = clean(outline.purpose || outline.summary);
  if (beat) {
    specificity.push(`Dettaglio scena non intercambiabile: ${beat.slice(0, 100)} — reso concreto, non metafora vuota.`);
  } else {
    specificity.push(
      `Dettaglio scena non intercambiabile: oggetto o traccia fisica del capitolo ${chapterIndex + 1} che resterà in memoria.`,
    );
  }

  return specificity.slice(0, 3);
}

export function buildSceneBeatsForChapter(
  config: BookConfig,
  outline: BookChapterOutline,
  chapterIndex: number,
  totalChapters: number,
): string[] {
  const phase = arcPhase(chapterIndex, totalChapters);
  const summary = clean(outline.summary);
  const beats: string[] = [];

  beats.push(`Apertura — ancoraggio sensoriale concreto (no atmosfera generica). Piano: ${summary.slice(0, 120) || "entra in scena con tensione attiva"}.`);

  if (phase === "opening" || phase === "rising") {
    beats.push("Pressione — ostacolo esterno che costringe una scelta imbarazzante o pericolosa.");
    beats.push("Attrito dialogo — ognuno vuole qualcosa di diverso; nessuno dice tutto.");
  } else if (phase === "midpoint") {
    beats.push("Rottura — informazione che ribalta ciò che il protagonista credeva vero.");
    beats.push("Conseguenza — la rivelazione peggiora la situazione, non la risolve.");
  } else if (phase === "crisis" || phase === "climax") {
    beats.push("Confronto — posta in gioco visibile; nessuna via d'uscita pulita.");
    beats.push("Costo — qualcosa viene perso (fiducia, tempo, sangue, alibi).");
  } else {
    beats.push("Eco — conseguenza emotiva della scelta precedente.");
    beats.push("Varco — verso il finale, con tono coerente ma non spiegato.");
  }

  beats.push("Chiusura — ending hook (vedi endingHook).");
  return beats;
}

export function buildChapterEndingDirective(
  config: BookConfig,
  chapterIndex: number,
  totalChapters: number,
  outline: BookChapterOutline,
): string {
  const phase = arcPhase(chapterIndex, totalChapters);
  const summary = clean(outline.summary);

  if (phase === "midpoint") {
    return "Chiudi con rivelazione che crea un problema nuovo — il lettore deve voler girare pagina per capire il prezzo.";
  }
  if (phase === "climax" || phase === "crisis") {
    return "Chiudi con scelta irreversibile o rischio immediato — niente respiro comodo.";
  }
  if (phase === "resolution" && chapterIndex === totalChapters - 1) {
    return "Chiudi con eco emotiva e sensazione di completamento — ultima immagine concreta, non moralina.";
  }
  if (summary) {
    return `Chiudi con domanda aperta, rischio o scelta legata a: ${summary.slice(0, 90)}.`;
  }
  return "Chiudi con scelta, rivelazione, rischio o domanda aperta — mai con spiegazione pacificata.";
}

function buildChapterPurpose(
  outline: BookChapterOutline,
  chapterIndex: number,
  totalChapters: number,
  config: BookConfig,
): string {
  const explicit = clean(outline.purpose || outline.narrativeProgression);
  if (explicit) return explicit;

  const phase = arcPhase(chapterIndex, totalChapters);
  const lead = protagonist(config);
  const name = lead?.name ? `${lead.name} ` : "Il protagonista ";

  const purposes: Record<typeof phase, string> = {
    opening: `${name}entra in uno spazio dove le regole precedenti non valgono più — qualcosa cambia nel modo in cui si percepisce il pericolo.`,
    rising: `${name}perde un margine di controllo: ciò che voleva oggi costa più di quanto immaginava.`,
    midpoint: `Ciò che ${name}credeva vero si incrina — deve agire con informazioni incomplete e pagare subito un prezzo.`,
    crisis: `${name}non può più rimandare: la scelta di questa scena definisce chi protegge e chi tradisce.`,
    climax: `${name}affronta il costo massimo della promessa narrativa — niente via d'uscita neutrale.`,
    resolution: `${name}integra ciò che è successo — il mondo interno non torna identico al capitolo 1.`,
  };

  return purposes[phase];
}

function buildEmotionalConflict(config: BookConfig): string {
  const lead = protagonist(config);
  if (!lead) {
    return "Desiderio concreto vs paura di perdere ciò che definisce identità — mostrare, non nominare.";
  }
  const desire = clean(lead.externalDesire) || "ottenere ciò che crede necessario";
  const fear = clean(lead.internalNeed || lead.vulnerability || lead.wound) || "perdere controllo e identità";
  return `Vuole: ${desire}. Tema: ${fear}. Ogni scena spinge verso uno e allontana dall'altro.`;
}

function buildExternalConflict(config: BookConfig, outline: BookChapterOutline): string {
  const explicit = clean(outline.conflictProgression || outline.tensionProgression);
  if (explicit) return explicit;

  const other = counterpart(config);
  if (other?.name) {
    return `${other.name} blocca, distrae o offre aiuto che complica — mai ostacolo generico senza volontà propria.`;
  }
  return "Ostacolo concreto con regole e conseguenze — ambiente, tempo, prova fisica o pressione sociale.";
}

function buildRevelation(outline: BookChapterOutline, chapterIndex: number, total: number): string {
  const notes = outline.canonNotes?.join(" · ");
  if (notes) return notes;
  const phase = arcPhase(chapterIndex, total);
  if (phase === "midpoint") return "Verità parziale che peggiora la situazione — non lore da manuale.";
  if (phase === "opening") return "Segnale che il mondo ha regole diverse da quelle assunte.";
  return "Informazione nuova che cambia la prossima mossa — mai solo background.";
}

function buildSubtext(config: BookConfig, outline: BookChapterOutline): string {
  const lead = protagonist(config);
  const other = counterpart(config);
  const parts: string[] = [];

  if (lead?.name) {
    parts.push(`${lead.name} non dice: ${clean(lead.secret) || "la paura vera"}.`);
  }
  if (other?.name) {
    parts.push(`${other.name} protegge: ${clean(other.secret) || "un interesse nascosto"}.`);
  }
  parts.push(`Sottotesto scena: ${clean(outline.emotionalFunction || outline.psychologicalProgression) || "desiderio vs vergogna"}.`);

  return parts.join(" ");
}

export function buildChapterWritingPlan(
  bookConfig: BookConfig,
  blueprint: BookBlueprint,
  chapterIndex: number,
  previousChapters: Chapter[] = [],
): ChapterWritingPlan {
  const outline = blueprint.chapterOutlines[chapterIndex] ?? {
    title: `Capitolo ${chapterIndex + 1}`,
    summary: clean(bookConfig.idea).slice(0, 200),
  };
  const total = bookConfig.numberOfChapters || blueprint.chapterOutlines.length || 1;
  const chapterTitle = clean(outline.title) || `Capitolo ${chapterIndex + 1}`;

  const antiClicheRules = buildGenreAntiClicheRules(bookConfig);
  const dialogueRules = buildCharacterBehaviorRules(bookConfig);
  const worldSpecificity = buildChapterSpecificitySeeds(bookConfig, outline, chapterIndex);
  const sceneBeats = buildSceneBeatsForChapter(bookConfig, outline, chapterIndex, total);
  const endingHook = buildChapterEndingDirective(bookConfig, chapterIndex, total, outline);

  const lastChapter = previousChapters[previousChapters.length - 1];
  const continuityNote = lastChapter?.content
    ? `Continua da: ${lastChapter.content.slice(-180).replace(/\s+/g, " ")}`
    : "Primo capitolo — stabilisci tono e promessa con concretezza.";

  return {
    chapterIndex,
    chapterTitle,
    chapterPurpose: buildChapterPurpose(outline, chapterIndex, total, bookConfig),
    sceneGoal: clean(outline.purpose) || clean(outline.summary) || "Far avanzare la trama con una mossa concreta.",
    emotionalConflict: buildEmotionalConflict(bookConfig),
    externalConflict: buildExternalConflict(bookConfig, outline),
    revelation: buildRevelation(outline, chapterIndex, total),
    characterBehavior: dialogueRules.join(" "),
    subtext: `${buildSubtext(bookConfig, outline)} ${continuityNote}`,
    worldSpecificity,
    antiClicheRules,
    forbiddenPhrases: buildChapterForbiddenPatterns(bookConfig),
    rhythmDirective:
      "Alterna azione, percezione sensoriale, dialogo teso e conseguenza. Max 3 frasi espositive di fila. Dopo ogni rivelazione, mostra reazione fisica.",
    endingHook,
    sceneBeats,
    dialogueRules,
    forbiddenPatterns: buildChapterForbiddenPatterns(bookConfig),
  };
}

export function buildChapterWritingPlanPromptBlock(plan: ChapterWritingPlan): string {
  const lines: string[] = [
    "CHAPTER WRITING PLAN — REGIA NARRATIVA OBBLIGATORIA",
    "Segui questa scheda come vincolo editoriale. Non ignorare nessun punto.",
    "",
    `Capitolo ${plan.chapterIndex + 1}: «${plan.chapterTitle}»`,
    "",
    `1. chapterPurpose: ${plan.chapterPurpose}`,
    `2. sceneGoal: ${plan.sceneGoal}`,
    `3. emotionalConflict: ${plan.emotionalConflict}`,
    `4. externalConflict: ${plan.externalConflict}`,
    `5. revelation: ${plan.revelation}`,
    `6. characterBehavior: ${plan.characterBehavior}`,
    `7. subtext: ${plan.subtext}`,
    "8. worldSpecificity (usa tutti e 3):",
    ...plan.worldSpecificity.map((s) => `   - ${s}`),
    "9. antiClicheRules:",
    ...plan.antiClicheRules.map((r) => `   - ${r}`),
    "10. forbiddenPhrases (MAI usare):",
    plan.forbiddenPhrases.map((p) => p).join(", "),
    `11. rhythmDirective: ${plan.rhythmDirective}`,
    `12. endingHook: ${plan.endingHook}`,
    "",
    "SCENE BEATS:",
    ...plan.sceneBeats.map((b, i) => `${i + 1}. ${b}`),
    "",
    "DIALOGUE RULES:",
    ...plan.dialogueRules.map((r) => `- ${r}`),
    "",
    "Esempio dialogo (stile, non copiare):",
    'NO: "La magia è corrotta e tuo fratello è in pericolo."',
    'SÌ: "Se ti dico cos\'è, correrai da lui. Se corri da lui, lo useranno per aprirti."',
  ];

  return lines.join("\n");
}

export type ClicheViolation = {
  type: "forbidden_phrase" | "fantasy_cliche" | "magic_without_cost" | "dialogue_infodump";
  detail: string;
};

export function detectChapterClicheViolations(
  content: string,
  plan: ChapterWritingPlan,
): ClicheViolation[] {
  const violations: ClicheViolation[] = [];
  const lower = content.toLowerCase();

  for (const phrase of plan.forbiddenPhrases) {
    if (lower.includes(phrase.toLowerCase())) {
      violations.push({ type: "forbidden_phrase", detail: phrase });
    }
  }

  if (/sigill/i.test(content) && !MAGIC_COST_MARKERS.some((m) => lower.includes(m))) {
    violations.push({
      type: "magic_without_cost",
      detail: "sigillo/magia senza costo, limite o conseguenza fisica",
    });
  }

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.includes("«") && !trimmed.includes('"') && !trimmed.includes('"')) continue;
    const lineLower = trimmed.toLowerCase();
    if (INFODUMP_MARKERS.some((m) => lineLower.includes(m)) && trimmed.length > 40) {
      violations.push({ type: "dialogue_infodump", detail: trimmed.slice(0, 80) });
    }
  }

  return violations;
}

/** @deprecated alias */
export function buildSceneBeatsForChapterFromPlan(plan: ChapterWritingPlan): string[] {
  return plan.sceneBeats;
}
