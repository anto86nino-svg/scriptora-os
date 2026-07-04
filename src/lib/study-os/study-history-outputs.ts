import type { StudyMaterialClassification } from "@/lib/study-session";

interface TimelineEvent {
  year: string;
  label: string;
  test: RegExp;
}

interface CauseConsequenceItem {
  label: string;
  test: RegExp;
}

const WWI_TIMELINE: TimelineEvent[] = [
  { year: "1914", label: "Attentato di Sarajevo e crisi diplomatica europea", test: /\bsarajevo\b|\bfrancesco ferdinando\b/i },
  { year: "luglio 1914", label: "Ultimatum austro-ungarico e mobilitazioni generali", test: /\bultimatum\b|\b28 luglio\b|\bmobilitaz/i },
  { year: "1914-1918", label: "Guerra di trincea sul fronte occidentale", test: /\btrince\w*|\bverdun\b|\bsomme\b/i },
  { year: "1915", label: "Intervento dell'Italia con il Patto di Londra", test: /\bpatto di londra\b|\binterventist/i },
  { year: "1917", label: "Caporetto e svolta con Rivoluzione russa e Stati Uniti", test: /\bcaporetto\b|\b1917\b|\brivoluzione russa\b|\bstati uniti\b/i },
  { year: "1918", label: "Resistenza sul Piave e vittoria di Vittorio Veneto", test: /\bpiave\b|\bvittorio veneto\b/i },
  { year: "11 nov 1918", label: "Armistizio e fine del conflitto", test: /\barmistizio\b|\b11 novembre\b/i },
  { year: "1919", label: "Conferenza di pace e Trattato di Versailles", test: /\bversailles\b|\btrattat/i },
];

const WWI_CAUSES: CauseConsequenceItem[] = [
  { label: "Nazionalismo e rivalità tra popoli, soprattutto nei Balcani", test: /\bnazionalismo\b/i },
  { label: "Imperialismo e competizione per colonie e mercati", test: /\bimperialismo\b/i },
  { label: "Militarismo e corsa agli armamenti", test: /\bmilitarismo\b/i },
  { label: "Sistema di alleanze: Triplice Alleanza e Triplice Intesa", test: /\btriplice\b|\balleanz/i },
  { label: "Crisi balcanica culminata nell'attentato di Sarajevo", test: /\bsarajevo\b|\bbalcan/i },
];

const WWI_CONSEQUENCES: CauseConsequenceItem[] = [
  { label: "Perdite umane immense e traumi sociali in Europa", test: /\bperdite\b|\bmorti\b|\bferiti\b/i },
  { label: "Crollo di grandi imperi (austro-ungarico, russo, ottomano)", test: /\bcroll\w*|\bimperi\b/i },
  { label: "Nuovi equilibri politici e nascita di nuovi Stati", test: /\bnuov.*stati\b|\bequilibri\b/i },
  { label: "Crisi economiche e industrie trasformate dalla guerra totale", test: /\beconom/i },
  { label: "Trattato di Versailles e tensioni che alimentarono il dopoguerra", test: /\bversailles\b|\briparazion/i },
  { label: "Ridisegno delle mappe europee e nuove rivalità internazionali", test: /\bmappe\b|\bconseguenz/i },
];

const WWI_KEY_POINTS: CauseConsequenceItem[] = [
  { label: "Conflitto globale 1914-1918 tra le grandi potenze europee", test: /\b1914\b|\b1918\b/i },
  { label: "Cause: nazionalismo, imperialismo, militarismo, alleanze", test: /\bnazionalismo\b|\bimperialismo\b/i },
  { label: "Scoppio legato a Sarajevo e al sistema di alleanze", test: /\bsarajevo\b/i },
  { label: "Guerra di trincea, battaglie logoranti, armi moderne", test: /\btrince/i },
  { label: "Italia: neutralità, intervento, Caporetto, Piave, Vittorio Veneto", test: /\bitalia\b|\bcaporetto\b/i },
  { label: "1917: Russia esce dal conflitto, entrano gli Stati Uniti", test: /\b1917\b/i },
  { label: "Armistizio 1918 e pace di Versailles con ripercussioni durature", test: /\barmistizio\b|\bversailles\b/i },
];

function isHistoryMaterial(classification?: StudyMaterialClassification): boolean {
  return classification?.type === "history";
}

function filterBySignals<T extends { test: RegExp }>(items: T[], text: string, min = 5): T[] {
  const matched = items.filter((item) => item.test.test(text));
  if (matched.length >= min) return matched;
  return items.slice(0, Math.max(min, matched.length));
}

export function buildSyntheticHistoryTimeline(text: string, classification?: StudyMaterialClassification): string {
  if (!isHistoryMaterial(classification)) return "";
  const events = filterBySignals(WWI_TIMELINE, text, 7);
  const lines = events.map((event, index) => `${index + 1}. (${event.year}) ${event.label}`);
  return ["Sequenza cronologica", ...lines].join("\n");
}

export function buildSyntheticHistoryCauses(text: string, classification?: StudyMaterialClassification): string {
  if (!isHistoryMaterial(classification)) return "";
  const causes = filterBySignals(WWI_CAUSES, text, 5);
  const consequences = filterBySignals(WWI_CONSEQUENCES, text, 5);
  const lines = [
    "Cause principali",
    ...causes.map((item) => `• ${item.label}`),
    "",
    "Conseguenze principali",
    ...consequences.map((item) => `• ${item.label}`),
  ];
  return lines.join("\n");
}

export function buildSyntheticHistoryKeyPoints(text: string, classification?: StudyMaterialClassification): string {
  if (!isHistoryMaterial(classification)) return "";
  const points = filterBySignals(WWI_KEY_POINTS, text, 6);
  return ["Punti chiave", ...points.map((item) => `• ${item.label}`)].join("\n");
}

export function countTimelineEvents(text: string): number {
  return WWI_TIMELINE.filter((event) => event.test.test(text)).length;
}

export function countCauseConsequenceItems(text: string): { causes: number; consequences: number } {
  return {
    causes: WWI_CAUSES.filter((item) => item.test.test(text)).length,
    consequences: WWI_CONSEQUENCES.filter((item) => item.test.test(text)).length,
  };
}
