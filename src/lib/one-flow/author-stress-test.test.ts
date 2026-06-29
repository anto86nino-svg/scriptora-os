import { describe, expect, it } from "vitest";
import { prepareOneFlowWriterPackage, startOneFlowSession } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import {
  extractConceptProtagonist,
  hasBusinessRestaurantSignals,
  hasCookbookMediterraneanSignals,
  hasDragonFlameFantasySignals,
  hasHospitalGuardianMemoirSignals,
  hasHorrorStationSignals,
  hasPhotographyManualSignals,
} from "@/lib/concept-dominance";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";
import { isGenericNarrativePromise } from "@/lib/narrative-promise-intelligence";

const GENERIC_BLUEPRINT =
  /normalità|crepa|escalation|modulo\s*1|modulo\s*2|domanda contemplativa|tradizione filosofica|la porta|primo ricordo|ultima scelta|mondo ordinario/i;

type StressCase = {
  label: string;
  idea: string;
  genreHint: string;
  expectedProtagonist?: string;
  mustContain: RegExp;
  mustNotContain: RegExp;
  minScore: number;
};

const CASES: StressCase[] = [
  {
    label: "FANTASY — Kael drago fiamma",
    idea: `Ogni drago nasce con una sola fiamma.
Kael nasce senza.
Per questo viene condannato a morte.
Quando scopre di poter controllare il fuoco degli altri draghi diventa l'uomo più pericoloso del continente.`,
    genreHint: "Fantasy",
    expectedProtagonist: "Kael",
    mustContain: /kael|drago|fiamma|fuoco/i,
    mustNotContain: /romance|filosofia|la porta|primo ricordo|fantasy emozionale.*tradimento/i,
    minScore: 90,
  },
  {
    label: "HORROR — stazione 03:17",
    idea: `Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare tra due gallerie inesistenti.
Elia trova una fotografia della madre con scritto:
"Non lasciare che io salga sul treno."`,
    genreHint: "Horror",
    expectedProtagonist: "Elia",
    mustContain: /elia|stazione|03:17|fotograf|madre|treno/i,
    mustNotContain: /kael|fantasy|filosofia|desiderio proibito|verità e sopravvivenza emotiva/i,
    minScore: 90,
  },
  {
    label: "MEMOIR — guardiano ospedale",
    idea: `Per venticinque anni ho lavorato come guardiano notturno in un ospedale destinato alla chiusura.
Questo libro racconta le persone che mi hanno insegnato cosa significa essere umani.`,
    genreHint: "Memoir",
    mustContain: /memoir|ospedale|guardiano|umani|voce autoriale|venti/i,
    mustNotContain: /romance|enemies to lovers|marco vs|desiderio|climax emotivo/i,
    minScore: 90,
  },
  {
    label: "BUSINESS — ristoranti chiosco",
    idea: `Ho costruito una catena di 17 ristoranti partendo da un chiosco di panini.
Questo libro racconta sistemi, errori e strategie che mi hanno portato da zero a milioni di fatturato.`,
    genreHint: "Business",
    mustContain: /ristorant|chiosco|sistemi|strategie|errori|fatturato|business/i,
    mustNotContain: /romance|protagonista fiction|hero journey|30 giorni per ho/i,
    minScore: 90,
  },
  {
    label: "RICETTARIO — cucina mediterranea",
    idea: `Libro di cucina mediterranea.
100 ricette tradizionali.
Menu settimanali.
Varianti vegetariane.
Piano alimentare di 30 giorni.`,
    genreHint: "Ricettario",
    mustContain: /ricett|ingredienti|menu|mediterrane|vegetarian|30 giorni/i,
    mustNotContain: /filosofia|modulo\s*1|modulo\s*2|protagonista romance|tradizione filosofica/i,
    minScore: 90,
  },
  {
    label: "MANUALE — fotografia digitale",
    idea: `Manuale pratico di fotografia digitale per principianti.
Esposizione.
Diaframma.
Composizione.
Luce.
Esercizi.
Piano di miglioramento di 30 giorni.`,
    genreHint: "Manuale",
    mustContain: /fotograf|esposizione|diaframma|composizione|luce|esercizi|30 giorni/i,
    mustNotContain: /romance|modulo\s*1|modulo\s*2|protagonista|desiderio|marco vs/i,
    minScore: 90,
  },
];

function scoreProposal(
  idea: string,
  proposal: NonNullable<ReturnType<typeof startOneFlowSession>["proposal"]>,
  payload: NonNullable<ReturnType<typeof prepareOneFlowWriterPackage>["payload"]>,
  test: StressCase,
): number {
  let score = 100;
  const joined = [
    proposal.title,
    proposal.subtitle,
    proposal.promise,
    proposal.characters,
    payload.config.genre,
    payload.blueprint?.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" ") ?? "",
  ].join(" ");

  if (isInvalidGeneratedTitle(proposal.title, idea, proposal.subtitle)) score -= 20;
  if (isGenericNarrativePromise(proposal.promise)) score -= 20;
  if (GENERIC_BLUEPRINT.test(joined)) score -= 25;
  if (!test.mustContain.test(joined)) score -= 20;
  if (test.mustNotContain.test(joined)) score -= 25;

  if (test.expectedProtagonist) {
    const extracted = extractConceptProtagonist(idea);
    if (extracted !== test.expectedProtagonist) score -= 15;
    if (!new RegExp(test.expectedProtagonist, "i").test(proposal.characters)) score -= 10;
  }

  const chapterTitles = payload.blueprint?.chapterOutlines.map((c) => c.title) ?? [];
  const uniqueTitles = new Set(chapterTitles);
  if (uniqueTitles.size < Math.min(6, chapterTitles.length)) score -= 15;

  return Math.max(0, score);
}

describe("author stress test — One Flow editorial quality", () => {
  it("detects concept signals for all six author ideas", () => {
    expect(hasDragonFlameFantasySignals(CASES[0]!.idea)).toBe(true);
    expect(extractConceptProtagonist(CASES[0]!.idea)).toBe("Kael");
    expect(extractConceptProtagonist(CASES[0]!.idea)).not.toBe("Per");
    expect(hasHorrorStationSignals(CASES[1]!.idea)).toBe(true);
    expect(extractConceptProtagonist(CASES[1]!.idea)).toBe("Elia");
    expect(hasHospitalGuardianMemoirSignals(CASES[2]!.idea)).toBe(true);
    expect(extractConceptProtagonist(CASES[2]!.idea)).toBeUndefined();
    expect(hasBusinessRestaurantSignals(CASES[3]!.idea)).toBe(true);
    expect(hasCookbookMediterraneanSignals(CASES[4]!.idea)).toBe(true);
    expect(hasPhotographyManualSignals(CASES[5]!.idea)).toBe(true);
  });

  it.each(CASES)("$label — scores ≥ minScore through One Flow", (test) => {
    const session = startOneFlowSession(test.idea, { genreHint: test.genreHint, language: "Italiano" });
    expect(session.proposal).toBeTruthy();
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const score = scoreProposal(test.idea, session.proposal!, payload!, test);
    expect(score, `score ${score} for ${test.label}`).toBeGreaterThanOrEqual(test.minScore);

    const chapterTitles = payload!.blueprint!.chapterOutlines.map((c) => c.title);
    expect(chapterTitles.join(" ")).not.toMatch(/tappa\s*2|tappa\s*3|parte\s*2/i);
    expect(new Set(chapterTitles).size).toBe(chapterTitles.length);

    const joined = [
      session.proposal!.title,
      session.proposal!.subtitle,
      session.proposal!.promise,
      chapterTitles.join(" "),
    ].join(" ");
    expect(joined).toMatch(test.mustContain);
    expect(joined).not.toMatch(test.mustNotContain);
    expect(isInvalidGeneratedTitle(session.proposal!.title, test.idea, session.proposal!.subtitle)).toBe(false);
    expect(GENERIC_BLUEPRINT.test(joined)).toBe(false);
  });
});
