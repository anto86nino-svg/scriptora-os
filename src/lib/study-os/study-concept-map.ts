import type { StudyConceptMap, StudySessionResult } from "@/lib/study-session";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";

export type ConceptMapLevel = "base" | "avanzata" | "esame";

export interface ConceptMapNode {
  id: string;
  label: string;
  detail: string;
  level: number;
  group?: string;
}

export interface ConceptMapEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  type: "hierarchy" | "cause-effect" | "prerequisite" | "contrast" | "example";
}

export interface StudyConceptMapData {
  title: string;
  level: ConceptMapLevel;
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  exportText: string;
}

const LEVEL_NODE_LIMIT: Record<ConceptMapLevel, number> = {
  base: 5,
  avanzata: 8,
  esame: 12,
};

function relationType(index: number, examFocused: boolean): ConceptMapEdge["type"] {
  if (examFocused) return index % 3 === 0 ? "prerequisite" : index % 2 === 0 ? "cause-effect" : "hierarchy";
  return index % 2 === 0 ? "hierarchy" : "example";
}

/** Auto-generate concept map structure from material and kernel profile. */
export function buildStudyConceptMap(
  result: StudySessionResult,
  kernelPlan?: StudyKernelPlan | null,
  level: ConceptMapLevel = "base",
): StudyConceptMapData {
  if (result.conceptMap?.nodes.length) {
    return fromLegacyConceptMap(result.conceptMap, level);
  }

  const title = result.title || result.detectedSubject || "Mappa concettuale";
  const concepts = result.keyConcepts.slice(0, LEVEL_NODE_LIMIT[level]);
  const examFocused = kernelPlan?.quizDifficulty === "esame" || level === "esame";
  const detailSource =
    level === "base"
      ? result.lightSummary || result.mediumSummary
      : level === "avanzata"
        ? result.proSummary || result.mediumSummary
        : result.studyNotesPro || result.proSummary || result.mediumSummary;

  const proLines = (detailSource || "")
    .split(/[.!?]\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20);

  const nodes: ConceptMapNode[] = [
    {
      id: "root",
      label: title,
      detail: kernelPlan?.classification.label ?? result.detectedSubject,
      level: 0,
      group: "centro",
    },
    ...concepts.map((concept, index) => ({
      id: `n-${index}`,
      label: concept,
      detail:
        proLines[index] ||
        (level === "esame"
          ? `Da saper definire, collegare e applicare in verifica.`
          : `Concetto collegato a ${title}.`),
      level: index < 3 ? 1 : 2,
      group: index < 3 ? "primario" : "secondario",
    })),
  ];

  const edges: ConceptMapEdge[] = concepts.map((_, index) => ({
    id: `e-${index}`,
    from: index < 3 ? "root" : `n-${Math.max(0, index - 3)}`,
    to: `n-${index}`,
    label: index < 3 ? "include" : index % 2 === 0 ? "dipende da" : "si collega a",
    type: relationType(index, examFocused),
  }));

  const exportText = [
    `# ${title} (${level})`,
    ...nodes.map((n) => `- ${"  ".repeat(n.level)}${n.label}: ${n.detail}`),
    "",
    "## Relazioni",
    ...edges.map((e) => `- ${e.from} → ${e.label} → ${e.to}`),
  ].join("\n");

  return { title, level, nodes, edges, exportText };
}

function fromLegacyConceptMap(map: StudyConceptMap, level: ConceptMapLevel): StudyConceptMapData {
  const limit = LEVEL_NODE_LIMIT[level];
  const nodes: ConceptMapNode[] = map.nodes.slice(0, limit).map((n) => ({
    id: n.id,
    label: n.label,
    detail: n.detail,
    level: n.level,
  }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: ConceptMapEdge[] = map.relations
    .filter((r) => nodeIds.has(r.from) && nodeIds.has(r.to))
    .map((r, i) => ({
      id: `legacy-${i}`,
      from: r.from,
      to: r.to,
      label: r.label,
      type: r.type,
    }));

  return {
    title: map.title,
    level,
    nodes,
    edges,
    exportText: map.exportText,
  };
}

/** Simple SVG layout positions for mobile-friendly rendering. */
export function layoutConceptMapSvg(
  data: StudyConceptMapData,
  width = 320,
  height = 280,
): { nodes: Array<ConceptMapNode & { x: number; y: number }>; edges: ConceptMapEdge[] } {
  const root = data.nodes.find((n) => n.id === "root") ?? data.nodes[0];
  const children = data.nodes.filter((n) => n.id !== root?.id);
  const cx = width / 2;
  const cy = height * 0.22;

  const positioned = data.nodes.map((node) => {
    if (node.id === root?.id) return { ...node, x: cx, y: cy };
    const idx = children.indexOf(node);
    const angle = (idx / Math.max(1, children.length)) * Math.PI * 2 - Math.PI / 2;
    const radius = node.level <= 1 ? height * 0.32 : height * 0.42;
    return {
      ...node,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius * 0.85 + height * 0.12,
    };
  });

  return { nodes: positioned, edges: data.edges };
}

export function getConceptMapLevelLabel(level: ConceptMapLevel): string {
  if (level === "base") return "Base";
  if (level === "avanzata") return "Avanzata";
  return "Esame";
}
