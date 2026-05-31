import type { GenreBrainProfile } from "@/lib/GenreBrain";
import { getSupremeGenreProfile } from "./resolver";
import { supremeRulesAsFlatList } from "./prompt";

/** Merge supreme rules into legacy GenreBrain profile for Humanizer path */
export function adaptSupremeToGenreBrainProfile(
  legacy: GenreBrainProfile,
  config?: Parameters<typeof getSupremeGenreProfile>[0]["config"],
): GenreBrainProfile {
  const supreme = getSupremeGenreProfile({ config });
  const mergedNotes = [
    `[Supreme] ${supreme.label}`,
    ...supreme.preventionNotes.slice(0, 4),
    ...supremeRulesAsFlatList(supreme).slice(0, 6),
    ...legacy.notes.filter(n => !n.startsWith("[Supreme]")),
  ].slice(0, 14);

  return {
    ...legacy,
    weights: supreme.weights,
    pacingStyle: supreme.pacingStyle !== "neutral" ? supreme.pacingStyle : legacy.pacingStyle,
    notes: mergedNotes,
  };
}
