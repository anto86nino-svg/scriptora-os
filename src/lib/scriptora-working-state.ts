export type ScriptoraWorkingTone =
  | "blueprint"
  | "writing"
  | "editorial"
  | "market"
  | "export"
  | "study"
  | "cover";

export const WORKING_MESSAGES: Record<ScriptoraWorkingTone, string[]> = {
  blueprint: [
    "Sto leggendo la promessa del libro…",
    "Sto ordinando struttura, pubblico e genere…",
    "Sto costruendo un blueprint coerente…",
  ],
  writing: [
    "Sto ascoltando la voce del capitolo…",
    "Sto collegando memoria, tono e continuità…",
    "Sto scrivendo senza perdere il filo narrativo…",
  ],
  editorial: [
    "Sto cercando ridondanze e punti deboli…",
    "Sto misurando ritmo, sottotesto e dialoghi…",
    "Sto preparando una diagnosi editoriale leggibile…",
  ],
  market: [
    "Sto leggendo titolo, promessa e posizionamento…",
    "Sto valutando hook, KDP fit e vendibilità…",
    "Sto trasformando i dati in azioni commerciali…",
  ],
  export: [
    "Sto preparando il manoscritto…",
    "Sto controllando copertina e sezioni…",
    "Sto impaginando il file finale…",
  ],
  study: [
    "Sto leggendo il materiale…",
    "Sto separando concetti chiave e dettagli…",
    "Sto creando una struttura di studio chiara…",
  ],
  cover: [
    "Sto valutando genere e promessa visiva…",
    "Sto costruendo una direzione da scaffale digitale…",
    "Sto controllando leggibilità e impatto…",
  ],
};

export const WORKING_STEP_PRESETS = {
  editorialAnalysis: ["Lettura capitolo", "Ritmo e sottotesto", "Diagnosi editoriale"],
  editorialPatch: ["Analisi patch", "Correzione chirurgica", "Anteprima diff"],
  radar: ["Progetto", "Titolo e promessa", "KDP Launch", "Cover", "Manoscritto", "Verdetto"],
  kdpNarrative: ["Configurazione", "Analisi mercato", "Flusso narrativo"],
  titleDomination: ["Scansione mercato", "Analisi strategica", "Titoli vendibili"],
  export: ["Sezioni", "Copertina", "Formato", "Impaginazione", "Download"],
  study: ["Lettura materiale", "Concetti chiave", "Struttura studio"],
  manuscript: ["Lettura testo", "Ritmo e conflitto", "Punti deboli"],
  marketScan: ["Segnali nicchia", "Confronto genere", "Sintesi competitor"],
} as const;

export function formatWorkingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function resolveRotatingMessage(
  tone: ScriptoraWorkingTone,
  elapsedSeconds: number,
  custom?: string[],
): string {
  const pool = custom?.length ? custom : WORKING_MESSAGES[tone];
  const index = Math.floor(elapsedSeconds / 4) % pool.length;
  return pool[index] || pool[0];
}

export function resolveActiveStep(
  steps: string[] | undefined,
  elapsedSeconds: number,
  explicit?: number,
): number {
  if (explicit != null) return Math.min(Math.max(0, explicit), (steps?.length || 1) - 1);
  if (!steps?.length) return 0;
  const interval = Math.max(3, Math.floor(18 / steps.length));
  return Math.min(steps.length - 1, Math.floor(elapsedSeconds / interval));
}
