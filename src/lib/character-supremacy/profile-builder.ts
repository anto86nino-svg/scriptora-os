import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { buildCharacterPsychologyProfiles } from "@/lib/narrative-intelligence-v2/character-psychology";
import type {
  CharacterRelationshipLink,
  CharacterSupremacyProfile,
  EmotionalOpennessLevel,
} from "./types";

function fullName(c: { name?: string; surname?: string; canonicalName?: string }): string {
  if ("canonicalName" in c && c.canonicalName) return c.canonicalName.trim();
  return [c.name, c.surname].filter(Boolean).join(" ").trim();
}

function parseOpenness(raw?: string): EmotionalOpennessLevel {
  const v = String(raw || "").toLowerCase();
  if (/open|apert/.test(v)) return "open";
  if (/select|parzial/.test(v)) return "selective";
  if (/guard|chius|closed|riserv/.test(v)) return "guarded";
  return "closed";
}

function parseRelationshipMap(raw: string | undefined, owner: string): CharacterRelationshipLink[] {
  if (!raw?.trim()) return [];
  const links: CharacterRelationshipLink[] = [];
  const segments = raw.split(/[;|•\n]+/).map(s => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const withMatch = seg.match(/(?:with|con|vs\.?|↔)\s*([A-ZÀ-Ö][a-zà-ö]+(?:\s+[A-ZÀ-Ö][a-zà-ö]+)?)/i);
    const trustMatch = seg.match(/trust(?:\s*level)?\s*[:=]?\s*(\d+)/i);
    const attractionMatch = seg.match(/attraction\s*[:=]?\s*(\d+)/i);
    links.push({
      withCharacter: withMatch?.[1] || seg.split(/[:\-]/)[0]?.trim() || "unknown",
      trust: trustMatch ? Number(trustMatch[1]) : 50,
      attraction: attractionMatch ? Number(attractionMatch[1]) : 40,
      conflict: /\bconflict|tension|ostile|hatred|odio\b/i.test(seg) ? 65 : 35,
      label: seg.slice(0, 80),
    });
  }
  return links.slice(0, 6);
}

function inferRelationshipsFromText(name: string, chapters: Chapter[], cast: string[]): CharacterRelationshipLink[] {
  const links: CharacterRelationshipLink[] = [];
  const corpus = chapters.map(c => c.content).join("\n").toLowerCase();
  for (const other of cast) {
    if (other.toLowerCase() === name.toLowerCase()) continue;
    if (!corpus.includes(other.toLowerCase())) continue;
    const pairPattern = new RegExp(
      `${name.split(" ")[0].toLowerCase()}[^.!?]{0,120}${other.split(" ")[0].toLowerCase()}|` +
        `${other.split(" ")[0].toLowerCase()}[^.!?]{0,120}${name.split(" ")[0].toLowerCase()}`,
      "i",
    );
    if (!pairPattern.test(corpus)) continue;
    const trust = /\b(trust|fiducia|believe|crede)\b/i.test(corpus) ? 55 : 40;
    const attraction = /\b(desire|want|kiss|attraction|desider|bacio)\b/i.test(corpus) ? 75 : 35;
    links.push({ withCharacter: other, trust, attraction, conflict: 100 - trust });
  }
  return links.slice(0, 4);
}

export function buildCharacterSupremacyProfiles(input: {
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  chapters?: Chapter[];
  longBookMemory?: LongBookMemorySnapshot;
}): CharacterSupremacyProfile[] {
  const chapters = input.chapters || [];
  const psychProfiles = buildCharacterPsychologyProfiles({
    config: input.config,
    blueprint: input.blueprint || null,
    chapters,
    characterStates: input.longBookMemory?.characterStates,
    existing: input.longBookMemory?.characterPsychology,
  });

  const castNames = [
    ...(input.config.characters || []).map(c => fullName(c)),
    ...(input.blueprint?.blueprintIntegrity?.characterMemoryEngine || []).map(c => c.canonicalName),
    ...psychProfiles.map(p => p.name),
  ].filter(Boolean);

  const profiles: CharacterSupremacyProfile[] = [];

  for (const psych of psychProfiles) {
    const configChar = (input.config.characters || []).find(
      c => fullName(c).toLowerCase() === psych.name.toLowerCase(),
    );
    const blueprintChar = input.blueprint?.blueprintIntegrity?.characterMemoryEngine?.find(
      c => c.canonicalName.toLowerCase() === psych.name.toLowerCase(),
    );
    const memoryState = input.longBookMemory?.characterStates?.find(
      s => s.name.toLowerCase() === psych.name.toLowerCase(),
    );

    const relationships = blueprintChar?.relationshipMap
      ? parseRelationshipMap(blueprintChar.relationshipMap, psych.name)
      : inferRelationshipsFromText(psych.name, chapters, castNames);

    if (configChar?.relationships && !relationships.length) {
      relationships.push(...parseRelationshipMap(configChar.relationships, psych.name));
    }

    profiles.push({
      name: psych.name,
      role: psych.role || configChar?.role || blueprintChar?.role,
      traumas: [psych.woundLabel, blueprintChar?.traumaMarkers, configChar?.wound].filter(Boolean) as string[],
      fears: [psych.fear, blueprintChar?.coreFear, configChar?.personality?.match(/fear|paura|timor[^.]*/i)?.[0]].filter(Boolean) as string[],
      desires: [psych.desire, blueprintChar?.coreDesire, configChar?.externalDesire].filter(Boolean) as string[],
      needs: [blueprintChar?.secretNeed, configChar?.internalNeed].filter(Boolean) as string[],
      emotionalWounds: [blueprintChar?.emotionalWounds, memoryState?.traumaState].filter(Boolean) as string[],
      values: [configChar?.strictRules, blueprintChar?.personalityProfile?.match(/values?[^.]*/i)?.[0]].filter(Boolean) as string[],
      contradictions: [psych.contradiction, blueprintChar?.internalContradiction].filter(Boolean) as string[],
      speechPattern: [blueprintChar?.speechPattern, blueprintChar?.vocabularyStyle, configChar?.personality?.match(/speak|parla|voice|voce[^.]*/i)?.[0]].filter(Boolean) as string[],
      emotionalOpenness: parseOpenness(blueprintChar?.emotionalOpennessLevel),
      secrets: [configChar?.secret, blueprintChar?.secretNeed].filter(Boolean) as string[],
      promises: input.longBookMemory?.promisePayoffs
        ?.filter(p => p.promise.toLowerCase().includes(psych.name.split(" ")[0].toLowerCase()))
        .map(p => p.promise.slice(0, 100)) || [],
      relationships,
      behavioralRules: psych.behavioralDirectives,
      forbiddenBehaviors: [
        ...psych.forbiddenPatterns,
        ...(blueprintChar?.forbiddenBehaviors || []),
        ...(blueprintChar?.neverSay?.map(s => `Never say: ${s}`) || []),
      ],
    });
  }

  if (!profiles.length && (input.config.characters || []).length) {
    for (const c of input.config.characters!.slice(0, 8)) {
      const name = fullName(c);
      if (!name) continue;
      profiles.push({
        name,
        role: c.role,
        traumas: [c.wound].filter(Boolean) as string[],
        fears: [],
        desires: [c.externalDesire].filter(Boolean) as string[],
        needs: [c.internalNeed].filter(Boolean) as string[],
        emotionalWounds: [c.wound].filter(Boolean) as string[],
        values: [c.strictRules].filter(Boolean) as string[],
        contradictions: [],
        speechPattern: [],
        emotionalOpenness: "guarded",
        secrets: [c.secret].filter(Boolean) as string[],
        promises: [],
        relationships: parseRelationshipMap(c.relationships, name),
        behavioralRules: c.strictRules ? [c.strictRules] : [],
        forbiddenBehaviors: [],
      });
    }
  }

  return profiles.slice(0, 10);
}

export function detectPresentCharacters(content: string, profiles: CharacterSupremacyProfile[]): CharacterSupremacyProfile[] {
  const text = content.toLowerCase();
  return profiles.filter(p => {
    const parts = p.name.toLowerCase().split(/\s+/);
    return parts.some(part => part.length > 2 && text.includes(part));
  });
}
