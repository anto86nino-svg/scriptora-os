import type { Chapter } from "@/types/book";
import {
  analyzeSubchapterContinuity,
  reconstructSubchapterSequence,
  type ContinuityError,
  type SubchapterInput,
} from "@/lib/writer/subchapter-continuity-engine";
import { applyCleanTextPass, repairCorruptedMergeFragments } from "@/lib/writer/clean-text-pass";
import { detectNarrativeCorruption } from "@/lib/writer/narrative-cleanup-pass";
import { assembleChapterFromSubchapters } from "@/lib/writer/subchapter-pipeline";

export type NarrativePhase =
  | "home"
  | "traveling"
  | "arrival"
  | "threshold"
  | "meeting"
  | "post_meeting"
  | "revelation"
  | "unknown";

export type AssemblyTimelineEvent = {
  subchapterIndex: number;
  phase: NarrativePhase;
  label: string;
  excerpt: string;
};

export type ChapterContinuityAssemblyResult = {
  score: number;
  errors: ContinuityError[];
  timeline: AssemblyTimelineEvent[];
  offendingSubchapterIndices: number[];
  deliveredRevelations: string[];
  criticalFailureTypes: string[];
};

export type RegenerateSubchapterFn = (
  subchapterIndex: number,
  chapter: Chapter,
  repairPrompt: string,
) => Promise<{ title: string; content: string }>;

export type ChapterContinuityRepairResult = {
  chapter: Chapter;
  assembly: ChapterContinuityAssemblyResult;
  repaired: boolean;
  regenAttempts: number;
};

const THRESHOLD_PATTERNS = [
  /\b(?:apr[iì]|spalanc|varc[òo]|attravers[òo])\w*\s+(?:la\s+)?(?:porta|soglia|uscio)\b/gi,
  /\b(?:entr[òo]|entrat[oa])\s+(?:in|nella|nel|nell')\b/gi,
  /\b(?:opened|crossed)\s+the\s+(?:door|threshold)\b/gi,
];

const MEETING_COMPLETE_PATTERNS = [
  /\bpossiamo scoprirlo insieme\b/gi,
  /\b(?:incontro|riunione|appuntamento)\s+(?:era\s+)?(?:finito|terminato|concluso)\b/gi,
  /\b(?:si salutarono|si congedarono)\b/gi,
  /\b(?:meeting\s+(?:was\s+)?(?:over|done|finished))\b/gi,
];

const HOME_RESET_PATTERNS = [
  /\b(?:a casa|in casa|torn[òo]\s+a casa|dal balcone di casa)\b/gi,
  /\b(?:in salotto|dalla cucina|sul divano di casa)\b/gi,
  /\b(?:at home|back home|in his apartment|in her apartment)\b/gi,
];

const TRAVEL_TO_MEETING_PATTERNS = [
  /\b(?:part[iì]|usc[iì]|prese\s+la\s+macchina|prese\s+l['']auto)\s+(?:per|verso)\b/gi,
  /\b(?:left for|headed to|drove to)\b/gi,
];

const REVELATION_PATTERNS = [
  /\b(?:foto|ritratto|immagine)\s+(?:del|della|di)\s+(?:padre|madre|genitore)\b/gi,
  /\b(?:lettera|messaggio)\s+(?:che|con|di)\b/gi,
  /\b(?:rivel[òo]|confess[òo]|disse\s+che)\b/gi,
  /\b(?:Rimini|1964|Carlo\s+Rinaldi)\b/gi,
  /\b(?:revealed|confessed|the letter|the photo)\b/gi,
];

const DECISION_TO_GO_PATTERNS = [
  /\b(?:decise|decidette)\s+di\s+(?:andare|partire|raggiungere|vedere)\b/gi,
  /\b(?:decided to go|made up his mind to see)\b/gi,
];

const CORRUPTED_FRAGMENT_PATTERNS = [
  /\bnon diceva a\./i,
  /\bnon trovarono a da fare\b/i,
  /\bAnch'io Le mani\b/i,
];

const PHASE_RANK: Record<NarrativePhase, number> = {
  home: 0,
  traveling: 1,
  arrival: 2,
  threshold: 3,
  meeting: 4,
  revelation: 5,
  post_meeting: 6,
  unknown: -1,
};

function normalizeHay(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function excerptAround(text: string, index: number, radius = 80): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function findFirstMatch(text: string, patterns: RegExp[]): { match: string; index: number } | null {
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    const m = re.exec(text);
    if (m) return { match: m[0], index: m.index };
  }
  return null;
}

function findAllMatches(text: string, patterns: RegExp[]): Array<{ match: string; index: number }> {
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

const POST_MEETING_FORWARD_PATTERNS = [
  /\b(?:uscirono insieme|dopo l['']?incontro|lasciarono|dal portone|si allontanarono)\b/gi,
  /\b(?:left together|after the meeting|walked away)\b/gi,
];

function inferSubchapterPhase(content: string, position: "opening" | "closing" | "full"): NarrativePhase {
  const slice = position === "opening"
    ? content.slice(0, 180)
    : position === "closing"
      ? content.slice(Math.max(0, content.length - 280))
      : content;

  if (position === "opening" && POST_MEETING_FORWARD_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(slice); })) {
    return "post_meeting";
  }

  if (MEETING_COMPLETE_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(slice); })) return "post_meeting";
  if (findFirstMatch(slice, THRESHOLD_PATTERNS)) return "threshold";
  if (findFirstMatch(slice, MEETING_COMPLETE_PATTERNS)) return "meeting";
  if (/\b(?:incontr[òo]|appuntamento|ritrov[òo])\b/i.test(slice)) return "meeting";
  if (findFirstMatch(slice, REVELATION_PATTERNS)) return "revelation";
  if (findFirstMatch(slice, HOME_RESET_PATTERNS)) return "home";
  if (findFirstMatch(slice, TRAVEL_TO_MEETING_PATTERNS)) return "traveling";
  if (/\b(?:arriv[òo]|giunse|davanti a)\b/i.test(slice)) return "arrival";
  return "unknown";
}

function extractRevelationFingerprints(content: string): string[] {
  const fingerprints: string[] = [];
  for (const pattern of REVELATION_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const key = normalizeHay(m[0]).slice(0, 80);
      if (key.length > 8) fingerprints.push(key);
    }
  }
  return [...new Set(fingerprints)];
}

function buildUnifiedTimeline(subchapters: SubchapterInput[]): AssemblyTimelineEvent[] {
  const timeline: AssemblyTimelineEvent[] = [];
  subchapters.forEach((sub, index) => {
    const content = String(sub.content || "").trim();
    if (!content) return;

    const openingPhase = inferSubchapterPhase(content, "opening");
    const closingPhase = inferSubchapterPhase(content, "closing");

    timeline.push({
      subchapterIndex: index,
      phase: openingPhase,
      label: `${sub.title} (apertura)`,
      excerpt: content.slice(0, 100),
    });

    if (closingPhase !== openingPhase && closingPhase !== "unknown") {
      timeline.push({
        subchapterIndex: index,
        phase: closingPhase,
        label: `${sub.title} (chiusura)`,
        excerpt: content.slice(Math.max(0, content.length - 100)),
      });
    }

    for (const hit of findAllMatches(content, THRESHOLD_PATTERNS)) {
      timeline.push({
        subchapterIndex: index,
        phase: "threshold",
        label: `Varco soglia in "${sub.title}"`,
        excerpt: excerptAround(content, hit.index),
      });
    }
  });
  return timeline;
}

function detectGlobalContinuityIssues(subchapters: SubchapterInput[]): {
  errors: ContinuityError[];
  offendingSubchapterIndices: Set<number>;
  criticalFailureTypes: Set<string>;
  deliveredRevelations: string[];
} {
  const errors: ContinuityError[] = [];
  const offendingSubchapterIndices = new Set<number>();
  const criticalFailureTypes = new Set<string>();
  const deliveredRevelations: string[] = [];
  const seenRevelations = new Map<string, number>();

  let subsWithThreshold = 0;
  let subsWithDecisionToGo = 0;
  let meetingCompleteIndex: number | null = null;

  subchapters.forEach((sub, index) => {
    const content = String(sub.content || "").trim();
    if (!content) return;

    if (findAllMatches(content, THRESHOLD_PATTERNS).length > 0) subsWithThreshold += 1;
    if (findAllMatches(content, DECISION_TO_GO_PATTERNS).length > 0) subsWithDecisionToGo += 1;

    if (MEETING_COMPLETE_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content); })) {
      meetingCompleteIndex = index;
    }

    for (const fingerprint of extractRevelationFingerprints(content)) {
      const prior = seenRevelations.get(fingerprint);
      if (prior != null && prior !== index) {
        errors.push({
          severity: "critical",
          category: "repetition",
          subchapterIndex: index,
          message: `Rivelazione già consegnata al lettore nel sottocapitolo ${prior + 1}: non reintrodurre.`,
          excerpt: fingerprint.slice(0, 80),
        });
        offendingSubchapterIndices.add(index);
        criticalFailureTypes.add("duplicate_revelation");
      } else {
        seenRevelations.set(fingerprint, index);
        deliveredRevelations.push(fingerprint);
      }
    }

    for (const pattern of CORRUPTED_FRAGMENT_PATTERNS) {
      if (pattern.test(content)) {
        errors.push({
          severity: "critical",
          category: "continuity",
          subchapterIndex: index,
          message: "Frammento di testo corrotto da merge automatico.",
          excerpt: content.match(pattern)?.[0],
        });
        offendingSubchapterIndices.add(index);
        criticalFailureTypes.add("corrupted_fragment");
      }
    }

    for (const corruption of detectNarrativeCorruption(content)) {
      errors.push({
        severity: corruption.kind === "out_of_context" || corruption.kind === "nonsense_fragment" ? "critical" : "medium",
        category: "narrative_corruption",
        subchapterIndex: index,
        message: corruption.message,
        excerpt: corruption.excerpt,
      });
      offendingSubchapterIndices.add(index);
      criticalFailureTypes.add("narrative_corruption");
    }
  });

  if (subsWithThreshold > 1) {
    errors.push({
      severity: "critical",
      category: "repetition",
      message: `Varco di soglia/ingresso ripetuto in ${subsWithThreshold} sottocapitoli.`,
    });
    criticalFailureTypes.add("duplicate_threshold");
    subchapters.forEach((_, i) => {
      if (findAllMatches(subchapters[i]!.content, THRESHOLD_PATTERNS).length > 0) {
        offendingSubchapterIndices.add(i);
      }
    });
  }

  if (subsWithDecisionToGo > 1) {
    errors.push({
      severity: "critical",
      category: "repetition",
      message: "La stessa decisione di andare/incontrarsi è narrata più volte.",
    });
    criticalFailureTypes.add("duplicate_decision");
  }

  for (let i = 0; i < subchapters.length - 1; i += 1) {
    const prevContent = String(subchapters[i]!.content || "").trim();
    const nextContent = String(subchapters[i + 1]!.content || "").trim();
    if (!prevContent || !nextContent) continue;

    const prevClosingPhase = inferSubchapterPhase(prevContent, "closing");
    const nextOpeningPhase = inferSubchapterPhase(nextContent, "opening");

    const prevRank = PHASE_RANK[prevClosingPhase];
    const nextRank = PHASE_RANK[nextOpeningPhase];

    const meetingDone = prevClosingPhase === "post_meeting" || MEETING_COMPLETE_PATTERNS.some((p) => {
      p.lastIndex = 0;
      return p.test(prevContent.slice(Math.max(0, prevContent.length - 300)));
    });

    const resetsBeforeMeeting =
      (nextOpeningPhase === "home" || nextOpeningPhase === "traveling")
      && findFirstMatch(nextContent.slice(0, 220), DECISION_TO_GO_PATTERNS) != null
      && !POST_MEETING_FORWARD_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(nextContent.slice(0, 220)); });

    if (meetingDone && resetsBeforeMeeting) {
      errors.push({
        severity: "critical",
        category: "timeline",
        boundaryIndex: i,
        subchapterIndex: i + 1,
        message: "Salto temporale all'indietro: l'incontro è concluso ma il sottocapitolo successivo riparte prima dell'incontro.",
        excerpt: nextContent.slice(0, 100),
      });
      offendingSubchapterIndices.add(i + 1);
      criticalFailureTypes.add("backward_time_travel");
    } else if (
      prevRank >= 0 &&
      nextRank >= 0 &&
      nextRank < prevRank - 1 &&
      !/\b(?:flashback|ricord(?:o|ava)|anni\s+prima)\b/i.test(nextContent.slice(0, 120))
    ) {
      errors.push({
        severity: "critical",
        category: "timeline",
        boundaryIndex: i,
        subchapterIndex: i + 1,
        message: `Sequenza causale invertita: da "${prevClosingPhase}" a "${nextOpeningPhase}" senza transizione.`,
        excerpt: nextContent.slice(0, 100),
      });
      offendingSubchapterIndices.add(i + 1);
      criticalFailureTypes.add("backward_time_travel");
    }

    const prevThreshold = findFirstMatch(prevContent.slice(Math.max(0, prevContent.length - 350)), THRESHOLD_PATTERNS);
    const nextThreshold = findFirstMatch(nextContent.slice(0, 350), THRESHOLD_PATTERNS);
    if (prevThreshold && nextThreshold) {
      errors.push({
        severity: "critical",
        category: "repetition",
        boundaryIndex: i,
        subchapterIndex: i + 1,
        message: "Scena di ingresso/soglia duplicata al confine tra sottocapitoli.",
        excerpt: nextThreshold.match,
      });
      offendingSubchapterIndices.add(i + 1);
      criticalFailureTypes.add("duplicate_scene");
    }
  }

  if (meetingCompleteIndex != null) {
    for (let j = meetingCompleteIndex + 1; j < subchapters.length; j += 1) {
      const laterContent = String(subchapters[j]!.content || "");
      if (/\b(?:incontr[òo]|appuntamento|ritrov[òo])\b/i.test(laterContent.slice(0, 500))
        && findFirstMatch(laterContent.slice(0, 500), THRESHOLD_PATTERNS)) {
        errors.push({
          severity: "critical",
          category: "repetition",
          subchapterIndex: j,
          message: "Incontro rifatto dopo che era già concluso in un sottocapitolo precedente.",
          excerpt: laterContent.slice(0, 100),
        });
        offendingSubchapterIndices.add(j);
        criticalFailureTypes.add("meeting_redone");
      }
    }
  }

  const phaseSequence = subchapters.map((sub) => inferSubchapterPhase(sub.content, "closing"));
  for (let i = 2; i < phaseSequence.length; i += 1) {
    const a = PHASE_RANK[phaseSequence[i - 2]!];
    const b = PHASE_RANK[phaseSequence[i - 1]!];
    const c = PHASE_RANK[phaseSequence[i]!];
    if (a >= 0 && b >= 0 && c >= 0 && a < b && c < b && c <= a) {
      errors.push({
        severity: "critical",
        category: "causality",
        subchapterIndex: i,
        message: "Catena causale violata: sequenza A→B→C→B→A senza giustificazione.",
      });
      offendingSubchapterIndices.add(i);
      criticalFailureTypes.add("causality_violation");
    }
  }

  return {
    errors,
    offendingSubchapterIndices,
    criticalFailureTypes,
    deliveredRevelations,
  };
}

function scoreFromAssemblyErrors(errors: ContinuityError[]): number {
  let score = 100;
  for (const error of errors) {
    if (error.severity === "critical") score -= 22;
    else if (error.severity === "medium") score -= 10;
    else score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

export function analyzeChapterContinuityAssembly(
  chapter: { subchapters: SubchapterInput[] },
  context?: { language?: string },
): ChapterContinuityAssemblyResult {
  const subchapters = (chapter.subchapters || []).filter((s) => String(s.content || "").trim());
  const baseAnalysis = analyzeSubchapterContinuity({ subchapters }, context);
  const global = detectGlobalContinuityIssues(subchapters);
  const timeline = buildUnifiedTimeline(subchapters);

  const mergedErrors = [...baseAnalysis.errors];
  const seenMessages = new Set(mergedErrors.map((e) => e.message));
  for (const error of global.errors) {
    if (!seenMessages.has(error.message)) {
      mergedErrors.push(error);
      seenMessages.add(error.message);
    }
  }

  const score = Math.min(baseAnalysis.score, scoreFromAssemblyErrors(mergedErrors));
  const offendingSubchapterIndices = [
    ...new Set([
      ...mergedErrors
        .filter((e) => e.severity === "critical" && e.subchapterIndex != null)
        .map((e) => e.subchapterIndex!),
      ...global.offendingSubchapterIndices,
    ]),
  ].sort((a, b) => a - b);

  return {
    score,
    errors: mergedErrors,
    timeline,
    offendingSubchapterIndices,
    deliveredRevelations: global.deliveredRevelations,
    criticalFailureTypes: [...global.criticalFailureTypes],
  };
}

export function extractDeliveredRevelations(subchapters: SubchapterInput[]): string[] {
  const revelations: string[] = [];
  for (const sub of subchapters) {
    revelations.push(...extractRevelationFingerprints(sub.content));
  }
  return [...new Set(revelations)];
}

export function buildContinuityRegenerationPrompt(
  assembly: ChapterContinuityAssemblyResult,
  subchapterIndex: number,
  previousEnding: string,
  language = "Italian",
): string {
  const relevant = assembly.errors.filter(
    (e) => e.subchapterIndex === subchapterIndex || e.boundaryIndex === subchapterIndex - 1,
  );
  const lang = String(language || "").toLowerCase().includes("ital") ? "italiano" : "the book language";
  const issues = relevant.slice(0, 6).map((e) => `- ${e.message}`).join("\n");

  return `CONTINUITÀ NARRATIVA — RIGENERAZIONE OBBLIGATORIA (sottocapitolo ${subchapterIndex + 1})
Il capitolo ha errori critici di continuità (punteggio ${assembly.score}/100). Scrivi in ${lang}.

ERRORI DA CORREGGERE:
${issues || "- Ripeti eventi già narrati o salti indietro nel tempo."}

STATO SCENA PRECEDENTE — INIZIA ESATTAMENTE QUI (ultimi 600 caratteri):
"""
${previousEnding.slice(-600)}
"""

REGOLE ASSOLUTE:
- Continua dalla chiusura precedente. NON tornare indietro nel tempo.
- NON ripetere: varco di soglia, telefonate, incontri, decisioni o rivelazioni già consegnate.
- NON reintrodurre informazioni già rivelate al lettore.
- Prosegui in avanti nelle conseguenze, non riaprire scene chiuse.`;
}

export function applyChapterContinuityMergePass(
  chapter: Chapter,
  language?: string,
): Chapter {
  const subs = (chapter.subchapters || []).map((sub) => ({
    ...sub,
    content: applyCleanTextPass(repairCorruptedMergeFragments(String(sub.content || "")), language),
  }));
  const content = applyCleanTextPass(
    repairCorruptedMergeFragments(assembleChapterFromSubchapters(subs)),
    language,
  );
  return { ...chapter, subchapters: subs, content };
}

export async function repairChapterContinuityAssembly(
  chapter: Chapter,
  options: {
    language?: string;
    maxRegenAttemptsPerSubchapter?: number;
    regenerateSubchapter?: RegenerateSubchapterFn;
  } = {},
): Promise<ChapterContinuityRepairResult> {
  const maxAttempts = options.maxRegenAttemptsPerSubchapter ?? 2;
  let working: Chapter = applyChapterContinuityMergePass(chapter, options.language);
  let assembly = analyzeChapterContinuityAssembly(
    { subchapters: working.subchapters || [] },
    { language: options.language },
  );
  let regenAttempts = 0;

  const reconstruction = reconstructSubchapterSequence(
    analyzeSubchapterContinuity({ subchapters: working.subchapters || [] }, { language: options.language }),
    working.subchapters || [],
  );

  if (reconstruction.improvedScore > assembly.score || reconstruction.reordered) {
    working = applyChapterContinuityMergePass(
      { ...working, subchapters: reconstruction.subchapters },
      options.language,
    );
    assembly = analyzeChapterContinuityAssembly(
      { subchapters: working.subchapters || [] },
      { language: options.language },
    );
  }

  const hasCritical = assembly.errors.some((e) => e.severity === "critical");
  const needsRegen = hasCritical && options.regenerateSubchapter && assembly.offendingSubchapterIndices.length > 0;

  if (needsRegen) {
    const attemptCounts = new Map<number, number>();
    for (const subIndex of assembly.offendingSubchapterIndices) {
      if ((attemptCounts.get(subIndex) || 0) >= maxAttempts) continue;

      const subs = working.subchapters || [];
      const previousEnding = subIndex > 0
        ? String(subs[subIndex - 1]?.content || "").trim()
        : "";

      const repairPrompt = buildContinuityRegenerationPrompt(
        assembly,
        subIndex,
        previousEnding,
        options.language,
      );

      const regenerated = await options.regenerateSubchapter!(subIndex, working, repairPrompt);
      const nextSubs = [...subs];
      nextSubs[subIndex] = {
        title: regenerated.title || subs[subIndex]?.title || "",
        content: applyCleanTextPass(regenerated.content, options.language),
      };
      working = applyChapterContinuityMergePass({ ...working, subchapters: nextSubs }, options.language);
      attemptCounts.set(subIndex, (attemptCounts.get(subIndex) || 0) + 1);
      regenAttempts += 1;
      assembly = analyzeChapterContinuityAssembly(
        { subchapters: working.subchapters || [] },
        { language: options.language },
      );

      if (!assembly.errors.some((e) => e.severity === "critical")) break;
    }
  }

  const repaired = regenAttempts > 0 || reconstruction.reordered;
  return { chapter: working, assembly, repaired, regenAttempts };
}
