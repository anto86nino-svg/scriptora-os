import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { ConflictLevel, RelationshipMemory } from "./types";
import {
  chapterCorpus,
  clampPercent,
  corpusForCharacter,
  pairKey,
  pairLabel,
} from "./utils";

const CONFLICT_PATTERNS = /\b(litig|argu(?:ed|ment)?|fight|fought|tradit|betray(?:ed|al)?|rupture|non\s+parlano|cold\s+war|accus)\b/i;
const INTIMACY_PATTERNS = /\b(kiss|bacio|touch|abbracc|desire|desider|attrazione|longing|vulnerab)\b/i;
const DISTANCE_PATTERNS = /\b(distance|distanza|pull(?:ed)?\s+away|si\s+tira\s+indietro|avoid|evita)\b/i;
const TRUST_PATTERNS = /\b(fiducia|trust|safe|sicur|confess|apert)\b/i;

function levelFromScore(score: number): ConflictLevel {
  if (score >= 66) return "high";
  if (score >= 34) return "medium";
  return "low";
}

function parseRelationshipPairs(config: BookConfig, blueprint: BookBlueprint | null): Array<{ a: string; b: string; note: string }> {
  const pairs = new Map<string, { a: string; b: string; note: string }>();

  for (const character of config.characters || []) {
    const name = [character.name, character.surname].filter(Boolean).join(" ").trim();
    const rel = character.relationships?.trim();
    if (!name || !rel) continue;
    const withMatch = rel.match(/^(?:with|con)\s+([^,;]+)/i);
    const target = withMatch?.[1]?.trim() || rel.split(/[,;]| with | con /i).find((part) => part.trim().length > 2)?.trim();
    if (target && target.length > 2) {
      const key = pairKey(name, target);
      pairs.set(key, { a: name, b: target, note: rel });
    }
  }

  const tension = blueprint?.blueprintIntegrity?.relationshipTensionEngine;
  if (tension && typeof tension === "object") {
    for (const [label, value] of Object.entries(tension)) {
      if (typeof value !== "string" || !value.trim()) continue;
      const names = label.split(/[↔x×\-]/).map((part) => part.trim()).filter(Boolean);
      if (names.length >= 2) {
        const key = pairKey(names[0], names[1]);
        pairs.set(key, { a: names[0], b: names[1], note: value.trim() });
      }
    }
  }

  return [...pairs.values()].slice(0, 8);
}

function scorePairSignals(a: string, b: string, chapters: Chapter[]): {
  trust: number;
  sexualTension: number;
  emotionalOpenness: number;
  conflictScore: number;
  vulnerabilityScore: number;
  lastInteractionChapter: number;
  statusNote: string;
} {
  let trust = 38;
  let sexualTension = 28;
  let emotionalOpenness = 22;
  let conflictScore = 18;
  let vulnerabilityScore = 34;
  let lastInteractionChapter = 0;

  chapters.forEach((chapter, index) => {
    const text = chapterCorpus(chapter);
    const lower = text.toLowerCase();
    if (!lower.includes(a.toLowerCase()) || !lower.includes(b.toLowerCase())) return;
    lastInteractionChapter = index + 1;
    if (CONFLICT_PATTERNS.test(text)) conflictScore += 24;
    if (INTIMACY_PATTERNS.test(text)) {
      sexualTension += 18;
      emotionalOpenness += 12;
    }
    if (DISTANCE_PATTERNS.test(text)) {
      emotionalOpenness -= 10;
      vulnerabilityScore += 14;
    }
    if (TRUST_PATTERNS.test(text)) trust += 16;
    if (/\b(non\s+si\s+fid|mistrust|sospett|doubt)\b/i.test(text)) trust -= 18;
  });

  const statusNote = conflictScore >= 50
    ? "recent conflict still active — no instant reconciliation"
    : sexualTension >= 55
      ? "charged attraction with unresolved friction"
      : trust >= 55
        ? "trust is growing but still conditional"
        : "guarded dynamic — preserve asymmetry";

  return {
    trust: clampPercent(trust),
    sexualTension: clampPercent(sexualTension),
    emotionalOpenness: clampPercent(emotionalOpenness),
    conflictScore,
    vulnerabilityScore,
    lastInteractionChapter,
    statusNote,
  };
}

export function buildRelationshipMemories(input: {
  config: BookConfig;
  blueprint: BookBlueprint | null;
  chapters: Chapter[];
}): RelationshipMemory[] {
  const written = input.chapters.filter((chapter) => chapterCorpus(chapter).length > 40);
  const pairs = parseRelationshipPairs(input.config, input.blueprint);

  if (!pairs.length && (input.config.characters || []).length >= 2) {
    const [first, second] = (input.config.characters || [])
      .map((character) => [character.name, character.surname].filter(Boolean).join(" ").trim())
      .filter(Boolean)
      .slice(0, 2);
    if (first && second) pairs.push({ a: first, b: second, note: "primary relationship axis" });
  }

  return pairs.map(({ a, b, note }) => {
    const signals = scorePairSignals(a, b, written);
    return {
      pair: pairLabel(a, b),
      characterA: a,
      characterB: b,
      trust: signals.trust,
      sexualTension: signals.sexualTension,
      emotionalOpenness: signals.emotionalOpenness,
      conflictLevel: levelFromScore(signals.conflictScore),
      fearOfVulnerability: levelFromScore(signals.vulnerabilityScore),
      lastInteractionChapter: signals.lastInteractionChapter,
      statusNote: `${note}. ${signals.statusNote}`,
    };
  });
}

export function relationshipPairAppearsInChapter(
  relationship: RelationshipMemory,
  chapterText: string,
): boolean {
  const lower = chapterText.toLowerCase();
  return lower.includes(relationship.characterA.toLowerCase()) && lower.includes(relationship.characterB.toLowerCase());
}

export function corpusMentionsPair(relationship: RelationshipMemory, chapters: Chapter[]): string {
  return chapters
    .map(chapterCorpus)
    .filter((text) => relationshipPairAppearsInChapter(relationship, text))
    .join("\n");
}
