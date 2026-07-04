import { describe, expect, it } from "vitest";
import {
  analyzeSubchapterContinuity,
  reconstructSubchapterSequence,
  validateSubchapterHandoff,
} from "./subchapter-continuity-engine";

const GOOD_HANDOFF = {
  subchapters: [
    {
      title: "La chiamata",
      content: [
        "Marco guardò il telefono sul tavolo, come se potesse rispondere al posto suo.",
        "Quando finalmente squillò, riconobbe il numero di Elena prima ancora di sollevare il ricevitore.",
        "«Domani alle nove», disse lei. Lui annuì anche se lei non poteva vederlo.",
        "Riagganciò e restò immobile, con il cuore che batteva più forte del necessario.",
      ].join("\n\n"),
    },
    {
      title: "La mattina dopo",
      content: [
        "Alle otto e quarantacinque Marco era già davanti al bar, con le mani in tasca e lo sguardo fisso sulla strada.",
        "Non era arrivato per abitudine, ma perché quella chiamata aveva riaperto una porta che credeva chiusa.",
        "Quando vide Elena attraversare la piazza, capì che non avrebbe più potuto fingere indifferenza.",
        "Le sorrise piano, come si fa quando si teme di dire troppo e troppo poco insieme.",
      ].join("\n\n"),
    },
    {
      title: "La scelta",
      content: [
        "Si sedettero al tavolo vicino alla finestra, senza ordinar subito.",
        "Elena parlò per prima del passato, e Marco ascoltò senza interrompere.",
        "Quando lei chiese se potevano ricominciare, lui rispose che non voleva più una storia a metà.",
        "Uscirono insieme, consapevoli che quella decisione avrebbe cambiato tutto ciò che veniva dopo.",
      ].join("\n\n"),
    },
  ],
};

const DUPLICATE_PHONE = {
  subchapters: [
    {
      title: "1.1 — Il telefono",
      content: [
        "La sera era fredda e la casa troppo silenziosa.",
        "Marco compose il numero di Elena con le dita che tremavano appena.",
        "Squillò il telefono e lei rispose dopo due toni, con voce cauta.",
        "«Domani alle nove al bar», disse. Lui annuì, anche se lei non poteva vederlo.",
      ].join("\n\n"),
    },
    {
      title: "1.2 — Di nuovo il telefono",
      content: [
        "Marco compose il numero di Elena con le dita che tremavano appena.",
        "Squillò il telefono e lei rispose dopo due toni, con voce cauta.",
        "«Domani alle nove al bar», disse. Lui annuì, anche se lei non poteva vederlo.",
        "Solo dopo riagganciò e capì che non poteva più rimandare quell'incontro.",
      ].join("\n\n"),
    },
  ],
};

const TIMELINE_CONTRADICTION = {
  subchapters: [
    {
      title: "La sera prima",
      content: [
        "Marco preparò la borsa e controllò l'orologio due volte.",
        "Domani è l'appuntamento con Elena, pensò, e restano 24 ore per decidere cosa dirle.",
        "Si coricò tardi, con la testa piena di frasi mai pronunciate.",
      ].join("\n\n"),
    },
    {
      title: "La mattina sbagliata",
      content: [
        "La mattina dopo si svegliò prima dell'alba, convinto che fosse già il giorno dell'incontro.",
        "Preparò il caffè, poi si fermò: ieri aveva promesso di non correre più verso ciò che non sapeva reggere.",
        "Rimandò tutto di un giorno, ma nel pomeriggio la chiamò di nuovo per confermare.",
      ].join("\n\n"),
    },
  ],
};

describe("subchapter-continuity-engine", () => {
  it("detects critical duplicate phone call across 1.1 and 1.2", () => {
    const analysis = analyzeSubchapterContinuity(DUPLICATE_PHONE);
    expect(analysis.score).toBeLessThan(70);
    expect(analysis.errors.some((e) => e.severity === "critical" && e.category === "repetition")).toBe(true);
    expect(analysis.errors.some((e) => /telefon/i.test(e.message))).toBe(true);
  });

  it("detects timeline contradiction with domani/mattina dopo stack", () => {
    const analysis = analyzeSubchapterContinuity(TIMELINE_CONTRADICTION);
    expect(analysis.errors.some((e) => e.category === "timeline")).toBe(true);
    expect(analysis.score).toBeLessThan(90);
  });

  it("scores good handoff at or above 90", () => {
    const analysis = analyzeSubchapterContinuity(GOOD_HANDOFF);
    expect(analysis.score).toBeGreaterThanOrEqual(90);
    expect(analysis.errors.filter((e) => e.severity === "critical")).toHaveLength(0);
  });

  it("validateSubchapterHandoff flags duplicate phone at boundary", () => {
    const errors = validateSubchapterHandoff(
      DUPLICATE_PHONE.subchapters[0]!.content,
      DUPLICATE_PHONE.subchapters[1]!.content,
    );
    expect(errors.some((e) => e.severity === "critical")).toBe(true);
  });

  it("validateSubchapterHandoff flags split words at subchapter boundary", () => {
    const errors = validateSubchapterHandoff(
      "Il metodo sembra funzionare, ma appena aumenti il ritmo acceleri p",
      "er non cadere nella stessa ansia di prima.",
    );

    expect(errors.some((e) => e.severity === "critical" && /spezzata/i.test(e.message))).toBe(true);
  });

  it("reconstructs by stripping duplicate prefix when 1.2 repeats 1.1", () => {
    const analysis = analyzeSubchapterContinuity(DUPLICATE_PHONE);
    const result = reconstructSubchapterSequence(analysis, DUPLICATE_PHONE.subchapters);
    expect(result.subchapters[1]!.content).not.toContain("Marco compose il numero");
    expect(result.subchapters[1]!.content).toContain("non poteva più rimandare");
    expect(result.improvedScore).toBeGreaterThanOrEqual(analysis.score);
  });

  it("builds a timeline with inferred time anchors", () => {
    const analysis = analyzeSubchapterContinuity(GOOD_HANDOFF);
    expect(analysis.timeline).toHaveLength(3);
    expect(analysis.timeline[0]?.keyEvents).toContain("phone_call");
    expect(analysis.recommendedOrder).toEqual([0, 1, 2]);
  });
});

describe("subchapter-continuity-engine — literary romance integration", () => {
  it("audits Spostati-style mature romance subchapter sequence", () => {
    const chapter = {
      subchapters: [
        {
          title: "Il secondo che cambia tutto",
          summary: "Ritrovo imprevisto dopo anni.",
          content: [
            "Elena lo vide attraversare la sala come se il tempo non fosse passato, eppure tutto era diverso.",
            "Si avvicinarono con cautela, misurando ogni parola come un vetro sottile.",
            "Quando lui disse che l'aveva cercata in silenzio per anni, lei non negò di aver fatto lo stesso.",
            "Si salutarono senza abbracci, ma entrambi sapevano che quella sera non sarebbe finita lì.",
          ].join("\n\n"),
        },
        {
          title: "La distanza che resta",
          summary: "Conseguenza emotiva del ritrovo.",
          content: [
            "Uscirono insieme verso il parcheggio, camminando più lenti del necessario.",
            "Parlarono del passato senza accusarsi, come due adulti che hanno imparato il prezzo delle scelte.",
            "Elena ammise di avere paura di riaprire una ferita che aveva impiegato anni a rimarginare.",
            "Lui le promise solo presenza, non certezze, e per la prima volta lei non chiese di più.",
          ].join("\n\n"),
        },
        {
          title: "La scelta necessaria",
          summary: "Decisione che apre il capitolo successivo.",
          content: [
            "Prima di salire in macchina, Elena si fermò con la mano sulla portiera.",
            "Disse che non poteva più vivere a metà tra memoria e paura.",
            "Lui rispose che avrebbero provato un secondo inizio, ma senza cancellare ciò che erano stati.",
            "Quella decisione li lasciò più vulnerabili e, per entrambi, finalmente vivi.",
          ].join("\n\n"),
        },
      ],
    };

    const analysis = analyzeSubchapterContinuity(chapter, { language: "Italian" });
    expect(analysis.score).toBeGreaterThanOrEqual(85);
    expect(analysis.errors.filter((e) => e.severity === "critical")).toHaveLength(0);
    expect(analysis.narrativePatch).toMatch(/coerente|Nessuna correzione/i);
  });
});
