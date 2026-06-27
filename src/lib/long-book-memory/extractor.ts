import type { BookBlueprint, BookConfig, BookProject, Chapter } from "@/types/book";
import type {
  CharacterMemoryState,
  EmotionalProgressionBeat,
  ForeshadowSeed,
  GlobalRepetitionSignal,
  LongBookMemorySnapshot,
  PromisePayoffTracker,
  UnresolvedArc,
  WorldRuleLock,
} from "./types";

const UNRESOLVED_PATTERNS = [
  /\b(non sapeva|didn't know|not yet|ancora non|mystery|mistero|secret|segreto|unanswered|senza risposta)\b/gi,
  /\b(doveva|would have to|must eventually|prima o poi|sooner or later|un giorno)\b/gi,
  /\b(promessa|promise|vow|giurò|swore to)\b/gi,
  /\b(unresolved|irrisolto|pending|in sospeso|cliffhanger)\b/gi,
];

const FORESHADOW_PATTERNS = [
  /\b(foreshadow|presag|hint|accenno|sembrava insignificante|would matter later|più tardi avrebbe)\b/gi,
  /\b(non immaginava|couldn't imagine|little did .+ know)\b/gi,
];

const PAYOFF_PATTERNS = [
  /\b(finalmente|at last|finally understood|revealed|rivelato|payoff|conseguenza)\b/gi,
];

const REPETITION_SIGNAL_PATTERNS: Array<{
  kind: GlobalRepetitionSignal["kind"];
  phrase: string;
  pattern: RegExp;
}> = [
  { kind: "gesture", phrase: "silenzio/silence as emotional beat", pattern: /\b(silenzio|silence)\b/gi },
  { kind: "gesture", phrase: "sguardo/eyes carrying the scene", pattern: /\b(sguardo|guardò|occhi|eyes|looked)\b/gi },
  { kind: "gesture", phrase: "jaw/throat tension", pattern: /\b(mascella|gola|throat|jaw)\b/gi },
  { kind: "image", phrase: "ombra/shadow image", pattern: /\b(ombra|ombre|shadow|shadows)\b/gi },
  { kind: "image", phrase: "cold/coldness image", pattern: /\b(fredd[oa]|cold)\b/gi },
  { kind: "emotion", phrase: "fear named directly", pattern: /\b(paura|afraid|fear)\b/gi },
  { kind: "emotion", phrase: "pain/wound named directly", pattern: /\b(dolore|ferita|pain|wound)\b/gi },
  { kind: "transition", phrase: "everything changed transition", pattern: /\b(tutto cambiò|niente sarebbe stato|everything changed|nothing would ever)\b/gi },
  { kind: "transition", phrase: "for a moment transition", pattern: /\b(per un istante|per un attimo|for a moment|for one second)\b/gi },
];

const EMOTION_LEXICON: Record<string, string[]> = {
  fear: ["paura", "afraid", "terror", "terrore", "anxious", "ansia"],
  desire: ["desire", "desiderio", "want", "volle", "attrazione", "longing"],
  anger: ["rabbia", "anger", "furious", "furioso", "rage"],
  grief: ["grief", "dolore", "loss", "perdita", "mourn", "lutto"],
  hope: ["hope", "speranza", "faith", "fede"],
  tension: ["tension", "tensione", "conflict", "conflitto", "clash"],
  intimacy: ["kiss", "bacio", "touch", "abbraccio", "vulnerable", "vulnerabile"],
};

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function chapterText(chapter: Chapter): string {
  const subs = (chapter.subchapters || []).map((s) => s.content).join("\n");
  return normalize(`${chapter.content}\n${subs}`);
}

function endingSnippet(text: string, max = 220): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `…${trimmed.slice(-max)}`;
}

function countEmotionHits(text: string): { emotion: string; count: number }[] {
  const lower = text.toLowerCase();
  return Object.entries(EMOTION_LEXICON)
    .map(([emotion, words]) => ({
      emotion,
      count: words.reduce((sum, word) => sum + (lower.match(new RegExp(`\\b${word}\\b`, "g"))?.length || 0), 0),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function dominantEmotion(text: string): { emotion: string; intensity: number } {
  const hits = countEmotionHits(text);
  if (!hits.length) return { emotion: "neutral", intensity: 3 };
  const top = hits[0];
  return { emotion: top.emotion, intensity: Math.min(10, 3 + top.count) };
}

function extractSentencesMatching(text: string, patterns: RegExp[], limit = 6): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const matches: string[] = [];
  for (const sentence of sentences) {
    if (patterns.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(sentence);
    })) {
      matches.push(sentence.slice(0, 180));
    }
    if (matches.length >= limit) break;
  }
  return matches;
}

function stableId(prefix: string, text: string, chapter: number): string {
  const hash = Array.from(text)
    .reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return `${prefix}-${chapter}-${hash.toString(36).slice(0, 6)}`;
}

function promiseImportance(text: string, introducedChapter: number, totalChapters: number): "low" | "medium" | "high" {
  const lower = text.toLowerCase();
  if (/morte|death|kill|segreto|secret|profezia|prophecy|minaccia|threat|finale|climax|tradimento|betrayal/.test(lower)) {
    return "high";
  }
  if (introducedChapter <= Math.max(2, Math.ceil(totalChapters * 0.25))) return "high";
  if (/promess|promise|mister|mystery|indizio|clue|love|amore|desiderio|desire/.test(lower)) return "medium";
  return "low";
}

function expectedPayoffFor(text: string, expectedChapter?: number): string {
  const target = expectedChapter ? ` entro il capitolo ${expectedChapter}` : "";
  if (/segreto|secret|mister|mystery|indizio|clue/i.test(text)) return `Rivelazione, conseguenza o falso indizio risolutivo${target}.`;
  if (/promess|promise|giur|vow/i.test(text)) return `Scelta visibile che mantiene, tradisce o paga la promessa${target}.`;
  if (/minaccia|threat|pericolo|danger/i.test(text)) return `La minaccia deve produrre costo concreto, ferita o nuova decisione${target}.`;
  return `Sviluppo o chiusura verificabile sulla pagina${target}.`;
}

function findActualPayoff(promise: string, chapters: Chapter[], introducedIndex: number): string | undefined {
  const keywords = promise
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 6)
    .slice(0, 5);
  if (!keywords.length) return undefined;

  for (let index = introducedIndex + 1; index < chapters.length; index += 1) {
    const text = chapterText(chapters[index]);
    const lower = text.toLowerCase();
    const keywordHits = keywords.filter((word) => lower.includes(word)).length;
    const hasPayoffLanguage = PAYOFF_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
    if (keywordHits >= 2 || (keywordHits >= 1 && hasPayoffLanguage)) {
      return `Ch${index + 1}: ${endingSnippet(text, 160)}`;
    }
  }
  return undefined;
}

function buildCharacterStates(
  config: BookConfig,
  blueprint: BookBlueprint | null,
  chapters: Chapter[],
): CharacterMemoryState[] {
  const cast = [
    ...(config.characters || []).map((c) => ({
      name: [c.name, c.surname].filter(Boolean).join(" ").trim(),
      role: c.role,
      trauma: c.traumaProfile || c.personality || "",
      relationships: c.relationships || "",
    })),
    ...(blueprint?.blueprintIntegrity?.characterMemoryEngine || []).map((c) => ({
      name: c.canonicalName,
      role: c.role,
      trauma: c.emotionalWounds || c.traumaMarkers || "",
      relationships: c.relationshipMap || "",
    })),
  ];

  const deduped = new Map<string, typeof cast[number]>();
  for (const item of cast) {
    if (!item.name) continue;
    deduped.set(item.name.toLowerCase(), item);
  }

  return [...deduped.values()].slice(0, 12).map((character) => {
    let lastSeen = 0;
    let emotionalState = "unknown";
    for (let i = chapters.length - 1; i >= 0; i -= 1) {
      const text = chapterText(chapters[i]);
      if (text.toLowerCase().includes(character.name.toLowerCase())) {
        lastSeen = i + 1;
        emotionalState = dominantEmotion(text).emotion;
        break;
      }
    }

    return {
      name: character.name,
      role: character.role,
      traumaState: character.trauma || "preserve established wounds — do not reset trauma",
      emotionalState,
      relationshipState: character.relationships || "maintain established relationship dynamics",
      lastSeenChapter: lastSeen || undefined,
    };
  });
}

function buildUnresolvedArcs(chapters: Chapter[], blueprint: BookBlueprint | null): UnresolvedArc[] {
  const arcs: UnresolvedArc[] = [];
  chapters.forEach((chapter, index) => {
    const text = chapterText(chapter);
    const hits = extractSentencesMatching(text, UNRESOLVED_PATTERNS, 3);
    hits.forEach((hit, hitIndex) => {
      arcs.push({
        id: `arc-${index + 1}-${hitIndex}`,
        description: hit,
        introducedChapter: index + 1,
        urgency: index >= chapters.length - 2 ? "high" : "medium",
        type: /secret|segreto|mystery|mistero/i.test(hit) ? "mystery" : /promise|promessa|vow/i.test(hit) ? "promise" : "conflict",
      });
    });
  });

  const futureOutlines = blueprint?.chapterOutlines?.slice(chapters.length) || [];
  futureOutlines.slice(0, 4).forEach((outline, offset) => {
    if (!outline.summary?.trim()) return;
    arcs.push({
      id: `blueprint-${chapters.length + offset + 1}`,
      description: `Planned arc: ${outline.summary.slice(0, 160)}`,
      introducedChapter: chapters.length,
      urgency: offset === 0 ? "high" : "medium",
      type: "promise",
    });
  });

  return arcs.slice(0, 14);
}

function buildForeshadowing(chapters: Chapter[]): ForeshadowSeed[] {
  const seeds: ForeshadowSeed[] = [];
  const corpus = chapters.map(chapterText).join("\n").toLowerCase();

  chapters.forEach((chapter, index) => {
    const text = chapterText(chapter);
    const hits = extractSentencesMatching(text, FORESHADOW_PATTERNS, 2);
    hits.forEach((hit) => {
      const normalized = hit.toLowerCase().slice(0, 80);
      const referencedLater = chapters.slice(index + 1).some((later) =>
        chapterText(later).toLowerCase().includes(normalized.slice(0, 40)),
      );
      const paid = PAYOFF_PATTERNS.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(corpus.slice(corpus.indexOf(normalized)));
      });
      seeds.push({
        seed: hit,
        chapter: index + 1,
        payoffStatus: paid || referencedLater ? "paid" : index < chapters.length - 1 ? "partial" : "open",
      });
    });
  });

  return seeds.slice(0, 12);
}

function buildPromisePayoffs(chapters: Chapter[], blueprint: BookBlueprint | null): PromisePayoffTracker[] {
  const items: PromisePayoffTracker[] = [];
  const totalChapters = blueprint?.chapterOutlines?.length || chapters.length || 1;

  chapters.forEach((chapter, index) => {
    const notes = blueprint?.chapterOutlines?.[index]?.canonNotes || [];
    notes.forEach((note) => {
      const payoffExpectedBy = Math.min(totalChapters, index + 3);
      items.push({
        id: stableId("promise-note", note, index + 1),
        promise: note,
        chapterIntroduced: index + 1,
        originChapter: index + 1,
        payoffExpectedBy,
        importance: promiseImportance(note, index + 1, totalChapters),
        expectedPayoff: expectedPayoffFor(note, payoffExpectedBy),
        status: "open",
      });
    });

    extractSentencesMatching(chapterText(chapter), [/\b(promett|promise|must|dovrà|will have to)\b/gi], 2).forEach((hit) => {
      const payoffExpectedBy = Math.min(totalChapters, index + 4);
      items.push({
        id: stableId("promise-text", hit, index + 1),
        promise: hit,
        chapterIntroduced: index + 1,
        originChapter: index + 1,
        payoffExpectedBy,
        importance: promiseImportance(hit, index + 1, totalChapters),
        expectedPayoff: expectedPayoffFor(hit, payoffExpectedBy),
        status: "open",
      });
    });
  });

  const corpus = chapters.map(chapterText).join("\n").toLowerCase();
  return items.slice(0, 12).map((item) => {
    const fragment = item.promise.toLowerCase().slice(0, 36);
    const paid = fragment.length > 8 && corpus.lastIndexOf(fragment) > corpus.indexOf(fragment);
    const actualPayoff = findActualPayoff(item.promise, chapters, Math.max(0, item.chapterIntroduced - 1));
    const overdue =
      item.payoffExpectedBy !== undefined && chapters.length > item.payoffExpectedBy && !paid && !actualPayoff;
    const developing =
      !paid && !actualPayoff && item.chapterIntroduced < chapters.length && item.status !== "overdue";
    return {
      ...item,
      actualPayoff,
      status: paid || actualPayoff ? "paid" : overdue ? "overdue" : developing ? "developing" : "open",
    };
  });
}

function buildGlobalRepetitionSignals(chapters: Chapter[]): GlobalRepetitionSignal[] {
  const signals: GlobalRepetitionSignal[] = [];
  const written = chapters
    .map((chapter, index) => ({ index, text: chapterText(chapter) }))
    .filter((chapter) => chapter.text.length > 50);

  for (const signal of REPETITION_SIGNAL_PATTERNS) {
    const chaptersWithSignal: number[] = [];
    let count = 0;
    for (const chapter of written) {
      signal.pattern.lastIndex = 0;
      const matches = chapter.text.match(signal.pattern) || [];
      if (matches.length > 0) {
        chaptersWithSignal.push(chapter.index + 1);
        count += matches.length;
      }
    }
    if (count >= 4 && chaptersWithSignal.length >= 2) {
      signals.push({
        id: stableId(`rep-${signal.kind}`, signal.phrase, chaptersWithSignal[0] || 1),
        kind: signal.kind,
        phrase: signal.phrase,
        count,
        chapters: chaptersWithSignal.slice(0, 8),
      });
    }
  }

  return signals.sort((a, b) => b.count - a.count).slice(0, 8);
}

function buildEmotionalProgression(chapters: Chapter[]): EmotionalProgressionBeat[] {
  return chapters.map((chapter, index) => {
    const text = chapterText(chapter);
    const { emotion, intensity } = dominantEmotion(text);
    return {
      chapter: index + 1,
      title: chapter.title,
      dominantEmotion: emotion,
      intensity,
    };
  });
}

function buildWorldRules(config: BookConfig, blueprint: BookBlueprint | null): WorldRuleLock[] {
  const rules: WorldRuleLock[] = [];
  const integrity = blueprint?.blueprintIntegrity;

  integrity?.canonProtectionLayer?.immutableCanonRules?.forEach((rule) => {
    rules.push({ rule, source: "blueprint" });
  });
  Object.values(integrity?.worldLoreFoundation || {}).forEach((value) => {
    if (typeof value === "string" && value.trim()) rules.push({ rule: value.trim(), source: "blueprint" });
    if (Array.isArray(value)) value.forEach((v) => rules.push({ rule: String(v), source: "blueprint" }));
  });
  (config.characters || []).forEach((character) => {
    if (character.strictRules?.trim()) {
      rules.push({ rule: `${character.name}: ${character.strictRules}`, source: "config" });
    }
  });

  return rules.slice(0, 16);
}

function buildRelationshipStates(config: BookConfig, blueprint: BookBlueprint | null): string[] {
  const lines: string[] = [];
  const tension = blueprint?.blueprintIntegrity?.relationshipTensionEngine;
  if (tension && typeof tension === "object") {
    Object.entries(tension).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) lines.push(`${key}: ${value}`);
    });
  }
  (config.characters || []).forEach((character) => {
    if (character.relationships?.trim()) {
      lines.push(`${character.name}: ${character.relationships}`);
    }
  });
  return lines.slice(0, 10);
}

function buildContinuityAnchors(chapters: Chapter[]): string[] {
  if (!chapters.length) return [];
  const anchors: string[] = [];
  const first = chapterText(chapters[0]);
  anchors.push(`Book opened with tone anchored in: "${endingSnippet(first, 120)}"`);

  if (chapters.length >= 2) {
    const latest = chapters[chapters.length - 1];
    anchors.push(`Latest chapter "${latest.title}" ended with: "${endingSnippet(chapterText(latest), 160)}"`);
  }

  const openQuestions = extractSentencesMatching(
    chapters.map(chapterText).join("\n"),
    [/\?\s*$/m, /\b(chi|who|why|perché|what if|e se)\b/gi],
    4,
  );
  openQuestions.forEach((q) => anchors.push(`Open thread: ${q}`));

  return anchors.slice(0, 8);
}

export function buildLongBookMemory(input: {
  config: BookConfig;
  blueprint: BookBlueprint | null;
  chapters: Chapter[];
}): LongBookMemorySnapshot {
  const written = input.chapters.filter((chapter) => chapterText(chapter).length > 50);
  const lastChapter = written.at(-1);

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    chaptersIndexed: written.length,
    unresolvedArcs: buildUnresolvedArcs(written, input.blueprint),
    characterStates: buildCharacterStates(input.config, input.blueprint, written),
    emotionalProgression: buildEmotionalProgression(written),
    foreshadowing: buildForeshadowing(written),
    promisePayoffs: buildPromisePayoffs(written, input.blueprint),
    globalRepetitionSignals: buildGlobalRepetitionSignals(written),
    relationshipStates: buildRelationshipStates(input.config, input.blueprint),
    worldRules: buildWorldRules(input.config, input.blueprint),
    continuityAnchors: buildContinuityAnchors(written),
    lastChapterEnding: lastChapter ? endingSnippet(chapterText(lastChapter)) : undefined,
  };
}

export function refreshProjectLongBookMemory(project: BookProject): BookProject {
  const memory = buildLongBookMemory({
    config: project.config,
    blueprint: project.blueprint,
    chapters: project.chapters,
  });
  return { ...project, longBookMemory: memory };
}

export function buildLongBookMemoryPromptBlock(
  memory: LongBookMemorySnapshot,
  chapterIndex: number,
): string {
  if (memory.chaptersIndexed === 0) {
    return `LONG BOOK MEMORY ENGINE V2:
This is the opening movement. Plant durable seeds, character wounds, and world rules that can pay off many chapters later.`;
  }

  const openArcs = memory.unresolvedArcs.filter((arc) => arc.urgency !== "low").slice(0, 6);
  const openSeeds = memory.foreshadowing.filter((seed) => seed.payoffStatus === "open").slice(0, 5);
  const openPromises = memory.promisePayoffs.filter((item) => item.status !== "paid");
  const trackedPromises = [
    ...openPromises,
    ...memory.promisePayoffs.filter((item) => item.status === "paid"),
  ].slice(0, 5);
  const overduePromises = memory.promisePayoffs.filter((item) => item.status === "overdue");
  const repetitionSignals = (memory.globalRepetitionSignals || []).slice(0, 6);

  return `LONG BOOK MEMORY ENGINE V2 — CANON LAW FOR CHAPTER ${chapterIndex + 1}
Chapters indexed: ${memory.chaptersIndexed}
${memory.lastChapterEnding ? `Last chapter ended with: "${memory.lastChapterEnding}"` : ""}

UNRESOLVED ARCS (maintain or advance — do NOT forget):
${openArcs.length ? openArcs.map((arc) => `• [Ch${arc.introducedChapter}] ${arc.description}`).join("\n") : "• Continue established pressure threads from prior chapters."}

CHARACTER STATES (persistent — no reset):
${memory.characterStates.length
    ? memory.characterStates.map((c) => `• ${c.name}${c.role ? ` (${c.role})` : ""}: trauma=${c.traumaState}; current emotion=${c.emotionalState}; relationships=${c.relationshipState}${c.lastSeenChapter ? `; last seen ch.${c.lastSeenChapter}` : ""}`).join("\n")
    : "• Preserve all names, wounds, and relationship dynamics already established."}

EMOTIONAL PROGRESSION (continue the arc — do not flatten):
${memory.emotionalProgression.slice(-5).map((beat) => `• Ch${beat.chapter} "${beat.title}": ${beat.dominantEmotion} (${beat.intensity}/10)`).join("\n")}

RELATIONSHIP STATES:
${memory.relationshipStates.length ? memory.relationshipStates.map((line) => `• ${line}`).join("\n") : "• Maintain relationship asymmetry and unresolved tension already on the page."}

FORESHADOWING SEEDS (honor open seeds or pay them off deliberately):
${openSeeds.length ? openSeeds.map((seed) => `• [Ch${seed.chapter}] ${seed.seed}`).join("\n") : "• Preserve planted seeds; do not contradict earlier setup."}

PROMISE / PAYOFF TRACKER:
${trackedPromises.length ? trackedPromises.map((item) => `• ${item.id ? `${item.id} ` : ""}[origin Ch${item.originChapter || item.chapterIntroduced}] importance=${item.importance || "medium"} status=${item.status}; promise=${item.promise}; expected payoff=${item.expectedPayoff || "visible development or closure on page"}${item.actualPayoff ? `; actual payoff=${item.actualPayoff}` : ""}`).join("\n") : "• Do not break promises made to the reader in earlier chapters."}
${overduePromises.length ? `\nOVERDUE PAYOFFS (address now):\n${overduePromises.map((item) => `• ${item.promise}`).join("\n")}` : ""}

GLOBAL ANTI-REPETITION MEMORY (avoid recycled prose):
${repetitionSignals.length ? repetitionSignals.map((item) => `• ${item.kind}: "${item.phrase}" used ${item.count}x across Ch${item.chapters.join(", ")} — replace with a fresh concrete behavior/image.`).join("\n") : "• No dominant repeated image/gesture detected yet; keep each scene visually specific."}

WORLD RULES (immutable):
${memory.worldRules.length ? memory.worldRules.map((rule) => `• ${rule.rule}`).join("\n") : "• Do not violate established world logic, facts, or character rules."}

CONTINUITY ANCHORS:
${memory.continuityAnchors.map((anchor) => `• ${anchor}`).join("\n")}

MANDATORY:
- Reference prior events naturally — the reader must feel this is one continuous book.
- Never rename characters, reset trauma, or resolve overdue promises without narrative cost.
- Even 20 chapters later, open seeds and wounds must still matter.`;
}
