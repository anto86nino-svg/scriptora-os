import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  BlueprintValidationError,
  buildFallbackBlueprintFromConfig,
  extractJsonFromText,
  getBlueprintValidationErrors,
  isBlueprintRecoverable,
  repairBlueprintResponse,
  resolveBlueprintFromAiResponse,
} from "./blueprint-recovery";
import { classifyError } from "./scriptora-error";

function sampleConfig(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Manuale del Pomodoro",
    subtitle: "Coltivazione pratica in vaso",
    language: "Italian",
    genre: "gardening",
    tone: "Pratico e incoraggiante",
    category: "Self Help",
    subcategory: "Gardening",
    bookLength: "short",
    chapterLength: "medium",
    numberOfChapters: 3,
    authorName: "Mario Rossi",
  } as BookConfig;
}

describe("blueprint recovery", () => {
  it("estrae JSON incastrato in markdown", () => {
    const raw = `Ecco la struttura:
\`\`\`json
{"overview":"Panoramica dettagliata del manuale pratico sul pomodoro in vaso con progressione settimanale.","chapterOutlines":[{"title":"Semi e atterraggio","summary":"Come scegliere semi adatti al clima e preparare il vaso."},{"title":"Acqua e luce","summary":"Gestire irrigazione e esposizione senza stress."},{"title":"Raccolta consapevole","summary":"Riconoscere maturazione e errori comuni."}],"themes":["orto","pazienza"],"emotionalArc":"Dalla curiosità alla competenza"}
\`\`\`
Fine risposta.`;

    const json = extractJsonFromText(raw);
    expect(json).toBeTruthy();
    expect(isBlueprintRecoverable(raw)).toBe(true);

    const resolved = resolveBlueprintFromAiResponse(raw, sampleConfig());
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.blueprint.chapterOutlines).toHaveLength(3);
      expect(resolved.source).toBe("repaired");
    }
  });

  it("normalizza campi mancanti in JSON parziale", () => {
    const raw = JSON.stringify({
      chapterOutlines: [
        { title: "Capitolo 1", summary: "Da sistemare" },
        { summary: "Secondo passo pratico con esempi concreti per il lettore." },
      ],
    });

    const repaired = repairBlueprintResponse(raw, sampleConfig());
    expect(repaired.candidate).not.toBeNull();
    expect(repaired.candidate!.chapterOutlines).toHaveLength(3);
    expect(repaired.errors).toHaveLength(0);
  });

  it("rifiuta blueprint non riparabile senza JSON", () => {
    const repaired = repairBlueprintResponse("Risposta narrativa senza struttura.", sampleConfig());
    expect(repaired.candidate).toBeNull();
    expect(repaired.errors.length).toBeGreaterThan(0);
  });

  it("crea struttura base sicura valida dalla configurazione", () => {
    const fallback = buildFallbackBlueprintFromConfig(sampleConfig());
    const errors = getBlueprintValidationErrors(fallback, sampleConfig());
    expect(errors).toHaveLength(0);
    expect(fallback.chapterOutlines).toHaveLength(3);
    expect(fallback.overview).toContain("Struttura base creata dalla configurazione");
  });

  it("classifica errori blueprint in messaggio user-friendly", () => {
    const err = new BlueprintValidationError(
      "Blueprint AI non valido. Riprova — la struttura del libro non è stata salvata per evitare corruzione.",
      ["overview troppo corta o mancante"],
    );
    const classified = classifyError(err, { operation: "blueprint" });
    expect(classified.title).toBe("Blueprint non valido");
    expect(classified.probableFix).toContain("Rigenera Blueprint");
  });
});

describe("blueprint i18n keys", () => {
  it("non usa stringhe inglesi hardcoded principali nel pannello struttura", async () => {
    const { t, getUILanguage, setUILanguage } = await import("./i18n");
    const previous = getUILanguage();
    setUILanguage("it");
    try {
      expect(t("blueprint_subtitle")).toBe("Architettura del libro e piano capitoli");
      expect(t("blueprint_empty_hint")).toContain("rigeneri");
      expect(t("generation_failed")).toContain("non riuscita");
    } finally {
      setUILanguage(previous);
    }
  });
});
