import { GenreProfile } from "./types";
import { StructuralBeat, WorldContext } from "./StructuralBeat";
import TitleMaskingEngine from "./TitleMaskingEngine";
import ChapterTitleGenerator from "./ChapterTitleGenerator";

// Benchmark suite for chapter title authenticity
export interface TitleBenchmarkCase {
  genre: string;
  beatType: StructuralBeat;
  worldContext: WorldContext;
  expectedTitleCharacteristics: string[];
}

export class ChapterTitleBenchmark {
  private cases: TitleBenchmarkCase[] = [];

  constructor() {
    this.cases = this.initializeCases();
  }

  private initializeCases(): TitleBenchmarkCase[] {
    return [
      // THRILLER
      {
        genre: "thriller",
        beatType: "climax",
        worldContext: {
          locations: ["The Safe House", "Downtown"],
          objects: ["pistol", "letter", "recording"],
          emotions: ["tension", "betrayal", "fear"],
        },
        expectedTitleCharacteristics: ["cryptic", "suggestive", "suspenseful"],
      },
      // FANTASY
      {
        genre: "fantasy",
        beatType: "threshold",
        worldContext: {
          locations: ["The Forbidden Gate", "Eldoria"],
          motifs: ["ancient magic", "destiny", "power"],
          emotions: ["wonder", "awe", "determination"],
        },
        expectedTitleCharacteristics: ["mythic", "symbolic", "atmospheric"],
      },
      // ROMANCE
      {
        genre: "romance",
        beatType: "midpoint",
        worldContext: {
          characters: ["Elena", "Marco"],
          emotions: ["longing", "vulnerability", "connection"],
          objects: ["rose", "letter", "photograph"],
        },
        expectedTitleCharacteristics: ["emotionally charged", "intimate", "layered"],
      },
      // TRAVEL GUIDE
      {
        genre: "travel",
        beatType: "setup",
        worldContext: {
          locations: ["Venice", "Montmartre", "Kyoto"],
          environmentalDetails: ["rain", "twilight", "narrow streets"],
          objects: ["canal", "café", "temple"],
        },
        expectedTitleCharacteristics: ["geographic", "experiential", "destination-focused"],
      },
      // COOKBOOK
      {
        genre: "cookbook",
        beatType: "rising_action",
        worldContext: {
          objects: ["saffron", "olive oil", "truffle"],
          motifs: ["flavor", "tradition", "nourishment"],
          emotions: ["warmth", "comfort", "celebration"],
        },
        expectedTitleCharacteristics: ["ingredient-focused", "sensory", "usefulness-oriented"],
      },
      // POETRY
      {
        genre: "poetry",
        beatType: "escalation",
        worldContext: {
          motifs: ["silence", "shadow", "memory"],
          emotions: ["melancholy", "reflection", "loss"],
          environmentalDetails: ["moonlight", "autumn"],
        },
        expectedTitleCharacteristics: ["lyrical", "abstract", "minimalist"],
      },
      // CHILDREN STORY
      {
        genre: "children",
        beatType: "inciting_incident",
        worldContext: {
          characters: ["Lucy", "the Fox"],
          locations: ["the Enchanted Forest"],
          objects: ["golden acorn", "secret map"],
          emotions: ["wonder", "excitement", "curiosity"],
        },
        expectedTitleCharacteristics: ["wonder-oriented", "playful", "memorable"],
      },
      // TECHNICAL MANUAL
      {
        genre: "technical",
        beatType: "setup",
        worldContext: {
          objects: ["API", "database", "authentication"],
          motifs: ["clarity", "precision", "efficiency"],
        },
        expectedTitleCharacteristics: ["clarity-first", "hierarchical", "instructional"],
      },
    ];
  }

  async benchmarkAllGenres(): Promise<
    Map<string, { title: string; score: number }>
  > {
    const results = new Map<string, { title: string; score: number }>();

    for (const testCase of this.cases) {
      const profile: GenreProfile = {
        macro: "fiction",
        micro: testCase.genre as any,
        format: "chapter",
        narrativeDensity: 0.6,
        informationalDensity: 0.3,
        emotionalIntensity: 0.7,
        readerExpectations: testCase.expectedTitleCharacteristics,
      };

      const maskingEngine = new TitleMaskingEngine(profile);
      const titleGen = new ChapterTitleGenerator(profile);

      const maskedTitle = await maskingEngine.maskBeatToTitle(
        testCase.beatType,
        testCase.worldContext
      );
      const generatedTitle = await titleGen.generateTitle(
        testCase.beatType,
        testCase.worldContext
      );

      const score = this.scoreTitle(
        generatedTitle,
        testCase.expectedTitleCharacteristics
      );

      const key = `${testCase.genre}-${testCase.beatType}`;
      results.set(key, {
        title: generatedTitle || maskedTitle,
        score,
      });
    }

    return results;
  }

  private scoreTitle(
    title: string,
    characteristics: string[]
  ): number {
    let score = 50; // baseline

    // Penalize generic/formulaic patterns
    if (/^the\s+\w+$/i.test(title)) {
      score -= 20;
    }

    // Check length (good range: 2-5 words)
    const wordCount = title.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 5) {
      score += 10;
    }

    // Penalize blacklisted patterns
    const blacklist = [
      "The Awakening",
      "The Fall",
      "The Choice",
      "Desire",
      "The Truth",
    ];
    if (blacklist.includes(title)) {
      score -= 30;
    }

    // Reward uniqueness
    if (title.includes("'") || title.includes("of") || title.includes("and")) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  printResults(results: Map<string, { title: string; score: number }>): void {
    console.log("\n=== CHAPTER TITLE BENCHMARK RESULTS ===\n");

    let totalScore = 0;
    let count = 0;

    for (const [key, { title, score }] of results) {
      console.log(`${key}: "${title}" (score: ${score}/100)`);
      totalScore += score;
      count++;
    }

    const average = (totalScore / count).toFixed(1);
    console.log(`\nAverage Score: ${average}/100`);
    console.log("\n✅ Benchmark complete. Titles should feel organic, not AI-generated.\n");
  }
}

export default ChapterTitleBenchmark;
