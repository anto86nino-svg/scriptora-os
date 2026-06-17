import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type { CopyrightConfig } from "./forge-evolution-types";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

export function deriveCopyrightConfig(state: GuidedInterviewState): CopyrightConfig {
  const ex = state.extracted ?? {};
  const existing = state.copyright ?? {};
  const modeRaw = clean(ex.copyrightMode || existing.mode);
  const mode: CopyrightConfig["mode"] =
    /personal|custom|personalizzat/i.test(modeRaw) ? "custom" : modeRaw ? "standard" : existing.mode;

  return {
    mode: mode ?? (clean(ex.copyrightCustom) ? "custom" : undefined),
    holder: clean(ex.authorName) || existing.holder,
    year: existing.year ?? String(new Date().getFullYear()),
    customText: clean(ex.copyrightCustom) || existing.customText,
  };
}

export function isCopyrightComplete(state: GuidedInterviewState): boolean {
  const c = deriveCopyrightConfig(state);
  if (!c.mode) return false;
  if (c.mode === "custom") return clean(c.customText).length >= 12;
  return clean(c.holder).length >= 2;
}

export function getCopyrightQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const c = deriveCopyrightConfig(state);
  if (c.mode === "custom" && !clean(c.customText)) {
    return [
      {
        id: "copyright-custom",
        key: "copyrightCustom",
        question: "Scrivi il copyright personalizzato che deve comparire nel libro.",
        helper: "Puoi includere nome, anno, diritti riservati, restrizioni.",
        placeholder: "© 2026 Nome Autore. Tutti i diritti riservati…",
      },
    ];
  }
  if (!c.mode) {
    return [
      {
        id: "copyright-mode",
        key: "copyrightMode",
        question: "Per il copyright preferisci la formula standard — o un testo personalizzato?",
        helper: "Ultimo dettaglio legale prima della scheda finale.",
        quickSuggestions: [
          { label: "Standard", value: "Copyright standard con nome autore e anno." },
          { label: "Personalizzato", value: "Copyright personalizzato — voglio scrivere il testo io." },
        ],
      },
    ];
  }
  return [];
}

export function applyCopyrightAnswer(state: GuidedInterviewState, answer: string): CopyrightConfig {
  const value = clean(answer);
  const next = deriveCopyrightConfig(state);
  if (/personal|custom|personalizzat/i.test(value)) {
    next.mode = "custom";
  } else if (/standard/i.test(value)) {
    next.mode = "standard";
    next.holder = clean(state.extracted?.authorName) || next.holder;
    next.year = String(new Date().getFullYear());
  } else if (next.mode === "custom") {
    next.customText = value;
  } else {
    next.mode = "standard";
  }
  return next;
}
