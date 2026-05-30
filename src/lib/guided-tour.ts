export type GuidedTourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface GuidedTourStep {
  id: string;
  target?: string;
  title: string;
  description: string;
  placement?: GuidedTourPlacement;
  onEnter?: () => void;
}

export function guidedTourSelector(id: string): string {
  return `[data-guided-tour="${id}"]`;
}
