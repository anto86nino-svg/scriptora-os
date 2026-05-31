import type { SupremeGenreProfile } from "./types";

export function buildSupremeGenrePromptBlock(profile: SupremeGenreProfile): string {
  const r = profile.rules;
  return [
    `GENRE BRAIN SUPREME — ${profile.label} (single source of truth):`,
    "",
    "NARRATIVE RULES:",
    ...r.narrative.map(x => `• ${x}`),
    "",
    "EMOTIONAL RULES:",
    ...r.emotional.map(x => `• ${x}`),
    "",
    "DIALOGUE RULES:",
    ...r.dialogue.map(x => `• ${x}`),
    "",
    "SUBTEXT RULES:",
    ...r.subtext.map(x => `• ${x}`),
    "",
    "TENSION RULES:",
    ...r.tension.map(x => `• ${x}`),
    "",
    "MARKET RULES:",
    ...r.market.map(x => `• ${x}`),
    "",
    "READER RULES:",
    ...r.reader.map(x => `• ${x}`),
    "",
    "PREVENTION:",
    ...profile.preventionNotes.map(x => `• ${x}`),
  ].join("\n");
}

export function supremeRulesAsFlatList(profile: SupremeGenreProfile): string[] {
  const r = profile.rules;
  return [
    ...r.narrative,
    ...r.emotional,
    ...r.dialogue,
    ...r.subtext,
    ...r.tension,
    ...profile.preventionNotes,
  ];
}

export function supremeMarketRules(profile: SupremeGenreProfile): string[] {
  return [...profile.rules.market, ...profile.rules.reader];
}
