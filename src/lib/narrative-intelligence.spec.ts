import { describe, it, expect } from "vitest";
import { BookConfig } from "@/types/book";
import {
  buildNarrativeIntelligenceSystemBlock,
  buildNarrativeIntelligenceRuntimeBlock,
  getNarrativeTelemetrySnapshot,
} from "@/lib/narrative-intelligence";

const baseConfig: BookConfig = {
  title: "Test Book",
  subtitle: "",
  language: "English",
  genre: "self-help",
  category: "Self Help",
  subcategory: "Mindset",
  chapterLength: "medium",
  numberOfChapters: 12,
  tone: "intense",
  audience: "adult",
  authorStyle: "",
  bookLength: "medium",
  customTotalWords: 50000,
  subchaptersEnabled: false,
  subchaptersPerChapter: 3,
};

const configFor = (genre: BookConfig["genre"], subcategory: string): BookConfig => ({
  ...baseConfig,
  genre,
  subcategory,
});

const sampleByScenario: Record<string, string> = {
  darkRomance: `He watched her hand hover at the door handle and did not move.
She wanted him to stop her. He wanted her to leave first.
"Say it," she whispered.
He smiled without warmth. "Not tonight."
She stayed, furious at herself for staying.`,
  cozyFantasy: `Steam rose from the kettle while the rain settled over the village roofs.
Mara sorted dried lavender in silence and listened to the old floorboards answer her steps.
When the fox tapped the window, she laughed and opened it as if this had always been possible.`,
  thriller: `The elevator stopped between floors and the lights died.
Jonas heard a second breath in the dark.
His phone flashed one message: DO NOT TRUST THE EXIT.
By the time the lights returned, his access badge was gone.`,
  mafiaRomance: `He kissed her wrist like a promise and a threat.
Outside, engines idled below the balcony.
"You don't belong in this war," he said.
"Then stop pulling me into it," she replied, not stepping back.`,
  psychHorror: `The mirror reflected him a second too late.
He blinked, and the smile in the glass remained.
Every object in the apartment had moved an inch since morning, all closer to the bed.`,
  enemiesToLovers: `"You plagiarized my methodology," she said, dropping the marked draft on his desk.
He looked up, calm and infuriating. "I improved it."
She should have left. Instead she sat down and read every line.`,
  literary: `My mother called only on Tuesdays, always at 6:03, as if grief could be scheduled.
I answered from train stations, hospital corridors, borrowed kitchens.
We spoke in practical verbs because nouns were too dangerous.`,
};

describe("Narrative Intelligence audit", () => {
  it("produces differentiated genre DNA across required scenarios", () => {
    const scenarios: Array<{ key: string; config: BookConfig }> = [
      { key: "darkRomance", config: configFor("dark-romance", "Dark Romance") },
      { key: "cozyFantasy", config: configFor("fantasy", "Cozy Fantasy") },
      { key: "thriller", config: configFor("thriller", "Psychological Thriller") },
      { key: "mafiaRomance", config: configFor("dark-romance", "Mafia Romance") },
      { key: "psychHorror", config: configFor("thriller", "Psychological Horror") },
      { key: "enemiesToLovers", config: configFor("romance", "Academic Enemies to Lovers") },
      { key: "literary", config: configFor("memoir", "Emotional Literary Fiction") },
    ];

    const snapshots = scenarios.map(({ key, config }) =>
      getNarrativeTelemetrySnapshot({ config, currentText: sampleByScenario[key] })
    );

    const subgenres = new Set(snapshots.map((s) => s.genreDNA.subgenre));
    expect(subgenres.size).toBeGreaterThanOrEqual(5);

    const hasDarkRomanceBrain = snapshots.some((s) => s.genreDNA.brains.includes("DarkRomanceBrain"));
    const hasThrillerBrain = snapshots.some((s) => s.genreDNA.brains.includes("ThrillerBrain"));
    const hasCozyBrain = snapshots.some((s) => s.genreDNA.brains.includes("CozyFantasyBrain"));
    expect(hasDarkRomanceBrain).toBe(true);
    expect(hasThrillerBrain).toBe(true);
    expect(hasCozyBrain).toBe(true);
  });

  it("avoids unstable over-correction when text sample is too short", () => {
    const snapshot = getNarrativeTelemetrySnapshot({
      config: configFor("thriller", "Psychological Thriller"),
      currentText: "He stared at the door.",
    });

    expect(snapshot.flags.momentumConfidence).toBe("low");
    expect(snapshot.flags.aiPatternConfidence).toBe("low");
    expect(snapshot.scores.aiRiskScore).toBeLessThanOrEqual(35);
  });

  it("keeps system and runtime prompt layers compact and non-empty", () => {
    const config = configFor("dark-romance", "Mafia Romance");
    const systemBlock = buildNarrativeIntelligenceSystemBlock(config);
    const runtimeBlock = buildNarrativeIntelligenceRuntimeBlock({
      config,
      blueprint: {
        overview: "overview",
        chapterOutlines: [{ title: "Chapter", summary: "summary" }],
        themes: ["power", "desire"],
        emotionalArc: "rise and rupture",
      },
      previousChapters: [],
      chapterIndex: 0,
      currentText: sampleByScenario.mafiaRomance,
    });

    expect(systemBlock.length).toBeGreaterThan(400);
    expect(systemBlock.length).toBeLessThan(2600);
    expect(runtimeBlock.length).toBeGreaterThan(400);
    expect(runtimeBlock.length).toBeLessThan(3600);
    expect(systemBlock.includes("NARRATIVE INTELLIGENCE SYSTEM")).toBe(true);
    expect(runtimeBlock.includes("NARRATIVE RUNTIME CONTROLS")).toBe(true);
  });
});

