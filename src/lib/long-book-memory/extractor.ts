import type { BookBlueprint, BookConfig, BookProject, Chapter } from "@/types/book";
import type {
  CharacterMemoryState,
  EmotionalProgressionBeat,
  ForeshadowSeed,
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

  chapters.forEach((chapter, index) => {
    const notes = blueprint?.chapterOutlines?.[index]?.canonNotes || [];
    notes.forEach((note) => {
      items.push({
        promise: note,
        chapterIntroduced: index + 1,
        payoffExpectedBy: Math.min(blueprint?.chapterOutlines?.length || index + 3, index + 3),
        status: "open",
      });
    });

    extractSentencesMatching(chapterText(chapter), [/\b(promett|promise|must|dovrà|will have to)\b/gi], 2).forEach((hit) => {
      items.push({
        promise: hit,
        chapterIntroduced: index + 1,
        status: "open",
      });
    });
  });

  const corpus = chapters.map(chapterText).join("\n").toLowerCase();
  return items.slice(0, 12).map((item) => {
    const fragment = item.promise.toLowerCase().slice(0, 36);
    const paid = fragment.length > 8 && corpus.lastIndexOf(fragment) > corpus.indexOf(fragment);
    const overdue =
      item.payoffExpectedBy !== undefined && chapters.length > item.payoffExpectedBy && !paid;
    return {
      ...item,
      status: paid ? "paid" : overdue ? "overdue" : "open",
    };
  });
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
  const openPromises = memory.promisePayoffs.filter((item) => item.status !== "paid").slice(0, 5);
  const overduePromises = memory.promisePayoffs.filter((item) => item.status === "overdue");

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
${openPromises.length ? openPromises.map((item) => `• [Ch${item.chapterIntroduced}] ${item.promise} — status: ${item.status}`).join("\n") : "• Do not break promises made to the reader in earlier chapters."}
${overduePromises.length ? `\nOVERDUE PAYOFFS (address now):\n${overduePromises.map((item) => `• ${item.promise}`).join("\n")}` : ""}

WORLD RULES (immutable):
${memory.worldRules.length ? memory.worldRules.map((rule) => `• ${rule.rule}`).join("\n") : "• Do not violate established world logic, facts, or character rules."}

CONTINUITY ANCHORS:
${memory.continuityAnchors.map((anchor) => `• ${anchor}`).join("\n")}

MANDATORY:
- Reference prior events naturally — the reader must feel this is one continuous book.
- Never rename characters, reset trauma, or resolve overdue promises without narrative cost.
- Even 20 chapters later, open seeds and wounds must still matter.`;
}
