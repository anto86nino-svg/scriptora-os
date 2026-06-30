export type WriterRepairType = "none" | "local" | "surgical_ai" | "full";

export interface WriterPerformanceSnapshot {
  chapterIndex: number;
  tokenEstimate?: number;
  retryCount: number;
  repairType: WriterRepairType;
  memorabilityBefore?: number;
  memorabilityAfter?: number;
  editorialPass?: "traditional_editor";
  timestamp: number;
}

const snapshots: WriterPerformanceSnapshot[] = [];
const MAX_SNAPSHOTS = 48;

let lastRetryCount = 0;

export function resetWriterRetryCount(): void {
  lastRetryCount = 0;
}

export function incrementWriterRetryCount(): number {
  lastRetryCount += 1;
  return lastRetryCount;
}

export function getWriterRetryCount(): number {
  return lastRetryCount;
}

export function recordWriterPerformanceMetric(snapshot: Omit<WriterPerformanceSnapshot, "timestamp">): WriterPerformanceSnapshot {
  const entry: WriterPerformanceSnapshot = { ...snapshot, timestamp: Date.now() };
  snapshots.push(entry);
  if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();

  if (import.meta.env.DEV) {
    console.info("[Scriptora Writer Metrics]", {
      chapter: entry.chapterIndex + 1,
      repair: entry.repairType,
      retries: entry.retryCount,
      tokens: entry.tokenEstimate ?? "n/a",
      memorability: entry.memorabilityAfter ?? entry.memorabilityBefore ?? "n/a",
    });
  }

  return entry;
}

export function getLatestWriterPerformance(chapterIndex?: number): WriterPerformanceSnapshot | null {
  if (chapterIndex == null) return snapshots[snapshots.length - 1] ?? null;
  for (let i = snapshots.length - 1; i >= 0; i -= 1) {
    if (snapshots[i].chapterIndex === chapterIndex) return snapshots[i];
  }
  return null;
}

export function getWriterPerformanceSnapshots(): readonly WriterPerformanceSnapshot[] {
  return snapshots;
}
