import type { MemoryGraphSnapshot } from "../types";

export function buildWriterMemoryContextBlock(snapshot: MemoryGraphSnapshot): string {
  const lines: string[] = ["[MEMORY GRAPH — invisible canon context]"];

  if (snapshot.characters.length) {
    lines.push("Characters:");
    for (const c of snapshot.characters.slice(0, 8)) {
      lines.push(
        `- ${c.name}${c.role ? ` (${c.role})` : ""}: wound=${c.coreWound || "—"}; desire=${c.coreDesire || "—"}; fear=${c.coreFear || "—"}`,
      );
    }
  }

  const openPromises = snapshot.promises.filter((p) => p.status === "open" || p.status === "partial");
  if (openPromises.length) {
    lines.push("Open promises:");
    for (const p of openPromises.slice(0, 6)) {
      lines.push(`- [ch.${p.introducedIn}] ${p.description}`);
    }
  }

  const openMysteries = snapshot.mysteries.filter((m) => m.status === "open");
  if (openMysteries.length) {
    lines.push("Open mysteries:");
    for (const m of openMysteries.slice(0, 4)) {
      lines.push(`- ${m.description}`);
    }
  }

  if (snapshot.storyDebt.narrativeDebtScore > 0) {
    lines.push(`Narrative debt score: ${snapshot.storyDebt.narrativeDebtScore}/100`);
  }

  if (snapshot.mode === "degraded") {
    lines.push("Memory mode: DEGRADED — using DNA/Blueprint/Canon fallback.");
  }

  return lines.join("\n");
}

export function selectOpenPromises(snapshot: MemoryGraphSnapshot) {
  return snapshot.promises.filter((p) => p.status !== "resolved");
}

export function selectActiveCharacters(snapshot: MemoryGraphSnapshot, chapterIndex: number) {
  return snapshot.characters.filter(
    (c) => c.lastUpdatedChapter == null || chapterIndex - c.lastUpdatedChapter <= 6,
  );
}
