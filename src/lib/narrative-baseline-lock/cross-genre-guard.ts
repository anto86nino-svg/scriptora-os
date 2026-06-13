import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import type { BookConfig } from "@/types/book";
import type { BaselineGenreId, CrossGenreStabilityReport } from "./types";

const CROSS_GENRE_RULES: Array<{ families: string[]; rule: string }> = [
  {
    families: ["narrative", "poetry"],
    rule: "Do not inject romance slow-burn friction into thriller/gothic pacing unless the book genre is romance.",
  },
  {
    families: ["instructional", "nonfiction", "educational", "manual"],
    rule: "Do not inject mystery cliffhangers, gothic symbols, or romantic tension into instructional prose.",
  },
  {
    families: ["narrative", "poetry"],
    rule: "Memory callbacks and character tics must stay subtle — never turn literary fiction into puzzle-box exposition.",
  },
  {
    families: ["educational", "manual"],
    rule: "Keep study/manual chapters concise and executable — no cinematic scene padding or emotional melodrama.",
  },
];

export function buildCrossGenreProtectionBlock(config: BookConfig): string {
  const family = resolveBookTypeDefinition(
    config.genre,
    config.subcategory,
    config.subgenre,
    config.bookTypeId,
  ).family;

  const rules = CROSS_GENRE_RULES
    .filter((entry) => entry.families.includes(family))
    .map((entry) => `• ${entry.rule}`);

  if (!rules.length) return "";

  return `CROSS-GENRE STABILITY LOCK:
Genre: ${config.genre} · Family: ${family}
${rules.join("\n")}
A fix for one genre must NOT degrade clarity, pacing, or utility in another.`;
}

export function validateCrossGenreStability(
  current: Record<BaselineGenreId, number>,
  baseline: Record<BaselineGenreId, number>,
  maxDrop = 8,
): CrossGenreStabilityReport {
  const regressions = (Object.keys(baseline) as BaselineGenreId[])
    .map((genre) => {
      const base = baseline[genre];
      const now = current[genre] ?? 0;
      const drop = base - now;
      return { genre, baseline: base, current: now, drop };
    })
    .filter((entry) => entry.drop > maxDrop);

  return {
    stable: regressions.length === 0,
    regressions,
    message: regressions.length
      ? `Cross-genre regression detected in ${regressions.map((r) => r.genre).join(", ")}`
      : "Cross-genre stability maintained",
  };
}
