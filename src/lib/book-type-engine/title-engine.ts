import type { BookTypeFamily } from "./types";

/** Vietati — titoli generici che non vendono e non informano. */
export const FORBIDDEN_GENERIC_TITLES = [
  "l'inizio del viaggio",
  "linizio del viaggio",
  "una nuova scoperta",
  "il segreto nascosto",
  "il cambiamento",
  "l'inizio dell'avventura",
  "linizio dell'avventura",
  "il primo passo",
  "una svolta",
  "il viaggio inizia",
  "l'innesco",
  "la prima crepa",
  "il desiderio nascosto",
  "la soglia",
  "the beginning",
  "a new discovery",
  "the hidden secret",
  "the change",
  "the journey begins",
  "first steps",
];

const TOPIC_FALLBACK_IT: Record<string, string[]> = {
  educational: ["Periodo e contesto", "Concetti fondamentali", "Esempi guidati", "Esercizi applicativi", "Sintesi e verifica"],
  cookbook: ["Ingredienti e preparazione", "Tecnica base", "Varianti regionali", "Abbinamenti", "Conservazione"],
  manual: ["Prerequisiti", "Configurazione iniziale", "Procedura passo-passo", "Risoluzione problemi", "Best practice"],
  nonfiction: ["Il problema reale", "Principio chiave", "Caso applicato", "Azione concreta", "Misurazione risultati"],
  poetry: ["Movimento I", "Variazione tematica", "Ritornello interiore", "Coda luminosa"],
};

export function normalizeTitleLoose(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function isForbiddenGenericTitle(value: unknown): boolean {
  const loose = normalizeTitleLoose(String(value || ""));
  if (!loose || loose.length < 3) return true;
  return FORBIDDEN_GENERIC_TITLES.some((bad) => loose === bad || loose.includes(bad));
}

export function buildTitleEnginePromptBlock(family: BookTypeFamily, language = "Italian"): string {
  const forbidden = FORBIDDEN_GENERIC_TITLES.slice(0, 8).map((t) => `"${t}"`).join(", ");
  const examples = family === "educational"
    ? 'GOOD: "Origini Polinesiane e le Prime Navigazioni nel Pacifico" · BAD: "L\'inizio dell\'avventura"'
    : family === "cookbook"
      ? 'GOOD: "Ragù Bolognese Tradizionale con Soffritto Lento" · BAD: "Una ricetta speciale"'
      : family === "manual"
        ? 'GOOD: "Configurazione API Key e Primo Workflow Automatizzato" · BAD: "Il primo capitolo"'
        : family === "nonfiction"
          ? 'GOOD: "Perché la Procrastinazione è un Problema di Identità" · BAD: "Il cambiamento"'
          : 'GOOD: "Quando il Telefono Squilla a Mezzanotte" · BAD: "Il segreto nascosto"';

  return `REAL TITLE ENGINE (${family.toUpperCase()})
- Titles MUST be content-specific and derived from the chapter summary/topic.
- NEVER use generic journey/secret/change/discovery titles.
- FORBIDDEN examples: ${forbidden}
- Pattern: ${examples}
- Language: ${language} only.`;
}

export function fallbackTitleForFamily(family: BookTypeFamily, index: number, language = "Italian"): string {
  const pool = TOPIC_FALLBACK_IT[family];
  if (!pool) return language === "English" ? `Section ${index + 1}` : `Sezione ${index + 1}`;
  return pool[index % pool.length];
}
