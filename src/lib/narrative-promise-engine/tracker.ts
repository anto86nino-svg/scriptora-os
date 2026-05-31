import type { Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import type { NarrativePromise, NarrativePromiseRegistry, PromiseDetectionInput, PromiseStatus } from "./types";

const PROMISE_PATTERNS: Array<{ pattern: RegExp; genreHint: string; label: (match: string) => string }> = [
  {
    pattern: /\b(?:the )?forbidden seal\b/gi,
    genreHint: "Fantasy",
    label: () => "Il sigillo proibito",
  },
  {
    pattern: /\bwho (?:killed|murdered)\s+([A-Z][a-z]+)\b/g,
    genreHint: "Thriller",
    label: m => `Chi ha ucciso ${m.match(/\b([A-Z][a-z]+)\b/)?.[1] || "la vittima"}?`,
  },
  {
    pattern: /\bwhy (?:does|did|would) (?:he|she|they)\s+avoid\b/gi,
    genreHint: "Romance",
    label: () => "Perché lui la evita?",
  },
  {
    pattern: /\bhow to (?:overcome|face|conquer)\s+(?:fear|anxiety|doubt)\b/gi,
    genreHint: "Self Help",
    label: () => "Come superare la paura?",
  },
  {
    pattern: /\b(?:must|will have to|dovrà|promett(?:e|o))\s+[^.!?]{8,80}/gi,
    genreHint: "General",
    label: m => m[0].slice(0, 72),
  },
  {
    pattern: /\b(?:secret|segreto|mystery|mistero)\s+(?:of|about|di|del|della)\s+[^.!?]{4,60}/gi,
    genreHint: "Thriller",
    label: m => m[0].slice(0, 72),
  },
  {
    pattern: /\b(?:before|entro|by) (?:midnight|dawn|tomorrow|domani|fine settimana)[^.!?]{0,40}/gi,
    genreHint: "Thriller",
    label: m => m[0].slice(0, 72),
  },
];

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function detectNewPromises(content: string, chapterIndex: number, genre?: string): NarrativePromise[] {
  const found: NarrativePromise[] = [];
  const seen = new Set<string>();

  for (const rule of PROMISE_PATTERNS) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.pattern.exec(content)) !== null) {
      const label = rule.label(match[0]);
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (genre && rule.genreHint !== "General" && !genre.toLowerCase().includes(rule.genreHint.toLowerCase().split(" ")[0])) {
        // still allow cross-genre detection for explicit patterns
      }
      found.push({
        id: `promise-${chapterIndex}-${found.length}`,
        label,
        genreHint: rule.genreHint,
        status: "OPEN",
        introducedChapter: chapterIndex + 1,
        lastTouchedChapter: chapterIndex + 1,
        excerpt: match[0].slice(0, 120),
      });
    }
  }

  return found.slice(0, 8);
}

function resolveStatus(promise: NarrativePromise, content: string, chapterIndex: number): PromiseStatus {
  const fragment = promise.label.toLowerCase().slice(0, 24);
  const corpus = content.toLowerCase();
  const touched = corpus.includes(fragment) || corpus.includes(promise.excerpt.toLowerCase().slice(0, 20));

  const payoffSignals = /\b(revealed|finally|discovered|understood|paid off|risolto|scoperto|confess(?:ed|ò))\b/i.test(content);
  const brokenSignals = /\b(forgot|never mentioned|impossible|contradict|broken promise|dimenticato)\b/i.test(content);

  if (brokenSignals && promise.introducedChapter < chapterIndex + 1) return "BROKEN";
  if (payoffSignals && touched) return "RESOLVED";
  if (touched && chapterIndex + 1 > promise.introducedChapter) return "PARTIAL";
  if (chapterIndex + 1 - promise.introducedChapter > 4 && !touched) return "BROKEN";
  return promise.status;
}

export function trackNarrativePromises(input: PromiseDetectionInput): NarrativePromiseRegistry {
  const previous = input.previousRegistry?.promises || [];
  const detected = detectNewPromises(input.content, input.chapterIndex, input.genre);

  const merged = new Map<string, NarrativePromise>();
  for (const p of previous) merged.set(p.id, { ...p });
  for (const p of detected) {
    const existing = [...merged.values()].find(v => v.label.toLowerCase() === p.label.toLowerCase());
    if (existing) {
      merged.set(existing.id, {
        ...existing,
        lastTouchedChapter: input.chapterIndex + 1,
        excerpt: p.excerpt || existing.excerpt,
      });
    } else {
      merged.set(p.id, p);
    }
  }

  const promises = [...merged.values()].map(p => ({
    ...p,
    status: resolveStatus(p, input.content, input.chapterIndex),
    lastTouchedChapter: input.content.toLowerCase().includes(p.excerpt.toLowerCase().slice(0, 16))
      ? input.chapterIndex + 1
      : p.lastTouchedChapter,
  }));

  const openCount = promises.filter(p => p.status === "OPEN" || p.status === "PARTIAL").length;
  const brokenCount = promises.filter(p => p.status === "BROKEN").length;
  const resolvedCount = promises.filter(p => p.status === "RESOLVED").length;
  const integrityScore = promises.length
    ? clamp100(100 - brokenCount * 22 - openCount * 4 + resolvedCount * 6)
    : 100;

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    promises: promises.slice(0, 20),
    openCount,
    brokenCount,
    integrityScore,
  };
}

export function buildPromiseRegistryFromChapters(
  chapters: Chapter[],
  genre?: string,
  longBookMemory?: LongBookMemorySnapshot,
): NarrativePromiseRegistry {
  let registry: NarrativePromiseRegistry | undefined;

  chapters.forEach((chapter, index) => {
    registry = trackNarrativePromises({
      content: chapter.content,
      chapterIndex: index,
      genre,
      previousRegistry: registry,
    });
  });

  if (longBookMemory?.promisePayoffs?.length) {
    const extra: NarrativePromise[] = longBookMemory.promisePayoffs.map((item, i) => ({
      id: `lbm-${i}`,
      label: item.promise.slice(0, 80),
      genreHint: "Memory",
      status: item.status === "paid" ? "RESOLVED" : item.status === "overdue" ? "BROKEN" : "OPEN",
      introducedChapter: item.chapterIntroduced,
      lastTouchedChapter: item.chapterIntroduced,
      excerpt: item.promise.slice(0, 80),
    }));
    registry = trackNarrativePromises({
      content: chapters.at(-1)?.content || "",
      chapterIndex: Math.max(0, chapters.length - 1),
      genre,
      previousRegistry: {
        version: 1,
        updatedAt: new Date().toISOString(),
        promises: [...(registry?.promises || []), ...extra].slice(0, 20),
        openCount: 0,
        brokenCount: 0,
        integrityScore: registry?.integrityScore || 100,
      },
    });
  }

  return (
    registry || {
      version: 1,
      updatedAt: new Date().toISOString(),
      promises: [],
      openCount: 0,
      brokenCount: 0,
      integrityScore: 100,
    }
  );
}
