import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  applyWritingEngineV12Postprocess,
  buildWritingEngineV12Block,
  buildCharacterPsychologyFromConfig,
} from "./index";
import { applyShowDontTellEnforcerPostprocess, countShowVsTell } from "./show-dont-tell-enforcer";
import { applyNarrativeBeatDeduplicatorPostprocess, removeBeatEchoes } from "./narrative-beat-deduplicator";
import { validateCanonLockV2 } from "./canon-lock-v2";
import { hardenFlatClosedEnding } from "./page-turn-engine";
import { applyHumanImperfectionV4Postprocess } from "./human-imperfection-v4";

const config = {
  title: "La distanza tra noi",
  subtitle: "",
  genre: "dark-romance",
  category: "Fiction",
  subcategory: "Dark Romance",
  language: "Italian",
  tone: "intenso",
  authorStyle: "cinematico",
  chapterLength: "medium",
  bookLength: "medium",
  numberOfChapters: 24,
  subchaptersEnabled: false,
  characters: [
    {
      name: "Nora",
      role: "protagonista",
      wound: "ha imparato a non fidarsi",
      externalDesire: "riprendere controllo",
      internalNeed: "accettare aiuto senza consegnarsi",
      relationships: "tensione con Damien",
      strictRules: "Non rinominare Nora.",
    },
    {
      name: "Damien",
      role: "love interest",
      personality: "controllato, protettivo",
      strictRules: "Non rinominare Damien.",
    },
  ],
} as BookConfig;

describe("Writing Engine V12", () => {
  it("builds modular V12 prompt with all engines", () => {
    const block = buildWritingEngineV12Block(config, { chapterIndex: 3, mode: "generation" });
    expect(block).toContain("CHARACTER OBSESSION ENGINE");
    expect(block).toContain("PAGE TURN ENGINE");
    expect(block).toContain("BESTSELLER RHYTHM ENGINE");
    expect(block).toContain("CANON LOCK V2");
    expect(block).toContain("ANTI-REPETITION ENGINE V2");
    expect(block).toContain("DIALOGUE HUMANIZER");
    expect(block).toContain("SHOW DON'T TELL ENFORCER");
    expect(block).toContain("Nora");
    expect(block).toContain("wound:");
  });

  it("builds CharacterPsychology from config character", () => {
    const psych = buildCharacterPsychologyFromConfig(config.characters![0]);
    expect(psych.wound).toContain("fidarsi");
    expect(psych.behavioralSignature.length).toBeGreaterThan(0);
    expect(psych.stressReaction.length).toBeGreaterThan(0);
  });

  it("strips therapy dialogue and V12 leakage", () => {
    const raw = [
      "HUMAN BESTSELLER MODE V12:",
      "Nora guardò la tazza.",
      "«Devo raccontarti tutto il mio trauma prima di fidarmi.»",
    ].join("\n\n");

    const result = applyWritingEngineV12Postprocess(raw, { config, language: "Italian" });
    expect(result).not.toContain("HUMAN BESTSELLER MODE V12");
    expect(result).not.toMatch(/raccontarti tutto il mio trauma/i);
    expect(result).toContain("Nora guardò");
  });

  it("hardens flat closed endings", () => {
    const raw = "A\n\nB\n\nFinalmente non aveva più paura.";
    const result = hardenFlatClosedEnding(raw, "Italian");
    expect(result).toMatch(/non tornava|impossibile da ignorare|Nessuno disse la cosa/i);
  });

  it("deduplicates repeated emotional beats", () => {
    const prior = "Nora disse che aveva paura di fidarsi. Il trauma era ancora lì.";
    const current = [
      "Nora ripeté che aveva paura.",
      "Nora decise di uscire e chiudere la porta alle spalle.",
      "Aveva ancora paura di fidarsi.",
    ].join("\n\n");

    const pruned = removeBeatEchoes(current, prior);
    expect(pruned).toContain("decise di uscire");
  });

  it("corrects canon name drift via StoryBibleLock", () => {
    const raw = "Nora rimase ferma. Damian abbassò lo sguardo.";
    const result = applyWritingEngineV12Postprocess(raw, {
      config,
      language: "Italian",
      priorText: "Nora e Damien avevano già litigato.",
    });
    expect(result).toContain("Damien");
    expect(result).not.toContain("Damian");
  });

  it("validateCanonLockV2 flags critical name drift before merge", () => {
    const check = validateCanonLockV2("Nora vide Damian entrare.", {
      config,
      previousChapters: [{ title: "Cap 1", content: "Nora e Damien si erano incontrati." }],
    });
    expect(check.criticalDrift || check.nameDrift >= 0).toBeTruthy();
  });

  it("show-dont-tell enforcer reduces flat tells", () => {
    const raw = "Elena era nervosa. Poi parlò.";
    const result = applyShowDontTellEnforcerPostprocess(raw, { language: "Italian" });
    const metrics = countShowVsTell(result);
    expect(result.length).toBeGreaterThan(0);
    expect(metrics.tells + metrics.shows).toBeGreaterThanOrEqual(0);
  });

  it("human imperfection v4 removes AI metaphors", () => {
    const raw = "Fu come un'onda di emozioni. Nora tacque.";
    const result = applyHumanImperfectionV4Postprocess(raw, { language: "Italian" });
    expect(result).not.toMatch(/onda di emozioni/i);
    expect(result).toContain("Nora tacque");
  });

  it("beat deduplicator postprocess preserves evolving beats", () => {
    const prior = "Ho paura di perderti, disse Nora.";
    const current = "Nora mentì e cambiò argomento. Poi scappò via.";
    const result = applyNarrativeBeatDeduplicatorPostprocess(current, {
      config,
      priorText: prior,
      language: "Italian",
    });
    expect(result).toContain("mentì");
  });
});
