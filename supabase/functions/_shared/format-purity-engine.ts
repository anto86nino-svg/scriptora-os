export type FormatPurityFormat =
  | "poetry_collection"
  | "manual"
  | "self_help"
  | "psychology_guide"
  | "workbook"
  | "study_material"
  | "essay"
  | "memoir"
  | "short_story_collection"
  | "novella"
  | "novel";

export type FormatPuritySeverity = "critical" | "high" | "medium";

export interface FormatPurityInput {
  text?: unknown;
  bookFormat?: unknown;
  genre?: unknown;
  subcategory?: unknown;
  studioId?: unknown;
  generationStrategy?: unknown;
  blueprintType?: unknown;
  requireMandatorySections?: boolean;
}

export interface FormatPurityIssue {
  code: string;
  severity: FormatPuritySeverity;
  message: string;
  evidence: string[];
}

export interface FormatPurityResult {
  passed: boolean;
  format: FormatPurityFormat;
  score: number;
  threshold: number;
  issues: FormatPurityIssue[];
}

function clean(value: unknown, max = 12000): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}

function normalize(value: unknown): string {
  return clean(value, 400).toLowerCase().replace(/[_\s]+/g, "-");
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function resolveFormatPurityFormat(input: Omit<FormatPurityInput, "text">): FormatPurityFormat {
  const identity = [
    input.studioId,
    input.bookFormat,
    input.genre,
    input.subcategory,
    input.generationStrategy,
    input.blueprintType,
  ].map(normalize).join(" ");

  if (/\bpoetry\b/.test(identity) || /poetry-collection|poetryblueprint|generatepoetrycollection|raccolta-poetica|poesia/.test(identity)) {
    return "poetry_collection";
  }
  if (/\bstudy\b/.test(identity) || /study-material|studyblueprint|generatestudymaterial|education|accademico/.test(identity)) {
    return "study_material";
  }
  if (/\bworkbook\b/.test(identity) || /journal|planner|generateworkbook/.test(identity)) {
    return "workbook";
  }
  if (/\btransformation\b/.test(identity) || /self-help|self_help|generateselfhelpguide|crescita-personale|mindset|coaching/.test(identity)) {
    return "self_help";
  }
  if (/psychology-guide|psychologyblueprint|generatepsychologyguide|psicologia|psychology/.test(identity)) {
    return "psychology_guide";
  }
  if (/\bprofessional-guide\b|\bprofessional_guide\b/.test(identity) || /manual|guideblueprint|generatemanual|business-book|cookbook|travel-guide/.test(identity)) {
    return "manual";
  }
  if (/essay|essayblueprint|generateessay|saggio/.test(identity)) {
    return "essay";
  }
  if (/\bmemoir\b/.test(identity) || /biography|autobiography|memoirblueprint|generatememoir/.test(identity)) {
    return "memoir";
  }
  if (/short-story-collection|short_story_collection|raccolta-racconti|story-collection|generateshortstorycollection/.test(identity)) {
    return "short_story_collection";
  }
  if (/novella|generatenovella/.test(identity)) {
    return "novella";
  }
  return "novel";
}

function collectPatternIssues(text: string, patterns: Array<{ code: string; message: string; pattern: RegExp }>): FormatPurityIssue[] {
  return patterns.flatMap(({ code, message, pattern }) => {
    const hits = text.match(pattern) || [];
    const evidence = Array.from(new Set(hits.map((hit) => hit.trim()).filter(Boolean))).slice(0, 6);
    return evidence.length
      ? [{ code, severity: "critical" as const, message, evidence }]
      : [];
  });
}

const POETRY_FORBIDDEN_PATTERNS = [
  { code: "poetry_narrative_role", message: "La poesia non puo' contenere ruoli fiction.", pattern: /\b(protagonist[aoie]?|antagonist[aoie]?|personaggi?|cast|eroe|villain)\b/gi },
  { code: "poetry_plot_language", message: "La poesia non puo' essere formulata come trama o storia.", pattern: /\b(trama|storia|conflitto|conflitto narrativo|mistero narrativo|investigazione|missione|promessa narrativa)\b/gi },
  { code: "poetry_pronoun_action", message: "La poesia non deve aprire un arco narrativo con personaggi agentivi.", pattern: /\b(lei|lui)\s+(?:e|è|progetta|deve|vuole|scopre|incontra|cerca|lotta|torna|parte|salva|dimostra|si\s+\w+)/gi },
  { code: "poetry_story_frame", message: "La poesia non deve usare frame da sinossi.", pattern: /\b(la storia|il protagonista|la protagonista|deve scoprire|deve salvare|deve dimostrare|si allea|si innamora|l'attrazione tra loro|attrazione tra loro|per dimostrare)\b/gi },
  { code: "poetry_common_names", message: "La poesia non deve aprire con personaggi nominati.", pattern: /\b(Viola|Luca|Marco|Anna|Giulia|Giulio|Sofia|Matteo|Elena|Leonardo|Celeste|Leo|Nicol[oò]|Livia|Sara|Andrea|Alessandro|Martina)\b/g },
];

const PRACTICAL_FORBIDDEN_PATTERNS = [
  { code: "practical_narrative_role", message: "Questo formato non deve contenere ruoli fiction.", pattern: /\b(protagonist[aoie]?|antagonist[aoie]?|personaggi?|cast)\b/gi },
  { code: "practical_plot_language", message: "Questo formato deve restare pratico: niente trama o promessa narrativa.", pattern: /\b(trama|promessa narrativa|storia romantica|missione narrativa|cliffhanger)\b/gi },
];

const REQUIRED_SECTIONS: Partial<Record<FormatPurityFormat, Array<{ code: string; label: string; pattern: RegExp }>>> = {
  poetry_collection: [
    { code: "poetry_missing_theme", label: "Tema centrale", pattern: /tema centrale\s*:/i },
    { code: "poetry_missing_voice", label: "Voce poetica", pattern: /voce poetica\s*:/i },
    { code: "poetry_missing_symbolic_field", label: "Campo simbolico", pattern: /campo simbolico\s*:/i },
    { code: "poetry_missing_images", label: "Immagini ricorrenti", pattern: /immagini ricorrenti\s*:/i },
    { code: "poetry_missing_emotional_arc", label: "Arco emotivo", pattern: /arco emotivo\s*:/i },
    { code: "poetry_missing_structure", label: "Struttura", pattern: /struttura\s*:/i },
    { code: "poetry_missing_section_count", label: "Numero sezioni", pattern: /numero sezioni\s*:/i },
    { code: "poetry_missing_poem_count", label: "Numero poesie", pattern: /numero poesie\s*:/i },
    { code: "poetry_missing_poetic_promise", label: "Promessa poetica", pattern: /promessa poetica\s*:/i },
    { code: "poetry_missing_rhythm", label: "Tono e ritmo", pattern: /tono e ritmo\s*:/i },
    { code: "poetry_missing_negative_space", label: "Cosa NON fara'", pattern: /cosa non (?:fara'|farà)[^:]{0,40}\s*:/i },
  ],
  manual: [
    { code: "manual_missing_problem", label: "Problema lettore", pattern: /problema(?: lettore)?\s*:/i },
    { code: "manual_missing_method", label: "Metodo", pattern: /metodo\s*:/i },
    { code: "manual_missing_exercises", label: "Esercizi", pattern: /esercizi\s*:/i },
    { code: "manual_missing_checklist", label: "Checklist", pattern: /checklist\s*:/i },
  ],
  self_help: [
    { code: "manual_missing_problem", label: "Problema lettore", pattern: /problema(?: lettore)?\s*:/i },
    { code: "manual_missing_method", label: "Metodo", pattern: /metodo\s*:/i },
    { code: "manual_missing_exercises", label: "Esercizi", pattern: /esercizi\s*:/i },
    { code: "manual_missing_checklist", label: "Checklist", pattern: /checklist\s*:/i },
  ],
  psychology_guide: [
    { code: "manual_missing_problem", label: "Problema lettore", pattern: /problema(?: lettore)?\s*:/i },
    { code: "manual_missing_method", label: "Metodo", pattern: /metodo\s*:/i },
    { code: "manual_missing_exercises", label: "Esercizi", pattern: /esercizi\s*:/i },
    { code: "manual_missing_checklist", label: "Checklist", pattern: /checklist\s*:/i },
  ],
  workbook: [
    { code: "workbook_missing_sheets", label: "Schede", pattern: /schede\s*:/i },
    { code: "workbook_missing_exercises", label: "Esercizi", pattern: /esercizi\s*:/i },
    { code: "workbook_missing_tracker", label: "Tracker", pattern: /(?:progress tracker|tracker)\s*:/i },
    { code: "workbook_missing_activities", label: "Attivita'", pattern: /attivit[aà]/i },
  ],
  study_material: [
    { code: "study_missing_modules", label: "Moduli", pattern: /moduli\s*:/i },
    { code: "study_missing_quiz", label: "Quiz", pattern: /quiz\s*:/i },
    { code: "study_missing_flashcards", label: "Flashcard", pattern: /flashcard\s*:/i },
    { code: "study_missing_checks", label: "Verifiche", pattern: /verifiche?\s*:/i },
    { code: "study_missing_simulations", label: "Simulazioni", pattern: /simulazioni?\s*:/i },
  ],
};

function mandatorySectionIssues(format: FormatPurityFormat, text: string, requireMandatorySections: boolean): FormatPurityIssue[] {
  if (!requireMandatorySections) return [];
  const required = REQUIRED_SECTIONS[format] || [];
  return required
    .filter((item) => !item.pattern.test(text))
    .map((item) => ({
      code: item.code,
      severity: "high" as const,
      message: `Sezione obbligatoria mancante: ${item.label}.`,
      evidence: [item.label],
    }));
}

function thresholdFor(format: FormatPurityFormat): number {
  return format === "poetry_collection" ? 98 : 95;
}

function scoreFor(format: FormatPurityFormat, issues: FormatPurityIssue[]): number {
  const penalty = issues.reduce((total, issue) => {
    if (format === "poetry_collection" && issue.severity === "critical") return total + 45;
    if (issue.severity === "critical") return total + 35;
    if (issue.severity === "high") return total + 12;
    return total + 6;
  }, 0);
  return Math.max(0, 100 - penalty);
}

export function validateFormatPurity(input: FormatPurityInput): FormatPurityResult {
  const format = resolveFormatPurityFormat(input);
  const text = clean(input.text);
  const textWithoutAccents = stripAccents(text);
  const requireMandatorySections = input.requireMandatorySections !== false;

  const issues: FormatPurityIssue[] = [];
  if (!text) {
    issues.push({
      code: "empty_output",
      severity: "critical",
      message: "Output vuoto.",
      evidence: [],
    });
  }

  if (format === "poetry_collection") {
    issues.push(...collectPatternIssues(textWithoutAccents, POETRY_FORBIDDEN_PATTERNS));
  }

  if (format === "manual" || format === "self_help" || format === "psychology_guide" || format === "workbook" || format === "study_material" || format === "essay") {
    issues.push(...collectPatternIssues(textWithoutAccents, PRACTICAL_FORBIDDEN_PATTERNS));
  }

  if (format === "workbook") {
    issues.push(...collectPatternIssues(textWithoutAccents, [
      { code: "workbook_plot", message: "Il workbook non puo' essere impostato come trama.", pattern: /\b(trama|personaggi|protagonista)\b/gi },
    ]));
  }

  if (format === "study_material") {
    issues.push(...collectPatternIssues(textWithoutAccents, [
      { code: "study_plot", message: "Il materiale di studio non puo' contenere cast o trama.", pattern: /\b(trama|personaggi|cast|protagonista)\b/gi },
    ]));
  }

  issues.push(...mandatorySectionIssues(format, textWithoutAccents, requireMandatorySections));

  const threshold = thresholdFor(format);
  const score = scoreFor(format, issues);
  return {
    passed: score >= threshold && issues.length === 0,
    format,
    score,
    threshold,
    issues,
  };
}

export function repairFormatPurityText(input: FormatPurityInput): { text: string; changed: boolean; purity: FormatPurityResult } {
  const format = resolveFormatPurityFormat(input);
  let text = clean(input.text, 4000);
  const original = text;

  if (format === "poetry_collection") {
    text = text
      .replace(/\bprotagonista\s+ferita\s+ma\s+combattiva\b/gi, "voce poetica intima, ferita ma resiliente")
      .replace(/\bprotagonist[ao]\b/gi, "voce poetica")
      .replace(/\bpersonaggi?\b/gi, "immagini")
      .replace(/\bcast\b/gi, "campo simbolico")
      .replace(/\btrama\b/gi, "arco emotivo")
      .replace(/\bpromessa narrativa\b/gi, "promessa poetica");
  }

  const purity = validateFormatPurity({ ...input, text, requireMandatorySections: false });
  return {
    text,
    changed: text !== original,
    purity,
  };
}
