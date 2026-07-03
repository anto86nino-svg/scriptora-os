import {
  buildTimelineCoherencePromptBlock,
  validateNarrativeTimeline,
  type NarrativeTimelineIssue,
} from "@/lib/writer/narrative-timeline-validator";

export type ContinuitySeverity = "critical" | "medium" | "minor";

export type ContinuityCategory =
  | "timeline"
  | "causality"
  | "emotional_arc"
  | "progression"
  | "repetition"
  | "continuity";

export type ContinuityError = {
  severity: ContinuitySeverity;
  category: ContinuityCategory;
  subchapterIndex?: number;
  boundaryIndex?: number;
  message: string;
  excerpt?: string;
};

export type SubchapterInput = {
  title: string;
  content: string;
  summary?: string;
};

export type TimelineEvent = {
  subchapterIndex: number;
  title: string;
  order: number;
  inferredTime?: string;
  keyEvents: string[];
};

export type SubchapterContinuityAnalysis = {
  score: number;
  errors: ContinuityError[];
  timeline: TimelineEvent[];
  recommendedOrder: number[];
  narrativePatch: string;
  correctedStructure?: SubchapterInput[];
};

export type ReconstructionResult = {
  subchapters: SubchapterInput[];
  patchPlan: string;
  improvedScore: number;
  reordered: boolean;
};

const PHONE_CALL_PATTERNS = [
  /\bsquill(?:ò|a)\s+il\s+telefono\b/gi,
  /\b(?:rispose|prese|afferr(?:ò|a))\s+il\s+telefono\b/gi,
  /\bcompose\s+il\s+numero\b/gi,
  /\b(?:chiam(?:ò|o|ata|are)|telefon(?:o|ata|are))\b/gi,
  /\b(?:answered|picked up)\s+the\s+phone\b/gi,
  /\bphone\s+(?:rang|call)\b/gi,
];

const MEETING_PATTERNS = [
  /\b(?:incontr(?:ò|o|arono|arsi)|appuntamento|ritrov(?:ò|o|arono))\b/gi,
  /\b(?:meeting|met\s+(?:up|with))\b/gi,
];

const DECISION_PATTERNS = [
  /\b(?:decise|decid(?:ette|ono)|scelse|scel(?:ta|te)|promett(?:e|ette|endo)|giur(?:ò|a))\b/gi,
  /\b(?:decided|chose|promised|swore)\b/gi,
];

const TIME_MARKERS: Array<{ pattern: RegExp; label: string; rank: number }> = [
  { pattern: /\b(?:ieri|yesterday)\b/i, label: "ieri", rank: -1 },
  { pattern: /\b(?:stamattina|this\s+morning)\b/i, label: "stamattina", rank: 0 },
  { pattern: /\b(?:mattina|morning)\b/i, label: "mattina", rank: 1 },
  { pattern: /\b(?:pomeriggio|afternoon)\b/i, label: "pomeriggio", rank: 2 },
  { pattern: /\b(?:sera|evening)\b/i, label: "sera", rank: 3 },
  { pattern: /\b(?:notte|night)\b/i, label: "notte", rank: 4 },
  { pattern: /\b(?:domani|tomorrow)\b/i, label: "domani", rank: 5 },
  { pattern: /\b(?:mattina\s+dopo|il\s+giorno\s+dopo|the\s+next\s+(?:day|morning))\b/i, label: "giorno_dopo", rank: 6 },
];

const EMOTIONAL_BEAT_PATTERNS = [
  /\b(?:non\s+(?:poteva|potevo|riusciva)\s+(?:più\s+)?(?:mentire|negare|fingere))\b/gi,
  /\b(?:finalmente\s+cap(?:ì|ito)|realizz(?:ò|ai)\s+che)\b/gi,
  /\b(?:il\s+cuore\s+(?:acceler|batte)|heart\s+(?:raced|beat))\b/gi,
  /\b(?:lacrim(?:e|a)|piang(?:ere|eva)|tears?\s+(?:fell|streamed))\b/gi,
];

const FLASHBACK_MARKERS = [
  /\b(?:ricord(?:ò|ai|ava)|flashback| anni\s+prima|years?\s+(?:ago|before))\b/gi,
  /\b(?:torn(?:ò|ai)\s+(?:indietro|a\s+quella))\b/gi,
];

const PROGRESSION_MARKERS = [
  /\b(?:scopr(?:e|ì|ono)|rivel(?:a|ò|ano)|cap(?:isce|ì|iscono)|decid(?:e|e|ono|ette)|scegl(?:ie|ie|ono)|perde|ottiene|apre|chiude|consegna|arriva|scompare|compare|minaccia|ostacol(?:o|a|ano)|fallisce|cambia\s+obiettivo)\b/gi,
  /\b(?:conseguenza|per\s+questo|da\s+allora|a\s+quel\s+punto|la\s+posta\s+in\s+gioco|nuovo\s+indizio|nuova\s+prova|nuova\s+scoperta)\b/gi,
];

const NARRATIVE_ANCHOR_STOP = new Set([
  "arturo", "nora", "marco", "elena", "capitolo", "sottocapitolo", "storia",
  "quando", "ancora", "stessa", "stesso", "quella", "quello", "questo", "questa",
]);

function normalizeHay(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function excerptAround(text: string, index: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalizeHay(text)
      .split(/[^a-z0-9']+/i)
      .filter((token) => token.length > 3),
  );
}

function narrativeAnchors(text: string): Set<string> {
  return new Set(
    normalizeHay(text)
      .split(/[^a-z0-9']+/i)
      .filter((token) => token.length > 4 && !NARRATIVE_ANCHOR_STOP.has(token)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function splitSentences(text: string): string[] {
  return String(text || "")
    .split(/(?<=[.!?…]["»"]?\s)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20);
}

function extractOpening(text: string, chars = 280): string {
  return String(text || "").trim().slice(0, chars);
}

function extractClosing(text: string, chars = 280): string {
  const trimmed = String(text || "").trim();
  return trimmed.slice(Math.max(0, trimmed.length - chars));
}

function inferTimeAnchor(text: string): { label?: string; rank?: number } {
  for (const marker of TIME_MARKERS) {
    if (marker.pattern.test(text)) {
      return { label: marker.label, rank: marker.rank };
    }
  }
  return {};
}

function extractKeyEvents(content: string): string[] {
  const sentences = splitSentences(content);
  const events: string[] = [];
  for (const sentence of sentences.slice(0, 4)) {
    if (PHONE_CALL_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(sentence); })) {
      events.push("phone_call");
    }
    if (MEETING_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(sentence); })) {
      events.push("meeting");
    }
    if (DECISION_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(sentence); })) {
      events.push("decision");
    }
  }
  return [...new Set(events)];
}

function findPatternMatches(text: string, patterns: RegExp[]): Array<{ match: string; index: number }> {
  const hits: Array<{ match: string; index: number }> = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits.push({ match: m[0], index: m.index });
    }
  }
  return hits;
}

function scoreFromErrors(errors: ContinuityError[]): number {
  let score = 100;
  for (const error of errors) {
    if (error.severity === "critical") score -= 25;
    else if (error.severity === "medium") score -= 10;
    else score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

function buildNarrativePatch(errors: ContinuityError[], timeline: TimelineEvent[]): string {
  if (!errors.length) return "Nessuna correzione necessaria: la sequenza narrativa è coerente.";
  const lines = errors
    .filter((e) => e.severity !== "minor")
    .slice(0, 8)
    .map((e) => `- [${e.severity.toUpperCase()}] ${e.message}`);
  const orderHint = timeline.length
    ? `\nOrdine eventi suggerito: ${timeline.map((ev) => `"${ev.title}" (${ev.inferredTime || "tempo non ancorato"})`).join(" → ")}`
    : "";
  return `Patch narrativa consigliata:\n${lines.join("\n")}${orderHint}`;
}

export function validateSubchapterHandoff(
  prevContent: string,
  nextContent: string,
): ContinuityError[] {
  const errors: ContinuityError[] = [];
  const prev = String(prevContent || "").trim();
  const next = String(nextContent || "").trim();
  if (!prev || !next) return errors;

  const prevClosing = extractClosing(prev);
  const nextOpening = extractOpening(next);
  const prevHay = normalizeHay(prevClosing);
  const nextHay = normalizeHay(nextOpening);

  const openingSim = jaccardSimilarity(tokenize(prevClosing), tokenize(nextOpening));
  if (openingSim > 0.55) {
    errors.push({
      severity: "critical",
      category: "repetition",
      message: "Il sottocapitolo successivo riapre con contenuto quasi identico alla chiusura del precedente.",
      excerpt: nextOpening.slice(0, 120),
    });
  }

  const prevPhones = findPatternMatches(prevClosing, PHONE_CALL_PATTERNS);
  const nextPhones = findPatternMatches(nextOpening, PHONE_CALL_PATTERNS);
  if (prevPhones.length && nextPhones.length) {
    errors.push({
      severity: "critical",
      category: "repetition",
      message: "Telefonata duplicata al confine tra sottocapitoli: entrambi descrivono una chiamata.",
      excerpt: nextPhones[0]?.match,
    });
  }

  const prevMeetings = findPatternMatches(prevClosing, MEETING_PATTERNS);
  const nextMeetings = findPatternMatches(nextOpening, MEETING_PATTERNS);
  if (prevMeetings.length && nextMeetings.length) {
    errors.push({
      severity: "critical",
      category: "repetition",
      message: "Incontro/appuntamento duplicato al confine tra sottocapitoli.",
      excerpt: nextMeetings[0]?.match,
    });
  }

  const prevTime = inferTimeAnchor(prevClosing);
  const nextTime = inferTimeAnchor(nextOpening);
  if (
    prevTime.rank != null &&
    nextTime.rank != null &&
    nextTime.rank < prevTime.rank &&
    nextTime.label !== "ieri"
  ) {
    errors.push({
      severity: "critical",
      category: "timeline",
      message: `Salto temporale all'indietro: chiusura su "${prevTime.label}", apertura su "${nextTime.label}".`,
      excerpt: nextOpening.slice(0, 100),
    });
  }

  if (/\bdomani\b/i.test(prevClosing) && /\b(?:ieri|stamattina|mattina)\b/i.test(nextOpening) && !/\b(?:giorno\s+dopo|indomani)\b/i.test(nextOpening)) {
    errors.push({
      severity: "critical",
      category: "timeline",
      message: "Contraddizione domani/mattina: il precedente anticipa domani, il successivo torna indietro nel tempo.",
      excerpt: nextOpening.slice(0, 100),
    });
  }

  const prevDecisions = findPatternMatches(prevClosing, DECISION_PATTERNS);
  const nextDecisions = findPatternMatches(nextOpening, DECISION_PATTERNS);
  if (prevDecisions.length && nextDecisions.length) {
    errors.push({
      severity: "medium",
      category: "emotional_arc",
      message: "Decisione emotiva processata due volte al confine: rischio di doppia elaborazione.",
      excerpt: nextDecisions[0]?.match,
    });
  }

  const hasFlashback = FLASHBACK_MARKERS.some((p) => { p.lastIndex = 0; return p.test(nextOpening); });
  const continuesForward = jaccardSimilarity(tokenize(prevClosing), tokenize(nextOpening)) < 0.25;
  if (hasFlashback && continuesForward && !/\b(?:flashback|ricord(?:o|ava)|anni\s+prima)\b/i.test(nextOpening.slice(0, 80))) {
    errors.push({
      severity: "medium",
      category: "timeline",
      message: "Possibile flashback non dichiarato all'inizio del sottocapitolo successivo.",
      excerpt: nextOpening.slice(0, 100),
    });
  }

  if (openingSim < 0.08 && !nextPhones.length && !nextMeetings.length) {
    const prevEndsWithAction = /[.!?…]["»"]?\s*$/.test(prev) && prev.length > 100;
    const nextStartsNewScene = /^(?:Il|La|Lo|I|Le|Gli|Un|Una|Quella|Quel|Mentre|When|The|She|He)\b/i.test(next.trim());
    if (prevEndsWithAction && nextStartsNewScene && !/\b(?:poi|dopo|infine|mentre|quando|then|after)\b/i.test(nextOpening)) {
      errors.push({
        severity: "medium",
        category: "causality",
        message: "Handoff debole: il sottocapitolo successivo non sembra collegarsi alla chiusura del precedente.",
        excerpt: nextOpening.slice(0, 100),
      });
    }
  }

  return errors;
}

function detectCrossSubchapterDuplicates(subchapters: SubchapterInput[]): ContinuityError[] {
  const errors: ContinuityError[] = [];
  const seenSentences = new Map<string, number>();

  subchapters.forEach((sub, index) => {
    for (const sentence of splitSentences(sub.content)) {
      const key = normalizeHay(sentence).slice(0, 120);
      if (key.length < 40) continue;
      const priorIndex = seenSentences.get(key);
      if (priorIndex != null && priorIndex !== index) {
        errors.push({
          severity: "critical",
          category: "repetition",
          subchapterIndex: index,
          message: `Frase/scena duplicata rispetto al sottocapitolo ${priorIndex + 1}.`,
          excerpt: sentence.slice(0, 100),
        });
      } else {
        seenSentences.set(key, index);
      }
    }
  });

  for (let i = 0; i < subchapters.length; i += 1) {
    for (let j = i + 1; j < subchapters.length; j += 1) {
      const openI = tokenize(extractOpening(subchapters[i]!.content));
      const openJ = tokenize(extractOpening(subchapters[j]!.content));
      if (jaccardSimilarity(openI, openJ) > 0.65) {
        errors.push({
          severity: "critical",
          category: "repetition",
          subchapterIndex: j,
          message: `Apertura scena duplicata tra sottocapitolo ${i + 1} e ${j + 1}.`,
          excerpt: extractOpening(subchapters[j]!.content, 100),
        });
      }

      const phonesI = findPatternMatches(subchapters[i]!.content, PHONE_CALL_PATTERNS);
      const phonesJ = findPatternMatches(subchapters[j]!.content, PHONE_CALL_PATTERNS);
      if (phonesI.length && phonesJ.length) {
        const overlap = jaccardSimilarity(
          tokenize(subchapters[i]!.content.slice(phonesI[0]!.index, phonesI[0]!.index + 200)),
          tokenize(subchapters[j]!.content.slice(phonesJ[0]!.index, phonesJ[0]!.index + 200)),
        );
        if (overlap > 0.4) {
          errors.push({
            severity: "critical",
            category: "repetition",
            subchapterIndex: j,
            message: `Telefonata duplicata tra sottocapitolo ${i + 1} e ${j + 1}.`,
            excerpt: phonesJ[0]?.match,
          });
        }
      }
    }
  }

  return errors;
}

function detectEmotionalArcIssues(subchapters: SubchapterInput[]): ContinuityError[] {
  const errors: ContinuityError[] = [];
  const seenBeats = new Map<string, number>();

  subchapters.forEach((sub, index) => {
    for (const pattern of EMOTIONAL_BEAT_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
      let m: RegExpExecArray | null;
      while ((m = re.exec(sub.content)) !== null) {
        const key = normalizeHay(m[0]);
        const prior = seenBeats.get(key);
        if (prior != null && prior !== index) {
          errors.push({
            severity: "medium",
            category: "emotional_arc",
            subchapterIndex: index,
            message: `Battuta emotiva duplicata (già in sottocapitolo ${prior + 1}).`,
            excerpt: m[0],
          });
        } else {
          seenBeats.set(key, index);
        }
      }
    }
  });

  return errors;
}

function detectCausalityGaps(subchapters: SubchapterInput[]): ContinuityError[] {
  const errors: ContinuityError[] = [];

  subchapters.forEach((sub, index) => {
    const content = String(sub.content || "").trim();
    if (!content) return;

    const hasConsequence =
      /\b(?:quindi|così|per questo|da allora|ne\s+consegu|as\s+a\s+result|therefore|because\s+of\s+that)\b/i.test(content) ||
      splitSentences(content).length >= 3;

    if (index > 0 && !hasConsequence && content.length < 400) {
      errors.push({
        severity: "medium",
        category: "causality",
        subchapterIndex: index,
        message: `Sottocapitolo ${index + 1} non produce conseguenza narrativa chiara per il successivo.`,
      });
    }
  });

  return errors;
}

function hasProgressionMarker(text: string): boolean {
  return PROGRESSION_MARKERS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

function detectNarrativeProgressionStalls(subchapters: SubchapterInput[]): ContinuityError[] {
  const errors: ContinuityError[] = [];

  for (let i = 1; i < subchapters.length; i += 1) {
    const prev = subchapters[i - 1]!;
    const curr = subchapters[i]!;
    const prevText = [prev.title, prev.summary, prev.content].filter(Boolean).join(" ");
    const currText = [curr.title, curr.summary, curr.content].filter(Boolean).join(" ");
    if (!prevText.trim() || !currText.trim()) continue;

    const sharedAnchors = [...narrativeAnchors(prevText)].filter((token) => narrativeAnchors(currText).has(token));
    const semanticSimilarity = jaccardSimilarity(tokenize(prevText), tokenize(currText));
    const repeatsSameScene =
      sharedAnchors.length >= 4 &&
      semanticSimilarity > 0.36 &&
      !hasProgressionMarker(currText);

    if (repeatsSameScene) {
      errors.push({
        severity: "critical",
        category: "progression",
        subchapterIndex: i,
        message: `Sottocapitolo ${i + 1} troppo simile al precedente: non introduce evento, scoperta, conseguenza, ostacolo o cambio di obiettivo.`,
        excerpt: curr.content.slice(0, 120),
      });
    }
  }

  return errors;
}

function buildTimeline(subchapters: SubchapterInput[], order: number[]): TimelineEvent[] {
  return order.map((originalIndex, sequenceIndex) => {
    const sub = subchapters[originalIndex]!;
    const anchor = inferTimeAnchor(sub.content);
    return {
      subchapterIndex: originalIndex,
      title: sub.title,
      order: sequenceIndex + 1,
      inferredTime: anchor.label,
      keyEvents: extractKeyEvents(sub.content),
    };
  });
}

function timelineIssuesToContinuityErrors(issues: NarrativeTimelineIssue[]): ContinuityError[] {
  return issues.map((issue) => ({
    severity: issue.type === "contradictory_day_sequence" ? "critical" as const : "medium" as const,
    category: "timeline" as const,
    message: issue.message,
    excerpt: issue.excerpt,
  }));
}

export function analyzeSubchapterContinuity(
  chapter: { subchapters: SubchapterInput[] },
  context?: { language?: string },
): SubchapterContinuityAnalysis {
  const subchapters = (chapter.subchapters || []).filter((s) => String(s.content || "").trim());
  const errors: ContinuityError[] = [];

  if (subchapters.length < 2) {
    return {
      score: subchapters.length ? 95 : 0,
      errors: subchapters.length ? [] : [{
        severity: "critical",
        category: "continuity",
        message: "Nessun sottocapitolo da analizzare.",
      }],
      timeline: buildTimeline(subchapters, subchapters.map((_, i) => i)),
      recommendedOrder: subchapters.map((_, i) => i),
      narrativePatch: "Servono almeno due sottocapitoli per l'analisi di continuità.",
    };
  }

  for (let i = 0; i < subchapters.length - 1; i += 1) {
    const handoffErrors = validateSubchapterHandoff(
      subchapters[i]!.content,
      subchapters[i + 1]!.content,
    ).map((error) => ({ ...error, boundaryIndex: i }));
    errors.push(...handoffErrors);
  }

  errors.push(...detectCrossSubchapterDuplicates(subchapters));
  errors.push(...detectEmotionalArcIssues(subchapters));
  errors.push(...detectNarrativeProgressionStalls(subchapters));
  errors.push(...detectCausalityGaps(subchapters));

  const assembled = subchapters.map((s) => s.content).join("\n\n");
  errors.push(...timelineIssuesToContinuityErrors(validateNarrativeTimeline(assembled).issues));

  const recommendedOrder = subchapters.map((_, i) => i);
  const timeline = buildTimeline(subchapters, recommendedOrder);
  const score = scoreFromErrors(errors);
  const narrativePatch = buildNarrativePatch(errors, timeline);

  void context?.language;

  return {
    score,
    errors,
    timeline,
    recommendedOrder,
    narrativePatch,
    correctedStructure: subchapters,
  };
}

function permutations(indices: number[]): number[][] {
  if (indices.length <= 1) return [indices];
  const result: number[][] = [];
  for (let i = 0; i < indices.length; i += 1) {
    const rest = [...indices.slice(0, i), ...indices.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([indices[i]!, ...perm]);
    }
  }
  return result;
}

function scoreOrder(subchapters: SubchapterInput[], order: number[]): number {
  const ordered = order.map((i) => subchapters[i]!);
  let penalty = 0;

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const handoffErrors = validateSubchapterHandoff(ordered[i]!.content, ordered[i + 1]!.content);
    for (const error of handoffErrors) {
      if (error.severity === "critical") penalty += 25;
      else if (error.severity === "medium") penalty += 10;
      else penalty += 3;
    }
  }

  const timeRanks = order.map((i) => inferTimeAnchor(subchapters[i]!.content).rank ?? 3);
  for (let i = 1; i < timeRanks.length; i += 1) {
    if (timeRanks[i]! < timeRanks[i - 1]! - 1) penalty += 15;
  }

  return Math.max(0, 100 - penalty);
}

function splitParagraphs(text: string): string[] {
  return String(text || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripDuplicatePrefix(content: string, referenceContent: string): string {
  const refHay = normalizeHay(referenceContent);
  const paragraphs = splitParagraphs(content);
  if (!paragraphs.length) return content;

  let skip = 0;
  for (const paragraph of paragraphs) {
    const paraHay = normalizeHay(paragraph);
    if (paraHay.length < 25) break;

    const inReference =
      refHay.includes(paraHay) ||
      refHay.includes(paraHay.slice(0, Math.min(80, paraHay.length))) ||
      splitSentences(referenceContent).some(
        (refSentence) => jaccardSimilarity(tokenize(refSentence), tokenize(paragraph)) > 0.55,
      );

    if (inReference) skip += 1;
    else break;
  }

  if (skip === 0) return content;
  const remainder = paragraphs.slice(skip);
  return remainder.join("\n\n").trim() || content;
}

export function reconstructSubchapterSequence(
  analysis: SubchapterContinuityAnalysis,
  subchapters: SubchapterInput[],
): ReconstructionResult {
  const source = (subchapters || []).filter((s) => String(s.content || "").trim());
  if (source.length < 2) {
    return { subchapters: source, patchPlan: "Niente da ricostruire.", improvedScore: analysis.score, reordered: false };
  }

  const indices = source.map((_, i) => i);
  const currentScore = analysis.score;
  let bestOrder = [...indices];
  let bestScore = scoreOrder(source, bestOrder);

  if (source.length <= 5) {
    for (const perm of permutations(indices)) {
      const permScore = scoreOrder(source, perm);
      if (permScore > bestScore) {
        bestScore = permScore;
        bestOrder = perm;
      }
    }
  }

  const reordered = bestOrder.map((i) => ({ ...source[i]! }));
  let reorderedFlag = !bestOrder.every((v, i) => v === i);

  for (let i = 1; i < reordered.length; i += 1) {
    const prev = reordered[i - 1]!;
    const curr = reordered[i]!;
    const cleaned = stripDuplicatePrefix(curr.content, prev.content);
    if (cleaned !== curr.content && cleaned.length > 30) {
      reordered[i] = { ...curr, content: cleaned };
      reorderedFlag = true;
    }
  }

  const improvedAnalysis = analyzeSubchapterContinuity({ subchapters: reordered });
  const patchLines: string[] = [];

  if (!bestOrder.every((v, i) => v === i)) {
    patchLines.push(
      `Riordino suggerito: ${bestOrder.map((i) => `"${source[i]!.title}"`).join(" → ")}`,
    );
  }
  for (const error of analysis.errors.filter((e) => e.severity === "critical").slice(0, 5)) {
    patchLines.push(`Correggere: ${error.message}`);
  }
  if (improvedAnalysis.score <= currentScore && !reorderedFlag) {
    patchLines.push("Rigenerare i sottocapitoli con continuità esplicita o applicare patch manuali.");
  }

  return {
    subchapters: reordered,
    patchPlan: patchLines.join("\n") || "Sequenza ottimale già raggiunta.",
    improvedScore: improvedAnalysis.score,
    reordered: reorderedFlag,
  };
}

export function buildContinuityRepairPromptBlock(
  analysis: SubchapterContinuityAnalysis,
  language = "Italian",
): string {
  if (analysis.score >= 70 && !analysis.errors.some((e) => e.severity === "critical")) return "";

  const critical = analysis.errors.filter((e) => e.severity === "critical").slice(0, 6);
  const lines = critical.map((e) => `- ${e.message}${e.excerpt ? ` ("${e.excerpt.slice(0, 80)}")` : ""}`);
  const lang = String(language || "").toLowerCase().includes("ital") ? "italiano" : "the book language";

  const timelineBlock = buildTimelineCoherencePromptBlock(
    analysis.errors
      .filter((e) => e.category === "timeline")
      .map((e) => ({
        type: "ambiguous_time_jump" as const,
        excerpt: e.excerpt || "",
        message: e.message,
      })),
    language,
  );

  return `SUBCHAPTER CONTINUITY AUDIT — FIX BEFORE CLOSING:
The assembled chapter has subchapter continuity failures (score ${analysis.score}/100). Repair in ${lang} without meta commentary.
${lines.join("\n")}

RULES:
- Subchapters are ONE continuous narrative, not independent stories.
- Each subchapter must start exactly where the previous one ended.
- No backward time travel, duplicate phone calls/meetings/decisions, or repeated emotional beats.
- Every scene must produce a consequence for the next.

${analysis.narrativePatch}
${timelineBlock ? `\n${timelineBlock}` : ""}`;
}

export function buildSubchapterHandoffPromptBlock(previousSubchapter?: SubchapterInput): string {
  if (!previousSubchapter?.content?.trim()) return "";
  const ending = extractClosing(previousSubchapter.content, 450);
  return `CONTINUITÀ OBBLIGATORIA — INIZIA ESATTAMENTE QUI:
Il sottocapitolo precedente ("${previousSubchapter.title}") termina così:
"""
${ending}
"""
Inizia esattamente dove termina il sottocapitolo precedente. Non ripetere eventi già accaduti. Non riaprire telefonate, incontri o decisioni già narrati. Prosegui in avanti nel tempo e nelle conseguenze.`;
}

export const CONTINUITY_SCORE_THRESHOLD = 70;
