import { describe, expect, it } from "vitest";
import { prepareOneFlowWriterPackage, startOneFlowSessionWithConfirmedFoundations } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import {
  extractConceptProtagonist,
  isSparseConceptInput,
  sanitizeUserConceptInput,
  shouldUseEntityDrivenScaffold,
} from "@/lib/concept-dominance";
import { isInvalidGeneratedTitle } from "@/lib/title-intelligence-validation";
import type { AuthorFoundations } from "@/lib/book-forge/author-format-genre-catalog";
import { isGenericNarrativePromise } from "@/lib/narrative-promise-intelligence";

const GENERIC_BLUEPRINT =
  /normalità|crepa|escalation|modulo\s*1|modulo\s*2|domanda contemplativa|tradizione filosofica|la porta|primo ricordo|ultima scelta|mondo ordinario|inciting incident|indagine\/fuga|falsi sospetti/i;

type WildCase = {
  label: string;
  idea: string;
  expectedProtagonist?: string;
  foundations?: AuthorFoundations;
  mustContain: RegExp;
  mustNotContain: RegExp;
  minScore: number;
};

const DEFAULT_NARRATIVE_FOUNDATIONS: AuthorFoundations = {
  formatId: "romanzo",
  formatLabel: "Romanzo",
  genreId: "literary-fiction",
  genreLabel: "Literary Fiction",
};

const WILD_CASES: WildCase[] = [
  {
    label: "WILD 1 — Absurdist literary (Vittorio / martedì)",
    idea: "Un uomo compra una scatola che contiene il martedì. Ogni volta che la apre, il giorno successivo sparisce dal calendario di tutti. Si chiama Vittorio.",
    expectedProtagonist: "Vittorio",
    mustContain: /vittorio|scatola|marted|calendario/i,
    mustNotContain: /ariana|la forza opposta|fantasy emozionale|magia, tradimento/i,
    minScore: 85,
  },
  {
    label: "WILD 2 — Hybrid noir + folklore (Noemi / Bruma)",
    idea: "Nella città portuale di Bruma, la pescatrice Noemi pesca cadaveri che parlano solo nei sogni dei bambini. Il mare sta salendo di un piano ogni luna piena.",
    expectedProtagonist: "Noemi",
    mustContain: /noemi|bruma|cadaver|mare|sogni|bambini/i,
    mustNotContain: /bruma vs|ariana|inciting incident|la porta/i,
    minScore: 85,
  },
  {
    label: "WILD 3 — Speculative essay (sonno / economisti)",
    idea: "Se il sonno fosse una valuta, chi controlla le banche dei sogni controlla il futuro. Tre economisti e un insomne cercano di chiudere il mercato nero degli incubi.",
    foundations: { formatId: "saggio", formatLabel: "Saggio", genreId: "cultura", genreLabel: "Cultura" },
    mustContain: /sonno|valuta|banche|sogni|incubi|economist|insomne/i,
    mustNotContain: /ariana|fantasy emozionale|la porta|primo ricordo/i,
    minScore: 85,
  },
  {
    label: "WILD 4 — Children's allegory (Argo / volpe)",
    idea: "La volpe Argo non sa mentire ma vive in un regno dove mentire è obbligatorio per legge. Deve consegnare una lettera al Re delle Mezze Verità.",
    expectedProtagonist: "Argo",
    foundations: { formatId: "bambini", formatLabel: "Libro per bambini", genreId: "fiabe", genreLabel: "Fiabe" },
    mustContain: /argo|volpe|mentir|lettera|mezze verit/i,
    mustNotContain: /kael|la porta|primo ricordo|magia, tradimento|fantasy emozionale/i,
    minScore: 85,
  },
  {
    label: "WILD 5 — Weird horror comedy (Lorenzo / bollette)",
    idea: "Il fantasma del condominio si lamenta solo delle bollette. Lorenzo, amministratore, scopre che i morti stanno usando il Wi-Fi per votare le assemblee.",
    expectedProtagonist: "Lorenzo",
    mustContain: /lorenzo|fantasma|bollette|wifi|condominio|assemblee/i,
    mustNotContain: /ariana|inciting incident|la forza opposta/i,
    minScore: 85,
  },
  {
    label: "WILD 6 — Non-western historical (Hana / Nagasaki)",
    idea: "Nel 1743 a Nagasaki, la interprete Hana traduce una confessione che potrebbe far scoppiare una guerra tra tre imperi. Una parola sbagliata costa mille vite.",
    expectedProtagonist: "Hana",
    mustContain: /hana|nagasaki|1743|confessione|guerra|parola|imperi/i,
    mustNotContain: /nagasaki vs|ariana|inciting incident/i,
    minScore: 85,
  },
  {
    label: "WILD 7 — Ultra minimal input",
    idea: "libro sul silenzio",
    foundations: { formatId: "raccolta_poetica", formatLabel: "Raccolta poetica", genreId: "contemporanea", genreLabel: "Contemporanea" },
    mustContain: /silenzio|poesia|contemplativ|liric/i,
    mustNotContain: /ariana|inciting incident|la forza opposta|thriller|indagine\/fuga/i,
    minScore: 85,
  },
  {
    label: "WILD 8 — Chip pollution (Petra / chiave)",
    idea: "Idea di libro: Romanzo, Thriller, Fantasy. Una donna trova una chiave che apre solo porte che non esistono più. Si chiama Petra.",
    expectedProtagonist: "Petra",
    mustContain: /petra|chiave|porte/i,
    mustNotContain: /si vs|kael|la porta|primo ricordo|fantasy emozionale|magia, tradimento/i,
    minScore: 85,
  },
];

function scoreWildProposal(
  idea: string,
  proposal: NonNullable<ReturnType<typeof startOneFlowSessionWithConfirmedFoundations>["proposal"]>,
  payload: NonNullable<ReturnType<typeof prepareOneFlowWriterPackage>["payload"]>,
  test: WildCase,
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
  if (new Set(chapterTitles).size < Math.min(6, chapterTitles.length)) score -= 15;

  return Math.max(0, score);
}

describe("wild ideas stress test — One Flow entity-driven edge cases", () => {
  it("sanitizes chip pollution and extracts named protagonists", () => {
    const dirty =
      "Idea di libro: Romanzo, Thriller, Fantasy. Una donna trova una chiave che apre solo porte che non esistono più. Si chiama Petra.";
    const cleaned = sanitizeUserConceptInput(dirty);
    expect(cleaned.toLowerCase()).toMatch(/una donna trova una chiave/);
    expect(cleaned).not.toMatch(/^Idea di libro/i);
    expect(cleaned).not.toMatch(/^Romanzo,\s*Thriller/i);
    expect(extractConceptProtagonist(cleaned)).toBe("Petra");
    expect(extractConceptProtagonist(cleaned)).not.toBe("Si");
  });

  it("detects sparse vs entity-driven wild ideas", () => {
    expect(isSparseConceptInput("libro sul silenzio")).toBe(true);
    expect(shouldUseEntityDrivenScaffold(WILD_CASES[0]!.idea)).toBe(true);
    expect(extractConceptProtagonist(WILD_CASES[0]!.idea)).toBe("Vittorio");
    expect(extractConceptProtagonist(WILD_CASES[1]!.idea)).toBe("Noemi");
    expect(extractConceptProtagonist(WILD_CASES[5]!.idea)).toBe("Hana");
  });

  it.each(WILD_CASES)("$label — scores ≥ minScore through One Flow", (test) => {
    const session = startOneFlowSessionWithConfirmedFoundations(test.idea, {
      language: "Italiano",
      foundations: test.foundations ?? DEFAULT_NARRATIVE_FOUNDATIONS,
    });
    expect(session.proposal).toBeTruthy();
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const score = scoreWildProposal(test.idea, session.proposal!, payload!, test);
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
