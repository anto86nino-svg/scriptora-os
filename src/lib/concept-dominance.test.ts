import { describe, expect, it } from "vitest";
import {
  buildSupernaturalThrillerSecondaryCast,
  buildSupernaturalThrillerSubtitle,
  extractConceptProtagonist,
  hasHighConceptFantasySignals,
  hasExplicitRomanceSignals,
  hasSubmergedCitySciFiSignals,
  hasSupernaturalThrillerSignals,
  hasDragonFlameFantasySignals,
  hasHospitalGuardianMemoirSignals,
  hasBusinessRestaurantSignals,
  expandChapterScaffold,
  buildHorrorStationChapterTitles,
  isGenericPhilosophyTitleForFiction,
  resolveConceptDominance,
  sanitizeUserConceptInput,
} from "@/lib/concept-dominance";
import { prepareOneFlowWriterPackage, startOneFlowSessionWithConfirmedFoundations } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";

describe("concept-dominance", () => {
  const eliasIdea =
    "Elias, la porta nel cuore, ricordi di una donna vissuta mille anni prima, data della fine del mondo";

  const martaIdea =
    "Thriller soprannaturale. Ogni notte alle 03:17 nel piccolo paese, Marta insegnante riceve ricordi dettagliati dal futuro. Una visione mostra la sua morte. Memoria, tempo, destino.";

  it("detects high-concept fantasy without romance drift", () => {
    expect(hasHighConceptFantasySignals(eliasIdea)).toBe(true);
    expect(hasExplicitRomanceSignals(eliasIdea)).toBe(false);
  });

  it("does not treat porta nel cuore as romance", () => {
    expect(hasExplicitRomanceSignals("porta nel cuore e ricordi antichi")).toBe(false);
  });

  it("resolves fantasy dominance for Elias concept", () => {
    const resolved = resolveConceptDominance(eliasIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("fantasy");
    expect(resolved.blockRomanceTemplates).toBe(true);
    expect(resolved.blockPhilosophyBlueprint).toBe(true);
    expect(resolved.protagonist).toBe("Elias");
  });

  it("rejects generic philosophy title for fantasy concept", () => {
    expect(isGenericPhilosophyTitleForFiction("Quello che Essere Nasconde", eliasIdea)).toBe(true);
  });

  it("sanitizes UI noise and chip prefixes from concept input", () => {
    const dirty =
      "Idea di libro: Fantasy, High Concept, Mistero, Destino, Memoria. Thriller soprannaturale. Ogni notte alle 03:17 nel piccolo paese, Marta insegnante riceve ricordi dal futuro.";
    const cleaned = sanitizeUserConceptInput(dirty);
    expect(cleaned.toLowerCase()).toMatch(/thriller soprannaturale/);
    expect(cleaned).not.toMatch(/^Idea di libro/i);
    expect(extractConceptProtagonist(cleaned)).toBe("Marta");
    expect(extractConceptProtagonist(cleaned)).not.toBe("Idea");
  });

  it("detects supernatural thriller and blocks fantasy drift for Marta concept", () => {
    expect(hasSupernaturalThrillerSignals(martaIdea)).toBe(true);
    expect(hasHighConceptFantasySignals(martaIdea)).toBe(false);

    const resolved = resolveConceptDominance(martaIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("thriller");
    expect(resolved.blockFantasyTemplates).toBe(true);
    expect(resolved.protagonist).toBe("Marta");
  });

  it("does not classify future-memory thriller as epic fantasy from ricordi/destino/futuro alone", () => {
    expect(hasHighConceptFantasySignals("ricordi dal futuro, destino, memoria e tempo in un paese")).toBe(false);
  });

  it("builds supernatural thriller subtitle with futuro, morte and ricordi", () => {
    const subtitle = buildSupernaturalThrillerSubtitle(martaIdea, "commercial");
    expect(subtitle.toLowerCase()).toMatch(/futuro|morte|ricord/);
    expect(subtitle).not.toMatch(/ucciderla|ucciderlo/i);
    expect(buildSupernaturalThrillerSecondaryCast().join(" ")).toMatch(/sceriffo/i);
  });

  it("keeps Marta 03:17 thriller through One Flow without fantasy template contamination", () => {
    const dirty =
      "Idea di libro: Fantasy, High Concept, Mistero, Destino, Memoria. " + martaIdea;
    const session = startOneFlowSessionWithConfirmedFoundations(dirty, { genreHint: "Fantasy", language: "Italiano" });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      session.proposal?.title ?? "",
      session.proposal?.subtitle ?? "",
      session.proposal?.promise ?? "",
      session.proposal?.characters ?? "",
      session.proposal?.premise ?? "",
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(joined).toMatch(/marta/i);
    expect(joined).toMatch(/03:17/);
    expect(joined).toMatch(/thriller|morte|futuro|ricord/i);
    expect(joined).toMatch(/sceriffo/i);
    expect(session.proposal?.subtitle?.toLowerCase() ?? "").toMatch(/futuro|morte|ricord/);
    expect(session.proposal?.characters?.toLowerCase() ?? "").toMatch(/marta/);
    expect(session.proposal?.characters?.toLowerCase() ?? "").toMatch(/sceriffo/);
    expect(joined).not.toMatch(/kael/i);
    expect(joined).not.toMatch(/magia proibita/i);
    expect(joined).not.toMatch(/fantasy epico|epic fantasy/i);
    expect(joined).not.toMatch(/mille anni/i);
    expect(joined).not.toMatch(/\bidea\b.*vs/i);
    expect(extractConceptProtagonist(session.rawIdea)).toBe("Marta");
  });

  it("resolves sci-fi dominance for ice-city idea even with Fantasy genre hint", () => {
    const exactIdea = `Per oltre trecento anni una città è rimasta nascosta sotto il ghiaccio eterno del Nord.
Quando il disgelo libera la città, i suoi abitanti credono che siano passati solo sette giorni.
Aren, giovane cartografo, scopre che la città custodisce una tecnologia impossibile e un segreto capace di riscrivere la storia dell'umanità.
Mentre il mondo combatte per impossessarsene, Aren scopre che il ghiaccio era una prigione costruita per contenere qualcosa che sta per svegliarsi.`;
    const resolved = resolveConceptDominance(exactIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("sci-fi");
    expect(hasSubmergedCitySciFiSignals(exactIdea)).toBe(true);
    expect(hasHighConceptFantasySignals(exactIdea)).toBe(false);
  });

  it("extracts Aren not Per from submerged city concept", () => {
    const arenIdea =
      "Per oltre trecento anni la città sommersa è rimasta congelata nel ghiaccio. Aren, ultimo storico della città, scopre che il disgelo sta rivelando tecnologia impossibile e un segreto che cambia la storia dell'umanità. Un'entità antica è stata imprigionata sotto la città.";
    expect(extractConceptProtagonist(arenIdea)).toBe("Aren");
    expect(extractConceptProtagonist(arenIdea)).not.toBe("Per");
  });

  it("keeps Aren submerged-city sci-fi through One Flow without philosophy template", () => {
    const arenIdea =
      "Per oltre trecento anni la città sommersa è rimasta congelata nel ghiaccio. Aren, ultimo storico della città, scopre che il disgelo sta rivelando tecnologia impossibile e un segreto che cambia la storia dell'umanità. Un'entità antica è stata imprigionata sotto la città.";
    const session = startOneFlowSessionWithConfirmedFoundations(arenIdea, { genreHint: "Fantasy", language: "Italiano" });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = [
      payload!.config.genre,
      session.proposal?.title ?? "",
      session.proposal?.subtitle ?? "",
      session.proposal?.promise ?? "",
      session.proposal?.characters ?? "",
      session.proposal?.premise ?? "",
      payload!.blueprint!.overview,
      payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" "),
    ].join(" ");

    expect(extractConceptProtagonist(session.rawIdea)).toBe("Aren");
    expect(joined).toMatch(/aren/i);
    expect(joined).toMatch(/citt[aà]\s+sommersa|sommersa/i);
    expect(joined).toMatch(/disgelo|ghiaccio/i);
    expect(joined).toMatch(/trecento|300/i);
    expect(joined).toMatch(/entit[aà]/i);
    expect(joined).toMatch(/sci[-\s]?fi|tecnolog/i);
    expect(joined).not.toMatch(/\bper\s+vs\b/i);
    expect(joined).not.toMatch(/tradizione filosofica|implicazione esistenziale|domanda contemplativa/i);
    expect(session.proposal?.characters?.toLowerCase() ?? "").toMatch(/aren/);
    expect(session.proposal?.characters?.toLowerCase() ?? "").not.toMatch(/^per\b/);
  });

  const kaelDragonIdea = `Ogni drago nasce con una sola fiamma.
Kael nasce senza.
Per questo viene condannato a morte.
Quando scopre di poter controllare il fuoco degli altri draghi diventa l'uomo più pericoloso del continente.`;

  it("detects dragon flame fantasy and extracts Kael not Per", () => {
    expect(hasDragonFlameFantasySignals(kaelDragonIdea)).toBe(true);
    expect(extractConceptProtagonist(kaelDragonIdea)).toBe("Kael");
    expect(extractConceptProtagonist(kaelDragonIdea)).not.toBe("Per");
    const resolved = resolveConceptDominance(kaelDragonIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("fantasy");
    expect(resolved.protagonist).toBe("Kael");
  });

  it("detects hospital memoir without fiction protagonist extraction", () => {
    const memoirIdea = `Per venticinque anni ho lavorato come guardiano notturno in un ospedale destinato alla chiusura.
Questo libro racconta le persone che mi hanno insegnato cosa significa essere umani.`;
    expect(hasHospitalGuardianMemoirSignals(memoirIdea)).toBe(true);
    expect(extractConceptProtagonist(memoirIdea)).toBeUndefined();
    expect(resolveConceptDominance(memoirIdea, { genre: "Memoir" }).bookFormat).toBe("memoir");
  });

  it("detects business restaurant growth signals", () => {
    const businessIdea = `Ho costruito una catena di 17 ristoranti partendo da un chiosco di panini.
Questo libro racconta sistemi, errori e strategie che mi hanno portato da zero a milioni di fatturato.`;
    expect(hasBusinessRestaurantSignals(businessIdea)).toBe(true);
    expect(extractConceptProtagonist(businessIdea)).toBeUndefined();
  });

  it("expands horror station beats to 20 unique chapters without tappa suffixes", () => {
    const horrorIdea = `Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare tra due gallerie inesistenti.
Elia trova una fotografia della madre con scritto: "Non lasciare che io salga sul treno."`;
    const expanded = expandChapterScaffold(buildHorrorStationChapterTitles(horrorIdea), 20, horrorIdea, "horror_station");
    expect(expanded).toHaveLength(20);
    const titles = expanded.map((b) => b.title);
    expect(new Set(titles).size).toBe(20);
    expect(titles.join(" ")).not.toMatch(/tappa\s*2|tappa\s*3/i);
  });
});
