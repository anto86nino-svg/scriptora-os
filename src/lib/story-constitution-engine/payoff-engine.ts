import type { MemoryGraphSnapshot } from "@/lib/memory-graph/types";
import type { ConstitutionWarning } from "./types";

export function evaluatePayoffEngine(
  text: string,
  memoryGraph?: MemoryGraphSnapshot | null,
  chapterIndex?: number,
): ConstitutionWarning[] {
  const warnings: ConstitutionWarning[] = [];
  if (!memoryGraph?.promises?.length) return warnings;

  const stale = memoryGraph.promises.filter(
    (p) =>
      (p.status === "open" || p.status === "partial") &&
      p.importance !== "low" &&
      chapterIndex != null &&
      chapterIndex - p.introducedIn > 6,
  );

  for (const promise of stale.slice(0, 4)) {
    const fragment = promise.description.slice(0, 20).toLowerCase();
    if (fragment.length >= 6 && !text.toLowerCase().includes(fragment)) {
      warnings.push({
        ruleId: "payoff_engine",
        severity: promise.importance === "critical" ? "critical" : "warning",
        message: `Promessa narrativa non sviluppata: «${promise.label}».`,
        suggestion: "Riprendi, complica o chiudi la promessa.",
      });
    }
  }

  return warnings;
}

export function buildPayoffEngineBlock(memoryGraph?: MemoryGraphSnapshot | null): string {
  if (!memoryGraph?.promises?.length) return "";
  const open = memoryGraph.promises
    .filter((p) => p.status === "open" || p.status === "partial")
    .slice(0, 6);
  if (!open.length) return "";
  const lines = open.map((p) => `- [${p.importance}] ${p.description}`);
  return `PAYOFF ENGINE — open narrative promises (develop or resolve):\n${lines.join("\n")}`;
}
