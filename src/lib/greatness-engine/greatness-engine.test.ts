import { describe, expect, it } from "vitest";
import {
  buildGreatnessEnginePromptBlock,
  evaluateGreatnessChapter,
  getGreatnessMode,
  isGreatnessPromptActive,
} from "@/lib/greatness-engine";
import type { BookConfig } from "@/types/book";

const gothicWeak = `La pioggia cadeva sul paese da giorni. Era una giornata normale e tutto sembrava tranquillo.
Nora camminava lentamente. Pensò che forse un giorno le cose sarebbero migliorate.
Alla fine tutto era a posto e tornarono a casa in pace.`;

const gothicStrong = `Nora non sapeva perché la statua senza volto fosse in una posizione diversa — ma lo era.
Il metallo freddo le lasciò un alone sul polso mentre Elia bussava alla porta sbagliata.
"Non aprire," sussurrò qualcuno dietro di lei. Ma la chiave era già nella serratura.
Domani avrebbe dovuto scoprire chi aveva mentito — se sarebbe sopravvissuta alla notte.`;

const romanceWeak = `Era un bel mattino. Marco si svegliò e pensò che forse amava Sara.
Sara capì perfettamente tutto e disse che andava tutto bene tra loro.
In conclusione erano felici e tutto era risolto.`;

const romanceStrong = `Sara non rispose quando Marco disse il suo nome — solo il bicchiere tremò sul tavolo.
Un secondo di silenzio bastò a farle capire che aveva paura di essere scelta davvero.
"Non oggi," mormorò, evitando lo sguardo, ma le sue dita restarono sul suo polso un istante di troppo.
Domani avrebbe dovuto dirgli la bugia che stava già proteggendo entrambi.`;

const fantasyWeak = `Il regno era molto bello e magico. Il protagonista camminava nel bosco scuro.
Pensò che la missione sarebbe stata facile. Alla fine tutto andò bene.`;

const fantasyStrong = `La runa incisa sull'elsa brillò solo quando Lyra mentì — e stavolta mentì a se stessa.
Il fiume non rifletteva il cielo: rifletteva una città che non esisteva ancora.
Una foglia nera cadde sulla mappa e cambiò il confine del regno prima che potessero fermarla.
Prima che l'alba arrivasse, qualcuno avrebbe dovuto pagare per ciò che avevano risvegliato.`;

const selfHelpWeak = `In questo capitolo parleremo dell'importanza della produttività.
La produttività è importante per tutti. In conclusione, ricorda di essere produttivo ogni giorno.`;

const selfHelpStrong = `Il 73% delle persone fallisce questo passaggio entro la seconda settimana — non perché manca motivazione, ma perché confonde urgenza con priorità.
Ecco lo strumento da usare domani mattina: una domanda da 12 secondi prima di aprire la inbox.
Se non misuri questo errore oggi, ripeterai lo stesso ciclo sabato.`;

function cfg(genre: string, subcategory = genre): BookConfig {
  return {
    title: "Test",
    subtitle: "",
    tone: "clear",
    authorStyle: "default",
    language: "English",
    genre,
    category: "Fiction",
    subcategory,
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 12,
    subchaptersEnabled: false,
  } as BookConfig;
}

describe("Scriptora Greatness Engine", () => {
  it("defaults to passive safe mode", () => {
    expect(getGreatnessMode()).toBe("passive");
    expect(isGreatnessPromptActive()).toBe(false);
  });

  it("scores gothic strong higher than weak on hook, ending, compulsive readability", () => {
    const weak = evaluateGreatnessChapter({ content: gothicWeak, chapterIndex: 2, genre: "gothic-thriller" });
    const strong = evaluateGreatnessChapter({ content: gothicStrong, chapterIndex: 2, genre: "gothic-thriller" });
    expect(strong.scores.hookPower).toBeGreaterThan(weak.scores.hookPower);
    expect(strong.scores.endingMagnetism).toBeGreaterThan(weak.scores.endingMagnetism);
    expect(strong.scores.compulsiveReadability).toBeGreaterThan(weak.scores.compulsiveReadability);
    expect(strong.scores.overall).toBeGreaterThan(weak.scores.overall);
  });

  it("scores romance slow burn with higher emotional aftertaste than therapy-style resolution", () => {
    const weak = evaluateGreatnessChapter({ content: romanceWeak, chapterIndex: 4, genre: "dark-romance" });
    const strong = evaluateGreatnessChapter({ content: romanceStrong, chapterIndex: 4, genre: "dark-romance" });
    expect(strong.scores.emotionalAftertaste).toBeGreaterThan(weak.scores.emotionalAftertaste);
    expect(strong.scores.memorability).toBeGreaterThan(weak.scores.memorability);
    expect(strong.genreMode).toBe("emotional_addiction");
  });

  it("scores fantasy wonder+momentum and self-help actionable momentum", () => {
    const fantasy = evaluateGreatnessChapter({ content: fantasyStrong, chapterIndex: 1, genre: "fantasy" });
    const fantasyWeakReport = evaluateGreatnessChapter({ content: fantasyWeak, chapterIndex: 1, genre: "fantasy" });
    expect(fantasy.genreMode).toBe("wonder_momentum");
    expect(fantasy.scores.overall).toBeGreaterThan(fantasyWeakReport.scores.overall);

    const help = evaluateGreatnessChapter({ content: selfHelpStrong, chapterIndex: 0, genre: "self-help" });
    const helpWeak = evaluateGreatnessChapter({ content: selfHelpWeak, chapterIndex: 0, genre: "self-help" });
    expect(help.genreMode).toBe("actionable_momentum");
    expect(help.scores.hookPower).toBeGreaterThan(helpWeak.scores.hookPower);
  });

  it("injects greatness prompt block with hook, ending, and market rules", () => {
    const block = buildGreatnessEnginePromptBlock({
      config: cfg("gothic-thriller"),
      previousChapters: [],
      chapterIndex: 0,
      outlineSummary: "Cathedral key mystery",
    });
    expect(block).toContain("GREATNESS ENGINE");
    expect(block).toContain("HOOK POWER ENGINE");
    expect(block).toContain("CHAPTER ENDING MAGNETISM");
    expect(block).toContain("MEMORABILITY ENGINE");
    expect(block).toContain("READER ADDICTION ENGINE");
    expect(block).toContain("Thriller/Gothic");
  });

  it("produces micro surgeries for weak scenes", () => {
    const report = evaluateGreatnessChapter({ content: gothicWeak, chapterIndex: 1, genre: "gothic-thriller" });
    expect(report.optimizations.length).toBeGreaterThan(0);
    expect(report.microSurgeries.length + report.optimizations.length).toBeGreaterThan(0);
  });
});
