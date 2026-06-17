import type { BookDnaLock } from "./dna-lock";
import { isDnaTooDirtyToShow } from "./dna-cleaner";
import type { GuidedInterviewState } from "./types";

export type ForgeMapNodeId =
  | "idea"
  | "emotionalCore"
  | "bookDirection"
  | "readerPromise"
  | "toneExperience"
  | "structureDna"
  | "dnaLock"
  | "blueprintReady";

export type ForgeMapNodeState =
  | "empty"
  | "understanding"
  | "confirmed"
  | "clarify"
  | "locked";

export type ForgeMapNode = {
  id: ForgeMapNodeId;
  emoji: string;
  label: string;
  shortLabel: string;
  state: ForgeMapNodeState;
  hint?: string;
};

export type ForgeLiveMapSnapshot = {
  nodes: ForgeMapNode[];
  confidencePct: number;
  activeNodeId: ForgeMapNodeId;
  missingItems: string[];
  directionSummary: {
    bookLabel: string;
    center: string;
    tone: string;
    stillMissing: string[];
  };
  readyForBlueprint: boolean;
  showDirectionCard: boolean;
};

export const FORGE_MAP_NODE_ORDER: ForgeMapNodeId[] = [
  "idea",
  "emotionalCore",
  "bookDirection",
  "readerPromise",
  "toneExperience",
  "structureDna",
  "dnaLock",
  "blueprintReady",
];

const NODE_META: Record<
  ForgeMapNodeId,
  { emoji: string; label: string; shortLabel: string; completionWhisper: string }
> = {
  idea: {
    emoji: "💡",
    label: "Idea",
    shortLabel: "Idea",
    completionWhisper: "Ok. L'idea inizia a prendere forma.",
  },
  emotionalCore: {
    emoji: "❤️",
    label: "Cuore emotivo",
    shortLabel: "Cuore",
    completionWhisper: "Ok. Sto iniziando a capire davvero il cuore emotivo del libro.",
  },
  bookDirection: {
    emoji: "📚",
    label: "Direzione libro",
    shortLabel: "Direzione",
    completionWhisper: "La direzione editoriale si sta chiarendo.",
  },
  readerPromise: {
    emoji: "👥",
    label: "Promessa lettore",
    shortLabel: "Promessa",
    completionWhisper: "Capisco cosa il lettore dovrebbe portarsi a casa.",
  },
  toneExperience: {
    emoji: "🎭",
    label: "Tono & esperienza",
    shortLabel: "Tono",
    completionWhisper: "Il tono e l'esperienza di lettura stanno emergendo.",
  },
  structureDna: {
    emoji: "🧠",
    label: "DNA struttura",
    shortLabel: "Struttura",
    completionWhisper: "La struttura narrativa prende consistenza.",
  },
  dnaLock: {
    emoji: "🧬",
    label: "DNA Lock",
    shortLabel: "DNA",
    completionWhisper: "Il DNA del libro è quasi pronto per il lock.",
  },
  blueprintReady: {
    emoji: "📖",
    label: "Blueprint",
    shortLabel: "Blueprint",
    completionWhisper: "Il blueprint può aprirsi.",
  },
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strength(value: unknown, min = 12): "none" | "weak" | "strong" {
  const len = clean(value).length;
  if (len === 0) return "none";
  if (len >= min) return "strong";
  return "weak";
}

function anyStrong(...values: unknown[]): boolean {
  return values.some((v) => strength(v) === "strong");
}

function anyWeak(...values: unknown[]): boolean {
  return values.some((v) => strength(v) === "weak");
}

function isFieldActive(activeKey: string | null | undefined, keys: string[]): boolean {
  if (!activeKey) return false;
  return keys.includes(activeKey);
}

function resolveNodeState(
  id: ForgeMapNodeId,
  state: GuidedInterviewState,
  dnaLock: BookDnaLock,
  isThinking: boolean,
  activeKey: string | null | undefined,
): ForgeMapNodeState {
  const ex = state.extracted;
  const dirty = isDnaTooDirtyToShow(ex as Record<string, unknown>);

  if (id === "blueprintReady") {
    if (dnaLock.readyForBlueprint) return "locked";
    if (dnaLock.confidenceScore >= 0.95) return "confirmed";
    return "empty";
  }

  if (id === "dnaLock") {
    if (state.dnaLock?.lockedAt || dnaLock.readyForBlueprint) return "locked";
    if (dnaLock.confidenceScore >= 0.72) return "confirmed";
    if (isThinking && isFieldActive(activeKey, ["genreDNA", "promise", "targetReader"])) {
      return "understanding";
    }
    if (dnaLock.confidenceScore >= 0.45) return "understanding";
    return "empty";
  }

  if (id === "idea") {
    const userMsgs = state.messages.filter((m) => m.role === "user").length;
    if (userMsgs >= 2 && anyStrong(ex.centralConflict, ex.emotionalTone, ex.promise)) return "confirmed";
    if (userMsgs >= 1 || isThinking) return "understanding";
    return "empty";
  }

  if (id === "emotionalCore") {
    const keys = ["emotionalTone", "centralConflict"];
    if (anyStrong(ex.emotionalTone) && anyStrong(ex.centralConflict)) return dirty ? "clarify" : "confirmed";
    if (isThinking && isFieldActive(activeKey, keys)) return "understanding";
    if (anyWeak(ex.emotionalTone, ex.centralConflict) || anyStrong(ex.emotionalTone, ex.centralConflict)) {
      return dirty ? "clarify" : "understanding";
    }
    return "empty";
  }

  if (id === "bookDirection") {
    const genre =
      state.selectedGenre ||
      state.inferredProfile?.genre ||
      state.inferredProfile?.subgenre ||
      ex.genreDNA;
    if (strength(genre) === "strong" && (state.inferredProfile?.bookType || strength(ex.genreDNA) === "strong")) {
      return "confirmed";
    }
    if (isThinking && isFieldActive(activeKey, ["genreDNA", "setting"])) return "understanding";
    if (strength(genre) !== "none" || strength(ex.genreDNA) !== "none") return "understanding";
    return "empty";
  }

  if (id === "readerPromise") {
    const keys = ["promise", "readerTransformation", "targetReader"];
    const strongCount = keys.filter((k) => strength((ex as Record<string, unknown>)[k]) === "strong").length;
    if (strongCount >= 2) return dirty ? "clarify" : "confirmed";
    if (isThinking && isFieldActive(activeKey, keys)) return "understanding";
    if (strongCount >= 1 || anyWeak(ex.promise, ex.readerTransformation, ex.targetReader)) return "understanding";
    return "empty";
  }

  if (id === "toneExperience") {
    if (anyStrong(ex.emotionalTone) && anyStrong(ex.genreDNA)) return "confirmed";
    if (isThinking && isFieldActive(activeKey, ["emotionalTone", "genreDNA"])) return "understanding";
    if (anyStrong(ex.emotionalTone) || anyStrong(ex.genreDNA)) return "understanding";
    return "empty";
  }

  if (id === "structureDna") {
    const keys = ["setting", "narrativeDrive"];
    if (anyStrong(ex.setting) && (anyStrong(ex.narrativeDrive) || state.inferredProfile?.structureHint)) {
      return "confirmed";
    }
    if (isThinking && isFieldActive(activeKey, keys)) return "understanding";
    if (anyStrong(ex.setting) || anyStrong(ex.narrativeDrive)) return "understanding";
    return "empty";
  }

  return "empty";
}

function buildMissingItems(nodes: ForgeMapNode[]): string[] {
  const items: string[] = [];
  for (const node of nodes) {
    if (node.state === "empty" || node.state === "clarify") {
      if (node.id === "readerPromise") items.push("trasformazione del lettore");
      else if (node.id === "bookDirection") items.push("direzione editoriale / genere");
      else if (node.id === "toneExperience") items.push("tono vs intensità emotiva");
      else if (node.id === "structureDna") items.push("quanto storico vs narrativo");
      else if (node.state === "clarify") items.push(`${node.label.toLowerCase()} da chiarire`);
    }
  }
  return [...new Set(items)].slice(0, 3);
}

export function buildForgeLiveMap(
  state: GuidedInterviewState,
  dnaLock: BookDnaLock,
  isThinking: boolean,
  activeQuestionKey?: string | null,
): ForgeLiveMapSnapshot {
  const nodes: ForgeMapNode[] = FORGE_MAP_NODE_ORDER.map((id) => {
    const meta = NODE_META[id];
    const nodeState = resolveNodeState(id, state, dnaLock, isThinking, activeQuestionKey);
    let hint: string | undefined;
    if (nodeState === "clarify") hint = "Da chiarire";
    if (nodeState === "understanding") hint = "In comprensione…";
    if (nodeState === "confirmed") hint = "Compreso";
    if (nodeState === "locked") hint = "Bloccato";
    return {
      id,
      emoji: meta.emoji,
      label: meta.label,
      shortLabel: meta.shortLabel,
      state: nodeState,
      hint,
    };
  });

  const activeNodeId =
    [...nodes].reverse().find((n) => n.state === "understanding" || n.state === "clarify")?.id ??
    nodes.find((n) => n.state === "empty")?.id ??
    "blueprintReady";

  const confidencePct = Math.round(dnaLock.confidenceScore * 100);
  const ex = state.extracted;
  const bookLabel =
    state.inferredProfile?.subgenre ||
    state.inferredProfile?.bookType ||
    state.selectedGenre ||
    clean(ex.genreDNA) ||
    "Libro in definizione";

  const stillMissing = buildMissingItems(nodes);

  return {
    nodes,
    confidencePct,
    activeNodeId,
    missingItems: stillMissing,
    directionSummary: {
      bookLabel,
      center: clean(ex.centralConflict) || clean(ex.setting) || "—",
      tone: clean(ex.emotionalTone) || clean(ex.genreDNA) || "—",
      stillMissing,
    },
    readyForBlueprint: dnaLock.readyForBlueprint,
    showDirectionCard: confidencePct >= 50,
  };
}

export function getNodeCompletionWhisper(nodeId: ForgeMapNodeId): string {
  return NODE_META[nodeId].completionWhisper;
}

export function nodeStateRank(state: ForgeMapNodeState): number {
  switch (state) {
    case "empty":
      return 0;
    case "understanding":
      return 1;
    case "clarify":
      return 2;
    case "confirmed":
      return 3;
    case "locked":
      return 4;
    default:
      return 0;
  }
}
