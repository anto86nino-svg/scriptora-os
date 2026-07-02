import { describe, expect, it, vi } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  BlueprintValidationError,
  buildFallbackBlueprintFromConfig,
  buildFormatCoherenceCorrectivePrompt,
  enforceBlueprintFormatCoherence,
  extractJsonFromText,
  getBlueprintValidationErrors,
  isBlueprintRecoverable,
  repairBlueprintResponse,
  resolveBlueprintFromAiResponse,
} from "./blueprint-recovery";
import { classifyError } from "./scriptora-error";
import { applyBookKernelToConfig, validateFormatCoherence } from "@/lib/book-intelligence";
import { normalizeBlueprintIntegrity } from "@/lib/BlueprintIntegrityEngine";
import { resolveWriterMemoryLabel } from "@/lib/generation";

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

  it("non rifiuta blueprint con sottocapitoli scaffold ripetuti tra capitoli", () => {
    const config = {
      ...sampleConfig(),
      numberOfChapters: 3,
      subchaptersEnabled: true,
      subchaptersPerChapter: 3,
      genre: "romance",
    } as BookConfig;
    const fallback = buildFallbackBlueprintFromConfig(config);
    const errors = getBlueprintValidationErrors(fallback, config);
    expect(errors.filter((e) => /beat duplicato/i.test(e))).toHaveLength(0);
    expect(fallback.chapterOutlines[0]?.subchapters?.length).toBe(3);
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

describe("format coherence gate", () => {
  it("passes coherent blueprints through unchanged", async () => {
    const config = applyBookKernelToConfig({
      title: "Manuale ansia",
      subtitle: "Passi pratici",
      idea: "manuale pratico per vincere l'ansia",
      genre: "manual",
      language: "Italian",
      tone: "chiaro",
      numberOfChapters: 3,
      bookLength: "short",
      chapterLength: "medium",
      authorStyle: "Editoriale",
      category: "Non-Fiction",
      subcategory: "General",
      subchaptersEnabled: false,
      characters: [],
    } as BookConfig);
    const blueprint = buildFallbackBlueprintFromConfig(config);
    const result = await enforceBlueprintFormatCoherence(config, blueprint, "ai");
    expect(result.source).toBe("ai");
    expect(validateFormatCoherence(config, result.blueprint).passed).toBe(true);
  });

  it("retries once and accepts repaired blueprint", async () => {
    const config = applyBookKernelToConfig({
      title: "Raccolta",
      subtitle: "",
      idea: "raccolta poetica oscura",
      bookFormat: "poetry_collection",
      genre: "poetry",
      language: "Italian",
      tone: "intimo",
      numberOfChapters: 3,
      bookLength: "short",
      chapterLength: "medium",
      authorStyle: "Lirico",
      category: "Poesia",
      subchaptersEnabled: false,
      characters: [],
    } as BookConfig);
    const badBlueprint = {
      ...buildFallbackBlueprintFromConfig(config),
      chapterOutlines: [
        { title: "Capitolo 1 — Il buio", summary: "Il protagonista scopre una trama segreta con love interest." },
        { title: "Capitolo 2 — Tensione", summary: "Antagonista e trama romantica si intensificano." },
        { title: "Capitolo 3 — Finale", summary: "Risoluzione della trama fiction." },
      ],
    };
    expect(validateFormatCoherence(config, badBlueprint).passed).toBe(false);

    const repairedBlueprint = buildFallbackBlueprintFromConfig(config);
    const retry = vi.fn(async () => repairedBlueprint);
    const result = await enforceBlueprintFormatCoherence(config, badBlueprint, "ai", retry);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("repaired");
    expect(validateFormatCoherence(config, result.blueprint).passed).toBe(true);
  });

  it("falls back silently when repair still fails coherence", async () => {
    const config = applyBookKernelToConfig({
      title: "Raccolta",
      subtitle: "",
      idea: "raccolta poetica oscura",
      bookFormat: "poetry_collection",
      genre: "poetry",
      language: "Italian",
      tone: "intimo",
      numberOfChapters: 3,
      bookLength: "short",
      chapterLength: "medium",
      authorStyle: "Lirico",
      category: "Poesia",
      subchaptersEnabled: false,
      characters: [],
    } as BookConfig);
    const badBlueprint = {
      ...buildFallbackBlueprintFromConfig(config),
      overview: "Un romanzo dark romance con protagonista e trama.",
      chapterOutlines: [
        { title: "Capitolo 1", summary: "Il protagonista incontra il love interest." },
        { title: "Capitolo 2", summary: "La trama si infittisce." },
        { title: "Capitolo 3", summary: "Finale romantico." },
      ],
    };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await enforceBlueprintFormatCoherence(config, badBlueprint, "ai", async () => null);
    expect(result.source).toBe("config_fallback");
    expect(validateFormatCoherence(config, result.blueprint).passed).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("builds a corrective prompt from coherence issues", () => {
    const config = applyBookKernelToConfig({
      title: "Guida",
      idea: "manuale pratico",
      genre: "manual",
      language: "Italian",
      tone: "chiaro",
      numberOfChapters: 3,
      bookLength: "short",
      chapterLength: "medium",
      authorStyle: "Editoriale",
      category: "Non-Fiction",
      subcategory: "General",
      subchaptersEnabled: false,
      characters: [],
    } as BookConfig);
    const report = validateFormatCoherence(config, {
      overview: "Il protagonista affronta la trama con antagonista.",
      chapterOutlines: [{ title: "Inizio", summary: "Trama fiction" }],
      themes: ["trama"],
      emotionalArc: "romance",
    });
    const prompt = buildFormatCoherenceCorrectivePrompt(config, report);
    expect(prompt).toContain("FORMAT COHERENCE REPAIR");
    expect(prompt).toContain("Issues detected");
  });
});

describe("writer memory label", () => {
  it("branches memory labels by book family", () => {
    expect(resolveWriterMemoryLabel({
      genre: "poetry",
      bookTypeId: "poetry",
      subcategory: "moderna",
    } as BookConfig)).toBe("POETIC CONTINUITY");

    expect(resolveWriterMemoryLabel({
      genre: "manual",
      bookTypeId: "manual",
      subcategory: "guide",
    } as BookConfig)).toBe("PRACTICAL CONTINUITY");

    expect(resolveWriterMemoryLabel({
      genre: "fantasy",
      bookTypeId: "fantasy",
      subcategory: "epic",
    } as BookConfig)).toBe("NARRATIVE MEMORY");

    expect(resolveWriterMemoryLabel({
      genre: "memoir",
      bookTypeId: "memoir",
      subcategory: "memoir",
    } as BookConfig)).toBe("NARRATIVE MEMORY");
  });
});

describe("blueprint integrity format awareness", () => {
  it("avoids protagonist wound fallbacks for practical formats", () => {
    const config = applyBookKernelToConfig({
      title: "Workbook ansia",
      idea: "workbook pratico per ansia",
      genre: "self-help",
      language: "Italian",
      tone: "chiaro",
      numberOfChapters: 4,
      bookLength: "short",
      chapterLength: "medium",
      authorStyle: "Editoriale",
      category: "Non-Fiction",
      subcategory: "General",
      subchaptersEnabled: false,
      characters: [],
    } as BookConfig);
    const integrity = normalizeBlueprintIntegrity(null, config, []);
    expect(integrity.bookCoreDNA.coreFear).not.toContain("protagonist");
    expect(integrity.relationshipTensionEngine.resistance).not.toContain("wound");
    expect(integrity.characterMemoryEngine).toHaveLength(0);
  });

  it("keeps narrative fallbacks for fiction formats", () => {
    const config = applyBookKernelToConfig({
      title: "Dark Romance",
      idea: "dark romance tra nemici",
      genre: "dark-romance",
      bookTypeId: "dark-romance",
      language: "Italian",
      tone: "intenso",
      numberOfChapters: 12,
      bookLength: "medium",
      chapterLength: "medium",
      authorStyle: "Cinematografico",
      category: "Fiction",
      subcategory: "morally grey",
      subchaptersEnabled: true,
      characters: [{ name: "Elena", role: "protagonist" }],
    } as BookConfig);
    const integrity = normalizeBlueprintIntegrity(null, config, []);
    expect(integrity.bookCoreDNA.coreFear).toContain("protagonist");
    expect(integrity.relationshipTensionEngine.resistance).toContain("wound");
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
