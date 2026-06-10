import type { BookConfig, Chapter } from "@/types/book";

/** Semantic clusters — same beat expressed with different words */
const BEAT_CLUSTERS: Record<string, RegExp[]> = {
  fear_of_loss: [
    /\bho paura\b/i, /\baveva paura\b/i, /\bavevo paura\b/i, /\bpaura di perder/i, /\bpaura che\b/i,
    /\bnon voglio perderti\b/i, /\bafraid of losing\b/i, /\bscared (he|she|they)('ll| will) leave\b/i,
  ],
  unreadiness: [
    /\bnon (sono|era|ero|siamo) pront[oa]\b/i, /\bnon è il momento\b/i, /\btroppo presto\b/i, /\bnot ready\b/i,
  ],
  trust_doubt: [
    /\bnon so se posso fidarmi\b/i, /\bnon mi fido\b/i, /\bnon si fidava\b/i, /\bnon si fidò\b/i,
    /\bcan i trust\b/i, /\bnon credo che\b/i, /\bdiffidenza\b/i,
  ],
  suffering_fear: [
    /\b(paura di soffrire|ancora paura di soffrire|ho ancora paura di soffrire)\b/i,
    /\bferirmi di nuovo\b/i, /\bhurt again\b/i, /\bsofferenza\b/i,
  ],
  confession_love: [
    /\bti amo\b/i, /\bti voglio\b/i, /\bi love you\b/i, /\bconfessione\b/i, /\bconfesso\b/i,
  ],
  unworthiness: [
    /\bnon ti merito\b/i, /\bnon sono abbastanza\b/i, /\bnon merit[oi]\b/i, /\bdon't deserve\b/i,
  ],
  therapeutic_clarity: [
    /\bdevo essere onest[oa]\b/i, /\bdobbiamo parlarne\b/i, /\bwe need to talk\b/i, /\bcomunicare apertamente\b/i,
  ],
};

export function classifyBeatCluster(text: string): string | null {
  const clusters = extractBeatClustersFromSegment(text);
  return clusters[0] ?? null;
}

function extractBeatClustersFromSegment(text: string): string[] {
  const sample = text.toLowerCase().slice(0, 240);
  const found: string[] = [];
  for (const [cluster, patterns] of Object.entries(BEAT_CLUSTERS)) {
    if (patterns.some((p) => p.test(sample))) found.push(cluster);
  }
  return found;
}

export function extractBeatClustersFromText(text: string): string[] {
  const segments = text.split(/\n{2,}|(?<=[.!?…])\s+/).filter((s) => s.trim().length > 8);
  const found = new Set<string>();
  for (const segment of segments) {
    for (const cluster of extractBeatClustersFromSegment(segment)) found.add(cluster);
  }
  return Array.from(found);
}

export function collectPriorBeatClusters(previousChapters: Chapter[]): string[] {
  const all = new Set<string>();
  for (const ch of previousChapters) {
    const content = [ch.content, ...(ch.subchapters || []).map((s) => s.content)].join("\n");
    for (const c of extractBeatClustersFromText(content)) all.add(c);
  }
  return Array.from(all);
}

export function scoreEmotionalRepetition(currentText: string, priorText: string): number {
  const current = extractBeatClustersFromText(currentText);
  const prior = extractBeatClustersFromText(priorText);
  if (!current.length) return 88;
  const overlap = current.filter((c) => prior.includes(c));
  const ratio = overlap.length / Math.max(1, current.length);
  return Math.round(Math.max(20, 100 - ratio * 55 - overlap.length * 12));
}

export function detectStaleBeatLoop(currentText: string, priorText: string): boolean {
  return scoreEmotionalRepetition(currentText, priorText) < 52;
}

const CLUSTER_LABELS_IT: Record<string, string> = {
  fear_of_loss: "paura di perdere / abbandono",
  unreadiness: "non sono pronta / troppo presto",
  trust_doubt: "diffidenza / non posso fidarmi",
  suffering_fear: "paura di soffrire di nuovo",
  confession_love: "confessione d'amore prematura",
  unworthiness: "non merito / non basto",
  therapeutic_clarity: "chiarezza terapeutica / dobbiamo parlarne",
};

export function buildNarrativeBeatAntiRepetitionBlock(ctx: {
  config: BookConfig;
  previousChapters: Chapter[];
}): string {
  const priorClusters = collectPriorBeatClusters(ctx.previousChapters);
  const usedList = priorClusters.length
    ? priorClusters.map((c) => `- ${CLUSTER_LABELS_IT[c] || c} (GIÀ ESPRESSO — vietato ripetere)`).join("\n")
    : "- (primo capitolo — stabilisci beat freschi)";

  return `
NARRATIVE BEAT ANTI-REPETITION ENGINE (MANDATORY):
Before writing each scene, ask: "Questo evento porta davvero avanti la storia oppure sta semplicemente ripetendo un'emozione già espressa?"
If NO → change the beat. Do not regenerate the same fear/confession with different words.

BEAT CLUSTERS ALREADY SPENT — do NOT revisit without NEW consequence:
${usedList}

RULES:
- Same emotional concept in new words = STILL forbidden (e.g. "ho paura" → "non sono pronta" → "non so se fidarmi" = ONE beat, not three)
- Every scene must add: new information OR new consequence OR new conflict escalation
- If a character must feel fear again, show it through ACTION (hesitation, withdrawal, lie) — not another confession speech
Language: ${ctx.config.language}
`.trim();
}
