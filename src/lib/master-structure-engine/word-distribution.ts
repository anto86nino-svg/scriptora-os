import type { BookSubchapterOutline, Genre } from "@/types/book";

export type SubchapterWordBudget = {
  subIndex: number;
  title: string;
  minWords: number;
  maxWords: number;
  targetWords: number;
  purpose: string;
  weight: number;
};

type GenreProfile = {
  purposes: string[];
  weights: number[];
};

const PROFILES: Partial<Record<Genre, GenreProfile>> = {
  horror: {
    purposes: ["setup", "unease", "escalation", "confrontation", "cliffhanger"],
    weights: [0.12, 0.16, 0.19, 0.26, 0.27],
  },
  thriller: {
    purposes: ["hook", "complication", "pressure", "reversal", "cliffhanger"],
    weights: [0.14, 0.18, 0.22, 0.24, 0.22],
  },
  romance: {
    purposes: ["spark", "tension", "vulnerability", "rupture", "pull"],
    weights: [0.16, 0.2, 0.22, 0.2, 0.22],
  },
  "dark-romance": {
    purposes: ["attraction", "danger", "surrender", "rupture", "obsession"],
    weights: [0.15, 0.2, 0.22, 0.21, 0.22],
  },
  fantasy: {
    purposes: ["wonder", "discovery", "stakes", "trial", "revelation"],
    weights: [0.18, 0.2, 0.2, 0.22, 0.2],
  },
  "self-help": {
    purposes: ["hook", "story", "teaching", "exercise", "retention"],
    weights: [0.15, 0.25, 0.35, 0.15, 0.1],
  },
  business: {
    purposes: ["hook", "story", "teaching", "exercise", "retention"],
    weights: [0.15, 0.2, 0.4, 0.15, 0.1],
  },
  productivity: {
    purposes: ["hook", "story", "teaching", "exercise", "retention"],
    weights: [0.15, 0.2, 0.4, 0.15, 0.1],
  },
  memoir: {
    purposes: ["scene", "reflection", "turn", "aftermath"],
    weights: [0.22, 0.28, 0.28, 0.22],
  },
  historical: {
    purposes: ["context", "event", "consequence", "meaning"],
    weights: [0.2, 0.3, 0.28, 0.22],
  },
};

const DEFAULT_PROFILE: GenreProfile = {
  purposes: ["opening", "development", "pressure", "turn", "closure"],
  weights: [0.18, 0.22, 0.22, 0.2, 0.18],
};

function interpolateWeights(base: number[], count: number): number[] {
  if (count <= 0) return [];
  if (count === base.length) return [...base];
  if (count === 1) return [1];
  const result: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const pos = (i / (count - 1)) * (base.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(base.length - 1, lo + 1);
    const t = pos - lo;
    result.push(base[lo] * (1 - t) + base[hi] * t);
  }
  const sum = result.reduce((a, b) => a + b, 0) || 1;
  return result.map((w) => w / sum);
}

function profileForGenre(genre: Genre, count: number): { purposes: string[]; weights: number[] } {
  const base = PROFILES[genre] ?? DEFAULT_PROFILE;
  const weights = interpolateWeights(base.weights, count);
  const purposes = Array.from({ length: count }, (_, i) => base.purposes[i % base.purposes.length]);
  return { purposes, weights };
}

export function distributeChapterWords(
  chapterWordTarget: number,
  subchapterOutlines: Pick<BookSubchapterOutline, "title" | "purpose">[],
  genre: Genre,
): SubchapterWordBudget[] {
  const count = Math.max(1, subchapterOutlines.length);
  const { purposes, weights } = profileForGenre(genre, count);
  const safeTarget = Math.max(400, chapterWordTarget);

  return subchapterOutlines.map((outline, subIndex) => {
    const weight = weights[subIndex] ?? 1 / count;
    const targetWords = Math.max(350, Math.round(safeTarget * weight));
    const minWords = Math.max(300, Math.round(targetWords * 0.82));
    const maxWords = Math.round(targetWords * 1.18);
    return {
      subIndex,
      title: outline.title,
      minWords,
      maxWords,
      targetWords,
      purpose: outline.purpose || purposes[subIndex] || "development",
      weight,
    };
  });
}

export function getSubchapterWordBudget(
  chapterWordTarget: number,
  subchapterOutlines: BookSubchapterOutline[],
  genre: Genre,
  subIndex: number,
): SubchapterWordBudget {
  const budgets = distributeChapterWords(chapterWordTarget, subchapterOutlines, genre);
  return budgets[subIndex] ?? {
    subIndex,
    title: subchapterOutlines[subIndex]?.title ?? "",
    minWords: Math.max(400, Math.round(chapterWordTarget * 0.2)),
    maxWords: Math.round(chapterWordTarget * 0.3),
    targetWords: Math.round(chapterWordTarget * 0.25),
    purpose: "development",
    weight: 0.25,
  };
}
