import type { NarrativePromiseRegistry } from "@/lib/narrative-promise-engine/types";
import type { NarrativeMemoryCoreSnapshot } from "./types";

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Bridge Phase B promise registry → Phase D unified memory */
export function memoryCoreToPromiseRegistry(memory: NarrativeMemoryCoreSnapshot): NarrativePromiseRegistry {
  const promises = memory.items
    .filter(i => i.kind === "promise" || i.kind === "mystery" || i.kind === "setup")
    .map(i => ({
      id: i.id,
      label: i.label,
      genreHint: i.kind,
      status: (i.status === "ACTIVE" ? "PARTIAL" : i.status) as "OPEN" | "PARTIAL" | "RESOLVED" | "BROKEN",
      introducedChapter: i.introducedChapter,
      lastTouchedChapter: i.lastTouchedChapter,
      excerpt: i.excerpt || i.label,
    }));

  const openCount = promises.filter(p => p.status === "OPEN" || p.status === "ACTIVE" || p.status === "PARTIAL").length;
  const brokenCount = promises.filter(p => p.status === "BROKEN").length;

  return {
    version: 1,
    updatedAt: memory.updatedAt,
    promises,
    openCount,
    brokenCount,
    integrityScore: clamp100(100 - brokenCount * 22 - openCount * 4),
  };
}
