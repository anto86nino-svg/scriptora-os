import type {
  BlueprintIntegrity,
  BlueprintIntegrityCharacterMemory,
  BookBlueprint,
  BookChapterOutline,
  BookConfig,
  BookSubchapterOutline,
} from "@/types/book";

export const BLUEPRINT_INTEGRITY_STORAGE_KEY = "scriptora-blueprint-integrity-enabled";

type StringRecord = Record<string, string | string[]>;

function valueToString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToString).filter(Boolean).join("; ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => `${key}: ${valueToString(val)}`)
      .filter((line) => line.trim().length > 0)
      .join("; ");
  }
  return "";
}

function valueToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(valueToString).map((item) => item.trim()).filter(Boolean);
  const single = valueToString(value);
  return single ? [single] : [];
}

function pick(source: any, keys: string[]): unknown {
  for (const key of keys) {
    if (source && source[key] != null) return source[key];
  }
  return undefined;
}

function normalizeRecord(source: unknown, fallback: StringRecord): StringRecord {
  if (!source || typeof source !== "object" || Array.isArray(source)) return fallback;
  const result: StringRecord = { ...fallback };
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      const list = valueToStringArray(value);
      if (list.length) result[key] = list;
    } else {
      const text = valueToString(value);
      if (text) result[key] = text;
    }
  }
  return result;
}

function normalizeCharacterMemory(source: unknown, config: BookConfig): BlueprintIntegrityCharacterMemory[] {
  const rawCharacters = Array.isArray(source) ? source : [];
  const fromIntegrity = rawCharacters
    .map((item: any) => ({
      canonicalName: valueToString(pick(item, ["canonicalName", "name", "fullName"])),
      role: valueToString(item?.role),
      age: valueToString(item?.age),
      physicalPresence: valueToString(pick(item, ["physicalPresence", "physicalDescription", "presence"])),
      emotionalWounds: valueToString(pick(item, ["emotionalWounds", "wound", "coreWound"])),
      coreDesire: valueToString(pick(item, ["coreDesire", "externalDesire", "desire"])),
      coreFear: valueToString(pick(item, ["coreFear", "fear"])),
      internalContradiction: valueToString(pick(item, ["internalContradiction", "contradiction"])),
      personalityProfile: valueToString(pick(item, ["personalityProfile", "personality"])),
      speechPattern: valueToString(pick(item, ["speechPattern", "speech"])),
      vocabularyStyle: valueToString(pick(item, ["vocabularyStyle", "vocabulary"])),
      emotionalOpennessLevel: valueToString(pick(item, ["emotionalOpennessLevel", "openness"])),
      trustLevel: valueToString(item?.trustLevel),
      loveLanguage: valueToString(item?.loveLanguage),
      angerStyle: valueToString(item?.angerStyle),
      lieStyle: valueToString(item?.lieStyle),
      traumaMarkers: valueToString(item?.traumaMarkers),
      bodyLanguage: valueToString(item?.bodyLanguage),
      habitsAndRecurringGestures: valueToString(pick(item, ["habitsAndRecurringGestures", "habits", "gestures"])),
      relationshipMap: valueToString(pick(item, ["relationshipMap", "relationships"])),
      characterArc: valueToString(item?.characterArc),
      forbiddenBehaviors: valueToStringArray(pick(item, ["forbiddenBehaviors", "forbidden"])),
      neverSay: valueToStringArray(pick(item, ["neverSay", "whatThisCharacterWouldNeverSay"])),
      secretNeed: valueToString(pick(item, ["secretNeed", "whatThisCharacterSecretlyNeeds", "internalNeed"])),
    }))
    .filter((character) => character.canonicalName);

  if (fromIntegrity.length) return fromIntegrity;

  return (config.characters || [])
    .map((character) => ({
      canonicalName: [character.name, character.surname].filter(Boolean).join(" ").trim(),
      role: character.role || "not specified",
      age: character.age || "not specified",
      physicalPresence: character.physicalDescription || "not specified",
      emotionalWounds: character.wound || "not specified",
      coreDesire: character.externalDesire || "not specified",
      secretNeed: character.internalNeed || "not specified",
      personalityProfile: character.personality || "not specified",
      relationshipMap: character.relationships || "not specified",
      forbiddenBehaviors: [character.strictRules || "Never rename or replace this character."],
      neverSay: ["Anything that contradicts their established wound, desire, role, or relationship state."],
    }))
    .filter((character) => character.canonicalName);
}

export function isBlueprintIntegrityEnabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_BLUEPRINT_INTEGRITY === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(BLUEPRINT_INTEGRITY_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setBlueprintIntegrityEnabled(enabled: boolean) {
  try {
    localStorage.setItem(BLUEPRINT_INTEGRITY_STORAGE_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-blueprint-integrity-change"));
  } catch {
    // Storage can be unavailable; generation should continue.
  }
}

export function normalizeBlueprintIntegrity(
  raw: unknown,
  config: BookConfig,
  chapterOutlines: BookChapterOutline[] = [],
): BlueprintIntegrity {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const bookCoreFallback: StringRecord = {
    title: config.title,
    subtitle: config.subtitle,
    genre: config.genre,
    subgenre: config.subcategory || "not specified",
    narrativePromise: config.subtitle || config.title,
    emotionalPromise: config.tone,
    coreTheme: chapterOutlines[0]?.summary || "not specified",
    coreFear: "defined by the protagonist's wound and the genre promise",
    coreDesire: "defined by the protagonist's external desire and reader fantasy",
    readerFantasy: config.category || config.genre,
    tone: config.tone,
    atmosphere: config.tone,
    writingStyle: config.authorStyle,
    emotionalDensity: "genre-appropriate, controlled, never repetitive",
    violenceLevel: "genre-appropriate",
    spiceRomanceLevel: String(config.genre).includes("romance") ? "slow-burn tension, no instant payoff" : "only if genre-relevant",
    endingDirection: chapterOutlines.at(-1)?.summary || "pay off the central promise without betraying canon",
    targetAudience: config.category || "not specified",
    bestsellerPositioning: `${config.genre} / ${config.subcategory || config.category || "general"}`,
  };

  return {
    bookCoreDNA: normalizeRecord(pick(source, ["bookCoreDNA", "book_core_dna", "coreDNA"]), bookCoreFallback),
    worldLoreFoundation: normalizeRecord(pick(source, ["worldLoreFoundation", "world_lore_foundation", "worldAndLore"]), {
      worldRules: "Preserve every established rule. Do not invent contradictions to make prose prettier.",
      socialStructure: "Maintain the hierarchy implied by genre, setting, and previous chapters.",
      geography: "Locations are immutable once established.",
      politicalTensions: "Escalate existing tensions before adding new ones.",
      religionsBeliefs: "Keep beliefs internally coherent.",
      technologyOrMagicSystems: "Power systems must have limits, cost, and continuity.",
      forbiddenElements: "No random lore mutations, no unexplained new powers, no renamed places.",
      historicalScars: "Past wounds must keep consequences.",
      culturalTensions: "Use culture through behavior and conflict, not exposition dumps.",
      environmentalTone: config.tone,
      symbolicRecurringElements: "Repeat symbols with variation and purpose only.",
    }),
    characterMemoryEngine: normalizeCharacterMemory(pick(source, ["characterMemoryEngine", "characters", "character_memory_engine"]), config),
    structuralStoryArchitecture: normalizeRecord(pick(source, ["structuralStoryArchitecture", "storyArchitecture", "structural_story_architecture"]), {
      actStructure: "Opening pressure, rising complication, midpoint shift, escalation, final payoff.",
      narrativeEscalation: "Every chapter changes the situation and raises the cost.",
      emotionalEscalation: "Growth is gradual. No emotional teleportation.",
      midpointShift: "A truth, cost, betrayal, or reversal changes how the book must be read.",
      characterReversals: "Reversals must emerge from psychology, not convenience.",
      betrayals: "Betrayals require setup and aftermath.",
      tensionSpikes: "One dominant spike per chapter; avoid reveal overload.",
      quietMoments: "Quiet scenes must reveal pressure, not stall momentum.",
      setupsPayoffs: "Every setup must be tracked until payoff or intentional subversion.",
      cliffhangers: "Use unanswered consequence, not random shock.",
      revelationTiming: "Prefer questions before answers.",
      finalPayoffStrategy: "Pay off theme through character choice and consequence.",
    }),
    relationshipTensionEngine: normalizeRecord(pick(source, ["relationshipTensionEngine", "relationship_tension_engine", "relationships"]), {
      attraction: "Build through behavior, risk, and restraint.",
      resistance: "Resistance must come from fear, wound, status, loyalty, or cost.",
      trustEvolution: "Trust rises in steps and can regress after pressure.",
      emotionalDependency: "Show through choices, not declarations.",
      jealousy: "Use only when earned by the relationship map.",
      vulnerability: "Vulnerability arrives partially, never as instant therapy speech.",
      powerImbalance: "Acknowledge cost and agency.",
      conflictChemistry: "Conflict should reveal desire and fear at the same time.",
      emotionalDistance: "Distance changes physically before it changes verbally.",
      unresolvedTension: "Protect longing until payoff is earned.",
      emotionalPayoffTiming: "Delay resolution; aftermath matters.",
    }),
    canonProtectionLayer: {
      immutableCanonRules: valueToStringArray(pick(source, ["immutableCanonRules", "canonProtectionLayer"])).length
        ? valueToStringArray(pick(source, ["immutableCanonRules", "canonProtectionLayer"]))
        : [
            "Names, roles, places, timeline facts, relationships, physical descriptions, lore rules and power systems are immutable after establishment.",
            "Canon consistency outranks beautiful prose, dramatic convenience, and new ideas.",
            "Every rewrite must preserve narrative identity, factual continuity, and reveal order.",
          ],
      forbiddenMutations: valueToStringArray(pick(source, ["forbiddenMutations", "forbidden_mutations"])).length
        ? valueToStringArray(pick(source, ["forbiddenMutations", "forbidden_mutations"]))
        : ["renaming characters", "changing wounds", "changing relationship status without scene cause", "adding powers without cost", "moving reveals earlier for drama"],
      priorityOrder: valueToStringArray(pick(source, ["priorityOrder", "priority_order"])).length
        ? valueToStringArray(pick(source, ["priorityOrder", "priority_order"]))
        : ["canon", "character psychology", "emotional continuity", "genre promise", "prose beauty"],
    },
    narrativeImmersionRules: {
      prioritize: valueToStringArray(pick(source, ["prioritize", "narrativeImmersionRules"])).length
        ? valueToStringArray(pick(source, ["prioritize", "narrativeImmersionRules"]))
        : ["subtext", "emotional realism", "sensory immersion", "imperfect behavior", "tension", "silence", "restraint", "psychological realism", "cinematic pacing"],
      avoid: valueToStringArray(pick(source, ["avoid", "avoidRules"])).length
        ? valueToStringArray(pick(source, ["avoid", "avoidRules"]))
        : ["repetitive metaphors", "overexplained emotions", "AI-perfect dialogue", "poetic overload", "generic reactions", "exposition dumps"],
      sceneLaws: valueToStringArray(pick(source, ["sceneLaws", "scene_laws"])).length
        ? valueToStringArray(pick(source, ["sceneLaws", "scene_laws"]))
        : ["Every scene needs desire, obstacle, tension, choice, and consequence.", "Every continuation must feel written by the same invisible mind."],
    },
  };
}

export function normalizeChapterOutlineExtras(item: any): Partial<BookChapterOutline> {
  const canonNotes = valueToStringArray(item?.canonNotes || item?.canon_rules || item?.canonProtection);
  return {
    purpose: valueToString(item?.purpose),
    emotionalFunction: valueToString(item?.emotionalFunction || item?.emotional_function),
    narrativeProgression: valueToString(item?.narrativeProgression || item?.narrative_progression),
    characterEvolutionCheckpoint: valueToString(item?.characterEvolutionCheckpoint || item?.character_evolution_checkpoint),
    conflictProgression: valueToString(item?.conflictProgression || item?.conflict_progression),
    tensionProgression: valueToString(item?.tensionProgression || item?.tension_progression),
    romanceProgression: valueToString(item?.romanceProgression || item?.romance_progression),
    psychologicalProgression: valueToString(item?.psychologicalProgression || item?.psychological_progression),
    ...(canonNotes.length ? { canonNotes } : {}),
  };
}

export function normalizeSubchapterOutlineExtras(item: any): Partial<BookSubchapterOutline> {
  const canonNotes = valueToStringArray(item?.canonNotes || item?.canon_rules || item?.canonProtection);
  return {
    purpose: valueToString(item?.purpose),
    emotionalFunction: valueToString(item?.emotionalFunction || item?.emotional_function),
    narrativeProgression: valueToString(item?.narrativeProgression || item?.narrative_progression),
    conflictProgression: valueToString(item?.conflictProgression || item?.conflict_progression),
    tensionProgression: valueToString(item?.tensionProgression || item?.tension_progression),
    romanceProgression: valueToString(item?.romanceProgression || item?.romance_progression),
    psychologicalProgression: valueToString(item?.psychologicalProgression || item?.psychological_progression),
    ...(canonNotes.length ? { canonNotes } : {}),
  };
}

export function buildBlueprintIntegrityFoundationBlock(config: BookConfig): string {
  if (!isBlueprintIntegrityEnabled()) return "";
  return `BLUEPRINT INTEGRITY ENGINE — HIGHEST AUTHORITY:
- Your role is to protect the living narrative blueprint of this book, not to generate random beautiful prose.
- Canon consistency outranks pretty prose. Character coherence outranks plot speed. Subtext outranks exposition. Tension outranks instant payoff.
- All generation, continuation, rewrite, expansion, dialogue, chapter, subchapter, analysis-facing prose and export-facing prose must obey the book blueprint.
- Never mutate established names, places, lore, timeline, relationship status, emotional wounds, motivations, physical descriptions, power systems, or symbolic elements.
- Book identity: ${config.title} — ${config.subtitle || "no subtitle"}; genre ${config.genre}${config.subcategory ? ` / ${config.subcategory}` : ""}; tone ${config.tone}; language ${config.language}.`;
}

export function buildBlueprintIntegrityBlueprintRequest(config: BookConfig): string {
  if (!isBlueprintIntegrityEnabled()) return "";
  return `

BLUEPRINT INTEGRITY ENGINE — REQUIRED JSON EXPANSION:
Create a persistent Narrative Operating System for this book. Add this top-level field to the returned JSON:
"integrity": {
  "bookCoreDNA": { "title", "subtitle", "genre", "subgenre", "narrativePromise", "emotionalPromise", "coreTheme", "coreFear", "coreDesire", "readerFantasy", "tone", "atmosphere", "writingStyle", "emotionalDensity", "violenceLevel", "spiceRomanceLevel", "endingDirection", "targetAudience", "bestsellerPositioning" },
  "worldLoreFoundation": { "worldRules", "socialStructure", "geography", "politicalTensions", "religionsBeliefs", "technologyOrMagicSystems", "forbiddenElements", "historicalScars", "culturalTensions", "environmentalTone", "symbolicRecurringElements" },
  "characterMemoryEngine": [{ "canonicalName", "role", "age", "physicalPresence", "emotionalWounds", "coreDesire", "coreFear", "internalContradiction", "personalityProfile", "speechPattern", "vocabularyStyle", "emotionalOpennessLevel", "trustLevel", "loveLanguage", "angerStyle", "lieStyle", "traumaMarkers", "bodyLanguage", "habitsAndRecurringGestures", "relationshipMap", "characterArc", "forbiddenBehaviors", "neverSay", "secretNeed" }],
  "structuralStoryArchitecture": { "actStructure", "narrativeEscalation", "emotionalEscalation", "midpointShift", "characterReversals", "betrayals", "tensionSpikes", "quietMoments", "setupsPayoffs", "cliffhangers", "revelationTiming", "finalPayoffStrategy" },
  "relationshipTensionEngine": { "attraction", "resistance", "trustEvolution", "emotionalDependency", "jealousy", "vulnerability", "powerImbalance", "conflictChemistry", "emotionalDistance", "unresolvedTension", "emotionalPayoffTiming" },
  "canonProtectionLayer": { "immutableCanonRules": [], "forbiddenMutations": [], "priorityOrder": [] },
  "narrativeImmersionRules": { "prioritize": [], "avoid": [], "sceneLaws": [] }
}

Also enrich EVERY chapterOutlines item with:
"purpose", "emotionalFunction", "narrativeProgression", "characterEvolutionCheckpoint", "conflictProgression", "tensionProgression", "romanceProgression", "psychologicalProgression", "canonNotes".
${config.subchaptersEnabled ? "Every subchapter must also include purpose, emotionalFunction, narrativeProgression, conflictProgression, tensionProgression, romanceProgression, psychologicalProgression and canonNotes." : ""}

Keep JSON compact but specific. No shallow summaries. This blueprint is the canon law for the entire book.`;
}

function formatRecord(label: string, record: StringRecord, limit = 12): string {
  const rows = Object.entries(record)
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : String(value || "").trim())
    .slice(0, limit)
    .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join("; ") : value}`);
  return rows.length ? `${label}:
${rows.join("\n")}` : "";
}

function formatCharacters(characters: BlueprintIntegrityCharacterMemory[]): string {
  if (!characters.length) return "";
  return `CHARACTER MEMORY ENGINE:
${characters.slice(0, 8).map((character) => {
    const rules = [
      character.role && `role=${character.role}`,
      character.emotionalWounds && `wound=${character.emotionalWounds}`,
      character.coreDesire && `desire=${character.coreDesire}`,
      character.coreFear && `fear=${character.coreFear}`,
      character.speechPattern && `speech=${character.speechPattern}`,
      character.forbiddenBehaviors?.length ? `forbidden=${character.forbiddenBehaviors.join("; ")}` : "",
      character.neverSay?.length ? `never say=${character.neverSay.join("; ")}` : "",
    ].filter(Boolean).join(" | ");
    return `- ${character.canonicalName}: ${rules || "maintain established psychology and continuity"}`;
  }).join("\n")}`;
}

function formatChapterLock(blueprint: BookBlueprint, chapterIndex?: number, subchapterIndex?: number): string {
  if (typeof chapterIndex !== "number") {
    return `CHAPTER BLUEPRINT LOCK:
${(blueprint.chapterOutlines || []).slice(0, 24).map((outline, index) => {
      const bits = [outline.summary, outline.purpose, outline.emotionalFunction, outline.tensionProgression].filter(Boolean).join(" | ");
      return `- Ch ${index + 1}: ${outline.title} — ${bits}`;
    }).join("\n")}`;
  }

  const outline = blueprint.chapterOutlines?.[chapterIndex];
  if (!outline) return "";
  const sub = typeof subchapterIndex === "number" ? outline.subchapters?.[subchapterIndex] : undefined;
  const rows = [
    `Chapter ${chapterIndex + 1}: ${outline.title}`,
    `Summary: ${outline.summary}`,
    outline.purpose && `Purpose: ${outline.purpose}`,
    outline.emotionalFunction && `Emotional function: ${outline.emotionalFunction}`,
    outline.narrativeProgression && `Narrative progression: ${outline.narrativeProgression}`,
    outline.characterEvolutionCheckpoint && `Character checkpoint: ${outline.characterEvolutionCheckpoint}`,
    outline.conflictProgression && `Conflict progression: ${outline.conflictProgression}`,
    outline.tensionProgression && `Tension progression: ${outline.tensionProgression}`,
    outline.romanceProgression && `Romance progression: ${outline.romanceProgression}`,
    outline.psychologicalProgression && `Psychological progression: ${outline.psychologicalProgression}`,
    outline.canonNotes?.length && `Canon notes: ${outline.canonNotes.join("; ")}`,
    sub && `Subchapter ${subchapterIndex! + 1}: ${sub.title} — ${sub.summary}`,
    sub?.purpose && `Subchapter purpose: ${sub.purpose}`,
    sub?.canonNotes?.length && `Subchapter canon notes: ${sub.canonNotes.join("; ")}`,
  ].filter(Boolean);
  return `ACTIVE CHAPTER BLUEPRINT LOCK:
${rows.map((row) => `- ${row}`).join("\n")}`;
}

export function buildBlueprintIntegrityRuntimeBlock(
  config: BookConfig,
  blueprint?: BookBlueprint | null,
  opts: { chapterIndex?: number; subchapterIndex?: number; compact?: boolean } = {},
): string {
  if (!isBlueprintIntegrityEnabled()) return "";
  const integrity = blueprint?.integrity || normalizeBlueprintIntegrity(null, config, blueprint?.chapterOutlines || []);
  const sections = [
    "BLUEPRINT INTEGRITY ENGINE — CANON LAW FOR THIS OUTPUT:",
    "- Canon consistency is more important than pretty prose.",
    "- Emotional realism is more important than dramatic dialogue.",
    "- Character coherence is more important than plot speed.",
    "- Subtext is more important than exposition.",
    "- Tension is more important than instant payoff.",
    "- Preserve names, places, lore, timeline, motivations, relationship status, physical descriptions, power systems and symbolic elements.",
    formatRecord("BOOK CORE DNA", integrity.bookCoreDNA, opts.compact ? 8 : 18),
    opts.compact ? "" : formatRecord("WORLD & LORE FOUNDATION", integrity.worldLoreFoundation, 14),
    formatCharacters(integrity.characterMemoryEngine),
    formatRecord("STORY ARCHITECTURE", integrity.structuralStoryArchitecture, opts.compact ? 8 : 14),
    formatRecord("RELATIONSHIP & TENSION ENGINE", integrity.relationshipTensionEngine, opts.compact ? 8 : 14),
    `CANON PROTECTION LAYER:
- Immutable: ${integrity.canonProtectionLayer.immutableCanonRules.join("; ")}
- Forbidden mutations: ${integrity.canonProtectionLayer.forbiddenMutations.join("; ")}
- Priority order: ${integrity.canonProtectionLayer.priorityOrder.join(" > ")}`,
    `NARRATIVE IMMERSION RULES:
- Prioritize: ${integrity.narrativeImmersionRules.prioritize.join("; ")}
- Avoid: ${integrity.narrativeImmersionRules.avoid.join("; ")}
- Scene laws: ${integrity.narrativeImmersionRules.sceneLaws.join("; ")}`,
    blueprint ? formatChapterLock(blueprint, opts.chapterIndex, opts.subchapterIndex) : "",
  ].filter(Boolean);
  return sections.join("\n\n");
}
