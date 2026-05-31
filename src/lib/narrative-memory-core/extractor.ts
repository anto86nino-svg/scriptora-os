import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import { buildLongBookMemory } from "@/lib/long-book-memory";
import type {
  MemoryItemKind,
  MemoryItemStatus,
  NarrativeMemoryCoreSnapshot,
  NarrativeMemoryItem,
} from "./types";
import { updateRelationshipMemory } from "./relationship-memory";

const MYSTERY_PATTERNS = [
  /\b(?:who|chi|what|cosa|why|perché|where|dove)\s+[^.!?]{8,80}\?/gi,
  /\b(?:secret|segreto|mystery|mistero|unknown|sconosciut)\b[^.!?]{0,60}/gi,
];

const SETUP_PATTERNS = [
  /\b(?:noticed|found|discovered|trovò|vide|saw)\s+[^.!?]{10,90}/gi,
  /\b(?:the|il|la)\s+[^.!?]{4,40}(?:letter|lettera|key|chiave|ring|anello|map|mappa|photo|foto)\b/gi,
];

const OBJECT_PATTERNS = [
  /\b(?:the|il|la)\s+([A-ZÀ-Ö][a-zà-ö]+(?:\s+[A-ZÀ-Ö][a-zà-ö]+)?)\s+(?:letter|lettera|key|chiave|ring|anello|knife|coltello|gun|pistola)\b/g,
];

const PLACE_PATTERNS = [
  /\b(?:at|in|a|dal|dalla)\s+(?:the\s+)?([A-ZÀ-Ö][a-zà-ö]+(?:\s+[A-ZÀ-Ö][a-zà-ö]+)?)\b/g,
];

const PROMISE_PATTERNS = [
  /\b(?:promett|promise|must|dovrà|will have to|giurò|vowed)\s+[^.!?]{8,80}/gi,
];

function extractCast(config: BookConfig, blueprint?: BookBlueprint | null): string[] {
  return [
    ...(config.characters || []).map(c => [c.name, c.surname].filter(Boolean).join(" ").trim()),
    ...(blueprint?.blueprintIntegrity?.characterMemoryEngine || []).map(c => c.canonicalName),
  ].filter(Boolean);
}

function bumpStatus(current: MemoryItemStatus, signal: "touch" | "resolve" | "break"): MemoryItemStatus {
  if (signal === "break") return "BROKEN";
  if (signal === "resolve") return "RESOLVED";
  if (current === "OPEN") return "ACTIVE";
  if (current === "ACTIVE") return "PARTIAL";
  return current;
}

function scanItems(
  text: string,
  chapterIndex: number,
  kind: MemoryItemKind,
  patterns: RegExp[],
  limit = 4,
): NarrativeMemoryItem[] {
  const items: NarrativeMemoryItem[] = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null && items.length < limit) {
      items.push({
        id: `${kind}-${chapterIndex}-${items.length}`,
        kind,
        label: match[0].slice(0, 100),
        status: "OPEN",
        introducedChapter: chapterIndex + 1,
        lastTouchedChapter: chapterIndex + 1,
        excerpt: match[0].slice(0, 120),
      });
    }
  }
  return items;
}

function mergeItems(existing: NarrativeMemoryItem[], incoming: NarrativeMemoryItem[]): NarrativeMemoryItem[] {
  const map = new Map<string, NarrativeMemoryItem>();
  for (const item of existing) map.set(item.label.toLowerCase().slice(0, 40), item);
  for (const item of incoming) {
    const key = item.label.toLowerCase().slice(0, 40);
    const prev = map.get(key);
    if (prev) {
      map.set(key, {
        ...prev,
        lastTouchedChapter: item.lastTouchedChapter,
        status: bumpStatus(prev.status, "touch"),
      });
    } else {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function resolveItemsFromCorpus(
  items: NarrativeMemoryItem[],
  corpus: string,
  lastChapter: number,
  chapters: Chapter[],
  totalChapters: number,
): NarrativeMemoryItem[] {
  const recentCorpus = chapters
    .slice(-3)
    .map(c => c.content)
    .join("\n")
    .toLowerCase();
  const allowBroken = lastChapter > totalChapters;

  return items.map(item => {
    const frag = item.label.toLowerCase().slice(0, 30);
    const touched = corpus.includes(frag);
    const touchedRecently = recentCorpus.includes(frag);
    const resolved = /\b(revealed|finally|risolto|confessed|confess|understood|capito)\b/i.test(corpus) && touched;
    const broken =
      allowBroken &&
      lastChapter - item.introducedChapter > 5 &&
      !touchedRecently &&
      !["place", "secret", "goal", "wound"].includes(item.kind);
    let status = item.status;
    if (broken) status = "BROKEN";
    else if (resolved) status = "RESOLVED";
    else if (touched && item.introducedChapter < lastChapter) status = "PARTIAL";
    else if (touched) status = "ACTIVE";
    return { ...item, status };
  });
}

export function buildNarrativeMemoryCore(input: {
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  chapters: Chapter[];
}): NarrativeMemoryCoreSnapshot {
  const chapters = input.chapters.filter(c => String(c?.content || "").trim().length > 30);
  const cast = extractCast(input.config, input.blueprint);
  const longMemory = buildLongBookMemory({
    config: input.config,
    blueprint: input.blueprint || null,
    chapters,
  });

  let items: NarrativeMemoryItem[] = [];
  let relationships = updateRelationshipMemory({ content: "", chapterIndex: 0, cast, previous: [] });

  chapters.forEach((chapter, index) => {
    const text = chapter.content;
    items = mergeItems(items, [
      ...scanItems(text, index, "promise", PROMISE_PATTERNS),
      ...scanItems(text, index, "mystery", MYSTERY_PATTERNS),
      ...scanItems(text, index, "setup", SETUP_PATTERNS),
      ...scanItems(text, index, "object", OBJECT_PATTERNS, 3),
      ...scanItems(text, index, "place", PLACE_PATTERNS, 3),
    ]);

    for (const c of input.config.characters || []) {
      const name = [c.name, c.surname].filter(Boolean).join(" ");
      if (!name) continue;
      if (c.secret && text.toLowerCase().includes(name.split(" ")[0].toLowerCase())) {
        items = mergeItems(items, [{
          id: `secret-${index}-${name}`,
          kind: "secret",
          label: `${name}: ${c.secret.slice(0, 80)}`,
          status: "ACTIVE",
          introducedChapter: index + 1,
          lastTouchedChapter: index + 1,
          relatedCharacters: [name],
        }]);
      }
      if (c.externalDesire) {
        items = mergeItems(items, [{
          id: `goal-${name}`,
          kind: "goal",
          label: `${name} goal: ${c.externalDesire.slice(0, 80)}`,
          status: "OPEN",
          introducedChapter: 1,
          lastTouchedChapter: index + 1,
          relatedCharacters: [name],
        }]);
      }
      if (c.wound) {
        items = mergeItems(items, [{
          id: `wound-${name}`,
          kind: "wound",
          label: `${name} wound: ${c.wound.slice(0, 80)}`,
          status: "ACTIVE",
          introducedChapter: 1,
          lastTouchedChapter: index + 1,
          relatedCharacters: [name],
        }]);
      }
    }

    relationships = updateRelationshipMemory({
      content: text,
      chapterIndex: index,
      cast,
      previous: relationships,
    });
  });

  for (const arc of longMemory.unresolvedArcs) {
    items = mergeItems(items, [{
      id: arc.id,
      kind: "conflict",
      label: arc.description.slice(0, 100),
      status: arc.urgency === "high" ? "ACTIVE" : "OPEN",
      introducedChapter: arc.introducedChapter,
      lastTouchedChapter: chapters.length,
    }]);
  }

  for (const seed of longMemory.foreshadowing) {
    items = mergeItems(items, [{
      id: `seed-${seed.chapter}`,
      kind: "setup",
      label: seed.seed.slice(0, 100),
      status: seed.payoffStatus === "paid" ? "RESOLVED" : seed.payoffStatus === "partial" ? "PARTIAL" : "OPEN",
      introducedChapter: seed.chapter,
      lastTouchedChapter: chapters.length,
    }]);
  }

  const corpus = chapters.map(c => c.content).join("\n").toLowerCase();
  const totalChapters = Math.max(input.config.numberOfChapters || 0, chapters.length);
  items = resolveItemsFromCorpus(items, corpus, chapters.length, chapters, totalChapters);

  const castMentioned = new Set<string>();
  chapters.slice(-3).forEach(ch => {
    cast.forEach(name => {
      if (ch.content.toLowerCase().includes(name.split(" ")[0].toLowerCase())) castMentioned.add(name);
    });
  });
  const forgottenCharacterRisk = cast.filter(name => {
    const mentionedEver = corpus.includes(name.split(" ")[0].toLowerCase());
    return mentionedEver && !castMentioned.has(name) && chapters.length >= 8;
  });

  const objectItems = items.filter(i => i.kind === "object");
  const forgottenObjectRisk = objectItems
    .filter(o => o.status === "OPEN" && chapters.length - o.introducedChapter >= 4)
    .map(o => o.label);

  const incompleteArcs = items
    .filter(i => (i.kind === "promise" || i.kind === "setup" || i.kind === "mystery") && (i.status === "OPEN" || i.status === "BROKEN"))
    .map(i => i.label.slice(0, 80));

  const brokenItems = items.filter(i => i.status === "BROKEN").length;
  const openPromises = items.filter(i => i.kind === "promise" && (i.status === "OPEN" || i.status === "ACTIVE" || i.status === "PARTIAL")).length;

  return {
    version: "scriptora-narrative-memory-core-v1",
    updatedAt: new Date().toISOString(),
    chaptersIndexed: chapters.length,
    items: items.slice(0, 60),
    relationships,
    openPromises,
    brokenItems,
    forgottenCharacterRisk,
    forgottenObjectRisk,
    incompleteArcs: incompleteArcs.slice(0, 12),
  };
}

export function buildNarrativeMemoryPromptBlock(snapshot: NarrativeMemoryCoreSnapshot): string {
  const open = snapshot.items.filter(i => i.status === "OPEN" || i.status === "ACTIVE").slice(0, 6);
  const rel = snapshot.relationships.slice(0, 4);
  const lines = [
    "NARRATIVE MEMORY CORE (full-book continuity — obey):",
    `Chapters indexed: ${snapshot.chaptersIndexed} · Open promises: ${snapshot.openPromises} · Broken: ${snapshot.brokenItems}`,
  ];
  if (open.length) {
    lines.push("", "ACTIVE MEMORY:");
    open.forEach(i => lines.push(`• [${i.kind}] ${i.label} (${i.status})`));
  }
  if (rel.length) {
    lines.push("", "RELATIONSHIPS:");
    rel.forEach(r => lines.push(
      `• ${r.characterA} ↔ ${r.characterB}: trust ${r.axes.trust}% · attraction ${r.axes.attraction}% · hostility ${r.axes.hostility}% (${r.status})`,
    ));
  }
  if (snapshot.forgottenCharacterRisk.length) {
    lines.push("", "RE-INTRODUCE (not seen recently):", ...snapshot.forgottenCharacterRisk.map(c => `• ${c}`));
  }
  if (snapshot.incompleteArcs.length) {
    lines.push("", "INCOMPLETE ARCS:", ...snapshot.incompleteArcs.slice(0, 4).map(a => `• ${a}`));
  }
  return lines.join("\n");
}
