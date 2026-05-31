import type { Chapter } from "@/types/book";
import type { MemoryItemStatus, RelationshipMemoryAxis, RelationshipMemoryLink } from "./types";

const DEFAULT_AXES: RelationshipMemoryAxis = {
  trust: 50,
  attraction: 35,
  hostility: 30,
  respect: 50,
  dependency: 25,
  jealousy: 20,
  betrayal: 10,
};

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function pairKey(a: string, b: string): string {
  return [a, b].sort((x, y) => x.localeCompare(y)).join("::");
}

function detectAxisShifts(text: string): Partial<RelationshipMemoryAxis> {
  const lower = text.toLowerCase();
  const shifts: Partial<RelationshipMemoryAxis> = {};
  if (/\b(trust|fiducia|believe|credere|ti credo)\b/.test(lower)) shifts.trust = 8;
  if (/\b(betray|tradit|lied to|mentito)\b/.test(lower)) {
    shifts.betrayal = 25;
    shifts.trust = -20;
  }
  if (/\b(kiss|bacio|desire|want|desider|attraction)\b/.test(lower)) shifts.attraction = 12;
  if (/\b(hate|odio|hostile|enemy|nemic)\b/.test(lower)) shifts.hostility = 15;
  if (/\b(respect|rispetto|admire|ammir)\b/.test(lower)) shifts.respect = 10;
  if (/\b(need you|non posso senza|depend|dipend)\b/.test(lower)) shifts.dependency = 12;
  if (/\b(jealous|gelos|envy|invid)\b/.test(lower)) shifts.jealousy = 15;
  return shifts;
}

export function updateRelationshipMemory(input: {
  content: string;
  chapterIndex: number;
  cast: string[];
  previous?: RelationshipMemoryLink[];
}): RelationshipMemoryLink[] {
  const text = input.content;
  const map = new Map<string, RelationshipMemoryLink>();

  for (const link of input.previous || []) {
    map.set(link.id, { ...link });
  }

  const present = input.cast.filter(name => text.toLowerCase().includes(name.split(" ")[0].toLowerCase()));
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = present[i];
      const b = present[j];
      const id = pairKey(a, b);
      const shifts = detectAxisShifts(text);
      const existing = map.get(id);
      const axes = { ...(existing?.axes || DEFAULT_AXES) };
      for (const [key, delta] of Object.entries(shifts) as [keyof RelationshipMemoryAxis, number][]) {
        axes[key] = clamp100(axes[key] + delta);
      }

      const status: MemoryItemStatus =
        axes.betrayal >= 60 ? "BROKEN" : axes.trust >= 70 && axes.hostility < 35 ? "PARTIAL" : "ACTIVE";

      map.set(id, {
        id,
        characterA: a,
        characterB: b,
        status,
        axes,
        lastUpdatedChapter: input.chapterIndex + 1,
        notes: existing?.notes || [],
      });
    }
  }

  return [...map.values()].slice(0, 24);
}

export function relationshipHealthScore(links: RelationshipMemoryLink[]): number {
  if (!links.length) return 75;
  const broken = links.filter(l => l.status === "BROKEN").length;
  const avgTrust = links.reduce((s, l) => s + l.axes.trust, 0) / links.length;
  return clamp100(avgTrust * 0.7 + (links.length - broken) * 8);
}
