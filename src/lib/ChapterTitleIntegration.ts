import { Chapter, BookConfig } from "@/types/book";
import {
  classifyText,
  TitleMaskingEngine,
  ChapterTitleGenerator,
  TitleDiversityEngine,
  WorldContextAnalyzer,
} from "@/lib/genre";
import { StructuralBeat } from "@/lib/genre/StructuralBeat";

/**
 * Centralized integration point for applying genre-aware title masking
 * to generated chapters. This layer ensures:
 *
 * 1. Chapter titles are world-native, not editorial beat labels
 * 2. Genre authenticity is maintained
 * 3. Repetition is prevented across manuscript
 * 4. Structure remains invisible to the reader
 */

class ChapterTitleIntegrationService {
  private diversityEngine: TitleDiversityEngine;
  private titleHistory: string[] = [];

  constructor() {
    this.diversityEngine = new TitleDiversityEngine();
  }

  /**
   * Apply intelligent masking to a generated chapter title.
   * This transforms editorial beat labels into immersive world-native identities.
   */
  async maskChapterTitle(
    chapter: Chapter,
    config: BookConfig,
    previousChapters: Chapter[],
    chapterIndex: number
  ): Promise<string> {
    try {
      // Classify the genre to determine title strategy
      const genreProfile = await classifyText(
        chapter.content || config.title || ""
      );

      // Extract world context from the generated chapter
      const analyzer = new WorldContextAnalyzer();
      const worldContext = await analyzer.analyzeChapter(chapter.content || "");

      // Infer structural beat from chapter progression
      const beatType = this.inferStructuralBeat(chapterIndex, config.numberOfChapters || 1);

      // Generate masked, world-native title
      const titleGen = new ChapterTitleGenerator(genreProfile);
      let candidateTitle = await titleGen.generateTitle(
        beatType,
        worldContext,
        this.titleHistory
      );

      // Check diversity and prevent repetition
      if (this.diversityEngine.shouldRejectTitle(candidateTitle)) {
        const maskingEngine = new TitleMaskingEngine(genreProfile);
        candidateTitle = await maskingEngine.maskBeatToTitle(
          beatType,
          worldContext,
          chapterIndex
        );
      }

      // Final fallback: use chapter content to generate something organic
      if (!candidateTitle || candidateTitle.length === 0) {
        candidateTitle = await this.generateFallbackTitle(
          chapter.content || "",
          chapterIndex
        );
      }

      // Track for diversity
      this.diversityEngine.addTitle(candidateTitle);
      this.titleHistory.push(candidateTitle);

      return candidateTitle;
    } catch (error) {
      // Fail gracefully: return original title on error
      console.warn(
        `[ChapterTitleIntegration] Masking failed, using original: ${error}`
      );
      return chapter.title || `Chapter ${chapterIndex + 1}`;
    }
  }

  /**
   * Infer the structural beat based on chapter position in manuscript.
   * This is a simple heuristic; real implementation could be more sophisticated.
   */
  private inferStructuralBeat(index: number, total: number): StructuralBeat {
    const progress = total > 0 ? index / total : 0;

    if (index === 0) return "setup";
    if (progress < 0.1) return "inciting_incident";
    if (progress < 0.25) return "threshold";
    if (progress < 0.4) return "rising_action";
    if (progress < 0.45) return "first_reversal";
    if (progress < 0.5) return "midpoint";
    if (progress < 0.75) return "escalation";
    if (progress < 0.85) return "darkest_moment";
    if (progress < 0.95) return "climax";
    if (progress < 1.0) return "resolution";
    return "denouement";
  }

  /**
   * Fallback title generation from raw chapter content.
   * Extracts compelling phrases or objects to create organic titles.
   */
  private async generateFallbackTitle(
    content: string,
    chapterIndex: number
  ): Promise<string> {
    // Extract first sentence or striking phrase
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    if (sentences.length > 0) {
      const firstPhrase = sentences[0]
        .trim()
        .substring(0, 60)
        .replace(/^(The|A|An)\s+/i, "");

      if (firstPhrase.length > 5) {
        return firstPhrase;
      }
    }

    // Fallback: neutral chapter marker
    return `Chapter ${chapterIndex + 1}`;
  }

  /**
   * Reset the diversity tracking for a new manuscript.
   */
  reset(): void {
    this.diversityEngine.reset();
    this.titleHistory = [];
  }

  /**
   * Get diversity metrics for author insight.
   */
  getDiversityReport() {
    return this.diversityEngine.getDiversityReport();
  }
}

// Singleton instance
let integrationService: ChapterTitleIntegrationService | null = null;

export function getChapterTitleIntegration(): ChapterTitleIntegrationService {
  if (!integrationService) {
    integrationService = new ChapterTitleIntegrationService();
  }
  return integrationService;
}

export function resetChapterTitleIntegration(): void {
  if (integrationService) {
    integrationService.reset();
  }
}

export default ChapterTitleIntegrationService;
