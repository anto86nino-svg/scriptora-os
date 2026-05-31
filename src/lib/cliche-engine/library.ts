import type { ClicheCategory, ClicheEntry, ClicheSeverity } from "./types";

function entry(
  pattern: RegExp,
  label: string,
  severity: ClicheSeverity,
  category: ClicheCategory,
  rewrite?: string,
): ClicheEntry {
  return { pattern, label, severity, category, rewrite };
}

/** Curated cliché library — prevention + pre-delivery interception */
export const CLICHE_LIBRARY: ClicheEntry[] = [
  // Motivation / Self Help — CRITICAL
  entry(/\bbelieve in yourself\b/gi, "Believe in yourself", "CRITICAL", "Motivation", "trust the work you have already done"),
  entry(/\beverything happens for a reason\b/gi, "Everything happens for a reason", "CRITICAL", "Self Help", "some outcomes stay unexplained"),
  entry(/\bthe crack is where the light gets in\b/gi, "The crack is where the light gets in", "CRITICAL", "Self Help", "the fracture became the opening"),
  entry(/\btrust the process\b/gi, "Trust the process", "HIGH", "Self Help", "stay with the steps even when progress feels invisible"),
  entry(/\byou are enough\b/gi, "You are enough", "HIGH", "Self Help", "you do not need permission to begin"),
  entry(/\bstep out of your comfort zone\b/gi, "Step out of your comfort zone", "HIGH", "Motivation", "do the thing that makes your hands shake"),
  entry(/\bthe only thing standing in your way is you\b/gi, "The only thing standing in your way is you", "CRITICAL", "Motivation", "the obstacle was closer than it looked"),
  entry(/\bunlock your potential\b/gi, "Unlock your potential", "HIGH", "Self Help", "build capacity through repetition"),
  entry(/\bmanifest your dreams\b/gi, "Manifest your dreams", "CRITICAL", "Self Help", "name what you want and work backward"),
  entry(/\bhow to overcome fear\b/gi, "How to overcome fear", "MEDIUM", "Self Help"),

  // Character Emotion — HIGH/CRITICAL
  entry(/\bi finally understood who i was\b/gi, "I finally understood who I was", "CRITICAL", "Character Emotion", "something in me settled without a speech"),
  entry(/\ba weight lifted off (?:my|her|his|their) shoulders\b/gi, "A weight lifted off shoulders", "HIGH", "Character Emotion", "the tension in my chest loosened"),
  entry(/\btears streamed down (?:my|her|his|their) face\b/gi, "Tears streamed down face", "HIGH", "Character Emotion", "my eyes burned before I could stop them"),
  entry(/\bmy heart skipped a beat\b/gi, "My heart skipped a beat", "MEDIUM", "Character Emotion", "my pulse stuttered"),
  entry(/\bi couldn't help but feel\b/gi, "I couldn't help but feel", "HIGH", "Character Emotion"),
  entry(/\bdeep down,? (?:i|she|he|they) knew\b/gi, "Deep down, knew", "HIGH", "Character Emotion", "some part of me had known"),
  entry(/\ba storm raged inside (?:me|her|him|them)\b/gi, "Storm raged inside", "HIGH", "Character Emotion", "conflict tightened in my ribs"),

  // Ending — CRITICAL
  entry(/\bit was all worth it\b/gi, "It was all worth it", "CRITICAL", "Ending", "the cost still showed, but I would choose it again"),
  entry(/\band they lived happily ever after\b/gi, "Happily ever after", "CRITICAL", "Ending"),
  entry(/\bin the end,? (?:it|everything) (?:all )?worked out\b/gi, "In the end, it worked out", "CRITICAL", "Ending", "the ending left one thread loose"),
  entry(/\bthe journey had just begun\b/gi, "The journey had just begun", "HIGH", "Ending", "one door closed; another had no handle yet"),
  entry(/\bonly time would tell\b/gi, "Only time would tell", "HIGH", "Ending", "we would know soon enough"),

  // Dialogue — HIGH
  entry(/\bwe need to talk\b/gi, "We need to talk", "MEDIUM", "Dialogue", "we need five minutes without an audience"),
  entry(/\bi never meant to hurt you\b/gi, "I never meant to hurt you", "HIGH", "Dialogue", "I did not think it would land like that"),
  entry(/\bit'?s not what it looks like\b/gi, "It's not what it looks like", "HIGH", "Dialogue", "you're reading the wrong scene"),
  entry(/\byou don'?t understand\b/gi, "You don't understand", "MEDIUM", "Dialogue"),
  entry(/\bwe're not so different\b/gi, "We're not so different", "HIGH", "Dialogue", "we want the same thing from opposite sides"),

  // Romance — HIGH
  entry(/\b(?:he|she|they) took my breath away\b/gi, "Took my breath away", "HIGH", "Romance", "the air thinned when they looked at me"),
  entry(/\b(?:our|their) souls were intertwined\b/gi, "Souls intertwined", "CRITICAL", "Romance"),
  entry(/\blove (?:will|would) find a way\b/gi, "Love will find a way", "CRITICAL", "Romance"),
  entry(/\b(?:he|she|they) was my everything\b/gi, "Was my everything", "CRITICAL", "Romance", "I had built too much of my life around them"),
  entry(/\bwhy (?:does|did) (?:he|she|they) avoid me\b/gi, "Why does he avoid me", "LOW", "Romance"),

  // Fantasy — HIGH
  entry(/\bthe chosen one\b/gi, "The chosen one", "HIGH", "Fantasy", "the one the prophecy named"),
  entry(/\bancient evil\b/gi, "Ancient evil", "HIGH", "Fantasy", "something older than the kingdom"),
  entry(/\bthe forbidden seal\b/gi, "The forbidden seal", "LOW", "Fantasy"),
  entry(/\bdark magic (?:surged|awakened|stirred)\b/gi, "Dark magic surged", "HIGH", "Fantasy", "the ward buckled"),
  entry(/\bprophecy (?:had|has) foretold\b/gi, "Prophecy foretold", "HIGH", "Fantasy", "the old texts had warned"),

  // Thriller — MEDIUM/HIGH
  entry(/\bwho killed\b/gi, "Who killed", "LOW", "Thriller"),
  entry(/\bthe killer was closer than (?:anyone|they) thought\b/gi, "Killer closer than thought", "HIGH", "Thriller", "the threat had been in the room"),
  entry(/\btime was running out\b/gi, "Time was running out", "HIGH", "Thriller", "the deadline moved closer"),
  entry(/\bno one was who they seemed\b/gi, "No one was who they seemed", "HIGH", "Thriller", "every alibi had a seam"),

  // Business — HIGH
  entry(/\bthink outside the box\b/gi, "Think outside the box", "CRITICAL", "Business", "question the default workflow"),
  entry(/\blow-hanging fruit\b/gi, "Low-hanging fruit", "HIGH", "Business", "the quickest win on the board"),
  entry(/\bsynerg(?:y|ize)\b/gi, "Synergy", "HIGH", "Business", "combined leverage"),
  entry(/\bmove the needle\b/gi, "Move the needle", "HIGH", "Business", "change the metric that mattered"),
  entry(/\bdisrupt(?:ion|ive)?\b/gi, "Disrupt", "MEDIUM", "Business"),
];

export function getClichePreventionBlock(categories?: ClicheCategory[]): string {
  const blocked = CLICHE_LIBRARY.filter(
    e => e.severity === "CRITICAL" || e.severity === "HIGH",
  )
    .filter(e => !categories?.length || categories.includes(e.category))
    .slice(0, 18)
    .map(e => `• NEVER: "${e.label}"`);

  return [
    "CLICHÉ PREVENTION (write fresh prose — these phrases are forbidden):",
    ...blocked,
  ].join("\n");
}
