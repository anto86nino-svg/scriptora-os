import type { BookConfig } from "@/types/book";
import { runNarrativeContinuityGate } from "@/lib/writer/narrative-continuity-gate";

export interface MemorabilityContext {
  language?: string | null;
  genre?: string | null;
  bookTitle?: string;
  chapterTitle?: string;
  chapterIndex?: number;
  config?: Partial<BookConfig> & Record<string, unknown>;
  subchapters?: Array<{ title?: string; content?: string }>;
}

export interface MemorabilityScores {
  predictability: number;
  emotionalSurprise: number;
  sceneIdentity: number;
  characterDistinction: number;
  memorability: number;
  originality: number;
  narrativeQuality: number;
  dialogue: number;
  tension: number;
  coherence: number;
  narrativeContinuity: number;
  rhythm: number;
  repetitions: number;
}

export type MemorabilityIssueKind =
  | "predictable_trope"
  | "explained_dialogue"
  | "early_reconciliation"
  | "missing_subtext"
  | "generic_imagery"
  | "flat_dialogue_voice"
  | "missing_sensory_detail"
  | "safe_pattern";

export interface MemorabilityIssue {
  kind: MemorabilityIssueKind;
  severity: "low" | "medium" | "high";
  message: string;
  evidence: string[];
}

export type LocalPatchHintKind =
  | "memorable_image"
  | "unique_gesture"
  | "sensory_detail"
  | "unexpected_choice"
  | "subtext";

export interface LocalPatchHint {
  kind: LocalPatchHintKind;
  targetParagraphIndex: number;
  template: string;
  issue: string;
}

export interface MemorabilityReport {
  scores: MemorabilityScores;
  issues: MemorabilityIssue[];
  localPatchHints: LocalPatchHint[];
  problems: string[];
  improvements: string[];
  needsLocalPatch: boolean;
  provisional: boolean;
}

const PREDICTABLE_TROPES = [
  "si abbracciarono e tutto sembro",
  "finalmente capirono che si amavano",
  "non era paura, era desiderio",
  "il cuore le batteva forte",
  "nulla sarebbe stato piu come prima",
  "they embraced and everything felt right",
  "finally understood they loved each other",
  "it was not fear, it was desire",
  "nothing would ever be the same",
  "her heart beat faster",
];

const EXPLAINED_DIALOGUE = [
  "ti spiego perche",
  "la verita e che",
  "capisco che tu",
  "devo dirti la verita",
  "let me explain",
  "the truth is that",
  "i understand that you",
  "i need to tell you the truth",
];

const RECONCILIATION_MARKERS = [
  "si scusarono",
  "tutto era perdonato",
  "non c'era piu rabbia",
  "si abbracciarono",
  "they apologized",
  "all was forgiven",
  "no more anger",
  "they hugged",
];

const TENSION_MARKERS = [
  "ma ",
  "pero ",
  "tuttavia",
  "non ancora",
  "esito",
  "distanza",
  "silenzio",
  "but ",
  "however",
  "not yet",
  "hesitat",
  "distance",
  "silence",
];

const GENERIC_IMAGERY = [
  "occhi profondi",
  "sorriso malizioso",
  "cuore in gola",
  "aria carica di tensione",
  "deep eyes",
  "mischievous smile",
  "heart in throat",
  "tension in the air",
];

const SENSORY_WORDS = [
  "odore", "sapore", "freddo", "caldo", "ruggine", "sale", "legno", "vetro",
  "smell", "taste", "cold", "warm", "rust", "salt", "wood", "glass", "humid",
];

const DIALOGUE_MARKERS = /[«""][^«""\n]{4,}[»""]/g;

const LOCAL_PATCH_TEMPLATES: Record<LocalPatchHintKind, string[]> = {
  memorable_image: [
    "Un dettaglio resto' sospeso: {image}, come un segno che nessuno osava nominare.",
    "A single detail lingered — {image} — too specific to be accidental.",
  ],
  unique_gesture: [
    "Lui {gesture} prima di rispondere, come se le parole arrivassero in ritardo.",
    "She {gesture} before answering, as if speech needed permission.",
  ],
  sensory_detail: [
    "L'aria sapeva di {sense}, e quel odore le ricordo' che la scena era reale.",
    "The air carried {sense}, grounding the moment in something physical.",
  ],
  unexpected_choice: [
    "Invece di concedersi, scelse di {choice} — un gesto piccolo ma irreversibile.",
    "Instead of yielding, they chose to {choice} — small, but irreversible.",
  ],
  subtext: [
    "Non disse quello che pensava. Lascio' cadere solo: «{line}».",
    "They said less than they meant. Only: \"{line}\".",
  ],
};

export const MAX_QUALITY_REPAIR_ATTEMPTS = 2;

function normalizeText(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitParagraphs(text: string): string[] {
  const paragraphs = String(text || "")
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : [String(text || "").trim()].filter(Boolean);
}

function countMatches(text: string, patterns: string[]): number {
  const normalized = normalizeText(text);
  return patterns.reduce((sum, pattern) => sum + (normalized.includes(normalizeText(pattern)) ? 1 : 0), 0);
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function isItalian(language?: string | null): boolean {
  return !language || /italian|italiano|it\b/i.test(language);
}

function detectAntiSafeWritingIssues(text: string): MemorabilityIssue[] {
  const normalized = normalizeText(text);
  const issues: MemorabilityIssue[] = [];

  const tropeHits = PREDICTABLE_TROPES.filter((t) => normalized.includes(normalizeText(t)));
  if (tropeHits.length > 0) {
    issues.push({
      kind: "predictable_trope",
      severity: tropeHits.length >= 2 ? "high" : "medium",
      message: "Pattern narrativo prevedibile o troppo sicuro.",
      evidence: tropeHits.slice(0, 3),
    });
  }

  const explainedHits = EXPLAINED_DIALOGUE.filter((t) => normalized.includes(normalizeText(t)));
  if (explainedHits.length > 0) {
    issues.push({
      kind: "explained_dialogue",
      severity: "medium",
      message: "Dialogo che spiega invece di suggerire — manca subtesto.",
      evidence: explainedHits.slice(0, 2),
    });
  }

  const reconciliation = countMatches(text, RECONCILIATION_MARKERS);
  const tension = countMatches(text, TENSION_MARKERS);
  if (reconciliation >= 1 && tension < 2) {
    issues.push({
      kind: "early_reconciliation",
      severity: "high",
      message: "Conflitto risolto troppo presto senza attrito residuo.",
      evidence: RECONCILIATION_MARKERS.filter((m) => normalized.includes(normalizeText(m))).slice(0, 2),
    });
  }

  const dialogues = text.match(DIALOGUE_MARKERS) || [];
  const explicitEmotion = dialogues.filter((d) =>
    /\b(capisco|ti amo|mi dispiace|it's okay|I love you|I understand)\b/i.test(d),
  );
  if (dialogues.length >= 3 && explicitEmotion.length / dialogues.length > 0.5) {
    issues.push({
      kind: "missing_subtext",
      severity: "medium",
      message: "Dialoghi troppo espliciti — poca ambiguita controllata.",
      evidence: explicitEmotion.slice(0, 2),
    });
  }

  const genericHits = GENERIC_IMAGERY.filter((g) => normalized.includes(normalizeText(g)));
  if (genericHits.length >= 2) {
    issues.push({
      kind: "generic_imagery",
      severity: "medium",
      message: "Immagini generiche invece di dettagli specifici del libro.",
      evidence: genericHits.slice(0, 3),
    });
  }

  const sensoryCount = SENSORY_WORDS.filter((w) => normalized.includes(normalizeText(w))).length;
  if (splitParagraphs(text).length >= 4 && sensoryCount < 2) {
    issues.push({
      kind: "missing_sensory_detail",
      severity: "low",
      message: "Mancano ancoraggi sensoriali concreti nella scena.",
      evidence: [],
    });
  }

  return issues;
}

function scoreDialogueVoice(text: string): number {
  const lines = (text.match(DIALOGUE_MARKERS) || []).map((l) => l.slice(0, 120));
  if (lines.length < 2) return 68;
  const lengths = lines.map((l) => l.split(/\s+/).length);
  const variance = Math.max(...lengths) - Math.min(...lengths);
  const interruption = lines.filter((l) => /—|\.{2,}|…|\?.*,/.test(l)).length;
  return clampScore(55 + variance * 2 + interruption * 8);
}

function scoreSceneIdentity(text: string, context: MemorabilityContext): number {
  const normalized = normalizeText(text);
  const bookTitle = normalizeText(context.bookTitle || "");
  const chapterTitle = normalizeText(context.chapterTitle || "");
  let specific = 0;
  if (bookTitle && normalized.includes(bookTitle.split(" ")[0])) specific += 15;
  if (chapterTitle) {
    for (const word of chapterTitle.split(/\s+/).filter((w) => w.length > 5)) {
      if (normalized.includes(word)) specific += 8;
    }
  }
  const genericPenalty = countMatches(text, GENERIC_IMAGERY) * 12;
  const sensoryBonus = SENSORY_WORDS.filter((w) => normalized.includes(normalizeText(w))).length * 6;
  return clampScore(48 + specific + sensoryBonus - genericPenalty);
}

function buildLocalPatchHints(text: string, issues: MemorabilityIssue[], language?: string | null): LocalPatchHint[] {
  const paragraphs = splitParagraphs(text);
  if (paragraphs.length === 0) return [];

  const targetIndex = Math.min(Math.max(1, Math.floor(paragraphs.length / 2)), paragraphs.length - 1);
  const hints: LocalPatchHint[] = [];
  const italian = isItalian(language);

  for (const issue of issues.slice(0, 3)) {
    let kind: LocalPatchHintKind = "sensory_detail";
    if (issue.kind === "predictable_trope" || issue.kind === "generic_imagery") kind = "memorable_image";
    else if (issue.kind === "explained_dialogue" || issue.kind === "missing_subtext") kind = "subtext";
    else if (issue.kind === "early_reconciliation") kind = "unexpected_choice";
    else if (issue.kind === "flat_dialogue_voice") kind = "unique_gesture";
    else if (issue.kind === "missing_sensory_detail") kind = "sensory_detail";

    const templates = LOCAL_PATCH_TEMPLATES[kind];
    const template = templates[italian ? 0 : 1] || templates[0];
    hints.push({ kind, targetParagraphIndex: targetIndex, template, issue: issue.message });
  }

  return hints.slice(0, 3);
}

function countWords(text: string): number {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function resolveChapterTargetWords(context: MemorabilityContext): number {
  const config = context.config;
  if (!config) return 2500;
  const chapters = Number(config.numberOfChapters) > 0 ? Number(config.numberOfChapters) : 12;
  const bookLength = String(config.bookLength || "medium");
  const totalWords = bookLength === "short" ? 40000 : bookLength === "long" ? 120000 : 70000;
  const base = Math.round(totalWords / chapters);
  const chapterLength = String(config.chapterLength || "medium");
  const multiplier = chapterLength === "short" ? 0.6 : chapterLength === "long" ? 1.5 : 1;
  return Math.round(base * multiplier);
}

export function isProvisionalChapterScore(content: string, context: MemorabilityContext = {}): boolean {
  if (!context.config) return false;
  const words = countWords(content);
  const target = resolveChapterTargetWords(context);
  return words > 0 && words < target * 0.45;
}

function applyProvisionalScoreCap(value: number, provisional: boolean): number {
  return provisional ? Math.min(value, 62) : value;
}

function fillTemplate(template: string, kind: LocalPatchHintKind, italian: boolean): string {
  const fillers: Record<LocalPatchHintKind, Record<string, string>> = {
    memorable_image: { image: italian ? "luce tagliata sul bordo del vetro" : "light fractured along the glass edge" },
    unique_gesture: { gesture: italian ? "si passo' il pollice sul bordo del bicchiere" : "ran a thumb along the glass rim" },
    sensory_detail: { sense: italian ? "cera e pioggia vecchia" : "wax and old rain" },
    unexpected_choice: { choice: italian ? "voltare le spalle senza spiegazioni" : "turn away without explaining" },
    subtext: { line: italian ? "forse non oggi" : "maybe not today" },
  };
  let out = template;
  for (const [key, value] of Object.entries(fillers[kind])) {
    out = out.replace(`{${key}}`, value);
  }
  return out;
}

function isLiteraryOrRomance(genre?: string | null): boolean {
  const g = String(genre || "").toLowerCase();
  return /romance|romantic|literary|narrative|fiction|dramma|love/i.test(g);
}

function resolveNarrativeContinuityScore(context: MemorabilityContext): {
  score: number;
  problems: string[];
} {
  const subs = (context.subchapters || []).filter((s) => String(s.content || "").trim());
  if (subs.length < 2) {
    return { score: subs.length ? 90 : 70, problems: [] };
  }
  const gate = runNarrativeContinuityGate(
    { title: context.chapterTitle || "", content: "", subchapters: subs },
    { language: context.language || undefined },
  );
  const problems = gate.criticalFailures.slice(0, 3).map((f) => f.message);
  return { score: gate.score, problems };
}

function applyContinuityCap<T extends number>(value: T, continuityScore: number, genre?: string | null): number {
  if (!isLiteraryOrRomance(genre)) return value;
  if (continuityScore >= 60) return value;
  const cap = Math.max(35, continuityScore + 5);
  return Math.min(value, cap) as T;
}

export function evaluateMemorability(chapterText: string, context: MemorabilityContext = {}): MemorabilityReport {
  const text = String(chapterText || "").trim();
  const issues = detectAntiSafeWritingIssues(text);
  const provisional = isProvisionalChapterScore(text, context);
  const continuity = resolveNarrativeContinuityScore(context);
  const genre = context.genre || String(context.config?.genre || "");

  const predictability = clampScore(35 + countMatches(text, PREDICTABLE_TROPES) * 18 + countMatches(text, GENERIC_IMAGERY) * 10);
  const emotionalSurprise = clampScore(72 - countMatches(text, PREDICTABLE_TROPES) * 15 + countMatches(text, TENSION_MARKERS) * 4);
  const sceneIdentity = scoreSceneIdentity(text, context);
  const characterDistinction = scoreDialogueVoice(text);

  if (characterDistinction < 58 && (text.match(DIALOGUE_MARKERS) || []).length >= 2) {
    issues.push({
      kind: "flat_dialogue_voice",
      severity: "medium",
      message: "Le voci dialogiche sono troppo simili tra loro.",
      evidence: [],
    });
  }

  const memorability = clampScore(
    (100 - predictability) * 0.25 +
    emotionalSurprise * 0.25 +
    sceneIdentity * 0.25 +
    characterDistinction * 0.25,
  );
  const originality = clampScore(100 - predictability * 0.6 - countMatches(text, GENERIC_IMAGERY) * 8);
  let narrativeQuality = clampScore(memorability * 0.4 + sceneIdentity * 0.3 + emotionalSurprise * 0.3);
  const dialogue = characterDistinction;
  const tension = clampScore(50 + countMatches(text, TENSION_MARKERS) * 6 - countMatches(text, RECONCILIATION_MARKERS) * 10);
  const coherence = clampScore(78 - issues.filter((i) => i.kind === "early_reconciliation").length * 15);
  const narrativeContinuity = continuity.score;
  const rhythm = clampScore(70 - (splitParagraphs(text).some((p) => p.split(/\s+/).length > 80) ? 12 : 0));
  const repetitions = clampScore(85 - countMatches(text, PREDICTABLE_TROPES) * 10);

  if (isLiteraryOrRomance(genre) && narrativeContinuity < 60) {
    narrativeQuality = applyContinuityCap(narrativeQuality, narrativeContinuity, genre);
  }

  const localPatchHints = buildLocalPatchHints(text, issues, context.language);
  const problems = [
    ...continuity.problems,
    ...issues
      .sort((a, b) => (a.severity === "high" ? -1 : 1))
      .slice(0, 3)
      .map((i) => i.message),
  ].filter((p, i, arr) => arr.indexOf(p) === i).slice(0, 4);
  const improvements = localPatchHints.slice(0, 3).map((h) => {
    if (h.kind === "subtext") return "Sostituisci dichiarazioni esplicite con silenzi o risposte evasive.";
    if (h.kind === "memorable_image") return "Aggiungi un'immagine specifica del mondo del libro, non stock.";
    if (h.kind === "sensory_detail") return "Ancora la scena con un dettaglio sensoriale concreto.";
    if (h.kind === "unexpected_choice") return "Inserisci una scelta inattesa ma coerente prima della riconciliazione.";
    return "Differenzia i gesti dei personaggi nel dialogo.";
  });

  const needsLocalPatch = !provisional && (memorability < 62 || issues.some((i) => i.severity === "high"));
  let cappedMemorability = memorability;
  if (isLiteraryOrRomance(genre) && narrativeContinuity < 60) {
    cappedMemorability = applyContinuityCap(memorability, narrativeContinuity, genre);
  }
  const cappedScores = {
    predictability: applyProvisionalScoreCap(predictability, provisional),
    emotionalSurprise: applyProvisionalScoreCap(emotionalSurprise, provisional),
    sceneIdentity: applyProvisionalScoreCap(sceneIdentity, provisional),
    characterDistinction: applyProvisionalScoreCap(characterDistinction, provisional),
    memorability: applyProvisionalScoreCap(cappedMemorability, provisional),
    originality: applyProvisionalScoreCap(originality, provisional),
    narrativeQuality: applyProvisionalScoreCap(narrativeQuality, provisional),
    dialogue: applyProvisionalScoreCap(dialogue, provisional),
    tension: applyProvisionalScoreCap(tension, provisional),
    coherence: applyProvisionalScoreCap(coherence, provisional),
    narrativeContinuity: applyProvisionalScoreCap(narrativeContinuity, provisional),
    rhythm: applyProvisionalScoreCap(rhythm, provisional),
    repetitions: applyProvisionalScoreCap(repetitions, provisional),
  };

  return {
    scores: cappedScores,
    issues,
    localPatchHints,
    problems: provisional
      ? ["Capitolo incompleto rispetto al target: punteggio provvisorio.", ...problems]
      : problems,
    improvements: provisional
      ? ["Completa il capitolo prima di considerare il punteggio definitivo.", ...improvements]
      : improvements,
    needsLocalPatch,
    provisional,
  };
}

export function shouldApplyMemorabilityLocalPatch(report: MemorabilityReport): boolean {
  return report.needsLocalPatch && report.localPatchHints.length > 0;
}

export function applyMemorabilityLocalPatch(text: string, hints: LocalPatchHint[], language?: string | null): string {
  const source = String(text || "").trim();
  if (!source || hints.length === 0) return source;

  const paragraphs = splitParagraphs(source);
  if (paragraphs.length === 0) return source;

  const italian = isItalian(language);
  const patched = [...paragraphs];
  const usedIndices = new Set<number>();

  for (const hint of hints) {
    const idx = Math.min(Math.max(0, hint.targetParagraphIndex), patched.length - 1);
    if (usedIndices.has(idx)) continue;
    usedIndices.add(idx);

    const insertion = fillTemplate(hint.template, hint.kind, italian);
    const target = patched[idx];
    if (target.includes(insertion.slice(0, 24))) continue;

    patched[idx] = `${target}\n\n${insertion}`;
  }

  const result = patched.join("\n\n").trim();
  if (!result || result.length < source.length * 0.5) return source;
  return result;
}

export function runMemorabilityPreHumanPass(
  chapterText: string,
  context: MemorabilityContext,
): { text: string; report: MemorabilityReport; appliedLocalPatch: boolean } {
  const report = evaluateMemorability(chapterText, context);
  if (!shouldApplyMemorabilityLocalPatch(report)) {
    return { text: chapterText, report, appliedLocalPatch: false };
  }
  const patched = applyMemorabilityLocalPatch(chapterText, report.localPatchHints, context.language);
  return {
    text: patched,
    report: evaluateMemorability(patched, context),
    appliedLocalPatch: patched !== chapterText,
  };
}

export { detectAntiSafeWritingIssues };
