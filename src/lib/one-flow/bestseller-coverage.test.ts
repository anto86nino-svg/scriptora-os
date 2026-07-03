import { describe, expect, it } from "vitest";
import { prepareOneFlowWriterPackage, startOneFlowSessionWithConfirmedFoundations } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import { HOME_CREA_CHIPS } from "@/components/os/home/HomeCreaBlock";
import { mapGenreHintToExpressInput } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";

type CoverageCase = {
  label: string;
  idea: string;
  genreHint: string;
  mustContain: RegExp;
  mustNotContain: RegExp;
  chapterMustNot?: RegExp;
  chapterMustContain?: RegExp;
};

const CASES: CoverageCase[] = [
  {
    label: "Horror",
    idea: `Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare per sette minuti tra due gallerie inesistenti.
Elia trova una fotografia della madre con scritto: "Non lasciare che io salga sul treno."
Fotografie che cambiano. Ricordi che si riscrivono. Donna vestita di nero.`,
    genreHint: "Horror",
    mustContain: /stazione|03:17|elia|fotograf|treno/i,
    mustNotContain: /filosofia|essere nasconde|romance|desiderio proibito/i,
    chapterMustNot: /normalità|crepa|attrazione pericolosa/i,
  },
  {
    label: "Supernatural thriller",
    idea: "Thriller soprannaturale. Ogni notte alle 03:17 nel piccolo paese, Marta insegnante riceve ricordi dettagliati dal futuro. Una visione mostra la sua morte. Memoria, tempo, destino.",
    genreHint: "Fantasy",
    mustContain: /marta|03:17|thriller|futuro|morte|ricord|sceriffo/i,
    mustNotContain: /kael|fantasy epico|mille anni|porta nel cuore|idea di libro/i,
    chapterMustContain: /visione|futuro|morte|collasso temporale/i,
    chapterMustNot: /attrazione pericolosa|desiderio vs controllo/i,
  },
  {
    label: "Fantasy high-concept",
    idea: "Elias, la porta nel cuore, ricordi di una donna vissuta mille anni prima, data della fine del mondo",
    genreHint: "Fantasy",
    mustContain: /elias|porta|fantasy|mille anni|fine del mondo/i,
    mustNotContain: /romance|desiderio proibito|essere nasconde|filosofia pura/i,
    chapterMustContain: /porta|ricordo|ultima scelta/i,
  },
  {
    label: "Romance",
    idea: "Romance enemies to lovers in un piccolo paese di montagna — attrazione, attrito e slow burn fino al bacio",
    genreHint: "Romance",
    mustContain: /romance|enemies|lovers|attrazione|slow burn/i,
    mustNotContain: /filosofia|essere nasconde|stazione ferroviaria|serial killer/i,
  },
  {
    label: "Thriller",
    idea: "Thriller psicologico: un serial killer lascia indizi impossibili e l'investigatore Marco deve risolvere l'indagine prima della prossima vittima",
    genreHint: "Thriller",
    mustContain: /thriller|indagine|serial killer|marco/i,
    mustNotContain: /filosofia|romance|desiderio|slow burn/i,
    chapterMustContain: /indagine|vittima|prova|colpevole/i,
    chapterMustNot: /attrazione pericolosa|desiderio vs controllo/i,
  },
  {
    label: "Cookbook",
    idea: "Ricettario di cucina mediterranea con ingredienti di stagione, tecniche base e menu completi per la famiglia",
    genreHint: "Ricettario",
    mustContain: /ingredienti|ricette|cucina|mediterrane/i,
    mustNotContain: /filosofia|essere nasconde|protagonista romance|hero journey/i,
  },
  {
    label: "Workbook",
    idea: "Workbook pratico di 30 giorni per gestire l'ansia con esercizi guidati, tracker settimanali e checkpoint misurabili",
    genreHint: "Workbook",
    mustContain: /esercizi|tracker|workbook|ansia|30 giorni/i,
    mustNotContain: /hero journey|desiderio proibito|climax emotivo romance/i,
  },
  {
    label: "Poetry",
    idea: "Raccolta poetica sul tempo che passa — versi lirici, sezioni tematiche e voce intima",
    genreHint: "Raccolta poetica",
    mustContain: /poesi|sezione|verso|tempo|raccolta/i,
    mustNotContain: /capitolo 1 normalità|hero journey|romance arc/i,
  },
  {
    label: "Memoir",
    idea: "Memorie di un viaggio interiore dopo una crisi — dalla perdita alla ricostruzione dell'identità",
    genreHint: "Memoir",
    mustContain: /memoir|memoria|viaggio interiore|identità/i,
    mustNotContain: /desiderio proibito|enemies to lovers|hero journey standard/i,
  },
  {
    label: "Self-help",
    idea: "Guida pratica contro l'overthinking con esercizi quotidiani, metodo in 4 settimane e casi reali",
    genreHint: "Self-help",
    mustContain: /pratica|esercizi|overthinking|metodo/i,
    mustNotContain: /romance|narrative arc|desiderio|climax emotivo/i,
  },
  {
    label: "Manual/Business",
    idea: "Manuale di marketing digitale per PMI con moduli operativi, funnel, KPI e metodo replicabile",
    genreHint: "Business",
    mustContain: /marketing|moduli|metodo|digitale/i,
    mustNotContain: /protagonista romance|desiderio|bacio|hero journey/i,
  },
];

function joinedPackageText(
  session: ReturnType<typeof startOneFlowSessionWithConfirmedFoundations>,
  payload: NonNullable<ReturnType<typeof prepareOneFlowWriterPackage>["payload"]>,
): string {
  return [
    payload.config.genre,
    session.proposal?.title ?? "",
    session.proposal?.subtitle ?? "",
    session.proposal?.promise ?? "",
    session.proposal?.characters ?? "",
    session.proposal?.premise ?? "",
    payload.blueprint?.overview ?? "",
    payload.blueprint?.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" ") ?? "",
  ].join(" ");
}

describe("bestseller coverage — One Flow E2E", () => {
  it("maps all HomeCrea chips to express input", () => {
    for (const chip of HOME_CREA_CHIPS) {
      const mapped = mapGenreHintToExpressInput(chip);
      expect(mapped.genre || mapped.bookFormat, `missing mapping for chip: ${chip}`).toBeTruthy();
    }
  });

  it.each(CASES)("$label — end-to-end without template drift", ({ idea, genreHint, mustContain, mustNotContain, chapterMustContain, chapterMustNot }) => {
    const session = startOneFlowSessionWithConfirmedFoundations(idea, { genreHint, language: "Italiano" });
    const { payload } = prepareOneFlowWriterPackage(session);
    expect(payload).toBeTruthy();

    const joined = joinedPackageText(session, payload!);
    expect(joined).toMatch(mustContain);
    expect(joined).not.toMatch(mustNotContain);

    const chapters = payload!.blueprint!.chapterOutlines.map((c) => `${c.title} ${c.summary}`).join(" ");
    if (chapterMustContain) expect(chapters).toMatch(chapterMustContain);
    if (chapterMustNot) expect(chapters).not.toMatch(chapterMustNot);
  });
});
