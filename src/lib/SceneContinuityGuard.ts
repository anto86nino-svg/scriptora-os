import type { Chapter } from "@/types/book";

type SceneBeat = { id: string; label: string; pattern: RegExp };

const SCENE_BEATS: SceneBeat[] = [
  { id: "fear-confession", label: "fear confession", pattern: /\b(ho paura|paura di perder\w*|afraid|scared to lose|fear of losing)\b/i },
  { id: "trauma-dump", label: "trauma explanation", pattern: /\b(trauma|moglie morta|marito morto|wife died|husband died|non ne ho mai parlato|never told anyone)\b/i },
  { id: "one-day-at-a-time", label: "one day at a time promise", pattern: /\b(un giorno alla volta|one day at a time)\b/i },
  { id: "tearful-embrace", label: "tearful embrace", pattern: /\b(abbracci[òo]|embraced|held (?:her|him|them)).{0,90}\b(lacrime|pians|tears|cried)\b/i },
  { id: "intimate-breakfast", label: "intimate breakfast", pattern: /\b(colazione|caff[eè]|breakfast|coffee)\b.{0,100}\b(insieme|kitchen|cucina|together)\b/i },
  { id: "home-feeling", label: "feeling at home", pattern: /\b(mi sento a casa|felt like home|feels like home)\b/i },
  { id: "leave-or-stay", label: "leave-or-stay hesitation", pattern: /\b(scapp|restare|resta|andar via|leave|stay|walk away|run away)\b/i },
];

export function detectRecentSceneBeats(chapters: Array<Pick<Chapter, "content">> = []): string[] {
  const recentText = chapters.slice(-3).map((chapter) => chapter.content || "").join("\n");
  return SCENE_BEATS.filter((beat) => beat.pattern.test(recentText)).map((beat) => beat.label);
}

export function buildSceneContinuityPromptBlock(chapters: Array<Pick<Chapter, "content">> = []): string {
  const usedBeats = detectRecentSceneBeats(chapters);
  if (!usedBeats.length) return "";

  return `SCENE CONTINUITY GUARD — RECENTLY USED EMOTIONAL BEATS:\n${usedBeats.map((beat) => `- ${beat}`).join("\n")}\n\nDo NOT replay these beats with different furniture, locations, or wording. If one must echo, convert it into a NEW consequence, decision, relationship shift, or external action. Give this scene ONE dominant dramatic center. Emotion must move the story forward.`;
}
