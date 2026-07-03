import type {
  CallbackAnchor,
  CharacterLiveMemory,
  EmotionalContinuityBeat,
  MemoryConsistencyV25Snapshot,
  RelationshipMemory,
  StoryPromiseItem,
  TensionMemoryState,
} from "./types";

function compactCharacterLines(characters: CharacterLiveMemory[]): string[] {
  return characters.slice(0, 6).map((character) => {
    const tics = character.recurringTics.slice(0, 2).join("; ") || character.stressPattern;
    const trust = Object.entries(character.trustLevels)
      .slice(0, 2)
      .map(([name, value]) => `${name}:${value}%`)
      .join(", ");
    return `${character.name}: fear=${character.dominantFear}; desire=${character.dominantDesire}; wound=${character.wound}; loveResistance=${character.loveResistance}; speech=${character.speechStyle}; tic=${tics}${trust ? `; trust ${trust}` : ""}`;
  });
}

function compactRelationshipLines(relationships: RelationshipMemory[]): string[] {
  return relationships.slice(0, 4).map((relationship) =>
    `${relationship.pair}: trust ${relationship.trust}%, sexualTension ${relationship.sexualTension}%, openness ${relationship.emotionalOpenness}%, conflict ${relationship.conflictLevel}, vulnerabilityFear ${relationship.fearOfVulnerability}. ${relationship.statusNote}`,
  );
}

function compactPromiseLines(promises: StoryPromiseItem[]): string[] {
  return promises
    .filter((item) => item.status !== "resolved")
    .slice(0, 6)
    .map((item) => {
      const development = item.developedIn?.length ? ` developed ch.${item.developedIn.join(",")}` : "";
      const expected = item.expectedPayoffChapter ? ` payoff target ch.${item.expectedPayoffChapter}` : "";
      return `[Ch${item.chapterIntroduced || "?"}|${item.type}|${item.status}] ${item.description}${development}${expected}`;
    });
}

function compactEmotionLines(beats: EmotionalContinuityBeat[]): string[] {
  return beats.slice(-4).map((beat) =>
    `Ch${beat.chapter}: ${beat.emotion} ${beat.intensity}/10${beat.regressionRisk ? " ⚠ regression risk" : ""}`,
  );
}

function compactCallbackLines(callbacks: CallbackAnchor[]): string[] {
  return callbacks.slice(0, 5).map((callback) =>
    `[Ch${callback.chapterIntroduced}] ${callback.character ? `${callback.character}: ` : ""}${callback.detail} → ${callback.suggestedReuse}`,
  );
}

function compactTensionLine(tension: TensionMemoryState): string {
  const parts = [
    `mode=${tension.genreMode}`,
    `slowBurn=${tension.slowBurnActive ? "ON" : "off"}`,
    `level=${tension.tensionLevel}/100`,
  ];
  if (tension.frictionSignals[0]) parts.push(`friction="${tension.frictionSignals[0]}"`);
  if (tension.distanceSignals[0]) parts.push(`distance="${tension.distanceSignals[0]}"`);
  return parts.join("; ");
}

export function buildCompressedMemorySnapshot(
  snapshot: Omit<MemoryConsistencyV25Snapshot, "compressedPromptSnapshot">,
  chapterIndex: number,
): string {
  if (snapshot.chaptersIndexed === 0) {
    return `MEMORY SNAPSHOT V2.5 — Chapter ${chapterIndex + 1}
Plant durable character wounds, relationship asymmetry, objects, and promises that must survive 10+ chapters.`;
  }

  const sections = [
    `MEMORY SNAPSHOT V2.5 — CANON LAW FOR CHAPTER ${chapterIndex + 1}`,
    `Indexed chapters: ${snapshot.chaptersIndexed}`,
    "",
    "CHARACTER LIVE MEMORY:",
    ...compactCharacterLines(snapshot.characterMemories),
    "",
    "RELATIONSHIP MEMORY:",
    compactRelationshipLines(snapshot.relationships).length
      ? compactRelationshipLines(snapshot.relationships)
      : ["Preserve relationship asymmetry already on the page — no instant reset after conflict."],
    "",
    "STORY PROMISE TRACKER:",
    compactPromiseLines(snapshot.storyPromises).length
      ? compactPromiseLines(snapshot.storyPromises)
      : ["Honor every planted mystery, object, and promise from earlier chapters."],
    "",
    "EMOTIONAL CONTINUITY:",
    compactEmotionLines(snapshot.emotionalContinuity).length
      ? compactEmotionLines(snapshot.emotionalContinuity)
      : ["Continue emotional progression — no unjustified healing between chapters."],
    "",
    "TENSION MEMORY:",
    compactTensionLine(snapshot.tensionMemory),
    "",
    "CALLBACK ENGINE:",
    compactCallbackLines(snapshot.callbacks).length
      ? compactCallbackLines(snapshot.callbacks)
      : ["Reuse strong physical tells and charged objects for invisible payoff."],
    "",
    "HARD RULES:",
    "- Characters cannot change voice, wound, or coping without on-page cause.",
    "- Relationships cannot reset trust/conflict after a fight or betrayal.",
    "- Open promises, objects, and mysteries must persist or advance deliberately.",
    "- Slow-burn tension must keep friction, distance, or ambivalence until earned release.",
  ];

  return sections.join("\n");
}
